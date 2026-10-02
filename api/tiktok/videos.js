import { db } from "../../lib/supabase.js";
import { decrypt, parseCookies, json } from "../../lib/security.js";

const cors = {
  "Access-Control-Allow-Origin": "https://floybot.github.io",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
  "Cache-Control": "no-store"
};

export async function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

export async function GET(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const session = bearer || parseCookies(request).flowbot_session;
    if (!session) return json({ error: "TikTok не подключён" }, 401, cors);

    const account = (await db.account(session))?.[0];
    const secret = (await db.accountSecrets(session))?.[0];
    if (!account || !secret?.access_token_enc) return json({ error: "Аккаунт TikTok не найден" }, 404, cors);

    const scopes = String(account.scope || "").split(/[ ,]+/).filter(Boolean);
    if (!scopes.includes("video.list")) {
      return json({ ok: false, code: "SCOPE_REQUIRED", error: "Нужен одобренный TikTok scope video.list", scopes }, 403, cors);
    }

    const token = decrypt(secret.access_token_enc);
    const url = new URL("https://open.tiktokapis.com/v2/video/list/");
    url.searchParams.set("fields", "id,title,video_description,create_time,duration,cover_image_url,share_url,embed_link,like_count,comment_count,share_count,view_count");

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20 })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.data) {
      return json({ error: "TikTok не вернул список видео", details: payload?.error?.message || payload?.message || "API error" }, 502, cors);
    }

    return json({
      ok: true,
      videos: payload.data.videos || [],
      cursor: payload.data.cursor || 0,
      has_more: Boolean(payload.data.has_more)
    }, 200, cors);
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500, cors);
  }
}
