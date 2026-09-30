import { db } from "../../lib/supabase.js";
import { env, randomToken, sha256, encrypt, parseCookies, safeEqual, clearCookie, cookie, hmac, redirect, json } from "../../lib/security.js";

export async function GET(request) {
  try {
    const u = new URL(request.url);
    const code = u.searchParams.get("code");
    const state = u.searchParams.get("state");
    const error = u.searchParams.get("error");
    if (error) return redirect(env("SITE_URL") + "/?tiktok=error");
    if (!code || !state) return json({ error: "Missing OAuth parameters" }, 400);

    const c = parseCookies(request);
    const parts = state.split(".");
    if (!c.flowbot_session || !c.flowbot_oauth_nonce || parts.length !== 3) return json({ error: "OAuth session missing" }, 400);
    const expected = hmac(parts[0] + "." + parts[1]);
    if (!safeEqual(c.flowbot_session, parts[0]) || !safeEqual(c.flowbot_oauth_nonce, parts[1]) || !safeEqual(parts[2], expected)) {
      return json({ error: "Invalid OAuth state" }, 400);
    }

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        client_key:env("TIKTOK_CLIENT_KEY"),
        client_secret:env("TIKTOK_CLIENT_SECRET"),
        code,
        grant_type:"authorization_code",
        redirect_uri:env("TIKTOK_REDIRECT_URI")
      })
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token || !tokens.open_id) return json({ error:"TikTok token exchange failed", details:tokens }, 502);

    const profileRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name", {
      headers:{Authorization:"Bearer " + tokens.access_token}
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile?.data?.user) return json({ error:"TikTok profile lookup failed", details:profile }, 502);

    const now = Date.now();
    await db.upsert({
      session_id:c.flowbot_session,
      open_id:tokens.open_id,
      display_name:profile.data.user.display_name || null,
      avatar_url:profile.data.user.avatar_url || null,
      scope:tokens.scope || "user.info.basic",
      access_token_enc:encrypt(tokens.access_token),
      refresh_token_enc:encrypt(tokens.refresh_token),
      access_token_expires_at:new Date(now + Number(tokens.expires_in || 86400) * 1000).toISOString(),
      refresh_token_expires_at:new Date(now + Number(tokens.refresh_expires_in || 31536000) * 1000).toISOString()
    });

    const handoff = randomToken(32);
    await db.handoff({
      code_hash:sha256(handoff),
      session_id:c.flowbot_session,
      expires_at:new Date(Date.now() + 300000).toISOString()
    });

    return redirect(env("SITE_URL") + "/?tiktok=connected&code=" + encodeURIComponent(handoff), {
      "Set-Cookie": clearCookie("flowbot_oauth_nonce") + ", " + cookie("flowbot_session", c.flowbot_session, 2592000)
    });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
