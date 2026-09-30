import { env, randomToken, hmac, cookie, parseCookies, redirect, json } from "../../lib/security.js";

export function GET(request) {
  try {
    const old = parseCookies(request);
    const session = old.flowbot_session || randomToken(32);
    const nonce = randomToken(32);
    const state = session + "." + nonce + "." + hmac(session + "." + nonce);
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user.info.basic");
    url.searchParams.set("redirect_uri", env("TIKTOK_REDIRECT_URI"));
    url.searchParams.set("state", state);
    return redirect(url.toString(), {
      "Set-Cookie": cookie("flowbot_session", session, 2592000) + ", " + cookie("flowbot_oauth_nonce", nonce, 600)
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
