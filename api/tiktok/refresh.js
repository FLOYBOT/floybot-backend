import { db } from "../../lib/supabase.js";
import { env, decrypt, encrypt, parseCookies, json } from "../../lib/security.js";

export async function refreshAccount(row) {
  const refreshToken = decrypt(row.refresh_token_enc);

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method:"POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded",
      "Cache-Control":"no-cache"
    },
    body:new URLSearchParams({
      client_key:env("TIKTOK_CLIENT_KEY"),
      client_secret:env("TIKTOK_CLIENT_SECRET"),
      grant_type:"refresh_token",
      refresh_token:refreshToken
    })
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens?.error_description || tokens?.error || "TikTok refresh failed");
  }

  const now = Date.now();
  const nextRefreshToken = tokens.refresh_token || refreshToken;

  await db.updateTokens(row.session_id, {
    access_token_enc:encrypt(tokens.access_token),
    refresh_token_enc:encrypt(nextRefreshToken),
    access_token_expires_at:new Date(now + Number(tokens.expires_in || 86400) * 1000).toISOString(),
    refresh_token_expires_at:new Date(now + Number(tokens.refresh_expires_in || 31536000) * 1000).toISOString()
  });

  return {
    session_id:row.session_id,
    access_token_expires_at:new Date(now + Number(tokens.expires_in || 86400) * 1000).toISOString()
  };
}

export async function POST(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (!session) return json({ error:"Not connected" }, 401);

    const secret = (await db.accountSecrets(session))?.[0];
    if (!secret) return json({ error:"TikTok account not found" }, 404);

    const result = await refreshAccount({
      session_id:session,
      refresh_token_enc:secret.refresh_token_enc
    });

    return json({ ok:true, expires_at:result.access_token_expires_at });
  } catch (e) {
    return json({ error:e?.message || String(e) }, 500);
  }
}
