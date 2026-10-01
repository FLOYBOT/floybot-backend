import { db } from "../../lib/supabase.js";
import { env, json } from "../../lib/security.js";
import { refreshAccount } from "../tiktok/refresh.js";

export async function GET(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    if (auth !== "Bearer " + env("CRON_SECRET")) {
      return json({ error:"Unauthorized" }, 401);
    }

    const rows = await db.refreshableAccounts();
    const cutoff = Date.now() + 2 * 60 * 60 * 1000;
    const due = rows.filter(row => {
      const expiresAt = Date.parse(row.access_token_expires_at || "");
      return Number.isFinite(expiresAt) && expiresAt <= cutoff;
    });

    const results = [];
    for (const row of due) {
      try {
        results.push({ ...(await refreshAccount(row)), ok:true });
      } catch (e) {
        results.push({ session_id:row.session_id, ok:false, error:e?.message || String(e) });
      }
    }

    return json({
      ok:true,
      checked:rows.length,
      refreshed:results.filter(x => x.ok).length,
      failed:results.filter(x => !x.ok).length
    });
  } catch (e) {
    return json({ error:e?.message || String(e) }, 500);
  }
}
