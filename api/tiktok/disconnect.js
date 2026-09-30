import { db } from "../../lib/supabase.js";
import { parseCookies, clearCookie, json } from "../../lib/security.js";

export async function POST(request) {
  try {
    const session = parseCookies(request).flowbot_session;
    if (session) await db.remove(session);
    return json({ connected:false }, 200, { "Set-Cookie":clearCookie("flowbot_session") });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
