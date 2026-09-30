import { db } from "../../lib/supabase.js";
import { env, decrypt, parseCookies, json } from "../../lib/security.js";

export async function POST(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (!session) return json({ error:"Not connected" }, 401);

    const secret = (await db.accountSecrets(session))?.[0];
    const current = (await db.account(session))?.[0];
    if (!secret || !current) return json({ error:"TikTok account not found" }, 404);

    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        client_key:env("TIKTOK_CLIENT_KEY"),
        client_secret:env("TIKTOK_CLIENT_SECRET"),
        grant_type:"refresh_token",
        refresh_token:decrypt(secret.refresh_token_enc)
      })
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token) return json({ error:"TikTok refresh failed", details:tokens }, 502);

    const now = Date.now();
    await db.upsert({
      session_id:session,
      open_id:tokens.open_id || current.open_id,
      display_name:current.display_name,
      avatar_url:current.avatar_url,
      scope:tokens.scope || current.scope,
      access_token_enc:(await import("../../lib/security.js")).encrypt(tokens.access_token),
      refresh_token_enc:(await import("../../lib/security.js")).encrypt(tokens.refresh_token || decrypt(secret.refresh_token_enc)),
      access_token_expires_at:new Date(now + Number(tokens.expires_in || 86400) * 1000).toISOString(),
      refresh_token_expires_at:new Date(now + Number(tokens.refresh_expires_in || 31536000) * 1000).toISOString()
    });

    return json({ ok:true, expires_in:tokens.expires_in || 86400 });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
