import { db } from "../../lib/supabase.js";
import { parseCookies, json } from "../../lib/security.js";

const cors = {
  "Access-Control-Allow-Origin": "https://floybot.github.io",
  "Access-Control-Allow-Credentials": "true",
  "Cache-Control": "no-store"
};

export async function GET(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (!session) return json({ connected:false }, 200, cors);

    const account = (await db.account(session))?.[0];
    return json(account ? { connected:true, account } : { connected:false }, 200, cors);
  } catch (e) {
    return json({ error:e.message }, 500, cors);
  }
}
