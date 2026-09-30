import { env } from "./security.js";

async function request(path, options = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(env("SUPABASE_URL").replace(/\/$/, "") + "/rest/v1/" + path, {
    ...options,
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error("Supabase " + response.status + ": " + (data?.message || text));
  return data;
}
export const db = {
  account: session => request("tiktok_accounts?select=open_id,display_name,avatar_url,scope,access_token_expires_at,refresh_token_expires_at&session_id=eq." + encodeURIComponent(session) + "&limit=1"),
  accountSecrets: session => request("tiktok_accounts?select=access_token_enc,refresh_token_enc,refresh_token_expires_at&session_id=eq." + encodeURIComponent(session) + "&limit=1"),
  upsert: row => request("tiktok_accounts?on_conflict=session_id", { method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(row) }),
  remove: session => request("tiktok_accounts?session_id=eq." + encodeURIComponent(session), { method:"DELETE" }),
  handoff: row => request("oauth_handoffs", { method:"POST", headers:{Prefer:"return=minimal"}, body:JSON.stringify(row) }),
  claim: hash => request("oauth_handoffs?code_hash=eq." + encodeURIComponent(hash) + "&used_at=is.null&expires_at=gt." + encodeURIComponent(new Date().toISOString()), { method:"PATCH", headers:{Prefer:"return=representation"}, body:JSON.stringify({used_at:new Date().toISOString()}) })
};
