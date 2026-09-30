import { db } from "../../lib/supabase.js";
import { parseCookies, json } from "../../lib/security.js";

export async function GET(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (!session) return json({ connected:false });
    const account = (await db.account(session))?.[0];
    return json(account ? { connected:true, account } : { connected:false });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
