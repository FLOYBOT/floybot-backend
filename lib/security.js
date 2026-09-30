import crypto from "node:crypto";

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error("Missing environment variable: " + name);
  return value;
}
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
export function hmac(value) {
  return crypto.createHmac("sha256", env("TOKEN_ENCRYPTION_KEY")).update(value).digest("base64url");
}
export function safeEqual(a, b) {
  const aa = Buffer.from(String(a)), bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export function encrypt(value) {
  const key = Buffer.from(env("TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(x => x.toString("base64url")).join(".");
}
export function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(raw.split(";").filter(Boolean).map(part => {
    const i = part.indexOf("=");
    return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())];
  }));
}
export function cookie(name, value, maxAge = 0) {
  return name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAge + "; Path=/; HttpOnly; Secure; SameSite=None";
}
export function clearCookie(name) { return cookie(name, "", 0); }
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...extra } });
}
export function redirect(url, extra = {}) {
  return new Response(null, { status: 302, headers: { Location: url, ...extra } });
}
