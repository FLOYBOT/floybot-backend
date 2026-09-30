import { db } from "../../lib/supabase.js";
import { env, decrypt, parseCookies, clearCookie, json } from "../../lib/security.js";

export async function POST(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (!session) return json({ connected:false });

    const secrets = (await db.accountSecrets(session))?.[0];
    if (secrets?.access_token_enc) {
      const token = decrypt(secrets.access_token_enc);
      await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded"},
        body:new URLSearchParams({
          client_key:env("TIKTOK_CLIENT_KEY"),
          client_secret:env("TIKTOK_CLIENT_SECRET"),
          token
        })
      });
    }

    await db.remove(session);
    return json({ connected:false }, 200, { "Set-Cookie":clearCookie("flowbot_session") });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
