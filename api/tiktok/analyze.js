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
    const fields = ["open_id", "display_name", "avatar_url"];
    if (scopes.includes("user.info.profile")) fields.push("bio_description", "profile_deep_link", "is_verified");
    if (scopes.includes("user.info.stats")) fields.push("follower_count", "following_count", "likes_count", "video_count");

    const token = decrypt(secret.access_token_enc);
    const url = new URL("https://open.tiktokapis.com/v2/user/info/");
    url.searchParams.set("fields", fields.join(","));

    const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const payload = await response.json();
    if (!response.ok || !payload?.data?.user) {
      return json({ error: "TikTok не вернул данные профиля", details: payload?.error?.message || payload?.message || "API error" }, 502, cors);
    }

    const user = payload.data.user;
    return json({
      ok: true,
      analysis: {
        account: user.display_name || account.display_name || "TikTok",
        scopes,
        basic: {
          display_name: user.display_name || null,
          open_id: user.open_id || account.open_id || null,
          avatar_url: user.avatar_url || account.avatar_url || null
        },
        profile: scopes.includes("user.info.profile") ? {
          bio_description: user.bio_description || "",
          profile_deep_link: user.profile_deep_link || null,
          is_verified: Boolean(user.is_verified)
        } : null,
        stats: scopes.includes("user.info.stats") ? {
          followers: Number(user.follower_count || 0),
          following: Number(user.following_count || 0),
          likes: Number(user.likes_count || 0),
          videos: Number(user.video_count || 0)
        } : null,
        token: {
          access_expires_at: account.access_token_expires_at || null,
          refresh_expires_at: secret.refresh_token_expires_at || null
        },
        data_source: "TikTok Display API /v2/user/info/",
        checked_at: new Date().toISOString(),
        limitations: [
          ...(scopes.includes("user.info.stats") ? [] : ["Для статистики нужен одобренный scope user.info.stats."]),
          ...(scopes.includes("user.info.profile") ? [] : ["Для bio/ссылки/верификации нужен одобренный scope user.info.profile."]),
          ...(scopes.includes("video.list") ? [] : ["Для списка публичных видео нужен одобренный scope video.list."])
        ]
      }
    }, 200, cors);
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500, cors);
  }
}
