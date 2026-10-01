import { db } from "../../lib/supabase.js";
import { parseCookies, json } from "../../lib/security.js";

const cors = {
  "Access-Control-Allow-Origin": "https://floybot.github.io",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
  "Cache-Control": "no-store"
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const session = bearer || parseCookies(request).flowbot_session;

    if (!session) return json({ connected:false }, 200, cors);

    const account = (await db.account(session))?.[0];
    return json(account ? { connected:true, account } : { connected:false }, 200, cors);
  } catch (e) {
    return json({ error:e.message }, 500, cors);
  }
}
