// ============================================================
// verify-2fa — Supabase Edge Function
//
// WHY THIS EXISTS:
// The TOTP secret must never be sent back into the browser once it's been
// saved — if it were, anyone who obtained the admin password could fetch the
// secret themselves and compute valid codes without ever touching the real
// admin's phone, which defeats the point of 2FA. This function checks the
// code server-side (using the service-role key, which never leaves Supabase)
// and only ever returns true/false to the browser.
//
// HOW TO DEPLOY (no CLI needed):
// 1. Supabase Dashboard → Edge Functions → "Deploy a new function" → "Via Editor"
// 2. Name it exactly: verify-2fa
// 3. Paste this entire file in, replacing the template content
// 4. Click Deploy
// 5. Do this BEFORE logging in as admin for the first time after this update,
//    since every login after initial setup depends on this function existing.
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- TOTP (RFC 6238) — identical algorithm to the client, Deno also has Web Crypto ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) {
    const v = B32.indexOf(c);
    if (v !== -1) bits += v.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return new Uint8Array(bytes);
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, msg));
}

function counterBytes(num: number) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, num);
  return new Uint8Array(buf);
}

async function totpAt(secret: string, step: number) {
  const hmac = await hmacSha1(base32Decode(secret), counterBytes(step));
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

async function verifyTotp(secret: string, code: string) {
  const clean = (code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -1; w <= 1; w++) {
    if ((await totpAt(secret, step + w)) === clean) return true;
  }
  return false;
}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ valid: false, error: "Missing auth" }), { status: 401, headers: cors });
    }

    // Confirms the caller already passed step 1 (correct password) — this
    // function only ever runs the second-factor check on top of that.
    const userClient = createClient(SUPA_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid session" }), { status: 401, headers: cors });
    }
    const uid = userData.user.id;

    // Service-role client — the only place the 2FA secret is ever read.
    const admin = createClient(SUPA_URL, SERVICE_KEY);
    const { data: row, error: rowErr } = await admin.from("admin_2fa").select("*").eq("id", uid).single();
    if (rowErr || !row || !row.enabled) {
      return new Response(JSON.stringify({ valid: false, error: "2FA not set up" }), { status: 400, headers: cors });
    }

    const body = await req.json();

    if (body.code) {
      const ok = await verifyTotp(row.secret, body.code);
      return new Response(JSON.stringify({ valid: ok, error: ok ? undefined : "Incorrect code. Please try again." }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (body.backupCode) {
      const hash = await sha256Hex(String(body.backupCode).replace(/[\s-]/g, "").toUpperCase());
      const codes = row.backup_codes || [];
      const idx = codes.findIndex((c: any) => c.hash === hash && !c.used);
      if (idx === -1) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid or already-used backup code" }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      codes[idx].used = true;
      await admin.from("admin_2fa").update({ backup_codes: codes }).eq("id", uid);
      const remaining = codes.filter((c: any) => !c.used).length;
      return new Response(JSON.stringify({ valid: true, remaining }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: false, error: "No code provided" }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), { status: 500, headers: cors });
  }
});
