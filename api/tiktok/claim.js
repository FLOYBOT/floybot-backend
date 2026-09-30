import { db } from "../../lib/supabase.js";
import { sha256, parseCookies, json } from "../../lib/security.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code : "";
    const session = parseCookies(request).flowbot_session;
    if (!code || !session) return json({ error:"Invalid handoff" }, 401);
    const rows = await db.claim(sha256(code));
    if (!rows?.[0] || rows[0].session_id !== session) return json({ error:"Invalid or expired handoff" }, 401);
    const account = (await db.account(session))?.[0];
    if (!account) return json({ error:"TikTok account not found" }, 404);
    return json({ connected:true, account });
  } catch (e) {
    return json({ error:e.message }, 500);
  }
}
