import { db } from "../../lib/supabase.js";
import { sha256, parseCookies, json, cookie } from "../../lib/security.js";

const cors = {
  "Access-Control-Allow-Origin": "https://floybot.github.io",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code : "";
    if (!code) return json({ error:"Invalid handoff" }, 401);

    const rows = await db.claim(sha256(code));
    if (!rows?.[0]) return json({ error:"Invalid or expired handoff" }, 401);

    const session = rows[0].session_id;
    const account = (await db.account(session))?.[0];
    if (!account) return json({ error:"TikTok account not found" }, 404);

    return json(
      { connected:true, account, session },
      200,
      { ...cors, "Set-Cookie": cookie("flowbot_session", session, 2592000) }
    );
  } catch (e) {
    return json({ error:e.message }, 500, cors);
  }
}
