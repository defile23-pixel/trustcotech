/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("App crashed:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0D1020", color: "#fff", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 24, marginBottom: 12, color: "#C9A84C" }}>Something went wrong</h2>
          <p style={{ color: "#6B7290", fontSize: 14, marginBottom: 8, maxWidth: 320 }}>Error details (send this to admin):</p>
          <p style={{ color: "#FF4D6A", fontSize: 12, fontFamily: "monospace", maxWidth: 360, wordBreak: "break-all", background: "rgba(255,77,106,0.1)", padding: 12, borderRadius: 8 }}>{String(this.state.error)}</p>
          <button onClick={() => { try { localStorage.clear(); } catch(e) {} window.location.reload(); }} style={{ marginTop: 24, padding: "12px 28px", background: "#C9A84C", border: "none", borderRadius: 10, color: "#0D1020", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Refresh Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPA_URL = "https://fxrvbmdpyvhpmcbimwdp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cnZibWRweXZocG1jYmltd2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MjQxMDYsImV4cCI6MjA5NzUwMDEwNn0.6uaYV9-ODVVSlIQwCIZWoY_zUrzG-tTSzHQgoObTF6w";

// Supabase API helper
const supa = async (path, method = "GET", body = null, token = null) => {
  const headers = {
    "Content-Type": "application/json",
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${token || SUPA_KEY}`,
    "Prefer": method === "POST" ? "return=representation" : "",
  };
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || "Request failed");
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Auth helper
const supaAuth = async (endpoint, body) => {
  const res = await fetch(`${SUPA_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  // Supabase auth returns errors in several shapes depending on version/endpoint:
  // { error, error_description }, { msg }, { message }, or non-2xx with { code }
  const rawError = data.error || data.msg || data.message || (!res.ok ? "Request failed" : null);
  if (rawError) {
    const rawMsg = data.error_description || data.msg || data.message || data.error || rawError;
    // Map internal / cryptic Supabase messages to user-friendly ones
    const friendlyMsg = /invalid.*credentials|invalid email or password/i.test(rawMsg)
      ? "Incorrect email or password. Please try again."
      : /string did not match|expected pattern/i.test(rawMsg)
      ? "Incorrect email or password. Please try again."
      : /email.*not.*confirm/i.test(rawMsg)
      ? "Please confirm your email before signing in."
      : /too many requests/i.test(rawMsg)
      ? "Too many attempts. Please wait a moment and try again."
      : /user.*not.*found/i.test(rawMsg)
      ? "No account found with that email."
      : rawMsg;
    throw new Error(friendlyMsg);
  }
  return data;
};

// Updates the password of whoever the given access_token belongs to.
// Used by the "Reset Password" page after a user clicks the link in their
// password-recovery email (which lands back here with a token in the URL).
const supaUpdatePassword = async (accessToken, password) => {
  const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (data.error || data.error_description) throw new Error(data.error_description || data.msg || data.error);
  return data;
};

// ============================================================
// DEVICE DETECTION
// ============================================================
const detectDevice = () => {
  const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
  let brand = "Unknown", model = "Unknown Device", os = "Unknown OS", osVersion = "", browser = "Unknown Browser";
  const t = (r) => new RegExp(r).test(ua);
  const m = (r) => ua.match(new RegExp(r));
  if (t("iPhone")) {
    brand = "Apple"; os = "iOS";
    const iv = m("OS (\\d+_\\d+)"); if (iv) osVersion = iv[1].replace("_",".");
    const px = typeof screen !== "undefined" ? Math.max(screen.width, screen.height) : 812;
    if (px >= 932) model = "iPhone 15 Pro Max";
    else if (px >= 926) model = "iPhone 13 Pro Max";
    else if (px >= 896) model = "iPhone 11";
    else if (px >= 844) model = "iPhone 14";
    else if (px >= 812) model = "iPhone 12 mini";
    else if (px >= 736) model = "iPhone 8 Plus";
    else if (px >= 667) model = "iPhone SE";
    else model = "iPhone";
  } else if (t("iPad")) {
    brand = "Apple"; os = "iPadOS"; model = "iPad";
    const iv = m("OS (\\d+_\\d+)"); if (iv) osVersion = iv[1].replace("_",".");
  } else if (t("Android")) {
    os = "Android";
    const av = m("Android (\\d+\\.?\\d*)"); if (av) osVersion = av[1];
    if (t("Samsung|SM-")) { brand = "Samsung"; const sm = m("SM-[A-Z0-9]+"); model = sm ? sm[0] : "Samsung Galaxy"; }
    else if (t("Pixel")) { brand = "Google"; const px = m("Pixel \\d+"); model = px ? px[0] : "Google Pixel"; }
    else if (t("Huawei|HUAWEI")) { brand = "Huawei"; model = "Huawei Device"; }
    else if (t("OnePlus")) { brand = "OnePlus"; model = "OnePlus Device"; }
    else if (t("Xiaomi|Redmi")) { brand = "Xiaomi"; model = "Xiaomi Device"; }
    else { brand = "Android"; model = "Android Phone"; }
  } else if (t("Macintosh|MacIntel")) { brand = "Apple"; os = "macOS"; model = "Mac"; }
  else if (t("Windows")) { brand = "Microsoft"; os = "Windows"; model = "PC"; }
  if (t("CriOS")) browser = "Chrome (iOS)";
  else if (t("FxiOS")) browser = "Firefox (iOS)";
  else if (t("EdgiOS")) browser = "Edge (iOS)";
  else if (t("Safari") && !t("Chrome")) browser = "Safari";
  else if (t("Chrome")) browser = "Chrome";
  else if (t("Firefox")) browser = "Firefox";
  else if (t("Edge")) browser = "Edge";
  return { brand, model, os, osVersion: osVersion ? os + " " + osVersion : os, browser };
};

// ============================================================
// NOTIFICATIONS HELPER
// ============================================================
const createNotification = async (userId, adminToken, type, message) => {
  try { await supa("notifications", "POST", { user_id: userId, type, message, read: false }, adminToken); } catch(e) {}
};

// ============================================================
// RESEND EMAIL SERVICE
// Emails are now sent through our own /api/send-email serverless
// function (runs on Vercel's server), which keeps the Resend API
// key private. The browser never sees the key.
// ============================================================
const resendEmail = async ({ to, subject, html }) => {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Email send error:", err);
    }
  } catch (e) { console.error("Email send failed:", e); }
};

const emailTemplates = {
  welcome: (name) => ({
    subject: "Welcome to TrustCo Tech 🎉",
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1020;color:#EDF0F7;padding:32px;border-radius:12px">
      <h1 style="color:#C9A84C;font-size:24px;margin-bottom:8px">Welcome, ${name}! 🔐</h1>
      <p style="color:#A8B0C2;line-height:1.7">Your TrustCo Tech account has been created successfully. You're one step away from syncing your devices.</p>
      <p style="color:#A8B0C2;line-height:1.7">To get started, log in to your dashboard and follow the steps to connect your second device.</p>
      <div style="margin-top:24px;padding:16px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:8px">
        <p style="color:#C9A84C;font-size:13px;margin:0">💡 Need help? Contact our admin on <a href="${FB_URL}" style="color:#C9A84C">Facebook</a>.</p>
      </div>
      <p style="color:#6B7290;font-size:11px;margin-top:24px">© TrustCo Tech · All rights reserved</p>
    </div>`,
  }),

  paymentConfirmation: (name, plan, amount, method) => ({
    subject: `Payment Received — ${plan} Plan`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1020;color:#EDF0F7;padding:32px;border-radius:12px">
      <h1 style="color:#C9A84C;font-size:24px;margin-bottom:8px">Payment Received 💳</h1>
      <p style="color:#A8B0C2;line-height:1.7">Hi ${name}, we've received your payment and it's currently being verified by our admin.</p>
      <div style="margin:20px 0;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px">
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">📦 Plan: <strong style="color:#EDF0F7">${plan}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">💰 Amount: <strong style="color:#C9A84C">$${amount}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">💳 Method: <strong style="color:#EDF0F7">${method}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">⏱ Activation: <strong style="color:#EDF0F7">Within 1–3 hours</strong></p>
      </div>
      <p style="color:#A8B0C2;line-height:1.7">You'll receive another email once your plan is activated and your Partner ID is ready.</p>
      <p style="color:#6B7290;font-size:11px;margin-top:24px">© TrustCo Tech · All rights reserved</p>
    </div>`,
  }),

  adminNewPayment: (userName, userEmail, plan, amount, method) => ({
    subject: `🔔 New Payment — ${userName} (${plan})`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1020;color:#EDF0F7;padding:32px;border-radius:12px">
      <h1 style="color:#C9A84C;font-size:22px;margin-bottom:8px">New Payment Submitted</h1>
      <div style="margin:20px 0;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px">
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">👤 User: <strong style="color:#EDF0F7">${userName}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">📧 Email: <strong style="color:#EDF0F7">${userEmail}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">📦 Plan: <strong style="color:#EDF0F7">${plan}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">💰 Amount: <strong style="color:#C9A84C">$${amount}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#A8B0C2">💳 Method: <strong style="color:#EDF0F7">${method}</strong></p>
      </div>
      <p style="color:#A8B0C2;line-height:1.7">Log in to your admin dashboard to verify and activate this user.</p>
      <p style="color:#6B7290;font-size:11px;margin-top:24px">© TrustCo Tech Admin Alerts</p>
    </div>`,
  }),

  partnerIdIssued: (name, partnerId) => ({
    subject: `Your Partner ID is Ready — ${partnerId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1020;color:#EDF0F7;padding:32px;border-radius:12px">
      <h1 style="color:#C9A84C;font-size:24px;margin-bottom:8px">Your Partner ID is Ready 🔑</h1>
      <p style="color:#A8B0C2;line-height:1.7">Hi ${name}, your unique Partner ID has been issued by our admin.</p>
      <div style="margin:20px 0;padding:20px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:8px;text-align:center">
        <p style="color:#C9A84C;font-size:11px;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">Your Partner ID</p>
        <p style="color:#EDF0F7;font-size:28px;font-weight:700;letter-spacing:.15em;margin:0">${partnerId}</p>
      </div>
      <p style="color:#A8B0C2;line-height:1.7">Log in to your dashboard, go to <strong>Connect Device</strong>, and enter this ID to link your second device.</p>
      <p style="color:#FF4D6A;font-size:13px;">🔒 Keep this ID private. Do not share it with anyone.</p>
      <p style="color:#6B7290;font-size:11px;margin-top:24px">© TrustCo Tech · All rights reserved</p>
    </div>`,
  }),

  activation: (name, plan) => ({
    subject: `🎉 Your ${plan} Plan is Now Active!`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D1020;color:#EDF0F7;padding:32px;border-radius:12px">
      <h1 style="color:#00C878;font-size:24px;margin-bottom:8px">Plan Activated! ⚡</h1>
      <p style="color:#A8B0C2;line-height:1.7">Hi ${name}, your <strong style="color:#C9A84C">${plan}</strong> plan has been activated. You now have full access to all TrustCo Tech features.</p>
      <div style="margin:20px 0;padding:16px;background:rgba(0,200,120,0.06);border:1px solid rgba(0,200,120,0.2);border-radius:8px">
        <p style="color:#00C878;font-size:13px;margin:0">✓ All 9 data streams unlocked · Calls · SMS · WhatsApp · Instagram · Facebook · Photos · Location · Contacts</p>
      </div>
      <p style="color:#A8B0C2;line-height:1.7">Log in to your dashboard to start syncing your devices right now.</p>
      <p style="color:#6B7290;font-size:11px;margin-top:24px">© TrustCo Tech · All rights reserved</p>
    </div>`,
  }),
};

// Legacy wrapper kept so existing sendEmail() calls in admin still work
const sendEmail = async (userId, type, detail, adminToken, extra = "") => {};

// Convert payment proof to base64 data URL (no Storage bucket required)
const uploadPaymentProof = async (file, userId, token) => {
  if (file.size > 5 * 1024 * 1024) throw new Error("File too large. Please upload an image under 5MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file. Please try again."));
    reader.readAsDataURL(file);
  });
};

// ============================================================
// NOTIFICATION BELL (user dashboard)
// ============================================================
// Empty state illustration for sub-tabs
const EmptyState = ({ icon, title, subtitle, color = "#C9A84C" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
    <div style={{ position: "relative", marginBottom: 20 }}>
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg,${color}18,${color}06)`, border: `1.5px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>
        {icon}
      </div>
      <div style={{ position: "absolute", bottom: -4, right: -4, width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>📡</div>
    </div>
    <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, color: "#EDF0F7", marginBottom: 8 }}>{title}</h3>
    <p style={{ fontSize: 12.5, color: "#6B7290", lineHeight: 1.65, maxWidth: 260 }}>{subtitle}</p>
    <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 1 ? color : "rgba(255,255,255,0.08)", animation: `pulse ${0.8 + i * 0.3}s ease-in-out infinite alternate` }} />)}
    </div>
  </div>
);

const NotifBell = ({ userId, token }) => {
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const load = async () => {
    try { const n = await supa(`notifications?user_id=eq.${userId}&order=created_at.desc&limit=20`, "GET", null, token); setNotifs(n || []); } catch(e) {}
  };
  const markAllRead = async () => {
    try { await supa(`notifications?user_id=eq.${userId}&read=eq.false`, "PATCH", { read: true }, token); setNotifs(p => p.map(n => ({ ...n, read: true }))); } catch(e) {}
  };
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);
  const unread = notifs.filter(n => !n.read).length;
  const typeIcon = t => t === "activation" ? "⚡" : t === "partner_id" ? "🔑" : t === "ticket_reply" ? "💬" : t === "payment" ? "💳" : "🔔";

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => { setOpen(p => !p); if (!open && unread > 0) markAllRead(); }}
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "7px 10px", cursor: "pointer", color: unread > 0 ? "#C9A84C" : "#6B7290", position: "relative", display: "flex", alignItems: "center", gap: 5 }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "#FF4D6A", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div style={{ position: "fixed", right: 12, top: 64, width: "min(300px, calc(100vw - 24px))", background: "#161929", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, zIndex: 99999, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontWeight: 700, fontSize: 13 }}>Notifications</p>
            <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#C9A84C", fontSize: 11, cursor: "pointer" }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {notifs.length === 0 ? <p style={{ padding: "20px 16px", color: "#6B7290", fontSize: 13, textAlign: "center" }}>No notifications yet</p> : notifs.map((n, i) => (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: n.read ? "transparent" : "rgba(201,168,76,0.04)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcon(n.type)}</span>
                <div style={{ flex: 1 }}><p style={{ fontSize: 12, color: n.read ? "#A8B0C2" : "#E8EAF0", lineHeight: 1.5 }}>{n.message}</p><p style={{ fontSize: 10, color: "#6B7290", marginTop: 3 }}>{new Date(n.created_at).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
                {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Calls the verify-2fa Edge Function (deployed separately — see setup notes).
// Verification happens server-side with the service-role key so the TOTP
// secret never has to be sent back into the browser on a normal login;
// only password-auth + a correct code from the physical authenticator app
// can pass this check.
const supaVerify2FA = async (token, payload) => {
  const res = await fetch(`${SUPA_URL}/functions/v1/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`verify-2fa service returned ${res.status} — is the Edge Function deployed?`);
  return res.json();
};

// ============================================================
// TOTP (RFC 6238) — two-factor login for the admin account.
// Implemented with the Web Crypto API only, no external library, so any
// standard authenticator app (Google Authenticator, Authy, 1Password, etc.)
// can generate matching codes from the secret we hand it at enrollment.
// ============================================================
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
  let bits = "", out = "";
  for (let i = 0; i < bytes.length; i++) bits += bytes[i].toString(2).padStart(8, "0");
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32_ALPHABET[parseInt(bits.substr(i, 5), 2)];
  return out;
}

function base32Decode(str) {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) { const v = B32_ALPHABET.indexOf(c); if (v !== -1) bits += v.toString(2).padStart(5, "0"); }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  return new Uint8Array(bytes);
}

function generateTotpSecret() {
  const bytes = new Uint8Array(20); // 160-bit secret — standard TOTP size
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

function genBackupCodes(n = 8) {
  const codes = [];
  for (let i = 0; i < n; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    codes.push(base32Encode(bytes).slice(0, 8).match(/.{1,4}/g).join("-"));
  }
  return codes;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, msgBytes));
}

function counterToBytes(num) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setUint32(4, num); // counter fits in the low 32 bits for many decades to come
  return new Uint8Array(buf);
}

async function totpAt(secretB32, timeStep) {
  const hmac = await hmacSha1(base32Decode(secretB32), counterToBytes(timeStep));
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

// Checks the code against a ±1 step (±30s) window to tolerate clock drift.
async function verifyTotp(secretB32, code) {
  const clean = (code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -1; w <= 1; w++) { if (await totpAt(secretB32, step + w) === clean) return true; }
  return false;
}

// ============================================================
// CONSTANTS
// ============================================================
const GOLD="#C9A84C",SILVER="#C0C7D4",DARK="#080C18",MUTED="#7A849A",TEXT="#EDF0F7";

// ============================================================
// SECURITY UTILITIES
// ============================================================

// 1. INPUT SANITIZATION — strips HTML tags and dangerous characters
const sanitize = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "")                          // block HTML tags
    .replace(/javascript:/gi, "")                  // block JS injection
    .trim()
    .slice(0, 500);                                // max length cap
};

// Sanitize for non-auth fields only (names, messages) - strips more chars
const sanitizeStrict = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/['"`;]/g, "")
    .trim()
    .slice(0, 500);
};

// 2. RATE LIMITER — in-memory, resets on page reload
// Tracks attempts per key (email/action). Blocks after MAX_ATTEMPTS.
const _rateLimiter = {};
const RATE_LIMIT_MAX  = 5;   // max attempts
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes window

const checkRateLimit = (key) => {
  const now = Date.now();
  if (!_rateLimiter[key]) _rateLimiter[key] = { count: 0, firstAt: now, blockedUntil: 0 };
  const entry = _rateLimiter[key];
  // Still blocked?
  if (entry.blockedUntil > now) {
    const mins = Math.ceil((entry.blockedUntil - now) / 60000);
    throw new Error(`Too many attempts. Please wait ${mins} minute${mins > 1 ? "s" : ""} before trying again.`);
  }
  // Reset window if expired
  if (now - entry.firstAt > RATE_LIMIT_WINDOW) {
    _rateLimiter[key] = { count: 1, firstAt: now, blockedUntil: 0 };
    return;
  }
  entry.count++;
  if (entry.count >= RATE_LIMIT_MAX) {
    entry.blockedUntil = now + RATE_LIMIT_WINDOW;
    throw new Error(`Too many attempts. You are locked out for 15 minutes.`);
  }
};

const clearRateLimit = (key) => { delete _rateLimiter[key]; };

// 3. AUTO-BAN — flag account in Supabase after repeated failed logins
const _failedLogins = {};
const MAX_FAILED_LOGINS = 5;

const trackFailedLogin = async (email) => {
  if (!email) return;
  const key = email.toLowerCase();
  _failedLogins[key] = (_failedLogins[key] || 0) + 1;
  if (_failedLogins[key] >= MAX_FAILED_LOGINS) {
    try {
      await supa(`profiles?email=eq.${encodeURIComponent(key)}`, "PATCH", { banned: true });
    } catch(e) {}
  }
};

const resetFailedLogins = (email) => {
  if (email) delete _failedLogins[email.toLowerCase()];
};
const FB_URL="https://www.facebook.com/profile.php?id=61588536275390&mibextid=wwXIfr";
const WA_URL_DEFAULT="https://wa.me/1234567890";
const ADMIN_EMAIL="omeizaidris23@gmail.com";

// ============================================================
// SQL SCHEMA (run once in Supabase SQL editor)
// ============================================================
/*
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free',
  activated BOOLEAN DEFAULT false,
  partner_id TEXT UNIQUE,
  partner_id_revealed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  deletion_requested BOOLEAN DEFAULT FALSE,
  deletion_requested_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_status TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner IDs table
CREATE TABLE partner_ids (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  verified BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan TEXT,
  amount INTEGER,
  method TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposits / payment submissions
CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  plan TEXT,
  amount INTEGER,
  method TEXT,
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access deposits" ON deposits FOR ALL USING (true);

-- Support tickets
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Two-factor auth (TOTP) for the admin account only. One row, keyed to the
-- admin's own auth.users id; RLS ensures nobody else can ever read or write it.
CREATE TABLE admin_2fa (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  backup_codes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_2fa ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Anyone can read approved reviews" ON reviews FOR SELECT USING (approved = true);
CREATE POLICY "Anyone can insert reviews" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "Service role full access payments" ON payments FOR ALL USING (true);
CREATE POLICY "Service role full access tickets" ON tickets FOR ALL USING (true);
CREATE POLICY "Service role full access partner_ids" ON partner_ids FOR ALL USING (true);
CREATE POLICY "Admin can manage own 2fa row" ON admin_2fa FOR ALL USING (auth.uid() = id);

-- Initial partner IDs
INSERT INTO partner_ids (code) VALUES
('TC-100-001'),('TC-100-002'),('TC-100-003'),
('TC-200-001'),('TC-200-002'),('TC-300-001'),
('TC-300-002'),('TC-400-001'),('TC-500-001'),('TC-500-002');
*/

// ============================================================
// STYLES
// ============================================================
const Styles = () => (<style>{`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
html{background:#080C18 !important;}
body{background:#080C18 !important;color:#EDF0F7;font-family:'Inter',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
#root{background:#080C18 !important;min-height:100vh;}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:#080C18;}::-webkit-scrollbar-thumb{background:#C9A84C44;border-radius:3px;}
.raj{font-family:'Rajdhani',sans-serif;}.mono{font-family:'JetBrains Mono',monospace;}
.glass{background:rgba(20,24,40,0.85);backdrop-filter:blur(24px);border:1px solid rgba(201,168,76,0.18);border-radius:16px;}
.glass-gold{background:rgba(201,168,76,0.06);backdrop-filter:blur(20px);border:1px solid rgba(201,168,76,0.3);border-radius:16px;}
.glow-gold{box-shadow:0 0 40px rgba(201,168,76,0.2),0 0 80px rgba(201,168,76,0.06);}
.grad-gold{background:linear-gradient(135deg,#C9A84C,#F0D080,#C9A84C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.grad-silver{background:linear-gradient(135deg,#A8B0C2,#EDF0F7,#A8B0C2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.shimmer{background:linear-gradient(90deg,#C9A84C,#F0D080,#C9A84C);background-size:200%;animation:shimmer 2s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.btn-gold{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;background:linear-gradient(135deg,#9A7B2F,#C9A84C,#F0D080,#C9A84C);background-size:200%;color:#080C18;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;border:none;border-radius:10px;cursor:pointer;transition:all .3s;white-space:nowrap;letter-spacing:.05em;}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 10px 35px rgba(201,168,76,0.4);}
.btn-gold:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.btn-out{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;background:transparent;color:#EDF0F7;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:15px;border:1px solid rgba(201,168,76,0.35);border-radius:10px;cursor:pointer;transition:all .3s;white-space:nowrap;}
.btn-out:hover{border-color:#C9A84C;background:rgba(201,168,76,0.08);transform:translateY(-2px);}
.btn-red{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,77,106,0.1);color:#FF4D6A;border:1px solid rgba(255,77,106,0.25);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:all .2s;}
.btn-red:hover{background:rgba(255,77,106,0.2);}
.btn-green{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(0,200,120,0.1);color:#00C878;border:1px solid rgba(0,200,120,0.25);border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:all .2s;}
.btn-green:hover{background:rgba(0,200,120,0.2);}
.btn-tab{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,255,255,0.04);color:#7A849A;font-size:12px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;font-weight:500;white-space:nowrap;}
.btn-tab:hover{color:#EDF0F7;border-color:rgba(201,168,76,0.3);}
.btn-tab.active{background:rgba(201,168,76,0.12);color:#C9A84C;border-color:rgba(201,168,76,0.4);}
.inp{width:100%;padding:12px 15px;background:rgba(255,255,255,0.04);border:1px solid rgba(201,168,76,0.2);border-radius:10px;color:#EDF0F7;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:all .2s;}
.inp:focus{border-color:#C9A84C;background:rgba(201,168,76,0.06);}
.inp::placeholder{color:#4A5270;}
.pid{width:100%;padding:16px 18px;background:rgba(201,168,76,0.05);border:2px solid rgba(201,168,76,0.25);border-radius:14px;color:#C9A84C;font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:500;outline:none;transition:all .3s;text-align:center;letter-spacing:8px;}
.pid:focus{border-color:#C9A84C;box-shadow:0 0 0 4px rgba(201,168,76,0.1);}
.pid::placeholder{color:#2A3050;letter-spacing:4px;font-size:16px;}
.pid.err{border-color:#FF4D6A;color:#FF4D6A;box-shadow:0 0 0 4px rgba(255,77,106,0.1);}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
.tg{background:rgba(201,168,76,0.12);color:#C9A84C;border:1px solid rgba(201,168,76,0.3);}
.tgg{background:rgba(0,200,120,0.1);color:#00C878;border:1px solid rgba(0,200,120,0.25);}
.tgb{background:rgba(50,130,255,0.1);color:#3282FF;border:1px solid rgba(50,130,255,0.25);}
.tgr{background:rgba(255,77,106,0.1);color:#FF4D6A;border:1px solid rgba(255,77,106,0.25);}
.tgs{background:rgba(192,199,212,0.1);color:#C0C7D4;border:1px solid rgba(192,199,212,0.25);}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.on{background:#00C878;box-shadow:0 0 8px #00C878;}.off{background:#FF4D6A;}
.nl{color:#7A849A;font-size:14px;font-weight:500;cursor:pointer;transition:color .2s;background:none;border:none;font-family:'Inter',sans-serif;}
.nl:hover,.nl.active{color:#C9A84C;}
.sb{width:240px;min-height:100vh;background:#0D1020;border-right:1px solid rgba(201,168,76,0.1);padding:20px 0;flex-shrink:0;}
.sl{display:flex;align-items:center;gap:12px;padding:12px 20px;color:#7A849A;cursor:pointer;font-size:14px;font-weight:500;border:none;background:none;width:100%;text-align:left;border-left:3px solid transparent;transition:all .2s;font-family:'Inter',sans-serif;}
.sl:hover{color:#EDF0F7;background:rgba(255,255,255,0.03);}
.sl.active{color:#C9A84C;background:rgba(201,168,76,0.08);border-left-color:#C9A84C;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 14px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#7A849A;border-bottom:1px solid rgba(201,168,76,0.1);font-weight:600;}
.tbl td{padding:13px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);color:#A8B0C2;}
.tbl tr:hover td{background:rgba(201,168,76,0.03);}
.pb{height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;}
.pf{height:100%;border-radius:3px;background:linear-gradient(90deg,#9A7B2F,#C9A84C,#F0D080);transition:width .3s ease;}
.mo{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(14px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;}
.md{background:#0F1424;border:1px solid rgba(201,168,76,0.25);border-radius:22px;padding:36px;max-width:560px;width:100%;animation:sup .3s ease;margin:auto;}
.lo{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(8,12,24,0.94);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border-radius:inherit;z-index:10;}
.bub{padding:9px 13px;border-radius:16px;font-size:13px;max-width:82%;line-height:1.55;}
.bi{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.2);color:#EDF0F7;border-bottom-left-radius:4px;}
.bo{background:rgba(192,199,212,0.1);border:1px solid rgba(192,199,212,0.15);color:#EDF0F7;align-self:flex-end;border-bottom-right-radius:4px;}
.sr{position:relative;height:4px;background:rgba(201,168,76,0.08);border-radius:2px;overflow:hidden;margin:8px 0;}
.sp{position:absolute;width:40px;height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F0D080,transparent);border-radius:2px;animation:sm 1.6s linear infinite;}
.sp:nth-child(2){animation-delay:.53s;}.sp:nth-child(3){animation-delay:1.06s;}
.rc{background:rgba(20,24,40,0.9);border:1px solid rgba(201,168,76,0.15);border-radius:16px;padding:24px;transition:all .3s;}
.rc:hover{border-color:rgba(201,168,76,0.4);transform:translateY(-3px);}
.wb{background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:15px 17px;cursor:pointer;transition:all .2s;}
.wb:hover{background:rgba(201,168,76,0.1);border-color:rgba(201,168,76,0.4);}
.gc{border:2px solid rgba(201,168,76,0.15);border-radius:14px;padding:15px;cursor:pointer;transition:all .2s;background:rgba(255,255,255,0.02);}
.gc:hover{border-color:rgba(201,168,76,0.4);}.gc.sel{border-color:#C9A84C;background:rgba(201,168,76,0.1);}
.pc{border:2px solid rgba(201,168,76,0.15);border-radius:16px;padding:18px;cursor:pointer;transition:all .25s;background:rgba(255,255,255,0.02);}
.pc:hover{border-color:rgba(201,168,76,0.4);}.pc.sel{border-color:#C9A84C;background:rgba(201,168,76,0.08);}
.c3d{transform-style:preserve-3d;transition:transform .3s ease;}
.c3d:hover{transform:perspective(800px) rotateX(3deg) rotateY(-3deg) translateY(-6px);}
.dv{height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);margin:24px 0;}
.sec{padding:90px 0;}.ct{max-width:1180px;margin:0 auto;padding:0 24px;}
.ew{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#C9A84C;margin-bottom:14px;}
.ew::before{content:'';display:block;width:18px;height:1px;background:linear-gradient(90deg,#C9A84C,transparent);}
.ew::after{content:'';display:block;width:18px;height:1px;background:linear-gradient(90deg,transparent,#C9A84C);}
.stars{color:#C9A84C;letter-spacing:2px;}
.drawer-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:900;}
.drawer{position:fixed;top:0;right:0;bottom:0;width:300px;background:#0D1020;border-left:1px solid rgba(201,168,76,0.2);z-index:901;padding:24px 0;overflow-y:auto;animation:slide-right .3s ease;}
.drawer-link{display:flex;align-items:center;gap:14px;padding:16px 28px;color:#A8B0C2;cursor:pointer;font-size:15px;font-weight:500;border:none;background:none;width:100%;text-align:left;transition:all .2s;border-left:3px solid transparent;}
.drawer-link:hover{color:#C9A84C;background:rgba(201,168,76,0.06);border-left-color:#C9A84C;}
.sub-tabs{display:flex!important;gap:8px;flex-wrap:wrap;margin-bottom:16px;padding:10px 12px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(201,168,76,0.1);overflow-x:auto;}
.stat-card{background:rgba(20,24,40,0.85);border:1px solid rgba(201,168,76,0.15);border-radius:14px;padding:22px;}
.notif{padding:12px 16px;border-radius:10px;border:1px solid rgba(201,168,76,0.15);background:rgba(201,168,76,0.04);margin-bottom:8px;font-size:13px;color:#A8B0C2;}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-13px);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes sup{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes marquee{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
@keyframes fade{from{opacity:0;}to{opacity:1;}}
@keyframes sm{0%{left:-15%;}100%{left:115%;}}
@keyframes ping{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.6);opacity:0;}}
@keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
@keyframes slide-right{from{transform:translateX(100%);}to{transform:translateX(0);}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-8px);}75%{transform:translateX(8px);}}
.af{animation:float 5s ease-in-out infinite;}
.ap{animation:pulse 2s ease-in-out infinite;}
.as{animation:spin 1.1s linear infinite;}
.au{animation:sup .5s ease both;}
.ad{animation:fade .4s ease both;}
.shake{animation:shake .4s ease;}
@media(max-width:768px){
  .sec{padding:48px 0;}
  .hm{display:none!important;}
  .tbl{font-size:11px;}
  .tbl th,.tbl td{padding:8px 8px;}
  .sub-tabs{padding:8px;gap:5px;flex-wrap:wrap;}
  .sub-tabs .btn-tab{font-size:11px;padding:5px 10px;}
  .btn-gold,.btn-out{font-size:13px;padding:11px 18px;}
  input.inp,textarea.inp,select.inp{font-size:14px;}
  .dash-layout{flex-direction:column!important;}
  .sb.mobile-nav{display:none!important;}
  .mobile-stream-bar{display:flex!important;}
  .main-scroll{padding-bottom:24px!important;}
}
@media(max-width:480px){
  .ct{padding:0 12px;}
  nav{padding:0 12px;}
}
@media(max-width:640px){
  .payments-table-wrap{display:none!important;}
  .payment-cards-mobile{display:flex!important;}
}
`}</style>);

// ============================================================
// LOGO
// ============================================================
const Logo = ({ sz = 36 }) => (
  <svg width={sz} height={sz} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#A8B0C2"/><stop offset="50%" stopColor="#EDF0F7"/><stop offset="100%" stopColor="#7A849A"/>
      </linearGradient>
      <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#9A7B2F"/><stop offset="50%" stopColor="#F0D080"/><stop offset="100%" stopColor="#C9A84C"/>
      </linearGradient>
    </defs>
    <rect x="10" y="15" width="50" height="10" rx="2" fill="url(#sg)"/>
    <rect x="28" y="15" width="12" height="70" rx="2" fill="url(#sg)"/>
    <path d="M90 28 Q90 18 80 18 L62 18 Q52 18 52 28 L52 72 Q52 82 62 82 L80 82 Q90 82 90 72 L90 62 Q90 56 84 56 L78 56 Q74 56 74 60 L74 68 Q74 72 70 72 L65 72 Q62 72 62 68 L62 32 Q62 28 65 28 L70 28 Q74 28 74 32 L74 40 Q74 44 78 44 L84 44 Q90 44 90 38 Z" fill="url(#gg)"/>
  </svg>
);

// ============================================================
// ICONS
// ============================================================
const Ic = ({ n, sz = 18, c = "currentColor", st }) => {
  const p = {
    phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12a19.79 19.79 0 0 1-2.07-8.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    msg: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    map: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    img: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    video: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    sync: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    device: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    whatsapp: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    instagram: <><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
    facebook: <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    refund: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    support: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    credit: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
    trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    ticket: <><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    snap: <><path d="M12 2C8 2 5 5 5 9c0 2.4.7 4 1.8 5.3-.2.5-.7 1.5-2.3 2 .5.7 2 1.2 3.5.7.3.4.7.8 1.2 1 .5.8 1.2 2 2.8 2s2.3-1.2 2.8-2c.5-.2.9-.6 1.2-1 1.5.5 3 0 3.5-.7-1.6-.5-2.1-1.5-2.3-2C18.3 13 19 11.4 19 9c0-4-3-7-7-7z"/></>,
    telegram: <><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></>,
    tiktok: <><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    "arrow-right": <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  };
  return (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={st}>{p[n]}</svg>);
};

// ============================================================
// PARTICLES
// ============================================================
const Particles = () => {
  const r = useRef(null), m = useRef({ x: 0, y: 0 }), f = useRef(null);
  useEffect(() => {
    const c = r.current; if (!c) return;
    const x = c.getContext("2d"); let pts = [];
    const rs = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight;
      pts = Array.from({ length: 60 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.4 + .4, g: Math.random() > .5 }));
    };
    const dr = () => {
      x.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > c.width) p.vx *= -1;
        if (p.y < 0 || p.y > c.height) p.vy *= -1;
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        x.fillStyle = p.g ? "rgba(201,168,76,0.5)" : "rgba(192,199,212,0.3)"; x.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 100) { x.beginPath(); x.moveTo(pts[i].x, pts[i].y); x.lineTo(pts[j].x, pts[j].y); x.strokeStyle = `rgba(201,168,76,${(1 - d / 100) * .12})`; x.lineWidth = .5; x.stroke(); }
        }
        const dm = Math.hypot(pts[i].x - m.current.x, pts[i].y - m.current.y);
        if (dm < 150) { x.beginPath(); x.moveTo(pts[i].x, pts[i].y); x.lineTo(m.current.x, m.current.y); x.strokeStyle = `rgba(201,168,76,${(1 - dm / 150) * .25})`; x.lineWidth = .8; x.stroke(); }
      }
      f.current = requestAnimationFrame(dr);
    };
    const om = e => { const rc = c.getBoundingClientRect(); m.current = { x: e.clientX - rc.left, y: e.clientY - rc.top }; };
    window.addEventListener("resize", rs); c.addEventListener("mousemove", om);
    rs(); dr();
    return () => { window.removeEventListener("resize", rs); c.removeEventListener("mousemove", om); cancelAnimationFrame(f.current); };
  }, []);
  return <canvas ref={r} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .5 }} />;
};

// ============================================================
// STARS
// ============================================================
const Stars = ({ v, onChange }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <button key={s} onClick={() => onChange && onChange(s)} style={{ background: "none", border: "none", cursor: onChange ? "pointer" : "default", fontSize: 20, color: s <= v ? GOLD : "#2A3050", transition: "color .15s" }}>★</button>
    ))}
  </div>
);

// ============================================================
// DRAWER
// ============================================================
const Drawer = ({ open, onClose, sp, user }) => {
  if (!open) return null;
  const items = [
    { label: "How It Works", icon: "info", page: "howitworks" },
    { label: "Pricing", icon: "zap", page: "pricing" },
    { label: "Reviews", icon: "star", page: "reviews" },
    { label: "Live Demo", icon: "eye", page: "demo" },
    { label: "About", icon: "shield", page: "about" },
    { label: "Refund Policy", icon: "refund", page: "refund" },
    { label: "Contact Support", icon: "support", fb: true },
  ];
  return (<>
    <div className="drawer-overlay" onClick={onClose} />
    <div className="drawer">
      <div style={{ padding: "20px 28px 24px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Logo sz={32} />
            <div><div className="raj" style={{ fontSize: 13, fontWeight: 700, color: SILVER, letterSpacing: ".1em", lineHeight: 1.1 }}>TRUSTCO</div><div className="raj" style={{ fontSize: 8, color: GOLD, letterSpacing: ".2em", lineHeight: 1 }}>— TECH —</div></div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><Ic n="x" sz={20} /></button>
        </div>
      </div>
      {items.map(item => (
        <button key={item.label} className="drawer-link" onClick={() => { if (item.fb) { window.open(FB_URL, "_blank"); } else { sp(item.page); } onClose(); }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}><Ic n={item.icon} sz={15} /></div>
          {item.label}
          {item.fb && <span className="tag tg" style={{ marginLeft: "auto", fontSize: 9 }}>Facebook</span>}
        </button>
      ))}
      <div style={{ padding: "24px 28px", marginTop: 16, borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        {user ? (<button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => { sp("dashboard"); onClose(); }}>Go to Dashboard</button>) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn-gold" style={{ justifyContent: "center" }} onClick={() => { sp("register"); onClose(); }}>Get Started</button>
            <button className="btn-out" style={{ justifyContent: "center" }} onClick={() => { sp("login"); onClose(); }}>Sign In</button>
          </div>
        )}
      </div>
    </div>
  </>);
};

// ============================================================
// NAVBAR
// ============================================================
const Nav = ({ pg, sp, user, su }) => {
  const [sc, setSc] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { const f = () => setSc(window.scrollY > 40); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);
  return (<>
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, background: sc ? "rgba(8,12,24,0.97)" : "transparent", backdropFilter: sc ? "blur(24px)" : "none", borderBottom: sc ? "1px solid rgba(201,168,76,0.12)" : "none", transition: "all .4s", padding: "0 24px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", height: 70, gap: 32 }}>
        <button onClick={() => sp("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
          <Logo sz={36} />
          <div><div className="raj" style={{ fontSize: 15, fontWeight: 700, color: SILVER, letterSpacing: ".1em", lineHeight: 1.1 }}>TRUSTCO</div><div className="raj" style={{ fontSize: 9, color: GOLD, letterSpacing: ".2em", lineHeight: 1 }}>— TECH —</div></div>
        </button>
        <div className="hm" style={{ display: "flex", gap: 26, flex: 1, justifyContent: "center" }}>
          {["home", "features", "pricing", "demo", "about"].map(n => (<button key={n} className={`nl${pg === n ? " active" : ""}`} onClick={() => sp(n)}>{n[0].toUpperCase() + n.slice(1)}</button>))}
        </div>
        <div style={{ display: "flex", gap: 12, marginLeft: "auto", alignItems: "center" }}>
          {user ? (<>
            <button className="btn-out" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => sp("dashboard")}>Dashboard</button>
            <button onClick={() => { su(null); sp("home"); }} style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "8px 13px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}><Ic n="logout" sz={13} />Out</button>
          </>) : (<>
            <button className="nl hm" onClick={() => sp("login")}>Sign in</button>
            <button className="btn-gold" style={{ padding: "9px 20px", fontSize: 14 }} onClick={() => sp("register")}>Get Started</button>
          </>)}
          <button onClick={() => setDrawer(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex" }}><Ic n="menu" sz={22} c={GOLD} /></button>
        </div>
      </div>
    </nav>
    <Drawer open={drawer} onClose={() => setDrawer(false)} sp={sp} user={user} />
  </>);
};

// ============================================================
// PAYMENT MODAL
// ============================================================
const PayModal = ({ onClose, onOk, user, token }) => {
  const [plan, setPlan] = useState(null);
  const [waUrl, setWaUrl] = useState(WA_URL_DEFAULT);
  const [fbUrl, setFbUrl] = useState(FB_URL);
  const [payCfg, setPayCfg] = useState(null); // admin-configured payment methods, null until loaded

  // Pull admin-configured WhatsApp/Facebook support links, and admin's
  // Payment Methods settings (enabled toggles, crypto address, gift card
  // types) so this modal stays in sync with Admin → Settings.
  useEffect(() => {
    const loadSupportLinks = async () => {
      try {
        const rows = await supa("site_settings?key=eq.site_content&select=value", "GET", null, token);
        if (rows?.[0]?.value) {
          const parsed = JSON.parse(rows[0].value);
          if (parsed.whatsapp_url) setWaUrl(parsed.whatsapp_url);
          if (parsed.facebook_url) setFbUrl(parsed.facebook_url);
        }
      } catch(e) {}
      try {
        const rows = await supa("site_settings?key=eq.payment_methods&select=value", "GET", null, token);
        if (rows?.[0]?.value) setPayCfg(JSON.parse(rows[0].value));
      } catch(e) {}
    };
    loadSupportLinks();
  }, []);

  const [meth, setMeth] = useState(null);
  const [gc, setGc] = useState(null);
  const [cp, setCp] = useState("");
  const [saving, setSaving] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofErr, setProofErr] = useState("");

  const plans = [
    { name: "3 Months", price: 79, period: "3-month licence", ft: ["All 9 data streams", "1 device", "Email support"] },
    { name: "6 Months", price: 100, period: "6-month licence", ft: ["All 9 data streams", "2 devices", "Email support"] },
    { name: "2 Years", price: 300, period: "2-year licence", best: true, ft: ["All 9 data streams", "Up to 5 devices", "Priority support", "Free updates"] }
  ];
  const gcs = (payCfg?.giftcard?.types?.length ? payCfg.giftcard.types : ["Razer Gold", "Steam", "Apple Gift Card"]).map(name => {
    const em = /razer/i.test(name) ? "🟢" : /steam/i.test(name) ? "🎮" : /apple/i.test(name) ? "🍎" : /amazon/i.test(name) ? "📦" : /itunes/i.test(name) ? "🎵" : /google/i.test(name) ? "▶️" : /ebay/i.test(name) ? "🛒" : "🎁";
    return { name, em, ins: `Purchase a ${name} Gift Card of the exact plan amount, scratch to reveal the code, then email it to us.` };
  });

  // Methods where we don't publish a public handle/address — instead the
  // user is routed to contact the admin directly, who shares the relevant
  // tag/handle and confirms the payment manually.
  const ALL_METHODS = [
    { id: "giftcard", lb: "Gift Card", em: "🎁" },
    { id: "crypto", lb: "Crypto", em: "₿" },
    { id: "cashapp", lb: "Cash App", badge: { bg: "#00D632", fg: "#fff", txt: "$" } },
    { id: "paypal", lb: "PayPal", badge: { bg: "#003087", fg: "#fff", txt: "P" } },
    { id: "venmo", lb: "Venmo", badge: { bg: "#3D95CE", fg: "#fff", txt: "V" } },
    { id: "zelle", lb: "Zelle", badge: { bg: "#6D1ED4", fg: "#fff", txt: "Z" } },
    { id: "chime", lb: "Chime", badge: { bg: "#1DDD8D", fg: "#08291C", txt: "C" } },
    { id: "revolut", lb: "Revolut", badge: { bg: "#0A0A0A", fg: "#fff", txt: "R" } },
    { id: "applepay", lb: "Apple Pay", em: "🍎" },
  ];
  // Only hide a method once admin config has actually loaded AND explicitly
  // disabled it — before that (payCfg === null) show everything as before,
  // so nothing flashes/disappears while the settings are still loading.
  const methods = payCfg ? ALL_METHODS.filter(m => payCfg[m.id]?.enabled !== false) : ALL_METHODS;
  const CONTACT_METHODS = ["cashapp", "paypal", "venmo", "zelle", "chime", "revolut", "applepay"];
  const methLabel = id => methods.find(m => m.id === id)?.lb || id;

  const copy = (txt, k) => { try { navigator.clipboard.writeText(txt); } catch (e) { } setCp(k); setTimeout(() => setCp(""), 2500); };

  const handleProofUpload = async (file) => {
    setProofErr(""); setProofFile(file); setProofUploading(true);
    try {
      const url = await uploadPaymentProof(file, user.id, token);
      setProofUrl(url);
    } catch(e) { setProofErr("Upload failed. Please try again."); setProofFile(null); }
    setProofUploading(false);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      if (user?.id) {
        const payAmt = plan === "3 Months" ? 79 : plan === "6 Months" ? 100 : 300;
        const payMeth = meth === "giftcard" ? gc : meth === "crypto" ? "Crypto" : methLabel(meth);
        await supa(`deposits`, "POST", { user_id: user.id, plan, amount: payAmt, method: payMeth, status: "pending", proof_url: proofUrl || null }, token);
        // Save selected plan immediately so admin sees it without manual entry
        await supa(`profiles?id=eq.${user.id}`, "PATCH", { payment_status: "pending", plan }, token).catch(() => {});
        // Email user: payment confirmation
        try {
          const profile = await supa(`profiles?id=eq.${user.id}&select=name,email`, "GET", null, token);
          const uName = profile?.[0]?.name || "there";
          const uEmail = profile?.[0]?.email || user.email;
          const tpl = emailTemplates.paymentConfirmation(uName, plan, payAmt, payMeth);
          await resendEmail({ to: uEmail, ...tpl });
        } catch(e) {}
        // Email admin: new payment alert
        try {
          const profile2 = await supa(`profiles?id=eq.${user.id}&select=name,email`, "GET", null, token);
          const tpl2 = emailTemplates.adminNewPayment(profile2?.[0]?.name || "Unknown", profile2?.[0]?.email || "", plan, payAmt, payMeth);
          await resendEmail({ to: ADMIN_EMAIL, ...tpl2 });
        } catch(e) {}
      }
    } catch (e) { console.log("Payment log error:", e); }
    setSaving(false);
    onOk();
    onClose();
  };

  return (
    <div className="mo" onClick={onClose}>
      <div className="md" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div><h3 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 3 }}>Activate Full Access</h3><p style={{ color: MUTED, fontSize: 13 }}>Choose your plan and payment method</p></div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><Ic n="x" sz={21} /></button>
        </div>

        <p className="raj" style={{ fontSize: 12, color: GOLD, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Step 1 — Choose Plan</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {plans.map(p => (
            <div key={p.name} className={`pc${plan === p.name ? " sel" : ""}`} onClick={() => setPlan(p.name)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{plan === p.name && <div style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD }} />}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span className="raj" style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                  {p.best && <span className="tag tg" style={{ fontSize: 9 }}>BEST</span>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", rowGap: 2, columnGap: 12 }}>
                  {p.ft.map(f => (<div key={f} style={{ display: "flex", gap: 4, alignItems: "center" }}><Ic n="check" sz={10} c="#00C878" /><span style={{ fontSize: 11, color: "#A8B0C2" }}>{f}</span></div>))}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p className="raj" style={{ fontSize: 24, fontWeight: 700, color: GOLD, lineHeight: 1 }}>${p.price}</p>
                <p style={{ fontSize: 10, color: MUTED }}>{p.period}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="dv" />
        <p className="raj" style={{ fontSize: 12, color: GOLD, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Step 2 — Payment Method</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
          {methods.map(m => (
            <div key={m.id} onClick={() => { setMeth(m.id); setGc(null); }} style={{ padding: "13px 8px", borderRadius: 11, border: `2px solid ${meth === m.id ? GOLD : "rgba(201,168,76,0.15)"}`, background: meth === m.id ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all .2s", textAlign: "center" }}>
              {m.badge ? (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.badge.bg, color: m.badge.fg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontWeight: 800, fontSize: 13, fontFamily: "Inter, sans-serif" }}>{m.badge.txt}</div>
              ) : (
                <div style={{ fontSize: 22, marginBottom: 5 }}>{m.em}</div>
              )}
              <p className="raj" style={{ fontWeight: 700, fontSize: 12 }}>{m.lb}</p>
            </div>
          ))}
        </div>

        {meth === "giftcard" && (
          <div className="ad">
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 11 }}>Select gift card type:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
              {gcs.map(g => (
                <div key={g.name} className={`gc${gc === g.name ? " sel" : ""}`} onClick={() => setGc(g.name)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{gc === g.name && <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />}</div>
                    <span style={{ fontSize: 20 }}>{g.em}</span>
                    <span className="raj" style={{ fontWeight: 700, fontSize: 15 }}>{g.name}</span>
                  </div>
                  {gc === g.name && (
                    <div style={{ marginTop: 12, padding: "11px 14px", background: "rgba(201,168,76,0.06)", borderRadius: 9, border: "1px solid rgba(201,168,76,0.15)" }}>
                      <p style={{ fontSize: 12, color: "#A8B0C2", lineHeight: 1.7, marginBottom: 11 }}>{g.ins}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <Ic n="mail" sz={14} c={GOLD} />
                        <span className="mono" style={{ fontSize: 12, color: GOLD }}>trustcotech0@gmail.com</span>
                        <button className="btn-tab" onClick={() => copy("trustcotech0@gmail.com", "em")}><Ic n="copy" sz={11} />{cp === "em" ? "Copied!" : "Copy"}</button>
                      </div>
                      <p style={{ fontSize: 10, color: MUTED, marginTop: 9 }}>Subject: "{plan} Gift Card — {g.name}" · Activated within 1–3 hours.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {meth === "crypto" && (
          <div className="ad" style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Send exact amount, then email your transaction ID to <span style={{ color: GOLD }}>trustcotech0@gmail.com</span></p>
            {payCfg?.crypto?.address ? (
              <div className="wb" onClick={() => copy(payCfg.crypto.address, "cryptoaddr")}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>₿</span></div>
                  <div><p className="raj" style={{ fontWeight: 700, fontSize: 15 }}>{payCfg.crypto.network || "Crypto Wallet"}</p><p style={{ fontSize: 10, color: MUTED }}>Click to copy</p></div>
                  <div style={{ marginLeft: "auto" }}><span className="tag tg" style={{ fontSize: 9 }}>{cp === "cryptoaddr" ? "✓ Copied!" : "Copy"}</span></div>
                </div>
                <p className="mono" style={{ fontSize: 10, color: GOLD, wordBreak: "break-all", lineHeight: 1.6 }}>{payCfg.crypto.address}</p>
              </div>
            ) : (
              <>
                <div className="wb" style={{ marginBottom: 11 }} onClick={() => copy("bc1qrap03ecs3kgnxjfdxqw6neukn5eu6hj5ejqp8j", "btc")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(247,147,26,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18 }}>₿</span></div>
                    <div><p className="raj" style={{ fontWeight: 700, fontSize: 15 }}>Bitcoin (BTC)</p><p style={{ fontSize: 10, color: MUTED }}>Click to copy</p></div>
                    <div style={{ marginLeft: "auto" }}><span className="tag tg" style={{ fontSize: 9 }}>{cp === "btc" ? "✓ Copied!" : "Copy"}</span></div>
                  </div>
                  <p className="mono" style={{ fontSize: 10, color: GOLD, wordBreak: "break-all", lineHeight: 1.6 }}>bc1qrap03ecs3kgnxjfdxqw6neukn5eu6hj5ejqp8j</p>
                </div>
                <div className="wb" onClick={() => copy("TYxJnSECJnvieATcibeRpGmHEEXnv8wd8E", "usdt")}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(38,161,123,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 16, fontWeight: 700, color: "#26A17B" }}>₮</span></div>
                    <div><p className="raj" style={{ fontWeight: 700, fontSize: 15 }}>USDT TRC-20</p><p style={{ fontSize: 10, color: MUTED }}>Tron network</p></div>
                    <div style={{ marginLeft: "auto" }}><span className="tag tgg" style={{ fontSize: 9 }}>{cp === "usdt" ? "✓ Copied!" : "Copy"}</span></div>
                  </div>
                  <p className="mono" style={{ fontSize: 10, color: "#26A17B", wordBreak: "break-all", lineHeight: 1.6 }}>TYxJnSECJnvieATcibeRpGmHEEXnv8wd8E</p>
                </div>
              </>
            )}
          </div>
        )}

        {CONTACT_METHODS.includes(meth) && (
          <div className="ad" style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>For security, our {methLabel(meth)} details are shared directly by our admin rather than posted publicly. Message us your name and chosen plan ({plan || "6 Months / 2 Years"}) and we'll send you the {methLabel(meth)} details to complete payment.</p>
            <a href={`${waUrl}${waUrl.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Hi, I'd like to pay for the ${plan || ""} plan via ${methLabel(meth)}. My email is ${user?.email || ""}`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: 11 }}>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }}><Ic n="whatsapp" sz={15} />Contact Admin on WhatsApp →</button>
            </a>
            <a href={fbUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: 11 }}>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }}><Ic n="facebook" sz={15} />Contact Admin on Facebook →</button>
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <Ic n="mail" sz={14} c={GOLD} />
              <span className="mono" style={{ fontSize: 12, color: GOLD }}>trustcotech0@gmail.com</span>
              <button className="btn-tab" onClick={() => copy("trustcotech0@gmail.com", "em2")}><Ic n="copy" sz={11} />{cp === "em2" ? "Copied!" : "Copy"}</button>
            </div>
            <p style={{ fontSize: 10, color: MUTED, marginTop: 9 }}>Subject: "{plan || "[Plan]"} {methLabel(meth)} Payment" · Activated within 1–3 hours.</p>
          </div>
        )}

        {/* Payment Proof Upload */}
        {((meth === "giftcard" && gc) || meth === "crypto" || CONTACT_METHODS.includes(meth)) && plan && (
          <div style={{ marginTop: 14, padding: "14px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "#A8B0C2", marginBottom: 10 }}>📎 <strong style={{ color: "#C9A84C" }}>Optional:</strong> Upload payment screenshot to speed up verification</p>
            {proofUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(0,200,120,0.08)", border: "1px solid rgba(0,200,120,0.2)", borderRadius: 8 }}>
                <span style={{ color: "#00C878", fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 12, color: "#00C878" }}>Proof uploaded successfully</span>
                <button onClick={() => { setProofUrl(""); setProofFile(null); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6B7290", cursor: "pointer", fontSize: 11 }}>Remove</button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(201,168,76,0.25)", borderRadius: 9, cursor: "pointer" }}>
                <input type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => e.target.files[0] && handleProofUpload(e.target.files[0])} />
                {proofUploading ? <span style={{ fontSize: 12, color: "#C9A84C" }}>Uploading...</span> : <><span style={{ fontSize: 18 }}>📷</span><span style={{ fontSize: 12, color: "#6B7290" }}>Tap to upload screenshot (PNG, JPG, PDF)</span></>}
              </label>
            )}
            {proofErr && <p style={{ fontSize: 11, color: "#FF4D6A", marginTop: 6 }}>{proofErr}</p>}
          </div>
        )}

        {((meth === "giftcard" && gc) || meth === "crypto" || CONTACT_METHODS.includes(meth)) && plan ? (
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, marginTop: 8 }} onClick={handleConfirm} disabled={saving || proofUploading}>
            <Ic n="check" sz={16} />{saving ? "Saving..." : meth === "giftcard" ? `I've sent the ${gc} code →` : meth === "crypto" ? "I've sent the crypto payment →" : `I've contacted admin about ${methLabel(meth)} →`}
          </button>
        ) : (
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, opacity: .4 }} disabled>Select a plan and payment method above</button>
        )}
        <p style={{ textAlign: "center", fontSize: 11, color: MUTED, marginTop: 12 }}>🔒 Manual verification · 1–3 hours · trustcotech0@gmail.com</p>
      </div>
    </div>
  );
};

// ============================================================
// ONBOARDING / WELCOME — shown until the user is activated AND
// has a Partner ID assigned, instead of always defaulting straight
// to the Connect form (which they can't use yet at that point).
// ============================================================
const Welcome = ({ user, stage, onActivate }) => {
  const steps = [
    { n: "01", ic: "device", t: "Install on both phones", d: "Download TrustCo Tech on your primary phone and your second device, then sign in with the same account on both." },
    { n: "02", ic: "key", t: "Activate & get your Partner ID", d: "Choose a plan and submit payment. Once we confirm it, we'll issue you a unique Partner ID for your second device." },
    { n: "03", ic: "sync", t: "Connect & sync data", d: "Enter the Partner ID on your second device, watch the secure connection establish, then view everything in one place." },
  ];
  const doneIdx = stage === "pending" || stage === "ready" ? 1 : 0;

  return (
    <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: DARK }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div className="glass au" style={{ padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Ic n={stage === "pending" ? "sync" : "zap"} sz={26} c={DARK} />
            </div>
            <h2 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              {stage === "new" && `Welcome${user?.profile?.name ? ", " + user.profile.name : ""}!`}
              {stage === "pending" && "Payment received!"}
              {stage === "ready" && "You're activated!"}
            </h2>
            <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7 }}>
              {stage === "new" && "Here's how TrustCo Tech works, and what to do next."}
              {stage === "pending" && "We're confirming your payment now — usually within 1–3 hours. Your Partner ID will be issued as soon as it's verified."}
              {stage === "ready" && "Your plan is active. We're issuing your Partner ID now — check back shortly to connect your second device."}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 14, borderRadius: 12, background: i === doneIdx ? "rgba(201,168,76,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${i === doneIdx ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: i < doneIdx ? "rgba(0,200,120,0.15)" : i === doneIdx ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", color: i < doneIdx ? "#00C878" : i === doneIdx ? GOLD : MUTED }}>
                  {i < doneIdx ? <Ic n="check" sz={15} /> : <span className="raj" style={{ fontWeight: 700, fontSize: 13 }}>{s.n}</span>}
                </div>
                <div>
                  <p className="raj" style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3, color: i === doneIdx ? GOLD : "#EDF0F7" }}>{s.t}</p>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          {stage === "new" && (<button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }} onClick={onActivate}><Ic n="zap" sz={17} />Activate Your Plan</button>)}
          {stage === "pending" && (<a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn-out" style={{ width: "100%", justifyContent: "center" }}><Ic n="support" sz={15} />Questions? Contact Support</button></a>)}
          {stage === "ready" && (<a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn-out" style={{ width: "100%", justifyContent: "center" }}><Ic n="support" sz={15} />Haven&apos;t received your Partner ID? Contact Support</button></a>)}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CONNECT SCREEN
// ============================================================
const Connect = ({ user, onDone }) => {
  const [pid, setPid] = useState("");
  const [st, setSt] = useState("idle");
  const [prog, setProg] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [shk, setShk] = useState(false);
  const ref = useRef(null);

  // "Your Partner ID (this device)" must always be a stable, random ID for
  // THIS account — it should never be the admin-assigned partner_id, since
  // that ID is meant to be entered on the user's *second* device, not shown
  // back to them as their own device's ID.
  const myId = "TC-" + String(Math.abs((user?.email || "demo").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 900) + 100) + "-724";
  const assignedId = user?.profile?.partner_id || "";
  const msgs = [[5, "Locating device..."], [20, "Establishing encrypted tunnel..."], [38, "Authenticating partner device..."], [55, "Verifying Partner ID..."], [70, "Syncing device registry..."], [85, "Loading device profile..."], [95, "Finalising connection..."], [100, "Connected successfully!"]];

  const fmt = v => { const r = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9); if (r.length <= 2) return r; if (r.length <= 5) return r.slice(0, 2) + "-" + r.slice(2); return r.slice(0, 2) + "-" + r.slice(2, 5) + "-" + r.slice(5); };

  const go = async () => {
    const clean = pid.replace(/[\s-]/g, "").toUpperCase();
    if (!clean || clean.length < 5) { setErr("Please enter a Partner ID."); setShk(true); setTimeout(() => setShk(false), 500); return; }
    if (clean === myId.replace(/-/g, "")) { setErr("That's your own device ID. Enter the ID assigned to your second device."); setShk(true); setTimeout(() => setShk(false), 500); return; }

    // The second-device Partner ID must match the ID our admin specifically
    // assigned to this account (profiles.partner_id) — not just any code
    // that happens to exist in the partner_ids table.
    if (!assignedId) {
      setErr("No Partner ID has been assigned to your account yet. Please contact support.");
      setShk(true); setTimeout(() => setShk(false), 500); return;
    }
    if (clean !== assignedId.replace(/-/g, "").toUpperCase()) {
      setErr("❌ Incorrect Partner ID number. Please contact support.");
      setShk(true); setTimeout(() => setShk(false), 500); return;
    }

    setErr(""); setSt("connecting"); setProg(0);
    let cur = 0;
    ref.current = setInterval(() => {
      cur += Math.random() * 3.5 + 1;
      if (cur >= 100) { cur = 100; clearInterval(ref.current); setProg(100); setMsg("Connected successfully!"); setTimeout(() => setSt("connected"), 700); }
      else { setProg(Math.floor(cur)); const m = [...msgs].reverse().find(([p]) => cur >= p); if (m) setMsg(m[1]); }
    }, 110);
  };

  return (
    <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: DARK }}>
      <div style={{ width: "100%", maxWidth: 500 }}>
        {st === "idle" && (
          <div className="glass glow-gold au" style={{ padding: 44, borderColor: "rgba(201,168,76,0.3)" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: 17, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}><Ic n="link" sz={28} c={DARK} /></div>
              <h2 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 7 }}>Connect Your Device</h2>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.65 }}>Enter the <strong style={{ color: GOLD }}>Partner ID</strong> assigned to your second device to establish a secure connection.</p>
            </div>
            <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 11, padding: "13px 17px", marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Your Partner ID (this device)</p>
                <p className="mono" style={{ fontSize: 19, fontWeight: 500, color: GOLD, letterSpacing: 5 }}>{myId}</p>
              </div>
              <div style={{ position: "relative" }}><span className="dot on ap" /></div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "#A8B0C2", marginBottom: 9, display: "block", fontWeight: 500 }}>Second Device Partner ID</label>
              <input className={`pid${err ? " err" : ""}${shk ? " shake" : ""}`} placeholder="TC-XXX-XXX" value={pid} onChange={e => { setErr(""); setPid(fmt(e.target.value)); }} onKeyDown={e => e.key === "Enter" && go()} maxLength={10} />
              {err && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.25)", borderRadius: 10 }}>
                  <p style={{ color: "#FF4D6A", fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Ic n="alert" sz={14} c="#FF4D6A" />{err}</p>
                  <a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 12, display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}><Ic n="support" sz={12} c={GOLD} />Contact Support on Facebook →</a>
                </div>
              )}
              <p style={{ fontSize: 11, color: MUTED, marginTop: 10, display: "flex", alignItems: "center", gap: 5 }}>
                <Ic n="info" sz={12} c={MUTED} />Don't know your Partner ID?{" "}
                <a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>Contact support</a>
              </p>
            </div>
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }} onClick={go} disabled={pid.length < 5}><Ic n="link" sz={17} />Remote Access</button>
            <p style={{ textAlign: "center", fontSize: 11, color: MUTED, marginTop: 12 }}><Ic n="shield" sz={11} c={MUTED} /> End-to-end encrypted · Admin-issued IDs only</p>
          </div>
        )}
        {st === "connecting" && (
          <div className="glass au" style={{ padding: 44, textAlign: "center", borderColor: "rgba(201,168,76,0.25)" }}>
            <div style={{ position: "relative", width: 84, height: 84, margin: "0 auto 26px" }}>
              <div style={{ width: 84, height: 84, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.12)", position: "absolute" }} />
              <div style={{ width: 84, height: 84, borderRadius: "50%", border: "3px solid transparent", borderTopColor: GOLD, position: "absolute", animation: "spin 1s linear infinite" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="raj" style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>{prog}%</span></div>
            </div>
            <h3 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 7 }}>{prog < 100 ? "Connecting..." : "Connected!"}</h3>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 26, minHeight: 18 }}>{msg}</p>
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginBottom: 7 }}><span>Your Device</span><span>Partner Device</span></div>
              <div className="sr"><div className="sp" /><div className="sp" /><div className="sp" /></div>
            </div>
            <div className="pb"><div className="pf" style={{ width: `${prog}%` }} /></div>
            <p style={{ fontSize: 11, color: prog === 100 ? "#00C878" : MUTED, marginTop: 7 }}>{prog}% {prog < 100 ? "establishing secure connection" : "✓ connection established"}</p>
          </div>
        )}
        {st === "connected" && (
          <div className="glass au" style={{ padding: 44, textAlign: "center", borderColor: "rgba(0,200,120,0.3)" }}>
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(0,200,120,0.1)", border: "2px solid rgba(0,200,120,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", color: "#00C878" }}><Ic n="check" sz={30} /></div>
            <h3 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 7 }}>Device Connected!</h3>
            <p style={{ color: MUTED, marginBottom: 5 }}>Secure tunnel established to</p>
            <p className="mono" style={{ fontSize: 19, color: GOLD, letterSpacing: 5, marginBottom: 28 }}>{pid}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[["Ping", "22ms", "#00C878"], ["Encryption", "AES-256", GOLD], ["Signal", "Excellent", SILVER]].map(([l, v, c]) => (
                <div key={l} style={{ padding: "11px 7px", background: "rgba(255,255,255,0.03)", borderRadius: 9, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{l}</p>
                  <p className="mono" style={{ fontSize: 12, color: c, fontWeight: 600 }}>{v}</p>
                </div>
              ))}
            </div>
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }} onClick={onDone}><Ic n="eye" sz={17} />View Device Activity</button>
            <button onClick={() => setSt("idle")} style={{ marginTop: 11, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 12 }}>← Disconnect</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ACTIVITY DASHBOARD
// ============================================================
const Activity = ({ user, onDisc, setPM }) => {
  const [tab, setTab] = useState("calls");
  const [sub, setSub] = useState("all");
  const act = user?.profile?.activated;
  const STREAM_KEY = "trustco_streams_v2";

  const FALLBACK_STREAMS = [
    { id:"calls",     lb:"Call Log",         ic:"phone",     lk:!act, subs:[{id:"all",lb:"All Calls",icon:"📋"},{id:"received",lb:"Received",icon:"📞"},{id:"outgoing",lb:"Outgoing",icon:"📤"},{id:"missed",lb:"Missed",icon:"❌"}] },
    { id:"sms",       lb:"SMS",              ic:"msg",       lk:!act, subs:[{id:"all",lb:"All Messages",icon:"💬"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"}] },
    { id:"whatsapp",  lb:"WhatsApp",         ic:"whatsapp",  lk:!act, subs:[{id:"all",lb:"All Chats",icon:"💚"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"},{id:"media",lb:"Media",icon:"🖼️"}] },
    { id:"whatsapp_biz",lb:"WhatsApp Business",ic:"whatsapp",lk:!act, subs:[{id:"all",lb:"All Chats",icon:"💼"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"catalogs",lb:"Catalogs",icon:"🛍️"}] },
    { id:"snapchat",  lb:"Snapchat",         ic:"snap",      lk:!act, subs:[{id:"all",lb:"All Snaps",icon:"👻"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"stories",lb:"Stories",icon:"⭕"},{id:"memories",lb:"Memories",icon:"💾"}] },
    { id:"telegram",  lb:"Telegram",         ic:"telegram",  lk:!act, subs:[{id:"all",lb:"All Chats",icon:"✈️"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"},{id:"channels",lb:"Channels",icon:"📢"}] },
    { id:"tiktok",    lb:"TikTok",           ic:"tiktok",    lk:!act, subs:[{id:"all",lb:"All DMs",icon:"🎵"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"videos",lb:"Liked Videos",icon:"❤️"}] },
    { id:"instagram", lb:"Instagram",        ic:"instagram", lk:!act, subs:[{id:"all",lb:"All DMs",icon:"💌"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"requests",lb:"Requests",icon:"📬"}] },
    { id:"facebook",  lb:"Facebook",         ic:"facebook",  lk:!act, subs:[{id:"all",lb:"All Messages",icon:"💬"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"}] },
    { id:"media",     lb:"Photos & Videos",  ic:"img",       lk:!act, subs:[{id:"all photos",lb:"All Photos",icon:"🖼️"},{id:"camera",lb:"Camera Roll",icon:"📷"},{id:"screenshots",lb:"Screenshots",icon:"🖥️"},{id:"all videos",lb:"All Videos",icon:"🎬"},{id:"recorded",lb:"Recorded",icon:"🎥"},{id:"downloaded",lb:"Downloaded",icon:"⬇️"}] },
    { id:"contacts",  lb:"Contacts",         ic:"users",     lk:!act, subs:[{id:"all",lb:"All Contacts",icon:"👤"},{id:"favorites",lb:"Favourites",icon:"⭐"},{id:"recent",lb:"Recent",icon:"🕐"}] },
    { id:"location",  lb:"Live Location",    ic:"map",       lk:!act, subs:[{id:"live",lb:"Live GPS",icon:"📍"},{id:"history",lb:"History",icon:"🗺️"},{id:"zones",lb:"Safe Zones",icon:"🏠"}] },
  ];

  const [streams, setStreams] = useState(() => {
    try {
      const saved = localStorage.getItem(STREAM_KEY);
      if (!saved) return FALLBACK_STREAMS;
      const parsed = JSON.parse(saved);
      // Merge lk (lock) flag from fallback since admin doesn't edit that
      return parsed.map(s => {
        const fb = FALLBACK_STREAMS.find(f => f.id === s.id);
        return { ...s, lk: fb ? fb.lk : false };
      });
    } catch(e) { return FALLBACK_STREAMS; }
  });

  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const saved = localStorage.getItem(STREAM_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        setStreams(parsed.map(s => {
          const fb = FALLBACK_STREAMS.find(f => f.id === s.id);
          return { ...s, lk: fb ? (act ? false : fb.lk) : false };
        }));
      } catch(e) {}
    }, 2000);
    return () => clearInterval(iv);
  }, [act]);

  const cur = streams.find(s => s.id === tab);
  const chg = id => { setTab(id); setSub(streams.find(s => s.id === id)?.subs?.[0]?.id || "all"); };

  // Brief "syncing" state shown each time the user opens a stream or
  // switches sub-tab, before the (already-synced) data is revealed —
  // mirrors how the real partner-device sync would feel.
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (cur?.lk) return; // no need to fake-load a locked tab
    setSyncing(true);
    const t = setTimeout(() => setSyncing(false), 900 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [tab, sub]);

  const SyncingState = ({ label }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "60px 20px", textAlign: "center" }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.12)", position: "absolute" }} />
        <div style={{ width: 52, height: 52, borderRadius: "50%", border: "3px solid transparent", borderTopColor: GOLD, position: "absolute", animation: "spin 0.9s linear infinite" }} />
      </div>
      <div>
        <p className="raj" style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 3 }}>Syncing {label}...</p>
        <p style={{ fontSize: 12, color: MUTED }}>Pulling latest data from partner device</p>
      </div>
    </div>
  );

  const callData = {
    all: [],
    received: [],
    outgoing: [],
    missed: [],
  };
  const smsData = {
    all: [],
    received: [],
    sent: [],
  };
  const waData = {
    all: [],
    received: [],
    sent: [],
    groups: [],
  };
  const photos = [];
  const contacts = [];

  const renderSubTabs = () => {
    if (!cur?.subs?.length) return null;
    return (
      <div className="sub-tabs">
        {cur.subs.map(s => {
          const id = typeof s === "string" ? s : s.id;
          const lb = typeof s === "string" ? (s.charAt(0).toUpperCase() + s.slice(1)) : s.lb;
          const icon = typeof s === "object" ? s.icon : null;
          return (
            <button key={id} className={`btn-tab${sub === id ? " active" : ""}`} onClick={() => setSub(id)} style={{ gap: 5 }}>
              {icon && <span style={{ fontSize: 13 }}>{icon}</span>}{lb}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMsgList = (data, avatarBg) => data.map((m, i) => (
    <div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center", marginBottom: 7, cursor: "pointer" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg || `linear-gradient(135deg,${GOLD},#9A7B2F)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, color: DARK, flexShrink: 0 }}>{(m.from || m.av || "?")[0]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{m.from}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {m.type && <span className={`tag ${m.type === "sent" ? "tgs" : m.type === "groups" ? "tgb" : "tgg"}`} style={{ fontSize: 9 }}>{m.type}</span>}
            <span style={{ fontSize: 11, color: MUTED }}>{m.time}</span>
          </div>
        </div>
        <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{m.prev}</p>
      </div>
      {m.un > 0 && <div style={{ width: 18, height: 18, borderRadius: "50%", background: GOLD, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", color: DARK }}>{m.un}</div>}
    </div>
  ));

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 70px)", position: "relative" }}>
      {/* Desktop sidebar */}
      <div className="sb mobile-nav" style={{ display:"flex", flexDirection:"column" }}>
        <div style={{ padding: "13px 20px 17px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><span className="dot on ap" /><span className="raj" style={{ fontSize: 11, color: "#00C878", fontWeight: 700 }}>CONNECTED</span></div>
          <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Partner Device</p>
          <p className="mono" style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>{user?.profile?.partner_id || "TC-XXX-XXX"}</p>
        </div>
        {streams.map(s => (
          <button key={s.id} className={`sl${tab === s.id ? " active" : ""}`} onClick={() => chg(s.id)}>
            <Ic n={s.ic} sz={14} c={s.lk ? "#2A3050" : undefined} />
            <span style={{ flex: 1, color: s.lk ? "#2A3050" : undefined }}>{s.lb}</span>
            {s.lk && <Ic n="lock" sz={12} c={GOLD} />}
          </button>
        ))}
        <div style={{ padding: "14px 11px", marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          {!act ? (user?.profile?.payment_status === "pending" ? (<div className="tag tg" style={{ justifyContent: "center", width: "100%", padding: "7px" }}>⏳ Pending approval</div>) : (<button className="btn-gold" style={{ width: "100%", justifyContent: "center", padding: "9px", fontSize: 12 }} onClick={() => setPM(true)}><Ic n="zap" sz={13} />Activate Full Access</button>)) : (<div className="tag tgg" style={{ justifyContent: "center", width: "100%", padding: "7px" }}>✓ Full Access Active</div>)}
          <button onClick={onDisc} style={{ width: "100%", marginTop: 9, background: "rgba(255,77,106,0.08)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.18)", padding: "8px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", justifyContent: "center" }}><Ic n="x" sz={12} />Disconnect</button>
        </div>
      </div>

      {/* Mobile stream drawer overlay */}
      {drawerOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: "flex" }} onClick={() => setDrawerOpen(false)}>
          <div style={{ width: "80%", maxWidth: 300, background: "#161929", borderRight: "1px solid rgba(201,168,76,0.15)", height: "100%", overflowY: "auto", paddingTop: 70 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "13px 20px 17px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><span className="dot on ap" /><span className="raj" style={{ fontSize: 11, color: "#00C878", fontWeight: 700 }}>CONNECTED</span></div>
              <p style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Partner Device</p>
              <p className="mono" style={{ fontSize: 10, color: GOLD, marginTop: 2 }}>{user?.profile?.partner_id || "TC-XXX-XXX"}</p>
            </div>
            {streams.map(s => (
              <button key={s.id} className={`sl${tab === s.id ? " active" : ""}`} onClick={() => { chg(s.id); setDrawerOpen(false); }} style={{ width: "100%" }}>
                <Ic n={s.ic} sz={14} c={s.lk ? "#2A3050" : undefined} />
                <span style={{ flex: 1, color: s.lk ? "#2A3050" : undefined }}>{s.lb}</span>
                {s.lk && <Ic n="lock" sz={12} c={GOLD} />}
              </button>
            ))}
            <div style={{ padding: "14px 11px", marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.1)" }}>
              {!act ? (<button className="btn-gold" style={{ width: "100%", justifyContent: "center", padding: "9px", fontSize: 12 }} onClick={() => { setPM(true); setDrawerOpen(false); }}><Ic n="zap" sz={13} />Activate Full Access</button>) : (<div className="tag tgg" style={{ justifyContent: "center", width: "100%", padding: "7px" }}>✓ Full Access Active</div>)}
              <button onClick={onDisc} style={{ width: "100%", marginTop: 9, background: "rgba(255,77,106,0.08)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.18)", padding: "8px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", justifyContent: "center" }}><Ic n="x" sz={12} />Disconnect</button>
            </div>
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} />
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", background: DARK, position: "relative" }}>
        {/* Mobile header bar with stream selector */}
        <div className="mobile-stream-bar" style={{ display: "none", position: "sticky", top: 0, zIndex: 100, background: "#0D1020", borderBottom: "1px solid rgba(201,168,76,0.1)", padding: "10px 16px", alignItems: "center", gap: 12 }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 9, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: GOLD, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            Streams
          </button>
          <div style={{ flex: 1, overflowX: "auto", display: "flex", gap: 8, scrollbarWidth: "none" }}>
            {streams.slice(0, 6).map(s => (
              <button key={s.id} onClick={() => chg(s.id)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, border: `1px solid ${tab === s.id ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, background: tab === s.id ? "rgba(201,168,76,0.1)" : "transparent", color: tab === s.id ? GOLD : MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                {s.lb}
              </button>
            ))}
          </div>
        </div>
        {cur?.lk && (
          <div className="lo">
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="lock" sz={30} c={GOLD} /></div>
            <h3 className="raj" style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>{cur.lb} is Locked</h3>
            <p style={{ color: MUTED, fontSize: 13, textAlign: "center", maxWidth: 290, lineHeight: 1.65 }}>Activate a TrustCo Tech plan to unlock {cur.lb} and all 9 data streams — from $79.</p>
            <div style={{ display: "flex", gap: 11, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn-gold" onClick={() => setPM(true)}><Ic n="zap" sz={15} />Activate — from $79</button>
              <button className="btn-out" style={{ padding: "11px 18px" }} onClick={() => setPM(true)}>View Plans</button>
            </div>
          </div>
        )}
        {!cur?.lk && syncing ? (
          <div style={{ padding: 24 }}>
            {renderSubTabs()}
            <SyncingState label={cur?.lb || "data"} />
          </div>
        ) : (
        <div style={{ padding: 24 }}>
          {tab === "calls" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Call Log</h2><p style={{ color: MUTED, fontSize: 12 }}>Forwarded from partner device</p></div><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Live</span></div>{renderSubTabs()}{(callData[sub] || callData.all).length > 0 ? (<div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead><tbody>{(callData[sub] || callData.all).map((c, i) => (<tr key={i}><td style={{ fontSize: 16 }}>{c.type === "incoming" ? "📞" : c.type === "outgoing" ? "📤" : "❌"}</td><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.num}</td><td><span className={`tag ${c.type === "incoming" ? "tgg" : c.type === "outgoing" ? "tgb" : "tgr"}`}>{c.type}</span></td><td>{c.dur}</td><td style={{ fontSize: 11 }}>{c.time}</td></tr>))}</tbody></table></div>) : <EmptyState icon="📞" title="No Calls Yet" subtitle="Call logs from the partner device will appear here once synced." color="#6C63FF" />}</div>)}
          {tab === "sms" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>SMS Messages</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Live</span></div>{renderSubTabs()}{(smsData[sub]||smsData.all).length > 0 ? renderMsgList(smsData[sub]||smsData.all) : <EmptyState icon="💬" title="No SMS Yet" subtitle="Text messages from the partner device will appear here once synced." color="#C9A84C" />}</div>)}
          {tab === "whatsapp" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>WhatsApp</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}{(waData[sub]||waData.all).length > 0 ? renderMsgList(waData[sub]||waData.all, "linear-gradient(135deg,#25D366,#128C7E)") : <EmptyState icon="💬" title="No Messages Yet" subtitle="Live WhatsApp messages will appear here once your partner device is synced." color="#25D366" />}</div>)}
          {tab === "whatsapp_biz" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>WhatsApp Business</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}<EmptyState icon="💼" title="No Business Messages" subtitle="WhatsApp Business conversations will sync here once connected." color="#128C7E" /></div>)}
          {tab === "snapchat" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Snapchat</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}<EmptyState icon="👻" title="No Snaps Yet" subtitle="Snapchat messages and stories will appear here once the partner device is synced." color="#FFFC00" /></div>)}
          {tab === "telegram" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Telegram</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}<EmptyState icon="✈️" title="No Chats Yet" subtitle="Telegram messages, groups and channels will appear here once synced." color="#229ED9" /></div>)}
          {tab === "tiktok" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>TikTok DMs</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}<EmptyState icon="🎵" title="No DMs Yet" subtitle="TikTok direct messages and liked videos will appear here once synced." color="#FF0050" /></div>)}
          {tab === "instagram" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Instagram DMs</h2></div>{renderSubTabs()}<EmptyState icon="📸" title="No DMs Yet" subtitle="Instagram direct messages will appear here once the partner device is synced." color="#E1306C" /></div>)}
          {tab === "facebook" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Facebook Messages</h2></div>{renderSubTabs()}<EmptyState icon="📘" title="No Messages Yet" subtitle="Facebook Messenger conversations will appear here once synced." color="#1877F2" /></div>)}
          {tab === "media" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Photos & Videos</h2><span className="tag tgg">Auto-sync ✓</span></div>{renderSubTabs()}{photos.filter(p => { if (sub === "all photos") return !p.v; if (sub === "all videos") return p.v; if (sub === "camera") return p.cat === "camera"; if (sub === "screenshots") return p.cat === "screenshots"; if (sub === "recorded") return p.cat === "recorded"; if (sub === "downloaded") return p.cat === "downloaded"; return true; }).length > 0 ? (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{photos.filter(p => { if (sub === "all photos") return !p.v; if (sub === "all videos") return p.v; if (sub === "camera") return p.cat === "camera"; if (sub === "screenshots") return p.cat === "screenshots"; if (sub === "recorded") return p.cat === "recorded"; if (sub === "downloaded") return p.cat === "downloaded"; return true; }).map((p, i) => (<div key={i} className="glass" style={{ padding: 0, overflow: "hidden", borderRadius: 13, cursor: "pointer" }}><div style={{ height: 120, position: "relative", overflow: "hidden" }}>{p.img ? <img src={p.img} alt={p.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", background: `linear-gradient(135deg,${p.c||GOLD}33,${p.c||GOLD}11)`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={p.v ? "video" : "img"} sz={28} c={p.c||GOLD} /></div>}{p.v && <span className="tag tg" style={{ position: "absolute", top: 7, right: 7, fontSize: 8 }}>VIDEO</span>}<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.6))", padding: "20px 9px 8px" }}><p style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{p.n}</p><p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>{p.s} · {p.d}</p></div></div></div>))}</div>) : <EmptyState icon="🖼️" title="No Media Yet" subtitle="Photos and videos from the partner device will sync here automatically." color="#C9A84C" />}</div>)}
          {tab === "contacts" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Contacts</h2><span className="tag tgg">{contacts.length} synced</span></div>{renderSubTabs()}<div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tag</th><th>Fav</th></tr></thead><tbody>{contacts.filter(c => { if (sub === "favorites") return c.fav; return true; }).map((c, i) => (<tr key={i}><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.ph}</td><td style={{ fontSize: 12 }}>{c.em}</td><td><span className={`tag ${c.tg === "Family" ? "tgg" : c.tg === "Work" ? "tgb" : c.tg === "Doctor" ? "tg" : "tgs"}`}>{c.tg}</span></td><td style={{ fontSize: 16 }}>{c.fav ? "⭐" : ""}</td></tr>))}</tbody></table>{contacts.filter(c => sub === "favorites" ? c.fav : true).length === 0 && <EmptyState icon="👤" title="No Contacts Yet" subtitle="Contacts from the partner device will appear here once synced." color="#00C878" />}</div></div>)}
          {tab === "location" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Live Location</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Tracking</span></div>{renderSubTabs()}{sub === "live" && (<div className="glass" style={{ overflow: "hidden", height: 320 }}><div style={{ height: "100%", background: "linear-gradient(135deg,rgba(201,168,76,0.06),rgba(192,199,212,0.02))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}><div style={{ position: "relative" }}><div style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(255,77,106,0.3)", animation: "ping 1.5s ease-out infinite", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} /><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FF4D6A", boxShadow: "0 0 0 4px rgba(255,77,106,0.2)" }} /></div><p className="mono" style={{ fontSize: 17, color: TEXT }}>37.7749° N, 122.4194° W</p><p style={{ color: MUTED, fontSize: 12 }}>San Francisco, CA — Updated just now</p><div style={{ display: "flex", gap: 12 }}>{[["Speed", "0 km/h"], ["Accuracy", "±5m"], ["Battery", "73%"]].map(([l, v]) => (<div key={l} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>{l}</p><p className="mono" style={{ fontSize: 12, color: GOLD }}>{v}</p></div>))}</div></div></div>)}{sub === "history" && (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[["Today 10:24 AM", "TechCorp Office, San Francisco", "Work"], ["Today 08:15 AM", "Home, San Francisco", "Home"], ["Yesterday 7:30 PM", "Restaurant Row, SF", "Dining"], ["Yesterday 2:00 PM", "Medical Center, SF", "Healthcare"]].map(([t, loc, cat], i) => (<div key={i} className="glass" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}><div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,77,106,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n="map" sz={16} c="#FF4D6A" /></div><div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{loc}</p><p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t}</p></div><span className="tag tg" style={{ fontSize: 9 }}>{cat}</span></div>))}</div>)}</div>)}
        </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CONNECTING ANIMATION (Onboarding Step 2)
// Hoisted OUTSIDE UserDash so its identity is stable across
// UserDash re-renders. The 20s profile poll inside UserDash calls
// setUser, which used to redefine this component on every render —
// React saw it as a "new" component each time and remounted it,
// wiping its progress state and restarting the animation from 0%.
// ============================================================
const FlowConnecting = ({ setFlow }) => {
  const [prog, setProg] = useState(0);
  const [msg, setMsg] = useState("Initialising...");
  const [done, setDone] = useState(false);
  const ref = useRef(null);
  const msgs = [[0,"Initialising secure connection..."],[10,"Locating device..."],[20,"Establishing encrypted tunnel..."],[38,"Authenticating partner device..."],[55,"Verifying Partner ID..."],[70,"Syncing device registry..."],[85,"Loading device profile..."],[95,"Finalising connection..."],[100,"Connected successfully!"]];
  useEffect(() => {
    let cur = 0;
    // 20 seconds total → 100 steps at 200ms each
    ref.current = setInterval(() => {
      cur += 1;
      if (cur >= 100) { cur = 100; clearInterval(ref.current); setProg(100); setMsg("Connected successfully!"); setTimeout(() => setDone(true), 800); }
      else { setProg(Math.floor(cur)); const m = [...msgs].reverse().find(([p]) => cur >= p); if (m) setMsg(m[1]); }
    }, 200);
    return () => clearInterval(ref.current);
  }, []);
  useEffect(() => {
    if (done) setFlow(3);
  }, [done]);
  if (done) return null;
  return (
    <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div className="glass au" style={{ padding: "44px 32px", textAlign: "center", borderColor: "rgba(201,168,76,0.25)" }}>
          <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 28px" }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.12)", position: "absolute" }} />
            <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid transparent", borderTopColor: GOLD, position: "absolute", animation: "spin 1s linear infinite" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="raj" style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{prog}%</span></div>
          </div>
          <h3 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 7 }}>{prog < 100 ? "Connecting..." : "Connected!"}</h3>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 28, minHeight: 20 }}>{msg}</p>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginBottom: 8 }}><span>Your Device</span><span>Partner Device</span></div>
            <div className="sr"><div className="sp" /><div className="sp" /><div className="sp" /></div>
          </div>
          <div className="pb"><div className="pf" style={{ width: `${prog}%` }} /></div>
          <p style={{ fontSize: 11, color: prog === 100 ? "#00C878" : MUTED, marginTop: 8 }}>{prog}% {prog < 100 ? "establishing secure connection" : "✓ connection established"}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// USER DASHBOARD
// ============================================================
const UserDash = ({ user, setUser, sp }) => {
  const [view, setView] = useState("connect");
  const [pm, setPm] = useState(false);
  const [tab, setTab] = useState("connect");
  const [siteWhatsAppUrl, setSiteWhatsAppUrl] = useState("https://wa.me/1234567890");
  const [siteFacebookUrl, setSiteFacebookUrl] = useState(FB_URL);
  const [pendingTitle, setPendingTitle] = useState("Payment Submitted");
  const [pendingMsg, setPendingMsg] = useState("Please wait while the admin confirms your payment. Once confirmed, your account will be activated automatically and you'll be redirected here.");
  const [toast, setToast] = useState("");
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // Pull admin-configured WhatsApp/Facebook support links so they always
  // match what's set in Admin → Settings, instead of a hardcoded number.
  useEffect(() => {
    const loadSupportLinks = async () => {
      try {
        const rows = await supa("site_settings?key=eq.site_content&select=value", "GET", null, user.token);
        if (rows?.[0]?.value) {
          const parsed = JSON.parse(rows[0].value);
          if (parsed.whatsapp_url) setSiteWhatsAppUrl(parsed.whatsapp_url);
          if (parsed.facebook_url) setSiteFacebookUrl(parsed.facebook_url);
          if (parsed.pending_payment_title) setPendingTitle(parsed.pending_payment_title);
          if (parsed.pending_payment_message) setPendingMsg(parsed.pending_payment_message);
        }
      } catch(e) {}
    };
    loadSupportLinks();
  }, []);

  const [flowStep, setFlowRaw] = useState(() => {
    // Resume from DB-saved step, capped at 3 (never auto-skip connection)
    const saved = user?.profile?.onboarding_step ?? 0;
    return Math.min(saved, 3);
  });
  const setFlow = async (step) => {
    setFlowRaw(step);
    // Persist to DB so progress survives device/browser switches
    try {
      await supa(`profiles?id=eq.${user.id}`, "PATCH", { onboarding_step: step }, user.token);
    } catch(e) {}
  };
  const [profile, setProfile] = useState(user?.profile || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Billing: payment history
  const [payments, setPayments] = useState([]);
  const [payLoading, setPayLoading] = useState(false);

  // Support ticket state
  const [ticket, setTicket] = useState({ subject: "", message: "" });
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketErr, setTicketErr] = useState("");
  const [myTickets, setMyTickets] = useState([]);

  // stage
  const stage = user?.profile?.activated
    ? (user?.profile?.partner_id ? "ready_to_connect" : "ready")
    : (user?.profile?.payment_status === "pending" ? "pending" : "new");

  // plan expiry helpers
  const getPlanDays = plan => {
    if (!plan) return null;
    if (/3.month/i.test(plan)) return 90;
    if (/6.month/i.test(plan)) return 180;
    if (/2.year/i.test(plan)) return 730;
    if (/professional/i.test(plan)) return 180;
    return null;
  };

  const getExpiryInfo = () => {
    if (!user?.profile?.activated) return null;
    const payments_sorted = [...payments].filter(p => p.status === "activated").sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const lastPay = payments_sorted[0];
    if (!lastPay) return null;
    const days = getPlanDays(lastPay.plan);
    if (!days) return null;
    const start = new Date(lastPay.created_at);
    const expiry = new Date(start.getTime() + days * 86400000);
    const remaining = Math.ceil((expiry - Date.now()) / 86400000);
    return { expiry, remaining, expired: remaining <= 0 };
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await supa(`profiles?id=eq.${user.id}`, "PATCH", { name: profile.name }, user.token);
      setUser(p => ({ ...p, profile: { ...p.profile, name: profile.name } }));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.log(e); }
    setSaving(false);
  };

  const changePassword = async () => {
    setPwErr("");
    if (!pwForm.next || pwForm.next.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwErr("Passwords don't match."); return; }
    setPwSaving(true);
    try {
      await supaUpdatePassword(user.token, pwForm.next);
      setPwOk(true); setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwOk(false), 3000);
    } catch (e) { setPwErr(e.message || "Failed to change password."); }
    setPwSaving(false);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      // Supabase does not allow a user to delete their own Auth account via
      // a regular access token — that requires the service role key, which
      // must never be exposed in frontend code. Instead: mark the account
      // for deletion, immediately disable/ban it so it can't be used, and
      // let the admin finish removing the Auth user from the dashboard.
      await supa(`profiles?id=eq.${user.id}`, "PATCH", {
        deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
        banned: true,
      }, user.token);
    } catch (e) { console.error("Delete account error:", e); }
    setUser(null);
    sp("home");
  };

  const loadPayments = async () => {
    if (!user?.id) return;
    setPayLoading(true);
    try {
      const p = await supa(`deposits?user_id=eq.${user.id}&select=*&order=created_at.desc`, "GET", null, user.token);
      setPayments(p || []);
    } catch (e) { console.log(e); }
    setPayLoading(false);
  };

  const loadMyTickets = async () => {
    if (!user?.id) return;
    try {
      const t = await supa(`tickets?user_id=eq.${user.id}&select=*&order=created_at.desc`, "GET", null, user.token);
      setMyTickets(t || []);
    } catch (e) { console.log(e); }
  };

  const submitTicket = async () => {
    setTicketErr("");
    if (!ticket.subject.trim() || !ticket.message.trim()) { setTicketErr("Please fill in subject and message."); return; }
    setTicketSending(true);
    try {
      await supa("tickets", "POST", { user_id: user.id, name: user.profile?.name || "", email: user.email, subject: ticket.subject, message: ticket.message, status: "open" }, user.token);
      setTicketSent(true); setTicket({ subject: "", message: "" });
      loadMyTickets();
      setTimeout(() => setTicketSent(false), 4000);
    } catch (e) { setTicketErr(e.message || "Failed to send ticket."); }
    setTicketSending(false);
  };

  // Refresh profile from DB periodically to pick up admin activation in real time
  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const rows = await supa(`profiles?id=eq.${user.id}&select=*`, "GET", null, user.token);
        if (rows?.[0]) {
          const prev = user?.profile?.activated;
          const next = rows[0].activated;
          setUser(p => ({ ...p, profile: { ...p.profile, ...rows[0] } }));
          // Push/browser notification when admin activates plan
          if (!prev && next) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("🎉 Your plan is now active!", {
                body: "TrustCo Tech: Your account has been activated. You can now unlock all features.",
                icon: "/logo.png",
              });
            }
            // Auto-redirect to the stream/Activity page once admin activates,
            // regardless of which onboarding step the user is currently on.
            setFlow(4);
          }
        }
      } catch(e) {}
    };
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    refreshProfile();
    const iv = setInterval(refreshProfile, 20000);
    return () => clearInterval(iv);
  }, []);

  // Auto logout after 30 minutes of inactivity
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setUser(null);
        sp("login");
      }, TIMEOUT);
    };
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  useEffect(() => {
    if (tab === "billing") loadPayments();
    if (tab === "support") { loadMyTickets(); }
  }, [tab]);

  // Onboarding steps
  const onboardingSteps = [
    { label: "Create Account", done: true, icon: "users" },
    { label: "Choose a Plan & Pay", done: user?.profile?.payment_status === "pending" || user?.profile?.activated, icon: "credit" },
    { label: "Admin Activation (1–3 hrs)", done: user?.profile?.activated, icon: "zap" },
    { label: "Receive Partner ID", done: !!user?.profile?.partner_id, icon: "key" },
    { label: "Connect Devices", done: stage === "ready_to_connect" && view === "activity", icon: "link" },
  ];

  const TABS = [
    ["connect", "link", "Remote Access"],
    ["profile", "settings", "Profile"],
    ["billing", "credit", "Billing"],
    ["support", "ticket", "Support"],
  ];

  const TopBar = () => (
    <div style={{ background: "#0D1020", borderBottom: "1px solid rgba(201,168,76,0.1)", padding: "10px 24px", display: "flex", gap: 8, overflowX: "auto" }}>
      {TABS.map(([id, ic, lb]) => (
        <button key={id} className={`btn-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}><Ic n={ic} sz={13} />{lb}</button>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <NotifBell userId={user.id} token={user.token} />
        <button onClick={() => { setUser(null); sp("home"); }} style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center" }}><Ic n="logout" sz={13} />Sign out</button>
      </div>
    </div>
  );

  // ── NEW 5-STEP ONBOARDING FLOW ──────────────────────────────
  // Step 0: Welcome / How it works
  // Step 1: Enter Partner ID  (with note to contact admin)
  // Step 2: Connecting animation (15s)
  // Step 3: Device preview — features locked, Activate button
  // Step 4: Plan & payment modal → then Activity dashboard
  // ─────────────────────────────────────────────────────────────
  const FlowWelcome = () => {
    const flowContent = user?.profile?.flow_welcome || {};
    const title = flowContent.title || `Welcome${user?.profile?.name ? ", " + user.profile.name : ""}!`;
    const subtitle = flowContent.subtitle || "Here's how TrustCo Tech works in 3 simple steps.";
    const steps = flowContent.steps || [
      { icon: "🔑", title: "Receive Partner ID", desc: "Our admin issues a unique Partner ID to your account within 10 mins." },
      { icon: "🔗", title: "Connect", desc: "Enter the Partner ID to connect to your partner device." },
      { icon: "🛒", title: "Choose Your Plan", desc: "Select a subscription that fits your needs and complete payment via your preferred method, to instantly access calls, messages, location and more." },
    ];
    return (
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div className="glass au" style={{ padding: "36px 28px" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔐</div>
              <h2 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{title}</h2>
              <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7 }}>{subtitle}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    <p className="raj" style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, color: TEXT }}>{s.title}</p>
                    <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }} onClick={() => setFlow(1)}>
              <Ic n="arrow-right" sz={17} />Get Started →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FlowPartnerID = () => {
    const [pid, setPid] = useState("");
    const [err, setErr] = useState("");
    const [shk, setShk] = useState(false);
    const [checking, setChecking] = useState(false);
    const assignedId = user?.profile?.partner_id || "";
    const revealed = user?.profile?.partner_id_revealed === true;

    // While waiting for reveal, poll faster (every 5s) so the screen
    // updates quickly once admin reveals — the main 20s poll in UserDash
    // still runs in parallel, but this gives much snappier feedback here.
    useEffect(() => {
      if (revealed) return; // already revealed, no need to keep polling fast
      const checkNow = async () => {
        try {
          const rows = await supa(`profiles?id=eq.${user.id}&select=*`, "GET", null, user.token);
          if (rows?.[0]) setUser(p => ({ ...p, profile: { ...p.profile, ...rows[0] } }));
        } catch(e) {}
      };
      const iv = setInterval(checkNow, 5000);
      return () => clearInterval(iv);
    }, [revealed]);

    const manualCheck = async () => {
      setChecking(true);
      try {
        const rows = await supa(`profiles?id=eq.${user.id}&select=*`, "GET", null, user.token);
        if (rows?.[0]) setUser(p => ({ ...p, profile: { ...p.profile, ...rows[0] } }));
      } catch(e) {}
      setTimeout(() => setChecking(false), 500);
    };
    const WA_URL = siteWhatsAppUrl.includes("?")
      ? `${siteWhatsAppUrl}&text=${encodeURIComponent("Hi, I'd like to request my Partner ID. My email is " + (user?.email || ""))}`
      : `${siteWhatsAppUrl}?text=${encodeURIComponent("Hi, I'd like to request my Partner ID. My email is " + (user?.email || ""))}`;
    const fmt = v => { const r = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9); if (r.length <= 2) return r; if (r.length <= 5) return r.slice(0, 2) + "-" + r.slice(2); return r.slice(0, 2) + "-" + r.slice(2, 5) + "-" + r.slice(5); };
    const go = () => {
      const clean = pid.replace(/[\s-]/g, "").toUpperCase();
      if (!clean || clean.length < 5) { setErr("Please enter your Partner ID."); setShk(true); setTimeout(() => setShk(false), 500); return; }
      if (!assignedId) { setErr("No Partner ID has been assigned to your account yet."); setShk(true); setTimeout(() => setShk(false), 500); return; }
      if (clean !== assignedId.replace(/[\s-]/g, "").toUpperCase()) { setErr("Incorrect Partner ID. Please check and try again."); setShk(true); setTimeout(() => setShk(false), 500); return; }
      setFlow(2);
    };

    // NOT YET REVEALED — show request screen
    if (!revealed) return (
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="glass au" style={{ padding: "40px 28px", textAlign: "center" }}>
            {/* Illustration */}
            <div style={{ margin: "0 auto 24px", position: "relative", width: 100, height: 100 }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))", border: "2px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 }}>🔑</div>
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,77,106,0.15)", border: "2px solid rgba(255,77,106,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔒</div>
            </div>
            <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Partner ID Required</h2>
            <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7, marginBottom: 8 }}>Your Partner ID hasn't been issued yet. Contact us via WhatsApp or Facebook to request yours — we'll reveal it on your dashboard once verified.</p>
            <div style={{ padding: "12px 16px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, marginBottom: 24, textAlign: "left", display: "flex", gap: 10 }}>
              <span style={{ fontSize: 15 }}>⏱️</span>
              <p style={{ fontSize: 12, color: "#C9A84C", lineHeight: 1.6 }}>Once you message us, we'll verify and reveal your ID — usually within a few minutes.</p>
            </div>
            {/* Request buttons — matching the solid gold "Contact Admin" style */}
            <a href={WA_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: 11 }}>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }}><Ic n="whatsapp" sz={15} />Contact Admin on WhatsApp →</button>
            </a>
            <a href={siteFacebookUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", marginBottom: 16 }}>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }}><Ic n="facebook" sz={15} />Contact Admin on Facebook →</button>
            </a>
            <button onClick={manualCheck} disabled={checking} style={{ width: "100%", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 9, padding: "11px", cursor: "pointer", color: GOLD, fontSize: 13, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {checking ? "Checking..." : <>🔄 Already messaged? Check now</>}
            </button>
            <button onClick={() => setFlow(0)} style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "11px", cursor: "pointer", color: MUTED, fontSize: 13 }}>← Back</button>
          </div>
        </div>
      </div>
    );

    // REVEALED — show masked ID + input to enter it
    return (
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div className="glass au" style={{ padding: "36px 28px" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔑</div>
              <h2 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Your Partner ID is Ready</h2>
              <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7 }}>Your Partner ID has been issued. Enter it below to connect your second device.</p>
            </div>
            {/* Show the revealed Partner ID */}
            <div style={{ padding: "16px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, marginBottom: 22, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".1em" }}>Your Partner ID</p>
              <p className="mono raj" style={{ fontSize: 28, fontWeight: 700, color: GOLD, letterSpacing: ".15em" }}>{assignedId}</p>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: MUTED, marginBottom: 8, display: "block", fontWeight: 500 }}>Enter Partner ID to Connect</label>
              <input className={`pid${err ? " err" : ""}${shk ? " shake" : ""}`} placeholder="TC-XXX-XXX" value={pid} onChange={e => { setErr(""); setPid(fmt(e.target.value)); }} onKeyDown={e => e.key === "Enter" && go()} maxLength={10} />
              {err && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.25)", borderRadius: 10 }}>
                  <p style={{ color: "#FF4D6A", fontSize: 13 }}>{err}</p>
                </div>
              )}
            </div>
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px", marginBottom: 12 }} onClick={go} disabled={pid.length < 5}>
              <Ic n="link" sz={17} />Connect Device
            </button>
            <button onClick={() => setFlow(0)} style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "11px", cursor: "pointer", color: MUTED, fontSize: 13 }}>← Back</button>
          </div>
        </div>
      </div>
    );
  };

  const FlowDevicePreview = () => {
    const flowContent = user?.profile?.flow_device || {};
    const STREAM_COLORS = { calls:"#6C63FF", sms:"#C9A84C", whatsapp:"#25D366", whatsapp_biz:"#128C7E", instagram:"#E1306C", facebook:"#1877F2", media:"#C9A84C", contacts:"#00C878", location:"#FF4D6A", snapchat:"#FFFC00", telegram:"#229ED9", tiktok:"#FF0050" };
    const features = flowContent.features || [
      { id:"calls",        ic:"phone",    label:"Call Log",           color:"#6C63FF", subs:["All Calls","Received","Outgoing","Missed"] },
      { id:"sms",          ic:"msg",      label:"SMS Messages",       color:"#C9A84C", subs:["All Messages","Received","Sent"] },
      { id:"location",     ic:"map",      label:"Live Location",      color:"#FF4D6A", subs:["Live GPS","History","Safe Zones"] },
      { id:"media",        ic:"img",      label:"Photos & Videos",    color:"#C9A84C", subs:["All Photos","Camera Roll","Screenshots","All Videos"] },
      { id:"whatsapp",     ic:"whatsapp", label:"WhatsApp",           color:"#25D366", subs:["All Chats","Received","Sent","Groups"] },
      { id:"whatsapp_biz", ic:"whatsapp", label:"WhatsApp Business",  color:"#128C7E", subs:["All Chats","Received","Sent","Catalogs"] },
      { id:"facebook",     ic:"facebook", label:"Facebook",           color:"#1877F2", subs:["All Messages","Received","Sent","Groups"] },
      { id:"instagram",    ic:"instagram",label:"Instagram",          color:"#E1306C", subs:["All DMs","Received","Sent","Requests"] },
      { id:"snapchat",     ic:"msg",      label:"Snapchat",           color:"#FFFC00", subs:["All Snaps","Received","Sent","Stories"] },
      { id:"telegram",     ic:"msg",      label:"Telegram",           color:"#229ED9", subs:["All Chats","Received","Sent","Groups"] },
      { id:"tiktok",       ic:"img",      label:"TikTok",             color:"#FF0050", subs:["All DMs","Received","Sent"] },
      { id:"contacts",     ic:"users",    label:"Contacts",           color:"#00C878", subs:["All Contacts","Favorites","Recent"] },
    ];
    return (
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div className="glass au" style={{ padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(0,200,120,0.1)", border: "2px solid rgba(0,200,120,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 28 }}>📱</div>
              <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Device Connected</h2>
              <p style={{ color: "#00C878", fontSize: 13, marginBottom: 4 }}>✓ Secure tunnel established</p>
            </div>
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 16, textAlign: "center" }}>🔒 All features are locked. Activate your plan to unlock full access.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {features.map((f, i) => {
                const cl = f.color || GOLD;
                return (
                  <div key={i} style={{ background: `linear-gradient(135deg,${cl}18,${cl}08)`, border: `1.5px solid ${cl}30`, borderRadius: 16, padding: "16px 12px 12px", display: "flex", flexDirection: "column", gap: 10, position: "relative", opacity: 0.85 }}>
                    {/* Lock badge */}
                    <div style={{ position: "absolute", top: 8, right: 8 }}><Ic n="lock" sz={13} c={cl} /></div>
                    {/* Icon + Label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: `${cl}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Ic n={f.ic} sz={18} c={cl} />
                      </div>
                      <span className="raj" style={{ fontSize: 12, fontWeight: 700, color: "#E8EAF0", lineHeight: 1.2 }}>{f.label}</span>
                    </div>
                    {/* Sub-tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {f.subs.map((s, si) => (
                        <span key={si} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, background: `${cl}22`, color: cl, border: `1px solid ${cl}44`, fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px", marginBottom: 10 }} onClick={() => { if (user?.profile?.activated) { setFlow(4); } else { setPm(true); } }}>
              <Ic n="zap" sz={17} />{user?.profile?.activated ? "View Live Data →" : "Activate to Unlock →"}
            </button>
            {!user?.profile?.activated && <p style={{ textAlign: "center", fontSize: 11, color: MUTED }}>Choose a plan to unlock all features</p>}
          </div>
        </div>
      </div>
    );
  };

  // Shown right after the user submits payment proof. Polls quickly so it
  // auto-redirects to the unlocked stream page the moment admin activates.
  const FlowPendingPayment = () => {
    useEffect(() => {
      const checkActivation = async () => {
        try {
          const rows = await supa(`profiles?id=eq.${user.id}&select=*`, "GET", null, user.token);
          if (rows?.[0]?.activated) {
            setUser(p => ({ ...p, profile: { ...p.profile, ...rows[0] } }));
            setFlow(4);
          }
        } catch(e) {}
      };
      const iv = setInterval(checkActivation, 5000);
      return () => clearInterval(iv);
    }, []);

    return (
      <div style={{ minHeight: "calc(100vh - 70px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div className="glass au" style={{ padding: "44px 28px", textAlign: "center" }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(201,168,76,0.05))", border: "2px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", fontSize: 36, position: "relative" }}>
              <span style={{ animation: "spin 2s linear infinite", display: "inline-block" }}>⏳</span>
            </div>
            <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{pendingTitle}</h2>
            <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7, marginBottom: 22 }}>
              {pendingMsg}
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 22 }}>
              {[1,2,3].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, animation: `pulse ${0.8 + i * 0.3}s ease-in-out infinite alternate` }} />)}
            </div>
            <div style={{ padding: "12px 16px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, marginBottom: 22, textAlign: "left", display: "flex", gap: 10 }}>
              <span style={{ fontSize: 15 }}>📩</span>
              <p style={{ fontSize: 12, color: "#C9A84C", lineHeight: 1.6 }}>A confirmation email will also be sent to you once your plan is activated.</p>
            </div>
            <button onClick={() => { setUser(p => ({ ...p, profile: { ...p.profile, payment_status: "" } })); }} style={{ width: "100%", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "11px", cursor: "pointer", color: MUTED, fontSize: 13 }}>← Back to features</button>
          </div>
        </div>
      </div>
    );
  };

  if (tab === "connect") return (
    <div style={{ paddingTop: 70 }}>
      <TopBar />
      {/* Step indicator */}
      {flowStep < 4 && (
        <div style={{ maxWidth: 480, margin: "16px auto 0", padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
            {["How it works", "Partner ID", "Connecting", "Device", "Activate"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: i === flowStep ? 28 : 8, height: 8, borderRadius: 4, background: i < flowStep ? "#00C878" : i === flowStep ? GOLD : "rgba(255,255,255,0.1)", transition: "all .3s" }} />
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: MUTED, marginTop: 6 }}>Step {flowStep + 1} of 5</p>
        </div>
      )}
      {flowStep === 0 && <FlowWelcome />}
      {flowStep === 1 && <FlowPartnerID />}
      {flowStep === 2 && <FlowConnecting setFlow={setFlow} />}
      {flowStep === 3 && user?.profile?.payment_status === "pending" && !user?.profile?.activated && <FlowPendingPayment />}
      {flowStep === 3 && !(user?.profile?.payment_status === "pending" && !user?.profile?.activated) && <FlowDevicePreview />}
      {flowStep === 4 && <Activity user={user} onDisc={() => setFlow(0)} setPM={setPm} />}
      {pm && <PayModal onClose={() => setPm(false)} onOk={() => { setUser(p => ({ ...p, profile: { ...p.profile, payment_status: "pending" } })); if (user?.profile?.activated) setFlow(4); }} user={user} token={user.token} />}
    </div>
  );

  const expiryInfo = getExpiryInfo();

  return (
    <div style={{ paddingTop: 70 }}>
      <TopBar />
      {toast && (<div style={{ position: "fixed", top: 90, right: 24, background: "#0D1020", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "12px 20px", zIndex: 3000, color: TEXT, fontSize: 14, animation: "sup .3s ease" }}>{toast}</div>)}
      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px" }}>

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="glass" style={{ padding: 32 }}>
              <h2 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Profile Settings</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Full Name</label><input className="inp" value={profile.name || ""} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Email</label><input className="inp" value={user.email || ""} disabled style={{ opacity: .6 }} /></div>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Partner ID</label><input className="inp" value={user.profile?.partner_id || "Not assigned yet"} disabled style={{ opacity: .6, fontFamily: "JetBrains Mono" }} /></div>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Plan Status</label><span className={`tag ${user.profile?.activated ? "tgg" : user.profile?.payment_status === "pending" ? "tg" : "tg"}`}>{user.profile?.activated ? "✓ Active — " + (user.profile?.plan || "Premium") : user.profile?.payment_status === "pending" ? "⏳ Pending admin approval" : "Not activated"}</span></div>
                <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={saveProfile} disabled={saving}>{saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>

            {/* Change Password */}
            <div className="glass" style={{ padding: 32 }}>
              <h2 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Change Password</h2>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Your new password must be at least 6 characters.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>New Password</label><input className="inp" type="password" placeholder="••••••••" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Confirm New Password</label><input className="inp" type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} /></div>
                {pwErr && <p style={{ color: "#FF4D6A", fontSize: 12 }}>{pwErr}</p>}
                {pwOk && <p style={{ color: "#00C878", fontSize: 12 }}>✓ Password updated successfully.</p>}
                <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={changePassword} disabled={pwSaving}>{pwSaving ? "Updating..." : "Update Password"}</button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="glass" style={{ padding: 32, border: "1px solid rgba(255,77,106,0.2)" }}>
              <h2 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: "#FF4D6A" }}>Delete Account</h2>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16, lineHeight: 1.7 }}>This permanently deletes your account and all data. Type <span style={{ color: "#FF4D6A", fontFamily: "JetBrains Mono" }}>DELETE</span> to confirm.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="inp" placeholder="Type DELETE to confirm" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} style={{ flex: 1 }} />
                <button onClick={deleteAccount} disabled={deleteConfirm !== "DELETE" || deleting} style={{ background: deleteConfirm === "DELETE" ? "rgba(255,77,106,0.15)" : "rgba(255,255,255,0.04)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)", padding: "10px 18px", borderRadius: 9, cursor: deleteConfirm === "DELETE" ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: deleteConfirm === "DELETE" ? 1 : 0.4 }}>{deleting ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {tab === "billing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Current Plan + Expiry */}
            <div className="glass" style={{ padding: 28 }}>
              <h2 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Billing & Subscription</h2>
              <div style={{ padding: "20px 24px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Current Plan</p>
                    <p className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{user.profile?.activated ? (user.profile?.plan || "Premium") : "Free"}</p>
                    <p style={{ fontSize: 13, color: MUTED }}>{user.profile?.activated ? "Full access to all 9 data streams" : user.profile?.payment_status === "pending" ? "Payment submitted — awaiting admin confirmation (1–3 hours)" : "Activate to unlock all features"}</p>
                  </div>
                  {expiryInfo && (
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Expires</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: expiryInfo.remaining <= 14 ? "#FF4D6A" : "#00C878" }}>{expiryInfo.expiry.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p style={{ fontSize: 12, color: expiryInfo.remaining <= 14 ? "#FF4D6A" : MUTED, marginTop: 2 }}>
                        {expiryInfo.expired ? "⚠ Expired" : `${expiryInfo.remaining} day${expiryInfo.remaining !== 1 ? "s" : ""} remaining`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Days remaining bar */}
                {expiryInfo && !expiryInfo.expired && (() => {
                  const totalDays = getPlanDays(user.profile?.plan) || 180;
                  const pct = Math.max(0, Math.min(1, expiryInfo.remaining / totalDays));
                  return (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${pct * 100}%`, background: pct > 0.3 ? "#00C878" : "#FF4D6A", transition: "width .5s ease" }} />
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {!user.profile?.activated && (user.profile?.payment_status === "pending"
                    ? <span className="tag tg">⏳ Pending approval</span>
                    : <button className="btn-gold" onClick={() => setPm(true)}><Ic n="zap" sz={15} />Activate Plan</button>
                  )}
                  {user.profile?.activated && (
                    <button className="btn-out" style={{ fontSize: 13, padding: "8px 16px" }} onClick={() => setPm(true)}><Ic n="zap" sz={14} />Upgrade Plan</button>
                  )}
                </div>
              </div>
              <div style={{ padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: MUTED }}>Questions? <a href="mailto:trustcotech0@gmail.com" style={{ color: GOLD }}>trustcotech0@gmail.com</a> · <a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD }}>Facebook Support</a></p>
              </div>
            </div>

            {/* Payment History */}
            <div className="glass" style={{ padding: 28 }}>
              <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Payment History</h3>
              {payLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} /></div>
              ) : payments.length === 0 ? (
                <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No payment records yet.</p>
              ) : (
                <div style={{ overflow: "auto" }}>
                  <table className="tbl">
                    <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                    <tbody>
                      {payments.map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td style={{ fontWeight: 600, color: TEXT }}>{p.plan}</td>
                          <td style={{ color: GOLD, fontWeight: 700 }}>${p.amount}</td>
                          <td style={{ fontSize: 12 }}>{p.method}</td>
                          <td><span className={`tag ${p.status === "activated" ? "tgg" : p.status === "pending" ? "tg" : "tgr"}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUPPORT TAB */}
        {tab === "support" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="glass" style={{ padding: 32 }}>
              <h2 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Submit a Support Ticket</h2>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Our team will reply within 1–24 hours.</p>
              {ticketSent ? (
                <div style={{ padding: "20px", background: "rgba(0,200,120,0.08)", border: "1px solid rgba(0,200,120,0.25)", borderRadius: 12, textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#00C878" }}><Ic n="check" sz={20} /></div>
                  <p style={{ fontWeight: 700, color: "#00C878", marginBottom: 4 }}>Ticket submitted!</p>
                  <p style={{ fontSize: 12, color: MUTED }}>We&apos;ll reply to your email within 1–24 hours.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Subject</label><input className="inp" placeholder="e.g. Can't connect my device" value={ticket.subject} onChange={e => setTicket(p => ({ ...p, subject: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Message</label><textarea className="inp" rows={5} placeholder="Describe your issue in detail…" value={ticket.message} onChange={e => setTicket(p => ({ ...p, message: e.target.value }))} style={{ resize: "vertical", minHeight: 110 }} /></div>
                  {ticketErr && <p style={{ color: "#FF4D6A", fontSize: 12 }}>{ticketErr}</p>}
                  <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={submitTicket} disabled={ticketSending}>{ticketSending ? "Sending..." : <><Ic n="ticket" sz={14} />Submit Ticket</>}</button>
                </div>
              )}
            </div>

            {/* My tickets history */}
            {myTickets.length > 0 && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>My Tickets</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {myTickets.map((t, i) => (
                    <div key={i} style={{ padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{t.subject}</p>
                        <span className={`tag ${t.status === "resolved" ? "tgg" : "tg"}`} style={{ fontSize: 9 }}>{t.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: MUTED, marginBottom: t.reply ? 10 : 0 }}>{new Date(t.created_at).toLocaleDateString()}</p>
                      <p style={{ fontSize: 11, color: "#6B7290", marginTop: 4, marginBottom: t.reply ? 8 : 0 }}>{t.message?.substring(0, 80)}{t.message?.length > 80 ? "..." : ""}</p>
                      {t.reply ? (
                        <div style={{ padding: "10px 13px", background: "rgba(0,200,120,0.06)", border: "1px solid rgba(0,200,120,0.18)", borderRadius: 8, marginTop: 8 }}>
                          <p style={{ fontSize: 10, color: "#00C878", fontWeight: 700, marginBottom: 4 }}>💬 Admin replied:</p>
                          <p style={{ fontSize: 12, color: "#E8EAF0", lineHeight: 1.5 }}>{t.reply}</p>
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, color: "#6B7290", marginTop: 6, fontStyle: "italic" }}>⏳ Awaiting admin reply...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: MUTED }}>Prefer to reach us directly? <a href="mailto:trustcotech0@gmail.com" style={{ color: GOLD }}>trustcotech0@gmail.com</a> · <a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD }}>Facebook Support</a></p>
            </div>
          </div>
        )}
      </div>
      {pm && <PayModal onClose={() => setPm(false)} onOk={() => { setUser(p => ({ ...p, profile: { ...p.profile, payment_status: "pending" } })); showToast("✅ Payment submitted — please wait while admin confirms it."); }} user={user} token={user.token} />}
    </div>
  );
};

// ============================================================
// ADMIN DASHBOARD
// ============================================================
const AdminDash = ({ user, setUser, sp }) => {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [pids, setPids] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [newPid, setNewPid] = useState("");
  const [selUser, setSelUser] = useState(null);
  const [editUser, setEditUser] = useState(null); // user being edited
  const [editUserDraft, setEditUserDraft] = useState({});
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [assignPid, setAssignPid] = useState("");
  const [ticketReply, setTicketReply] = useState({});
  const [ticketFilter, setTicketFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [paySearch, setPaySearch] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState("all");
  const [viewProof, setViewProof] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkActivating, setBulkActivating] = useState(false);
  const [editPlanUser, setEditPlanUser] = useState(null);
  const [editPlan, setEditPlan] = useState("");
  const [banConfirm, setBanConfirm] = useState(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [settings, setSettings] = useState({ supportEmail: "trustcotech0@gmail.com", fbUrl: "", announcement: "", maintenanceMode: false });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [adminPw, setAdminPw] = useState({ next: "", confirm: "" });
  const [adminPwErr, setAdminPwErr] = useState("");
  const [adminPwOk, setAdminPwOk] = useState(false);


  // ── Plan Manager state ────────────────────────────────────────
  const DEFAULT_PLANS = [
    { id: 1, name: "3 Months", price: 79, period: "3-month licence", best: false, features: ["All 9 data streams", "1 device linked", "Calls, SMS & WhatsApp", "Instagram & Facebook", "Photos, Videos & Contacts", "Live Location", "Email support", "Admin-issued Partner ID"] },
    { id: 2, name: "6 Months", price: 100, period: "6-month licence", best: false, features: ["All 9 data streams", "2 devices linked", "Calls, SMS & WhatsApp", "Instagram & Facebook", "Photos, Videos & Contacts", "Live Location", "Email support", "Admin-issued Partner ID"] },
    { id: 3, name: "2 Years", price: 300, period: "2-year licence", best: true, features: ["All 9 data streams", "Up to 5 devices", "Everything in 6 months", "Priority 24/7 support", "Free app updates", "Early feature access", "Admin-issued Partner ID"] },
  ];
  const [planList, setPlanList] = useState(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newFeature, setNewFeature] = useState("");
  const [addingPlan, setAddingPlan] = useState(false);
  const [newPlanDraft, setNewPlanDraft] = useState({ name: "", price: "", period: "", best: false, features: [] });
  const [newPlanFeature, setNewPlanFeature] = useState("");

  // Site settings state
  const DEFAULT_PAY_METHODS = {
    giftcard: { enabled: true, label: "Gift Card", emoji: "🎁", types: ["Amazon", "iTunes", "Google Play", "Steam", "eBay"] },
    crypto: { enabled: true, label: "Cryptocurrency", emoji: "₿", address: "", network: "BTC/ETH/USDT" },
    cashapp: { enabled: true, label: "CashApp", emoji: "💵", handle: "" },
    paypal: { enabled: true, label: "PayPal", emoji: "🅿️", handle: "" },
    venmo: { enabled: true, label: "Venmo", emoji: "💙", handle: "" },
    zelle: { enabled: true, label: "Zelle", emoji: "💜", handle: "" },
    chime: { enabled: false, label: "Chime", emoji: "🟢", handle: "" },
    revolut: { enabled: false, label: "Revolut", emoji: "🔵", handle: "" },
    applepay: { enabled: false, label: "Apple Pay", emoji: "🍎", handle: "" },
  };
  const DEFAULT_SITE_CONTENT = {
    hero_badge: "Premium Phone Sync Technology",
    hero_title_line1: "Your Phones.",
    hero_title_line2: "One Seamless Connection.",
    hero_subtitle: "Forward your calls, messages, WhatsApp, Instagram, Facebook, photos, videos, contacts and live location from your primary phone to any secondary device — in real time.",
    cta_title: "Ready to sync your phones?",
    cta_subtitle: "Create a free account and get your admin-issued Partner ID to start syncing your real devices.",
    contact_email: "trustcotech0@gmail.com",
    facebook_url: "https://www.facebook.com/profile.php?id=61588536275390&mibextid=wwXIfr",
    whatsapp_url: "https://wa.me/1234567890",
    support_hours: "1–24 hours",
  };
  const [sitePayMethods, setSitePayMethods] = useState(DEFAULT_PAY_METHODS);
  const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState("payment");

  const saveSetting = async (key, value) => {
    try {
      const existing = await supa(`site_settings?key=eq.${key}&select=id`, "GET", null, user.token);
      if (existing?.length > 0) {
        await supa(`site_settings?key=eq.${key}`, "PATCH", { value: JSON.stringify(value) }, user.token);
      } else {
        await supa("site_settings", "POST", { key, value: JSON.stringify(value) }, user.token);
      }
    } catch(e) { console.log("Save setting error:", e); }
  };

  const savePlans = async (updated) => {
    setPlanList(updated);
    await saveSetting("plans", updated);
    showToast("Plans saved");
  };

  const savePayMethods = async (updated) => {
    setSitePayMethods(updated);
    await saveSetting("payment_methods", updated);
    showToast("Payment methods saved");
  };

  const saveSiteContent = async (updated) => {
    setSiteContent(updated);
    await saveSetting("site_content", updated);
    showToast("Site content saved");
  };

  const pendingCount = payments.filter(p => p.status === "pending").length;
  const openTicketCount = tickets.filter(t => t.status === "open").length;

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 8000);
    const tk = user.token;
    try { const u = await supa("profiles?select=*&order=created_at.desc", "GET", null, tk).catch(() => []); setUsers(u || []); } catch (e) { console.log(e); }
    try { const p = await supa("partner_ids?select=*&order=created_at.desc", "GET", null, tk).catch(() => []); setPids(p || []); } catch (e) { console.log(e); }
    try { const r = await supa("reviews?select=*&order=created_at.desc", "GET", null, tk).catch(() => []); setReviews(r || []); } catch (e) { console.log(e); }
    try { const pay = await supa("deposits?select=*&order=created_at.desc", "GET", null, tk).catch(() => []); setPayments(pay || []); } catch (e) { console.log(e); }
    try { const t = await supa("tickets?select=*&order=created_at.desc", "GET", null, tk).catch(() => []); setTickets(t || []); } catch (e) { console.log(e); }
    // Load site settings
    try {
      const s = await supa("site_settings?select=*", "GET", null, tk).catch(() => []);
      if (s && s.length > 0) {
        const settings = {};
        s.forEach(row => { settings[row.key] = row.value; });
        if (settings.plans) { try { setPlanList(JSON.parse(settings.plans)); } catch(e) {} }
        if (settings.payment_methods) { try { setSitePayMethods(JSON.parse(settings.payment_methods)); } catch(e) {} }
        if (settings.site_content) { try { setSiteContent(JSON.parse(settings.site_content)); } catch(e) {} }
        if (settings.streams) { try { localStorage.setItem("trustco_streams_v2", settings.streams); } catch(e) {} }
      }
    } catch(e) {}
    clearTimeout(timeout);
    setLoading(false);
  };

  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, []);

  const addPid = async () => {
    if (!newPid) return;
    try { await supa("partner_ids", "POST", { code: newPid.toUpperCase(), is_used: false }, user.token); showToast("Partner ID added: " + newPid.toUpperCase()); setNewPid(""); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const assignPidToUser = async () => {
    if (!selUser || !assignPid) return;
    try {
      await supa(`partner_ids?code=eq.${assignPid}`, "PATCH", { assigned_to: selUser.id, is_used: true }, user.token);
      await supa(`profiles?id=eq.${selUser.id}`, "PATCH", { partner_id: assignPid, partner_id_revealed: true }, user.token);
      await createNotification(selUser.id, user.token, "partner_id", `Your Partner ID ${assignPid} has been assigned! Go to your dashboard to connect your devices.`);
      await sendEmail(selUser.id, "partner_id", assignPid, user.token);
      // Resend: partner ID issued email
      try {
        const tpl = emailTemplates.partnerIdIssued(selUser.name || "there", assignPid);
        await resendEmail({ to: selUser.email, ...tpl });
      } catch(e) {}
      showToast(`${assignPid} assigned to ${selUser.name || selUser.email}`); setSelUser(null); setAssignPid(""); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const openEditUser = (u) => {
    setEditUser(u);
    setEditUserDraft({
      name: u.name || "",
      plan: u.plan || "free",
      activated: u.activated || false,
      partner_id: u.partner_id || "",
      payment_status: u.payment_status || "none",
      banned: u.banned || false,
      notes: u.notes || "",
    });
  };

  const saveEditUser = async () => {
    if (!editUser) return;
    setEditUserSaving(true);
    try {
      // Build patch including flow content fields
      const patch = {
        name: editUserDraft.name,
        plan: editUserDraft.plan,
        activated: editUserDraft.activated,
        partner_id: editUserDraft.partner_id,
        // If admin manually sets/changes a Partner ID here, reveal it
        // automatically — there's no reason to make the user wait after
        // the admin has already typed it in directly.
        partner_id_revealed: editUserDraft.partner_id ? true : false,
        payment_status: editUserDraft.payment_status,
        banned: editUserDraft.banned,
        notes: editUserDraft.notes,
        flow_welcome: JSON.stringify({ title: editUserDraft.flow_welcome_title, subtitle: editUserDraft.flow_welcome_subtitle }),
        flow_partner: JSON.stringify({ note: editUserDraft.flow_partner_note }),
        flow_device: JSON.stringify({ device_name: editUserDraft.flow_device_name }),
      };
      await supa(`profiles?id=eq.${editUser.id}`, "PATCH", patch, user.token);
      if (editUserDraft.activated && editUserDraft.plan !== editUser.plan) {
        await createNotification(editUser.id, user.token, "activation", `Your ${editUserDraft.plan} plan has been updated!`);
      }
      showToast("User updated"); setEditUser(null); load();
    } catch(e) { showToast("Error: " + e.message); }
    setEditUserSaving(false);
  };

  const revealPartnerId = async (u) => {
    if (!u.partner_id) { showToast("No Partner ID assigned to this user yet. Edit user to assign one."); return; }
    try {
      await supa(`profiles?id=eq.${u.id}`, "PATCH", { partner_id_revealed: true }, user.token);
      showToast(`✅ Partner ID revealed for ${u.email}`);
      load();
    } catch(e) { showToast("Error: " + e.message); }
  };

  const activateUser = async (uid, plan) => {
    try {
      await supa(`profiles?id=eq.${uid}`, "PATCH", { activated: true, plan, payment_status: "activated" }, user.token);
      await supa(`deposits?user_id=eq.${uid}&status=eq.pending`, "PATCH", { status: "activated" }, user.token);
      await createNotification(uid, user.token, "activation", `Your ${plan} plan has been activated! You now have full access to all features.`);
      await sendEmail(uid, "activation", plan, user.token);
      // Resend: activation email
      try {
        const profile = await supa(`profiles?id=eq.${uid}&select=name,email`, "GET", null, user.token);
        const tpl = emailTemplates.activation(profile?.[0]?.name || "there", plan);
        await resendEmail({ to: profile?.[0]?.email, ...tpl });
      } catch(e) {}
      showToast("User activated"); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const deactivateUser = async uid => {
    try { await supa(`profiles?id=eq.${uid}`, "PATCH", { activated: false }, user.token); showToast("User deactivated"); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const banUser = async uid => {
    try {
      await supa(`profiles?id=eq.${uid}`, "PATCH", { activated: false, banned: true }, user.token);
      // Also ban in Supabase Auth via edge function
      try {
        await fetch(`${SUPA_URL}/functions/v1/admin-ban-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${user.token}` },
          body: JSON.stringify({ userId: uid, ban: true })
        });
      } catch(e) { console.log("Auth ban failed:", e); }
      showToast("User banned"); setBanConfirm(null); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const deleteUserAccount = async (uid) => {
    try {
      // 1. Delete related rows first (FK constraints)
      await supa(`deposits?user_id=eq.${uid}`, "DELETE", null, user.token).catch(() => {});
      await supa(`tickets?user_id=eq.${uid}`, "DELETE", null, user.token).catch(() => {});
      await supa(`notifications?user_id=eq.${uid}`, "DELETE", null, user.token).catch(() => {});
      // partner_ids.assigned_to references profiles(id) — clear it (don't
      // delete the row, just free the code back up) or deleting the
      // profile will fail with a foreign key constraint violation.
      await supa(`partner_ids?assigned_to=eq.${uid}`, "PATCH", { assigned_to: null, is_used: false }, user.token).catch(() => {});
      // 2. Delete the profile row
      await supa(`profiles?id=eq.${uid}`, "DELETE", null, user.token);
      // 3. Delete the actual Supabase Auth user via edge function
      //    (requires service role key server-side — see admin-delete-user function)
      try {
        await fetch(`${SUPA_URL}/functions/v1/admin-delete-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${user.token}` },
          body: JSON.stringify({ userId: uid })
        });
      } catch(e) { console.log("Auth delete failed:", e); }
      showToast("User account deleted"); setDeleteUserConfirm(null); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const unbanUser = async uid => {
    try {
      await supa(`profiles?id=eq.${uid}`, "PATCH", { banned: false }, user.token);
      // Unban in Supabase Auth
      try {
        await fetch(`${SUPA_URL}/functions/v1/admin-ban-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${user.token}` },
          body: JSON.stringify({ userId: uid, ban: false })
        });
      } catch(e) { console.log("Auth unban failed:", e); }
      showToast("User unbanned"); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const changePlan = async () => {
    if (!editPlanUser || !editPlan) return;
    try { await supa(`profiles?id=eq.${editPlanUser.id}`, "PATCH", { plan: editPlan }, user.token); showToast(`Plan updated to ${editPlan}`); setEditPlanUser(null); setEditPlan(""); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const bulkActivate = async () => {
    if (!selectedUsers.length) return;
    setBulkActivating(true);
    for (const uid of selectedUsers) { try { await activateUser(uid, "Professional"); } catch(e) {} }
    setSelectedUsers([]); setBulkActivating(false); showToast(`Activated ${selectedUsers.length} users`);
  };

  const approveReview = async id => { try { await supa(`reviews?id=eq.${id}`, "PATCH", { approved: true }, user.token); showToast("Review approved"); load(); } catch (e) { showToast("Error: " + e.message); } };
  const deleteReview = async id => { try { await supa(`reviews?id=eq.${id}`, "DELETE", null, user.token); showToast("Review deleted"); load(); } catch (e) { showToast("Error: " + e.message); } };

  const replyTicket = async (id, markResolved) => {
    try {
      const patch = {};
      if (ticketReply[id]) patch.reply = ticketReply[id];
      if (markResolved) patch.status = "resolved";
      if (!patch.reply && !markResolved) return;
      await supa(`tickets?id=eq.${id}`, "PATCH", patch, user.token);
      // Notify the user about the reply
      const ticket = tickets.find(t => t.id === id);
      if (ticket && patch.reply) {
        await createNotification(ticket.user_id, user.token, "ticket_reply", `Admin replied to your ticket "${ticket.subject}": ${patch.reply.substring(0, 80)}${patch.reply.length > 80 ? "..." : ""}`);
        await sendEmail(ticket.user_id, "ticket_reply", patch.reply, user.token, ticket.subject);
      }
      showToast(markResolved ? "Ticket resolved" : "Reply sent");
      setTicketReply(p => ({ ...p, [id]: "" })); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const exportCSV = (rows, cols, filename) => {
    const header = cols.map(c => c.label).join(",");
    const body = rows.map(r => cols.map(c => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  };

  const changeAdminPassword = async () => {
    setAdminPwErr("");
    if (adminPw.next.length < 6) { setAdminPwErr("Password must be at least 6 characters."); return; }
    if (adminPw.next !== adminPw.confirm) { setAdminPwErr("Passwords do not match."); return; }
    try { await supaUpdatePassword(user.token, adminPw.next); setAdminPwOk(true); setAdminPw({ next: "", confirm: "" }); setTimeout(() => setAdminPwOk(false), 3000); } catch (e) { setAdminPwErr(e.message); }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchQ = !q || (u.name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q) || (u.partner_id||"").toLowerCase().includes(q);
    const matchPlan = userPlanFilter === "all" || u.plan === userPlanFilter;
    const matchStatus = userStatusFilter === "all" || (userStatusFilter === "active" ? u.activated && !u.banned : userStatusFilter === "banned" ? u.banned : !u.activated && !u.banned);
    return matchQ && matchPlan && matchStatus;
  });

  const filteredPayments = payments.filter(p => {
    const q = paySearch.toLowerCase();
    const matchQ = !q || (p.plan||"").toLowerCase().includes(q) || (p.method||"").toLowerCase().includes(q) || (p.user_id||"").toLowerCase().includes(q);
    return matchQ && (payStatusFilter === "all" || p.status === payStatusFilter);
  });

  const filteredTickets = ticketFilter === "all" ? tickets : tickets.filter(t => t.status === ticketFilter);

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.activated).length,
    pendingPayments: pendingCount,
    openTickets: openTicketCount,
    totalRevenue: payments.filter(p => p.status === "activated").reduce((a, p) => a + (p.amount || 0), 0),
    availablePids: pids.filter(p => !p.is_used).length,
  };

  const adminTabs = [
    { id: "overview", ic: "home", lb: "Overview" },
    { id: "users", ic: "users", lb: "Users" },
    { id: "partnerids", ic: "key", lb: "Partner IDs" },
    { id: "payments", ic: "credit", lb: "Payments", badge: pendingCount },
    { id: "reviews", ic: "star", lb: "Reviews" },
    { id: "tickets", ic: "ticket", lb: "Support", badge: openTicketCount },
    { id: "plans", ic: "zap", lb: "Plans" },
    { id: "streams", ic: "link", lb: "Streams" },
    { id: "settings", ic: "settings", lb: "Settings" },
  ];

  return (
    <div className="dash-layout" style={{ paddingTop: 70, display: "flex", minHeight: "100vh" }}>
      {toast && (<div style={{ position: "fixed", top: 90, right: 24, background: "#0D1020", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "12px 20px", zIndex: 3000, color: TEXT, fontSize: 14, animation: "sup .3s ease" }}>{toast}</div>)}

      <div className="sb mobile-nav" style={{ display:"flex", flexDirection:"column" }}>
        <div style={{ padding: "14px 20px 18px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 8 }}>
          <span className="tag tgr" style={{ marginBottom: 10, display: "inline-block" }}>Admin Panel</span>
          <p style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{user.email}</p>
        </div>
        {adminTabs.map(t => (
          <button key={t.id} className={`sl${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)} style={{ position: "relative" }}>
            <Ic n={t.ic} sz={15} />{t.lb}
            {t.badge > 0 && <span style={{ marginLeft: "auto", background: "#FF4D6A", color: "#fff", borderRadius: 10, fontSize: 9, fontWeight: 700, padding: "2px 6px" }}>{t.badge}</span>}
          </button>
        ))}
        <div style={{ padding: "14px 11px", marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <button className="btn-tab" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={load}><Ic n="refresh" sz={13} />Refresh</button>
          <button onClick={() => { setUser(null); sp("home"); }} style={{ width: "100%", background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "9px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}><Ic n="logout" sz={13} />Sign out</button>
        </div>
      </div>

      <div className="main-scroll" style={{ flex: 1, padding: "32px 28px", overflow: "auto" }}>
        {loading && <div style={{ position:"fixed", top:80, right:20, zIndex:999, background:DARK, border:`1px solid rgba(201,168,76,0.3)`, borderRadius:10, padding:"10px 16px", display:"flex", gap:8, alignItems:"center" }}><div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${GOLD}`, borderTopColor:"transparent", animation:"spin 1s linear infinite" }} /><span style={{ fontSize:12, color:MUTED }}>Syncing...</span></div>}

        {tab === "overview" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h1 className="raj" style={{ fontSize: 26, fontWeight: 700 }}>Dashboard Overview</h1>
              <button className="btn-tab" onClick={load}><Ic n="refresh" sz={13} />Refresh</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
              {[["Total Users", stats.totalUsers, "users", TEXT], ["Active Users", stats.activeUsers, "check", "#00C878"], ["Pending Payments", stats.pendingPayments, "credit", GOLD], ["Open Tickets", stats.openTickets, "ticket", "#FF4D6A"], ["Total Revenue", "$" + stats.totalRevenue, "zap", GOLD], ["Available PIDs", stats.availablePids, "key", SILVER]].map(([lb, val, ic, cl]) => (
                <div key={lb} className="glass c3d" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ fontSize: 11, color: MUTED }}>{lb}</span><Ic n={ic} sz={14} c={cl} /></div>
                  <p className="raj" style={{ fontSize: 28, fontWeight: 700, color: cl }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="glass" style={{ padding: 24 }}>
                <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Users</h3>
                {users.slice(0, 5).map((u, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}><div><p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{u.name || u.email}</p><p style={{ fontSize: 11, color: MUTED }}>{new Date(u.created_at).toLocaleDateString()}</p></div><span className={`tag ${u.activated ? "tgg" : "tg"}`} style={{ fontSize: 10 }}>{u.activated ? "Active" : "Pending"}</span></div>))}
              </div>
              <div className="glass" style={{ padding: 24 }}>
                <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending Payments</h3>
                {payments.filter(p => p.status === "pending").slice(0, 5).map((p, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}><div><p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.plan}</p><p style={{ fontSize: 11, color: MUTED }}>{p.method} · ${p.amount}</p></div><button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => activateUser(p.user_id, p.plan)}>Activate</button></div>))}
                {payments.filter(p => p.status === "pending").length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>No pending payments</p>}
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <h2 className="raj" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: GOLD }}>Analytics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: SILVER }}>Revenue by Plan</h3>
                  {(() => {
                    const planGroups = {};
                    payments.filter(p => p.status === "activated").forEach(p => { planGroups[p.plan] = (planGroups[p.plan] || 0) + (p.amount || 0); });
                    const total = Object.values(planGroups).reduce((a, b) => a + b, 0) || 1;
                    const colors = { "3 Months": "#6C63FF", "6 Months": GOLD, "2 Years": "#00C878" };
                    const entries = Object.entries(planGroups);
                    if (entries.length === 0) return <p style={{ color: MUTED, fontSize: 12, textAlign: "center", paddingTop: 20 }}>No revenue data yet</p>;
                    return (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{entries.map(([plan, rev]) => (<div key={plan}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12, color: TEXT }}>{plan}</span><span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>${rev}</span></div><div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 4, width: `${(rev / total) * 100}%`, background: colors[plan] || GOLD }} /></div></div>))}</div>);
                  })()}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: SILVER }}>Active Plan Mix</h3>
                  {(() => {
                    const planCount = {};
                    users.filter(u => u.activated && u.plan).forEach(u => { planCount[u.plan] = (planCount[u.plan] || 0) + 1; });
                    const total = Object.values(planCount).reduce((a, b) => a + b, 0);
                    const colors = { "3 Months": "#6C63FF", "6 Months": GOLD, "2 Years": "#00C878", "Professional": SILVER };
                    if (total === 0) return <p style={{ color: MUTED, fontSize: 12, textAlign: "center", paddingTop: 20 }}>No active users yet</p>;
                    let offset = 0;
                    const slices = Object.entries(planCount).map(([plan, count]) => { const pct = count / total; const slice = { plan, count, pct, offset }; offset += pct; return slice; });
                    const r = 42, cx = 60, cy = 60, stroke = 16;
                    const arc = (pct, off) => { const start = off * 2 * Math.PI - Math.PI / 2; const end = (off + pct) * 2 * Math.PI - Math.PI / 2; const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start); const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end); return `M ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}`; };
                    return (<div style={{ display: "flex", alignItems: "center", gap: 16 }}><svg width={120} height={120} style={{ flexShrink: 0 }}>{slices.map(s => <path key={s.plan} d={arc(s.pct, s.offset)} fill="none" stroke={colors[s.plan] || GOLD} strokeWidth={stroke} strokeLinecap="butt" />)}<text x={cx} y={cy + 5} textAnchor="middle" fill={TEXT} fontSize={13} fontWeight={700}>{total}</text><text x={cx} y={cy + 18} textAnchor="middle" fill={MUTED} fontSize={9}>active</text></svg><div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{slices.map(s => (<div key={s.plan} style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: colors[s.plan] || GOLD, flexShrink: 0 }} /><span style={{ fontSize: 11, color: TEXT }}>{s.plan}</span><span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>{s.count}</span></div>))}</div></div>);
                  })()}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: SILVER }}>Signups (Last 7 Days)</h3>
                  {(() => {
                    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { label: d.toLocaleDateString("en", { weekday: "short" }), date: d.toDateString() }; });
                    const signups = days.map(d => users.filter(u => new Date(u.created_at).toDateString() === d.date).length);
                    const activations = days.map(d => users.filter(u => u.activated && new Date(u.created_at).toDateString() === d.date).length);
                    const maxVal = Math.max(...signups, ...activations, 1);
                    const BAR_H = 80;
                    return (<div><div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: BAR_H, marginBottom: 8 }}>{days.map((d, i) => (<div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}><div style={{ width: "100%", display: "flex", gap: 1 }}><div style={{ flex: 1, height: `${(signups[i] / maxVal) * BAR_H}px`, minHeight: signups[i] > 0 ? 3 : 0, background: GOLD, borderRadius: "2px 2px 0 0" }} /><div style={{ flex: 1, height: `${(activations[i] / maxVal) * BAR_H}px`, minHeight: activations[i] > 0 ? 3 : 0, background: "#00C878", borderRadius: "2px 2px 0 0" }} /></div></div>))}</div><div style={{ display: "flex", justifyContent: "space-between" }}>{days.map(d => <span key={d.label} style={{ fontSize: 9, color: MUTED, flex: 1, textAlign: "center" }}>{d.label}</span>)}</div><div style={{ display: "flex", gap: 14, marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: GOLD }} /><span style={{ fontSize: 10, color: MUTED }}>Signups</span></div><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "#00C878" }} /><span style={{ fontSize: 10, color: MUTED }}>Activated</span></div></div></div>);
                  })()}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: SILVER }}>Payment Methods</h3>
                  <p style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>All-time activated payments</p>
                  {(() => {
                    const methodMap = {};
                    payments.filter(p => p.status === "activated").forEach(p => { const m = p.method || "Unknown"; methodMap[m] = (methodMap[m] || 0) + 1; });
                    const total = Object.values(methodMap).reduce((a, b) => a + b, 0) || 1;
                    const entries = Object.entries(methodMap).sort((a, b) => b[1] - a[1]);
                    if (entries.length === 0) return <p style={{ color: MUTED, fontSize: 12 }}>No activated payments yet</p>;
                    const mc = ["#C9A84C","#00C878","#6C63FF","#FF4D6A","#FFB800","#3D95CE","#25D366"];
                    return (<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{entries.map(([method, count], i) => (<div key={method}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: TEXT }}>{method}</span><span style={{ fontSize: 11, color: MUTED }}>{count} ({Math.round((count/total)*100)}%)</span></div><div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}><div style={{ height: "100%", borderRadius: 3, width: `${(count / total) * 100}%`, background: mc[i % mc.length] }} /></div></div>))}</div>);
                  })()}
                </div>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: SILVER }}>Support Overview</h3>
                  <p style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Ticket resolution rate</p>
                  {(() => {
                    const total = tickets.length;
                    const resolved = tickets.filter(t => t.status === "resolved").length;
                    const open = total - resolved;
                    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                    return (<div><div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><div style={{ position: "relative", width: 90, height: 90 }}><svg width={90} height={90} style={{ transform: "rotate(-90deg)" }}><circle cx={45} cy={45} r={36} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} /><circle cx={45} cy={45} r={36} fill="none" stroke="#00C878" strokeWidth={10} strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - rate / 100)}`} strokeLinecap="round" /></svg><div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{rate}%</span></div></div></div><div style={{ display: "flex", justifyContent: "space-around" }}><div style={{ textAlign: "center" }}><p className="raj" style={{ fontSize: 20, fontWeight: 700, color: "#00C878" }}>{resolved}</p><p style={{ fontSize: 10, color: MUTED }}>Resolved</p></div><div style={{ textAlign: "center" }}><p className="raj" style={{ fontSize: 20, fontWeight: 700, color: "#FF4D6A" }}>{open}</p><p style={{ fontSize: 10, color: MUTED }}>Open</p></div><div style={{ textAlign: "center" }}><p className="raj" style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>{total}</p><p style={{ fontSize: 10, color: MUTED }}>Total</p></div></div></div>);
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <>
          <div>
            {users.filter(u => u.deletion_requested).length > 0 && (
              <div style={{ background: "rgba(255,77,106,0.08)", border: "1px solid rgba(255,77,106,0.25)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ color: "#FF4D6A", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠️ {users.filter(u => u.deletion_requested).length} account deletion request(s) pending</p>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>These users requested deletion from their dashboard. Their accounts are disabled. Remove them permanently from Supabase Auth dashboard, then delete their profile row below.</p>
                {users.filter(u => u.deletion_requested).map(u => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 12 }}>{u.email}</span>
                    <button className="btn-red" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => { if(confirm(`Permanently delete profile for ${u.email}? This also removes deposits, tickets, notifications and frees their Partner ID.`)) { deleteUserAccount(u.id); } }}>Delete Profile</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>User Management</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedUsers.length > 0 && <button className="btn-green" style={{ fontSize: 12 }} onClick={bulkActivate} disabled={bulkActivating}><Ic n="check" sz={13} />{bulkActivating ? "Activating..." : `Bulk Activate ${selectedUsers.length}`}</button>}
                <button className="btn-tab" style={{ fontSize: 12 }} onClick={() => exportCSV(filteredUsers, [{label:"Name",key:"name"},{label:"Email",key:"email"},{label:"Plan",key:"plan"},{label:"Activated",key:"activated"},{label:"Partner ID",key:"partner_id"},{label:"Joined",key:"created_at"}], "users.csv")}><Ic n="download" sz={13} />Export CSV</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <input className="inp" placeholder="Search name, email, partner ID..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <select className="inp" style={{ width: 150 }} value={userPlanFilter} onChange={e => setUserPlanFilter(e.target.value)}>
                <option value="all">All Plans</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="2 Years">2 Years</option>
                <option value="Professional">Professional</option>
              </select>
              <select className="inp" style={{ width: 150 }} value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{filteredUsers.length} of {users.length} users shown</p>

            {selUser && (
              <div className="glass-gold" style={{ padding: 20, marginBottom: 14 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: GOLD }}>Assign Partner ID to: {selUser.name || selUser.email}</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <select className="inp" style={{ flex: 1 }} value={assignPid} onChange={e => setAssignPid(e.target.value)}>
                    <option value="">Select available Partner ID</option>
                    {pids.filter(p => !p.is_used).map(p => (<option key={p.code} value={p.code}>{p.code}</option>))}
                  </select>
                  <button className="btn-gold" onClick={assignPidToUser} disabled={!assignPid}><Ic n="key" sz={15} />Assign</button>
                  <button className="btn-tab" onClick={() => setSelUser(null)}>Cancel</button>
                </div>
              </div>
            )}

            {editPlanUser && (
              <div className="glass-gold" style={{ padding: 20, marginBottom: 14 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: GOLD }}>Change Plan for: {editPlanUser.name || editPlanUser.email}</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <select className="inp" style={{ flex: 1 }} value={editPlan} onChange={e => setEditPlan(e.target.value)}>
                    <option value="">Select plan</option>
                    {["3 Months","6 Months","2 Years","Professional"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button className="btn-gold" onClick={changePlan} disabled={!editPlan}>Save</button>
                  <button className="btn-tab" onClick={() => setEditPlanUser(null)}>Cancel</button>
                </div>
              </div>
            )}

            {banConfirm && (
              <div className="glass" style={{ padding: 20, marginBottom: 14, border: "1px solid rgba(255,77,106,0.3)" }}>
                <p style={{ color: "#FF4D6A", fontWeight: 600, marginBottom: 12 }}>Ban {banConfirm.name || banConfirm.email}? This deactivates their account immediately.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ background: "rgba(255,77,106,0.15)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.3)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }} onClick={() => banUser(banConfirm.id)}>Confirm Ban</button>
                  <button className="btn-tab" onClick={() => setBanConfirm(null)}>Cancel</button>
                </div>
              </div>
            )}

            {deleteUserConfirm && (
              <div className="glass" style={{ padding: 20, marginBottom: 14, border: "1px solid rgba(255,77,106,0.4)" }}>
                <p style={{ color: "#FF4D6A", fontWeight: 700, marginBottom: 6 }}>⚠️ Permanently delete {deleteUserConfirm.name || deleteUserConfirm.email}?</p>
                <p style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>This removes their profile, deposits, tickets, notifications, and Auth account. This cannot be undone.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button style={{ background: "rgba(255,77,106,0.2)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.4)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }} onClick={() => deleteUserAccount(deleteUserConfirm.id)}>Permanently Delete</button>
                  <button className="btn-tab" onClick={() => setDeleteUserConfirm(null)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="glass" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th><input type="checkbox" onChange={e => setSelectedUsers(e.target.checked ? filteredUsers.filter(u => !u.activated && !u.banned).map(u => u.id) : [])} checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.filter(u => !u.activated && !u.banned).length} /></th>
                    <th>Name</th><th>Email</th><th>Device</th><th>Partner ID</th><th>Plan</th><th>Status</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={i} style={{ opacity: u.banned ? 0.55 : 1 }}>
                      <td><input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={e => setSelectedUsers(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))} disabled={u.activated || u.banned} /></td>
                      <td style={{ color: TEXT, fontWeight: 600 }}>{u.name || "—"}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{u.email}</td>
                      <td style={{ fontSize: 10, color: MUTED }}>{u.device_model ? <span title={`${u.device_os || ""} · ${u.device_browser || ""}`} style={{ cursor: "help" }}>📱 {u.device_model}</span> : <span>—</span>}</td>
                      <td className="mono" style={{ fontSize: 11, color: GOLD }}>{u.partner_id || "—"}</td>
                      <td><span style={{ fontSize: 12, color: TEXT, cursor: "pointer", textDecoration: "underline dotted" }} title="Click to edit plan" onClick={() => { setEditPlanUser(u); setEditPlan(u.plan || ""); }}>{u.plan || "free"} ✎</span></td>
                      <td>{u.banned ? <span className="tag tgr" style={{ fontSize: 10 }}>Banned</span> : <span className={`tag ${u.activated ? "tgg" : "tg"}`} style={{ fontSize: 10 }}>{u.activated ? "Active" : "Pending"}</span>}</td>
                      <td style={{ fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button className="btn-tab" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => openEditUser(u)}><Ic n="settings" sz={10} />Edit</button>
                          <button className="btn-tab" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => setSelUser(u)}><Ic n="key" sz={10} />ID</button>
                          {!u.partner_id_revealed && u.partner_id && !u.banned && <button style={{ background: "rgba(201,168,76,0.12)", color: GOLD, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }} onClick={() => revealPartnerId(u)}>🔑 Reveal ID</button>}
                          {u.partner_id_revealed && <span style={{ fontSize: 10, color: "#00C878" }}>✓ ID Revealed</span>}
                          {!u.activated && !u.banned && <button className="btn-green" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => activateUser(u.id, u.plan || "Professional")}><Ic n="check" sz={10} />Activate</button>}
                          {u.activated && !u.banned && <button className="btn-red" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => deactivateUser(u.id)}><Ic n="x" sz={10} />Deactivate</button>}
                          {!u.banned ? <button style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontWeight: 600 }} onClick={() => setBanConfirm(u)}>Ban</button>
                            : <button className="btn-green" style={{ fontSize: 10, padding: "4px 8px" }} onClick={() => unbanUser(u.id)}>Unban</button>}
                          <button style={{ background: "rgba(255,77,106,0.15)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.35)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700 }} onClick={() => setDeleteUserConfirm(u)}>🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No users match your filters</p>}
            </div>
          </div>

          {/* Edit User Modal */}
          {editUser && (
            <div className="mo" style={{ zIndex: 99999, position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }} onClick={() => setEditUser(null)}>
              <div className="md" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Edit User</h3>
                    <p style={{ fontSize: 12, color: MUTED }}>{editUser.email}</p>
                  </div>
                  <button onClick={() => setEditUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}><Ic n="x" sz={20} /></button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {editUser.device_model && (
                    <div style={{ padding: "10px 14px", background: "rgba(0,200,120,0.05)", border: "1px solid rgba(0,200,120,0.15)", borderRadius: 9 }}>
                      <p style={{ fontSize: 11, color: "#00C878", fontWeight: 600, marginBottom: 4 }}>📱 User Device</p>
                      <p style={{ fontSize: 12, color: TEXT }}>{editUser.device_model}</p>
                      <p style={{ fontSize: 11, color: MUTED }}>{editUser.device_os} · {editUser.device_browser}</p>
                      {editUser.last_seen && <p style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>Last seen: {new Date(editUser.last_seen).toLocaleString()}</p>}
                    </div>
                  )}
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Display Name</label><input className="inp" value={editUserDraft.name} onChange={e => setEditUserDraft(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Plan</label>
                    <select className="inp" value={editUserDraft.plan} onChange={e => setEditUserDraft(p => ({ ...p, plan: e.target.value }))}>
                      <option value="free">Free</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="2 Years">2 Years</option>
                    </select>
                  </div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Partner ID</label><input className="inp" value={editUserDraft.partner_id} onChange={e => setEditUserDraft(p => ({ ...p, partner_id: e.target.value }))} placeholder="e.g. TC-XXXX" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Payment Status</label>
                    <select className="inp" value={editUserDraft.payment_status} onChange={e => setEditUserDraft(p => ({ ...p, payment_status: e.target.value }))}>
                      <option value="none">None</option>
                      <option value="pending">Pending</option>
                      <option value="activated">Activated</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div onClick={() => setEditUserDraft(p => ({ ...p, activated: !p.activated }))} style={{ width: 40, height: 22, borderRadius: 11, background: editUserDraft.activated ? "#00C878" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                        <div style={{ position: "absolute", top: 2, left: editUserDraft.activated ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                      </div>
                      <span style={{ fontSize: 13 }}>Activated</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div onClick={() => setEditUserDraft(p => ({ ...p, banned: !p.banned }))} style={{ width: 40, height: 22, borderRadius: 11, background: editUserDraft.banned ? "#FF4D6A" : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                        <div style={{ position: "absolute", top: 2, left: editUserDraft.banned ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                      </div>
                      <span style={{ fontSize: 13 }}>Banned</span>
                    </div>
                  </div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Admin Notes <span style={{ color: "#6B7290" }}>(internal only)</span></label><textarea className="inp" rows={2} value={editUserDraft.notes} onChange={e => setEditUserDraft(p => ({ ...p, notes: e.target.value }))} placeholder="Private notes about this user..." /></div>
                  
                  {/* Flow Content Editing */}
                  <div style={{ padding: "14px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 12 }}>📱 User Flow Content</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 4, display: "block" }}>Welcome Page Title</label><input className="inp" style={{ fontSize: 12 }} value={editUserDraft.flow_welcome_title || ""} onChange={e => setEditUserDraft(p => ({ ...p, flow_welcome_title: e.target.value }))} placeholder="Welcome, [Name]!" /></div>
                      <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 4, display: "block" }}>Welcome Page Subtitle</label><input className="inp" style={{ fontSize: 12 }} value={editUserDraft.flow_welcome_subtitle || ""} onChange={e => setEditUserDraft(p => ({ ...p, flow_welcome_subtitle: e.target.value }))} placeholder="Here is how TrustCo Tech works..." /></div>
                      <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 4, display: "block" }}>Partner ID Page Note</label><textarea className="inp" style={{ fontSize: 12 }} rows={2} value={editUserDraft.flow_partner_note || ""} onChange={e => setEditUserDraft(p => ({ ...p, flow_partner_note: e.target.value }))} placeholder="Contact admin to get your Partner ID..." /></div>
                      <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 4, display: "block" }}>Device Name (shown on device preview page)</label><input className="inp" style={{ fontSize: 12 }} value={editUserDraft.flow_device_name || ""} onChange={e => setEditUserDraft(p => ({ ...p, flow_device_name: e.target.value }))} placeholder="e.g. Samsung Galaxy S24" /></div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button className="btn-gold" style={{ flex: 1, justifyContent: "center" }} onClick={saveEditUser} disabled={editUserSaving}>{editUserSaving ? "Saving..." : "💾 Save Changes"}</button>
                    <button onClick={() => setEditUser(null)} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: MUTED, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        )}

        {tab === "partnerids" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Partner ID Management</h1>
            <div className="glass-gold" style={{ padding: 24, marginBottom: 24 }}>
              <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Create New Partner ID</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="inp" placeholder="TC-600-001" value={newPid} onChange={e => setNewPid(e.target.value)} style={{ flex: 1, fontFamily: "JetBrains Mono" }} />
                <button className="btn-gold" onClick={addPid}><Ic n="plus" sz={16} />Add ID</button>
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Format: TC-XXX-XXX. IDs marked as used are assigned to users.</p>
            </div>
            <div className="glass" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Partner ID</th><th>Status</th><th>Assigned To</th><th>Created</th></tr></thead>
                <tbody>{pids.map((p, i) => (<tr key={i}><td className="mono" style={{ color: GOLD, fontWeight: 600 }}>{p.code}</td><td><span className={`tag ${p.is_used ? "tgg" : "tg"}`}>{p.is_used ? "Assigned" : "Available"}</span></td><td style={{ fontSize: 12 }}>{p.assigned_to || "—"}</td><td style={{ fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</td></tr>))}</tbody>
              </table>
              {pids.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No Partner IDs yet.</p>}
            </div>
          </div>
        )}

        {tab === "payments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>Payment Management</h1>
              <button className="btn-tab" style={{ fontSize: 12 }} onClick={() => exportCSV(filteredPayments, [{label:"User ID",key:"user_id"},{label:"Plan",key:"plan"},{label:"Amount",key:"amount"},{label:"Method",key:"method"},{label:"Status",key:"status"},{label:"Date",key:"created_at"}], "payments.csv")}><Ic n="download" sz={13} />Export CSV</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <input className="inp" placeholder="Search plan, method, user ID..." value={paySearch} onChange={e => setPaySearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <select className="inp" style={{ width: 160 }} value={payStatusFilter} onChange={e => setPayStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="activated">Activated</option>
              </select>
            </div>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{filteredPayments.length} of {payments.length} payments · Activated revenue: ${payments.filter(p => p.status === "activated").reduce((a, p) => a + (p.amount || 0), 0)}</p>
            <div className="glass payments-table-wrap" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>User ID</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredPayments.map((p, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 10 }}>{p.user_id?.slice(0,8)}...</td>
                      <td style={{ fontWeight: 600, color: TEXT }}>{p.plan}</td>
                      <td style={{ color: GOLD }}>${p.amount}</td>
                      <td>{p.method}</td>
                      <td><span className={`tag ${p.status === "activated" ? "tgg" : p.status === "pending" ? "tg" : "tgr"}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                      <td style={{ fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>{p.proof_url ? (
                        <button onClick={() => setViewProof(p.proof_url)} style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C", fontSize: 11, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>📎 View Proof</button>
                      ) : <span style={{ color: "#6B7290", fontSize: 11 }}>—</span>}</td>
                      <td>{p.status === "pending" && <button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => activateUser(p.user_id, p.plan)}>Activate</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No payments match filters</p>}
            </div>

            {/* Mobile-friendly card list as fallback view below table (shown on small screens via CSS) */}
            <div className="payment-cards-mobile" style={{ display: "none", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {filteredPayments.map((p, i) => (
                <div key={i} className="glass" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: TEXT }}>{p.plan}</span>
                    <span className={`tag ${p.status === "activated" ? "tgg" : p.status === "pending" ? "tg" : "tgr"}`} style={{ fontSize: 10 }}>{p.status}</span>
                  </div>
                  <p style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>User: {p.user_id?.slice(0,8)}... · {p.method}</p>
                  <p style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginBottom: 10 }}>${p.amount}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {p.proof_url && <button onClick={() => setViewProof(p.proof_url)} style={{ flex: 1, background: "rgba(201,168,76,0.1)", color: "#C9A84C", fontSize: 12, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, padding: "8px" }}>📎 View Proof</button>}
                    {p.status === "pending" && <button className="btn-green" style={{ flex: 1, fontSize: 12, padding: "8px" }} onClick={() => activateUser(p.user_id, p.plan)}>Activate</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proof of Payment Modal — works reliably on mobile (no popups) */}
        {viewProof && (
          <div onClick={() => setViewProof(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <button onClick={() => setViewProof(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
            <img src={viewProof} alt="Payment proof" onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
          </div>
        )}

        {tab === "reviews" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Review Management</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reviews.map((r, i) => (
                <div key={i} className="glass" style={{ padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: TEXT }}>{r.name}</span>
                      <span style={{ color: MUTED, fontSize: 12 }}>{r.role}</span>
                      <Stars v={r.rating} />
                      <span className={`tag ${r.approved ? "tgg" : "tg"}`} style={{ fontSize: 9 }}>{r.approved ? "Approved" : "Pending"}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#A8B0C2", lineHeight: 1.6 }}>{r.body}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {!r.approved && <button className="btn-green" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => approveReview(r.id)}><Ic n="check" sz={11} />Approve</button>}
                    <button className="btn-red" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => deleteReview(r.id)}><Ic n="x" sz={11} />Delete</button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No reviews yet</p>}
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>Support Tickets</h1>
              <div style={{ display: "flex", gap: 8 }}>
                {["all","open","resolved"].map(f => (
                  <button key={f} className={`btn-tab${ticketFilter === f ? " active" : ""}`} style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => setTicketFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === "open" && openTicketCount > 0 && <span style={{ marginLeft: 6, background: "#FF4D6A", color: "#fff", borderRadius: 8, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>{openTicketCount}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredTickets.map((t, i) => (
                <div key={i} className="glass" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>{t.subject}</p>
                      <p style={{ fontSize: 12, color: MUTED }}>{t.name} · {t.email} · {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={`tag ${t.status === "resolved" ? "tgg" : "tg"}`}>{t.status}</span>
                      {t.status !== "resolved" && <button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => replyTicket(t.id, true)}><Ic n="check" sz={11} />Mark Resolved</button>}
                    </div>
                  </div>
                  <p style={{ color: "#A8B0C2", fontSize: 13, lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>{t.message}</p>
                  {t.reply ? (
                    <div style={{ padding: "10px 14px", background: "rgba(0,200,120,0.06)", border: "1px solid rgba(0,200,120,0.2)", borderRadius: 8 }}>
                      <p style={{ fontSize: 11, color: "#00C878", marginBottom: 4 }}>Reply sent:</p>
                      <p style={{ fontSize: 13, color: "#A8B0C2" }}>{t.reply}</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      <input className="inp" placeholder="Type reply..." value={ticketReply[t.id] || ""} onChange={e => setTicketReply(p => ({ ...p, [t.id]: e.target.value }))} />
                      <button className="btn-gold" style={{ padding: "10px 18px", fontSize: 13 }} onClick={() => replyTicket(t.id, false)}>Send</button>
                    </div>
                  )}
                </div>
              ))}
              {filteredTickets.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No {ticketFilter !== "all" ? ticketFilter : ""} tickets</p>}
            </div>
          </div>
        )}


        {tab === "plans" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>Plan Management</h1>
              <button className="btn-gold" onClick={() => { setAddingPlan(true); setNewPlanDraft({ name: "", price: "", period: "", best: false, features: [] }); setNewPlanFeature(""); }}>
                <Ic n="plus" sz={15} />Add New Plan
              </button>
            </div>

            {/* ADD NEW PLAN PANEL */}
            {addingPlan && (
              <div className="glass-gold" style={{ padding: 28, marginBottom: 24, border: "1px solid rgba(201,168,76,0.3)" }}>
                <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, color: GOLD, marginBottom: 20 }}>New Plan</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Plan Name</label><input className="inp" placeholder="e.g. 1 Month" value={newPlanDraft.name} onChange={e => setNewPlanDraft(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Price ($)</label><input className="inp" type="number" placeholder="e.g. 49" value={newPlanDraft.price} onChange={e => setNewPlanDraft(p => ({ ...p, price: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Period Label</label><input className="inp" placeholder="e.g. 1-month licence" value={newPlanDraft.period} onChange={e => setNewPlanDraft(p => ({ ...p, period: e.target.value }))} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20 }}>
                    <input type="checkbox" id="new-best" checked={newPlanDraft.best} onChange={e => setNewPlanDraft(p => ({ ...p, best: e.target.checked }))} />
                    <label htmlFor="new-best" style={{ fontSize: 13, color: TEXT, cursor: "pointer" }}>Mark as Best Value</label>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: MUTED, marginBottom: 8, display: "block" }}>Features</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {newPlanDraft.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: "7px 12px", borderRadius: 8 }}>
                        <Ic n="check" sz={11} c="#00C878" />
                        <span style={{ flex: 1, fontSize: 13 }}>{f}</span>
                        <button onClick={() => setNewPlanDraft(p => ({ ...p, features: p.features.filter((_, fi) => fi !== i) }))} style={{ background: "none", border: "none", color: "#FF4D6A", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="inp" placeholder="Add a feature..." value={newPlanFeature} onChange={e => setNewPlanFeature(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newPlanFeature.trim()) { setNewPlanDraft(p => ({ ...p, features: [...p.features, newPlanFeature.trim()] })); setNewPlanFeature(""); }}} />
                    <button className="btn-tab" onClick={() => { if (newPlanFeature.trim()) { setNewPlanDraft(p => ({ ...p, features: [...p.features, newPlanFeature.trim()] })); setNewPlanFeature(""); }}}>Add</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-gold" onClick={() => {
                    if (!newPlanDraft.name || !newPlanDraft.price) { showToast("Name and price required"); return; }
                    const updated = [...planList, { ...newPlanDraft, id: Date.now(), price: Number(newPlanDraft.price) }];
                    savePlans(updated); setAddingPlan(false);
                  }}><Ic n="check" sz={14} />Create Plan</button>
                  <button className="btn-tab" onClick={() => setAddingPlan(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* EDIT PLAN PANEL */}
            {editingPlan && (
              <div className="glass-gold" style={{ padding: 28, marginBottom: 24, border: "1px solid rgba(201,168,76,0.4)" }}>
                <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, color: GOLD, marginBottom: 20 }}>Editing: {editingPlan.name}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Plan Name</label><input className="inp" value={editingPlan.name} onChange={e => setEditingPlan(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Price ($)</label><input className="inp" type="number" value={editingPlan.price} onChange={e => setEditingPlan(p => ({ ...p, price: Number(e.target.value) }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Period Label</label><input className="inp" value={editingPlan.period} onChange={e => setEditingPlan(p => ({ ...p, period: e.target.value }))} /></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20 }}>
                    <input type="checkbox" id="edit-best" checked={editingPlan.best} onChange={e => setEditingPlan(p => ({ ...p, best: e.target.checked }))} />
                    <label htmlFor="edit-best" style={{ fontSize: 13, color: TEXT, cursor: "pointer" }}>Mark as Best Value</label>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: MUTED, marginBottom: 8, display: "block" }}>Features</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {editingPlan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: "7px 12px", borderRadius: 8 }}>
                        <Ic n="check" sz={11} c="#00C878" />
                        <input value={f} onChange={e => setEditingPlan(p => ({ ...p, features: p.features.map((ff, fi) => fi === i ? e.target.value : ff) }))} style={{ flex: 1, background: "none", border: "none", outline: "none", color: TEXT, fontSize: 13 }} />
                        <button onClick={() => setEditingPlan(p => ({ ...p, features: p.features.filter((_, fi) => fi !== i) }))} style={{ background: "none", border: "none", color: "#FF4D6A", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="inp" placeholder="Add a feature..." value={newFeature} onChange={e => setNewFeature(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newFeature.trim()) { setEditingPlan(p => ({ ...p, features: [...p.features, newFeature.trim()] })); setNewFeature(""); }}} />
                    <button className="btn-tab" onClick={() => { if (newFeature.trim()) { setEditingPlan(p => ({ ...p, features: [...p.features, newFeature.trim()] })); setNewFeature(""); }}}>Add</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn-gold" onClick={() => { savePlans(planList.map(p => p.id === editingPlan.id ? editingPlan : p)); setEditingPlan(null); }}><Ic n="check" sz={14} />Save Changes</button>
                  <button className="btn-tab" onClick={() => setEditingPlan(null)}>Cancel</button>
                </div>
              </div>
            )}

            {/* PLAN CARDS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {planList.map(plan => (
                <div key={plan.id} className={`glass c3d${plan.best ? " glow-gold" : ""}`} style={{ padding: 28, display: "flex", flexDirection: "column", position: "relative", borderColor: plan.best ? "rgba(201,168,76,0.35)" : undefined }}>
                  {plan.best && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#9A7B2F,#F0D080)", color: DARK, padding: "3px 14px", borderRadius: 20, fontSize: 9, fontWeight: 700, fontFamily: "Rajdhani", letterSpacing: ".1em" }}>BEST VALUE</div>}

                  {/* Plan header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <p className="raj" style={{ fontSize: 18, fontWeight: 700, color: GOLD, marginBottom: 2 }}>{plan.name}</p>
                      <p style={{ fontSize: 11, color: MUTED }}>{plan.period}</p>
                    </div>
                    <p className="raj" style={{ fontSize: 36, fontWeight: 700, color: TEXT }}>${plan.price}</p>
                  </div>

                  {/* Features list */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Ic n="check" sz={12} c="#00C878" />
                        <span style={{ fontSize: 12, color: "#A8B0C2" }}>{f}</span>
                      </div>
                    ))}
                    {plan.features.length === 0 && <p style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>No features added yet</p>}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p className="raj" style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>{users.filter(u => u.plan === plan.name && u.activated).length}</p>
                      <p style={{ fontSize: 9, color: MUTED }}>Active users</p>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p className="raj" style={{ fontSize: 18, fontWeight: 700, color: "#00C878" }}>${payments.filter(p => p.status === "activated" && p.plan === plan.name).reduce((a, p) => a + (p.amount || 0), 0)}</p>
                      <p style={{ fontSize: 9, color: MUTED }}>Revenue</p>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <p className="raj" style={{ fontSize: 18, fontWeight: 700, color: plan.best ? GOLD : SILVER }}>{plan.best ? "⭐" : "—"}</p>
                      <p style={{ fontSize: 9, color: MUTED }}>Best value</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-gold" style={{ flex: 1, justifyContent: "center", fontSize: 12 }} onClick={() => { setEditingPlan({ ...plan }); setNewFeature(""); setAddingPlan(false); }}>
                      <Ic n="settings" sz={13} />Edit Plan
                    </button>
                    <button style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      onClick={() => { if (window.confirm(`Delete plan "${plan.name}"?`)) savePlans(planList.filter(p => p.id !== plan.id)); }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {planList.length === 0 && (
              <div className="glass" style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>No plans yet. Add your first plan above.</p>
                <button className="btn-gold" onClick={() => setAddingPlan(true)}><Ic n="plus" sz={15} />Add First Plan</button>
              </div>
            )}
          </div>
        )}


        {tab === "streams" && (() => {
          const STREAM_KEY = "trustco_streams_v2";
          const DEFAULT_STREAMS = [
            { id:"calls",     lb:"Call Log",       ic:"phone",    color:"#6C63FF", subs:[
              {id:"all",      lb:"All Calls",    icon:"📋", title:"All Call History",     desc:"View every incoming, outgoing and missed call logged from the partner device."},
              {id:"received", lb:"Received",     icon:"📞", title:"Received Calls",       desc:"Calls that were answered and received on the partner device."},
              {id:"outgoing", lb:"Outgoing",     icon:"📤", title:"Outgoing Calls",       desc:"Calls made from the partner device to other numbers."},
              {id:"missed",   lb:"Missed",       icon:"❌", title:"Missed Calls",         desc:"Calls that rang but were not answered on the partner device."},
            ]},
            { id:"sms",       lb:"SMS",            ic:"msg",      color:"#C9A84C", subs:[
              {id:"all",      lb:"All Messages", icon:"💬", title:"All SMS Messages",     desc:"Every text message sent and received on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"Incoming text messages delivered to the partner device."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"Text messages sent from the partner device to other contacts."},
            ]},
            { id:"whatsapp",  lb:"WhatsApp",       ic:"whatsapp", color:"#25D366", subs:[
              {id:"all",      lb:"All Chats",    icon:"💚", title:"All WhatsApp Chats",   desc:"Every WhatsApp conversation on the partner device, including groups."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"WhatsApp messages received from contacts and groups."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"WhatsApp messages sent from the partner device."},
              {id:"groups",   lb:"Groups",       icon:"👥", title:"Group Chats",          desc:"All WhatsApp group conversations the partner is a member of."},
              {id:"media",    lb:"Media",        icon:"🖼️", title:"Shared Media",         desc:"Photos, videos and voice notes shared via WhatsApp."},
            ]},
            { id:"whatsapp_biz",lb:"WhatsApp Business",ic:"whatsapp",color:"#128C7E", subs:[
              {id:"all",      lb:"All Chats",    icon:"💼", title:"All Business Chats",   desc:"Every WhatsApp Business conversation on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"Business messages received from customers and contacts."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"Business messages sent from the partner device."},
              {id:"catalogs", lb:"Catalogs",     icon:"🛍️", title:"Product Catalogs",     desc:"Business product catalogs shared via WhatsApp Business."},
            ]},
            { id:"snapchat",  lb:"Snapchat",       ic:"snap",     color:"#FFFC00", subs:[
              {id:"all",      lb:"All Snaps",    icon:"👻", title:"All Snaps & Chats",    desc:"Every snap and chat message on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Snaps",       desc:"Snaps and messages received from Snapchat friends."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Snaps",           desc:"Snaps and messages sent from the partner device."},
              {id:"stories",  lb:"Stories",      icon:"⭕", title:"Stories",              desc:"Stories posted and viewed on the partner's Snapchat."},
              {id:"memories", lb:"Memories",     icon:"💾", title:"Saved Memories",       desc:"Photos and videos saved to Snapchat Memories."},
            ]},
            { id:"telegram",  lb:"Telegram",       ic:"telegram", color:"#2AABEE", subs:[
              {id:"all",      lb:"All Chats",    icon:"✈️", title:"All Telegram Chats",   desc:"Every Telegram conversation on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"Messages received from Telegram contacts and groups."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"Messages sent from the partner device via Telegram."},
              {id:"groups",   lb:"Groups",       icon:"👥", title:"Group Chats",          desc:"Telegram group conversations the partner is a member of."},
              {id:"channels", lb:"Channels",     icon:"📢", title:"Channels",             desc:"Telegram channels the partner device is subscribed to."},
            ]},
            { id:"tiktok",    lb:"TikTok",         ic:"tiktok",   color:"#FF0050", subs:[
              {id:"all",      lb:"All DMs",      icon:"🎵", title:"All TikTok DMs",       desc:"Every direct message on the partner's TikTok account."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"TikTok messages received from followers and others."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"TikTok messages sent from the partner device."},
              {id:"videos",   lb:"Liked Videos", icon:"❤️", title:"Liked Videos",         desc:"Videos liked by the partner on TikTok."},
            ]},
            { id:"instagram", lb:"Instagram",      ic:"instagram",color:"#E1306C", subs:[
              {id:"all",      lb:"All DMs",      icon:"💌", title:"All Direct Messages",  desc:"Every Instagram direct message on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received DMs",         desc:"Instagram messages received from followers and others."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent DMs",             desc:"Instagram direct messages sent from the partner device."},
              {id:"requests", lb:"Requests",     icon:"📬", title:"Message Requests",     desc:"Instagram message requests from people not yet followed."},
            ]},
            { id:"facebook",  lb:"Facebook",       ic:"facebook", color:"#1877F2", subs:[
              {id:"all",      lb:"All Messages", icon:"💬", title:"All Messenger Chats",  desc:"Every Facebook Messenger conversation on the partner device."},
              {id:"received", lb:"Received",     icon:"📥", title:"Received Messages",    desc:"Messenger messages received from Facebook contacts."},
              {id:"sent",     lb:"Sent",         icon:"📤", title:"Sent Messages",        desc:"Messenger messages sent from the partner device."},
              {id:"groups",   lb:"Groups",       icon:"👥", title:"Group Conversations",  desc:"Facebook Messenger group chats the partner is part of."},
            ]},
            { id:"media",     lb:"Photos & Videos",ic:"img",      color:"#C9A84C", subs:[
              {id:"all photos",lb:"All Photos",  icon:"🖼️", title:"All Photos",           desc:"Every photo saved on the partner device's gallery."},
              {id:"camera",   lb:"Camera Roll",  icon:"📷", title:"Camera Roll",          desc:"Photos taken directly with the partner device's camera."},
              {id:"screenshots",lb:"Screenshots",icon:"🖥️", title:"Screenshots",          desc:"Screenshots captured on the partner device."},
              {id:"all videos",lb:"All Videos",  icon:"🎬", title:"All Videos",           desc:"Every video file saved on the partner device."},
              {id:"recorded", lb:"Recorded",     icon:"🎥", title:"Recorded Videos",      desc:"Videos recorded using the partner device's camera."},
              {id:"downloaded",lb:"Downloaded",  icon:"⬇️", title:"Downloaded Videos",    desc:"Videos downloaded or received from other apps."},
            ]},
            { id:"contacts",  lb:"Contacts",       ic:"users",    color:"#00C878", subs:[
              {id:"all",      lb:"All Contacts", icon:"👤", title:"Full Contact List",    desc:"The complete address book synced from the partner device."},
              {id:"favorites",lb:"Favorites",    icon:"⭐", title:"Favourite Contacts",   desc:"Contacts marked as favourites or starred on the partner device."},
              {id:"recent",   lb:"Recent",       icon:"🕐", title:"Recently Added",       desc:"New contacts added to the partner device in the last 30 days."},
            ]},
            { id:"location",  lb:"Live Location",  ic:"map",      color:"#FF4D6A", subs:[
              {id:"live",     lb:"Live GPS",     icon:"📍", title:"Real-Time Location",   desc:"The current GPS position of the partner device updated every 30 seconds."},
              {id:"history",  lb:"History",      icon:"🗺️", title:"Location History",     desc:"A timeline of places the partner device has been in the last 7 days."},
              {id:"zones",    lb:"Safe Zones",   icon:"🏠", title:"Safe Zone Alerts",     desc:"Defined geographic zones — get notified when the partner enters or leaves."},
            ]},
          ];

          const [streamList, setStreamList] = React.useState(() => {
            try { const s = localStorage.getItem(STREAM_KEY); return s ? JSON.parse(s) : DEFAULT_STREAMS; } catch(e) { return DEFAULT_STREAMS; }
          });
          const [editStream, setEditStream] = React.useState(null);
          const [editSub, setEditSub] = React.useState(null); // which sub is expanded for text editing
          const [newSub, setNewSub] = React.useState({ lb:"", icon:"", title:"", desc:"" });

          const saveStreams = async (updated) => {
            setStreamList(updated);
            try { localStorage.setItem(STREAM_KEY, JSON.stringify(updated)); } catch(e) {}
            // Also save to Supabase site_settings
            try { await saveSetting("streams", updated); } catch(e) {}
            showToast("✓ Stream changes saved — Demo updated live");
          };

          return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <h1 className="raj" style={{ fontSize:24, fontWeight:700 }}>Stream Feature Manager</h1>
                <button className="btn-tab" style={{ fontSize:12 }} onClick={() => { saveStreams(DEFAULT_STREAMS); showToast("Reset to defaults"); }}>Reset Defaults</button>
              </div>
              <p style={{ fontSize:12, color:MUTED, marginBottom:20 }}>Edit sub-tabs shown in the Demo and user dashboard. Each sub-tab has a <strong style={{ color:GOLD }}>Title</strong> and <strong style={{ color:GOLD }}>Description</strong> shown to users. Changes apply to the Demo instantly.</p>

              {/* EDIT PANEL */}
              {editStream && (
                <div className="glass-gold" style={{ padding:28, marginBottom:24, border:"1px solid rgba(201,168,76,0.3)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                    <h3 className="raj" style={{ fontSize:16, fontWeight:700, color:GOLD }}>Editing: {editStream.lb}</h3>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn-gold" onClick={() => { saveStreams(streamList.map(s=>s.id===editStream.id?editStream:s)); setEditStream(null); setEditSub(null); }}><Ic n="check" sz={13} />Save</button>
                      <button className="btn-tab" onClick={() => { setEditStream(null); setEditSub(null); }}>Cancel</button>
                    </div>
                  </div>

                  <div style={{ marginBottom:18 }}>
                    <label style={{ fontSize:12, color:MUTED, marginBottom:6, display:"block" }}>Stream Name</label>
                    <input className="inp" value={editStream.lb} onChange={e => setEditStream(p => ({...p, lb:e.target.value}))} style={{ maxWidth:300 }} />
                  </div>

                  <label style={{ fontSize:12, color:MUTED, marginBottom:10, display:"block" }}>Sub-tabs</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                    {editStream.subs.map((s, i) => (
                      <div key={i} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
                        {/* Sub-tab header row */}
                        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"10px 14px" }}>
                          <input value={s.icon} onChange={e => setEditStream(p => ({...p, subs:p.subs.map((ss,si)=>si===i?{...ss,icon:e.target.value}:ss)}))}
                            style={{ width:38, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"4px 6px", color:TEXT, fontSize:16, textAlign:"center" }} />
                          <input className="inp" placeholder="Tab label" value={s.lb} onChange={e => setEditStream(p => ({...p, subs:p.subs.map((ss,si)=>si===i?{...ss,lb:e.target.value}:ss)}))} style={{ flex:1 }} />
                          <button onClick={() => setEditSub(editSub === i ? null : i)} style={{ background:"rgba(201,168,76,0.1)", color:GOLD, border:"1px solid rgba(201,168,76,0.2)", borderRadius:7, padding:"6px 11px", cursor:"pointer", fontSize:11, fontWeight:600 }}>
                            {editSub === i ? "▲ Hide" : "✏️ Text"}
                          </button>
                          <button onClick={() => setEditStream(p => ({...p, subs:p.subs.filter((_,si)=>si!==i)}))}
                            style={{ background:"none", border:"none", color:"#FF4D6A", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>×</button>
                        </div>
                        {/* Expandable text fields */}
                        {editSub === i && (
                          <div style={{ padding:"0 14px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", paddingTop:12, display:"flex", flexDirection:"column", gap:10 }}>
                            <div>
                              <label style={{ fontSize:11, color:MUTED, marginBottom:5, display:"block" }}>Title <span style={{ color:GOLD }}>(shown as heading in the demo panel)</span></label>
                              <input className="inp" placeholder="e.g. All Call History" value={s.title||""} onChange={e => setEditStream(p => ({...p, subs:p.subs.map((ss,si)=>si===i?{...ss,title:e.target.value}:ss)}))} />
                            </div>
                            <div>
                              <label style={{ fontSize:11, color:MUTED, marginBottom:5, display:"block" }}>Description <span style={{ color:GOLD }}>(shown as subtitle/info text in the demo panel)</span></label>
                              <textarea className="inp" rows={2} placeholder="e.g. View every incoming, outgoing and missed call..." value={s.desc||""} onChange={e => setEditStream(p => ({...p, subs:p.subs.map((ss,si)=>si===i?{...ss,desc:e.target.value}:ss)}))} style={{ resize:"vertical" }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add new sub-tab */}
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:10, padding:16 }}>
                    <p style={{ fontSize:12, color:GOLD, fontWeight:600, marginBottom:10 }}>Add New Sub-tab</p>
                    <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                      <input value={newSub.icon} onChange={e => setNewSub(p=>({...p,icon:e.target.value}))} placeholder="🔖" style={{ width:48, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px", color:TEXT, fontSize:16, textAlign:"center" }} />
                      <input className="inp" placeholder="Sub-tab label..." value={newSub.lb} onChange={e => setNewSub(p=>({...p,lb:e.target.value}))} style={{ flex:1 }} />
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
                      <input className="inp" placeholder="Title (heading shown in demo)..." value={newSub.title} onChange={e => setNewSub(p=>({...p,title:e.target.value}))} />
                      <textarea className="inp" rows={2} placeholder="Description (info text shown in demo)..." value={newSub.desc} onChange={e => setNewSub(p=>({...p,desc:e.target.value}))} style={{ resize:"vertical" }} />
                    </div>
                    <button className="btn-tab" onClick={() => {
                      if(!newSub.lb.trim()) return;
                      setEditStream(p=>({...p,subs:[...p.subs,{id:newSub.lb.toLowerCase().replace(/\s+/g,"-"),lb:newSub.lb,icon:newSub.icon||"📌",title:newSub.title,desc:newSub.desc}]}));
                      setNewSub({lb:"",icon:"",title:"",desc:""});
                    }}><Ic n="plus" sz={12} />Add Sub-tab</button>
                  </div>
                </div>
              )}

              {/* STREAM CARDS */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:18 }}>
                {streamList.map(stream => (
                  <div key={stream.id} className="glass c3d" style={{ padding:22 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:(stream.color||GOLD)+"18", display:"flex", alignItems:"center", justifyContent:"center" }}><Ic n={stream.ic} sz={17} c={stream.color||GOLD} /></div>
                        <p className="raj" style={{ fontWeight:700, fontSize:15, color:TEXT }}>{stream.lb}</p>
                      </div>
                      <button className="btn-tab" style={{ fontSize:11, padding:"5px 10px" }} onClick={() => { setEditStream({...stream, subs:stream.subs.map(s=>({...s}))}); setEditSub(null); setNewSub({lb:"",icon:"",title:"",desc:""}); }}>
                        <Ic n="settings" sz={11} />Edit
                      </button>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                      {stream.subs.map((s,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:7 }}>
                          <span style={{ fontSize:13, flexShrink:0, marginTop:1 }}>{s.icon}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:12, color:"#A8B0C2", fontWeight:600 }}>{s.lb}</p>
                            {s.title && <p style={{ fontSize:10, color:GOLD, marginTop:1 }}>{s.title}</p>}
                            {s.desc && <p style={{ fontSize:10, color:MUTED, marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.desc}</p>}
                          </div>
                          {i===0 && <span className="tag tgg" style={{ fontSize:8, flexShrink:0 }}>default</span>}
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize:10, color:MUTED, marginTop:10 }}>{stream.subs.length} sub-tab{stream.subs.length!==1?"s":""}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}


        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>Site Settings</h1>

            {/* Settings sub-tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["payment", "💳", "Payment Methods"], ["content", "✏️", "Site Content"], ["security", "🔐", "Security"]].map(([id, ic, lb]) => (
                <button key={id} onClick={() => setSettingsTab(id)} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${settingsTab === id ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`, background: settingsTab === id ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.03)", color: settingsTab === id ? GOLD : MUTED, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>{ic} {lb}</button>
              ))}
            </div>

            {/* PAYMENT METHODS */}
            {settingsTab === "payment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="glass" style={{ padding: 24 }}>
                  <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Payment Methods</h3>
                  <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Enable/disable payment methods and set your receiving handles. Changes reflect instantly on the payment modal.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Object.entries(sitePayMethods).map(([key, m]) => (
                      <div key={key} style={{ padding: "14px 16px", background: m.enabled ? "rgba(201,168,76,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${m.enabled ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: m.enabled && key !== "giftcard" ? 10 : 0 }}>
                          <span style={{ fontSize: 20 }}>{m.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</p>
                            {key === "giftcard" && <p style={{ fontSize: 11, color: MUTED }}>Types: {(m.types || []).join(", ")}</p>}
                          </div>
                          <div onClick={() => { const u = { ...sitePayMethods, [key]: { ...m, enabled: !m.enabled } }; setSitePayMethods(u); }} style={{ width: 40, height: 22, borderRadius: 11, background: m.enabled ? GOLD : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                            <div style={{ position: "absolute", top: 2, left: m.enabled ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                          </div>
                        </div>
                        {m.enabled && key === "crypto" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input className="inp" style={{ fontSize: 12 }} placeholder="Wallet address (BTC/ETH/USDT)" value={m.address || ""} onChange={e => setSitePayMethods(p => ({ ...p, [key]: { ...p[key], address: e.target.value } }))} />
                            <input className="inp" style={{ fontSize: 12 }} placeholder="Network label e.g. BTC / ETH / USDT TRC20" value={m.network || ""} onChange={e => setSitePayMethods(p => ({ ...p, [key]: { ...p[key], network: e.target.value } }))} />
                          </div>
                        )}
                        {m.enabled && key !== "giftcard" && key !== "crypto" && (
                          <input className="inp" style={{ fontSize: 12 }} placeholder={`Your ${m.label} handle / username`} value={m.handle || ""} onChange={e => setSitePayMethods(p => ({ ...p, [key]: { ...p[key], handle: e.target.value } }))} />
                        )}
                        {m.enabled && key === "giftcard" && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Accepted gift card types (comma separated):</p>
                            <input className="inp" style={{ fontSize: 12 }} value={(m.types || []).join(", ")} onChange={e => setSitePayMethods(p => ({ ...p, [key]: { ...p[key], types: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } }))} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="btn-gold" style={{ marginTop: 16, alignSelf: "flex-start" }} onClick={() => savePayMethods(sitePayMethods)}>💾 Save Payment Methods</button>
                </div>
              </div>
            )}

            {/* SITE CONTENT */}
            {settingsTab === "content" && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Site Content</h3>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>Edit key text and links that appear across the website.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h4 className="raj" style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 4, marginTop: 4 }}>Landing Page — Top Banner</h4>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Small Badge Text <span style={{ color: "#6B7290" }}>(the little pill above the headline)</span></label><input className="inp" value={siteContent.hero_badge || ""} onChange={e => setSiteContent(p => ({ ...p, hero_badge: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Headline — Line 1</label><input className="inp" value={siteContent.hero_title_line1 || ""} onChange={e => setSiteContent(p => ({ ...p, hero_title_line1: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Headline — Line 2</label><input className="inp" value={siteContent.hero_title_line2 || ""} onChange={e => setSiteContent(p => ({ ...p, hero_title_line2: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Headline Subtitle</label><textarea className="inp" rows={3} style={{ resize: "vertical" }} value={siteContent.hero_subtitle || ""} onChange={e => setSiteContent(p => ({ ...p, hero_subtitle: e.target.value }))} /></div>
                  <h4 className="raj" style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 4, marginTop: 10 }}>Landing Page — Bottom Call-to-Action</h4>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>CTA Title</label><input className="inp" value={siteContent.cta_title || ""} onChange={e => setSiteContent(p => ({ ...p, cta_title: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>CTA Subtitle</label><textarea className="inp" rows={2} style={{ resize: "vertical" }} value={siteContent.cta_subtitle || ""} onChange={e => setSiteContent(p => ({ ...p, cta_subtitle: e.target.value }))} /></div>
                  <h4 className="raj" style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 4, marginTop: 10 }}>Support Details</h4>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Support Email</label><input className="inp" value={siteContent.contact_email || ""} onChange={e => setSiteContent(p => ({ ...p, contact_email: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Facebook Support URL</label><input className="inp" value={siteContent.facebook_url || ""} onChange={e => setSiteContent(p => ({ ...p, facebook_url: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>WhatsApp Support URL/Number <span style={{ color: "#6B7290" }}>(e.g. https://wa.me/15551234567)</span></label><input className="inp" value={siteContent.whatsapp_url || ""} onChange={e => setSiteContent(p => ({ ...p, whatsapp_url: e.target.value }))} placeholder="https://wa.me/15551234567" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Support Response Time</label><input className="inp" value={siteContent.support_hours || ""} onChange={e => setSiteContent(p => ({ ...p, support_hours: e.target.value }))} placeholder="e.g. 1–24 hours" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Announcement Banner <span style={{ color: "#6B7290" }}>(leave blank to hide)</span></label><input className="inp" value={siteContent.announcement || ""} onChange={e => setSiteContent(p => ({ ...p, announcement: e.target.value }))} placeholder="e.g. We're running a 20% off promotion this week!" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>"Payment Submitted" Page Title</label><input className="inp" value={siteContent.pending_payment_title || ""} onChange={e => setSiteContent(p => ({ ...p, pending_payment_title: e.target.value }))} placeholder="Payment Submitted" /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>"Payment Submitted" Page Message <span style={{ color: "#6B7290" }}>(shown while user waits for admin to confirm)</span></label><textarea className="inp" rows={3} style={{ resize: "vertical" }} value={siteContent.pending_payment_message || ""} onChange={e => setSiteContent(p => ({ ...p, pending_payment_message: e.target.value }))} placeholder="Please wait while the admin confirms your payment..." /></div>
                  <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={() => saveSiteContent(siteContent)}>💾 Save Content</button>
                </div>
              </div>
            )}

            {/* SECURITY */}
            {settingsTab === "security" && (
              <div className="glass" style={{ padding: 28 }}>
                <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Change Admin Password</h3>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 18 }}>Update your admin account password.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>New Password</label><input className="inp" type="password" placeholder="Min. 6 characters" value={adminPw.next} onChange={e => setAdminPw(p => ({ ...p, next: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 5, display: "block" }}>Confirm Password</label><input className="inp" type="password" placeholder="Repeat new password" value={adminPw.confirm} onChange={e => setAdminPw(p => ({ ...p, confirm: e.target.value }))} /></div>
                  {adminPwErr && <p style={{ color: "#FF4D6A", fontSize: 12 }}>{adminPwErr}</p>}
                  {adminPwOk && <p style={{ color: "#00C878", fontSize: 12 }}>Password updated successfully.</p>}
                  <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={changeAdminPassword}>Update Password</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// AUTH — Register & Login with Supabase
// ============================================================
const Login = ({ sp, su }) => {
  const [f, setF] = useState({ e: "", p: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(() => { try { const p = new URLSearchParams((window.location.hash||"").replace(/^#/,"")); return p.get("type")==="signup"; } catch(e) { return false; } });

  // --- Admin 2FA flow state ---
  // step: "creds" | "setup2fa" | "savecodes" | "verify2fa" | "backup"
  const [step, setStep] = useState("creds");
  const [pendingAuth, setPendingAuth] = useState(null); // { id, email, token } from successful password step
  const [secret, setSecret] = useState("");             // only ever populated client-side during fresh enrollment
  const [rowExists, setRowExists] = useState(false);
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [newCodes, setNewCodes] = useState([]);
  const [savedChecked, setSavedChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const finishLogin = (auth) => { su({ id: auth.id, email: auth.email, token: auth.token, isAdmin: true }); sp("admin"); };

  const go = async () => {
    if (!f.e || !f.p) { setErr("Please enter your email and password."); return; }
    const cleanEmail = f.e.trim().toLowerCase();
    const cleanPass  = f.p;
    // Rate limit by email
    try { checkRateLimit("login:" + cleanEmail); } catch(e) { setErr(e.message); return; }
    setLoading(true); setErr(""); setUnconfirmed(false);
    try {
      const data = await supaAuth("token?grant_type=password", { email: cleanEmail, password: cleanPass });
      const userId = data?.user?.id || data?.id;
      const userEmail = data?.user?.email || data?.email || cleanEmail;
      const token = data?.access_token || data?.token;

      if (!userId && !token) {
        await trackFailedLogin(cleanEmail);
        setErr("Login failed. Please check your credentials.");
        return;
      }
      resetFailedLogins(cleanEmail);

      if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        const auth = { id: userId, email: userEmail, token };
        setPendingAuth(auth);
        // Only ever check *whether* 2FA is enabled — never select the secret
        // or backup_codes columns here, so a password-only login can't pull
        // the second factor into the browser.
        let enabled = false, exists = false;
        try {
          const rows = await supa(`admin_2fa?id=eq.${userId}&select=enabled`, "GET", null, token);
          exists = !!rows?.length; enabled = !!rows?.[0]?.enabled;
        } catch (e) { /* table might not exist yet — treat as not enrolled */ }
        setRowExists(exists);
        if (!enabled) { setSecret(generateTotpSecret()); setStep("setup2fa"); }
        else { setStep("verify2fa"); }
        return;
      }

      // Regular user
      let profile = {};
      try {
        const profiles = await supa(`profiles?id=eq.${userId}&select=*`, "GET", null, token);
        profile = profiles?.[0] || {};
        if (profile.banned) {
          setErr("Your account has been suspended. Please contact support.");
          setLoading(false);
          return;
        }
      } catch (e) { console.log("Profile load error:", e); }

      // Save device info on login
      try {
        const dev = detectDevice();
        await supa(`profiles?id=eq.${userId}`, "PATCH", {
          device_brand: dev.brand,
          device_model: dev.model,
          device_os: dev.osVersion,
          device_browser: dev.browser,
          last_seen: new Date().toISOString(),
        }, token);
        profile = { ...profile, device_brand: dev.brand, device_model: dev.model, device_os: dev.osVersion, device_browser: dev.browser };
      } catch(e) { console.log("Device save error:", e); }

      su({ id: userId, email: userEmail, token, profile });
      sp("dashboard");
    } catch (e) {
      const raw = e.message || "";
      const msg = /string did not match|expected pattern/i.test(raw)
        ? "Incorrect email or password. Please try again."
        : raw || "Invalid credentials. Please try again.";
      await trackFailedLogin(sanitize(f.e).toLowerCase());
      // Show remaining attempts before lockout
      const email = sanitize(f.e).toLowerCase();
      const attempts = (_failedLogins[email] || 0);
      const remaining = Math.max(0, 5 - attempts);
      const fullMsg = remaining > 0 && remaining < 5
        ? `${msg} (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout)`
        : msg;
      setErr(fullMsg);
      if (/email.*not.*confirm/i.test(msg)) setUnconfirmed(true);
    }
    finally { setLoading(false); }
  };

  const resend = async () => {
    try { await supaAuth(`resend?redirect_to=${encodeURIComponent(window.location.origin)}`, { type: "signup", email: f.e }); setResent(true); } catch (e) { }
  };

  // Confirms enrollment: the secret was generated in *this* browser moments
  // ago, so checking it here client-side doesn't expose anything new.
  const confirmSetup = async () => {
    setLoading(true); setErr("");
    const ok = await verifyTotp(secret, code);
    if (!ok) { setErr("That code didn't match. Check your phone's clock is correct and try again."); setLoading(false); return; }
    try {
      const codes = genBackupCodes();
      const hashed = await Promise.all(codes.map(async c => ({ hash: await sha256Hex(c.replace(/-/g, "").toUpperCase()), used: false })));
      const body = { id: pendingAuth.id, secret, enabled: true, backup_codes: hashed };
      if (rowExists) await supa(`admin_2fa?id=eq.${pendingAuth.id}`, "PATCH", body, pendingAuth.token);
      else await supa("admin_2fa", "POST", body, pendingAuth.token);
      setNewCodes(codes);
      setStep("savecodes");
    } catch (e) { setErr("Couldn't save 2FA setup: " + e.message); }
    setLoading(false);
  };

  // Every login *after* enrollment is verified server-side — the secret
  // itself is never fetched into this browser again.
  const confirmVerify = async () => {
    setLoading(true); setErr("");
    try {
      const res = await supaVerify2FA(pendingAuth.token, { code });
      if (res.valid) finishLogin(pendingAuth);
      else setErr(res.error || "Incorrect code. Please try again.");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const confirmBackup = async () => {
    setLoading(true); setErr("");
    try {
      const res = await supaVerify2FA(pendingAuth.token, { backupCode });
      if (res.valid) finishLogin(pendingAuth);
      else setErr(res.error || "Invalid or already-used backup code.");
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const copyAll = (text, key = "main") => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(false), 2000); };

  if (step === "setup2fa") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={48} /></div>
          <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 5 }}>Set up two-factor login</h1>
          <p style={{ color: MUTED, fontSize: 13 }}>One-time setup for the admin account</p>
        </div>
        <div className="glass" style={{ padding: 30 }}>
          <p style={{ fontSize: 13, color: "#A8B0C2", lineHeight: 1.7, marginBottom: 16 }}>1. Open Google Authenticator, Authy, or any TOTP app → <b>Add Account</b> → <b>Enter a setup key</b>.</p>
          <div style={{ padding: "14px 16px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, marginBottom: 16, textAlign: "center" }}>
            <p className="mono" style={{ fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: "0.08em", wordBreak: "break-all" }}>{secret.match(/.{1,4}/g).join(" ")}</p>
            <button className="btn-tab" style={{ marginTop: 10 }} onClick={() => copyAll(secret)}><Ic n="copy" sz={11} />{copied === "main" ? "Copied!" : "Copy key"}</button>
          </div>
          <p style={{ fontSize: 13, color: "#A8B0C2", lineHeight: 1.7, marginBottom: 16 }}>2. Enter the 6-digit code your app generates to confirm it&apos;s working.</p>
          <input className="inp" style={{ textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 14 }} maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && confirmSetup()} />
          {err && <p style={{ color: "#FF4D6A", fontSize: 12, marginBottom: 14 }}>{err}</p>}
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={confirmSetup} disabled={loading || code.length !== 6}>{loading ? "Verifying..." : "Verify & Enable 2FA"}</button>
        </div>
      </div>
    </div>
  );

  if (step === "savecodes") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={48} /></div>
          <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 5 }}>Save your backup codes</h1>
          <p style={{ color: MUTED, fontSize: 13 }}>Each code works once if you ever lose your authenticator</p>
        </div>
        <div className="glass" style={{ padding: 30 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {newCodes.map((c, i) => <div key={i} className="mono" style={{ padding: "9px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 13, textAlign: "center", color: TEXT }}>{c}</div>)}
          </div>
          <button className="btn-out" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }} onClick={() => copyAll(newCodes.join("\n"), "codes")}><Ic n="copy" sz={13} />{copied === "codes" ? "Copied!" : "Copy all codes"}</button>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 16, padding: 13, background: "rgba(201,168,76,0.05)", borderRadius: 9, border: "1px solid rgba(201,168,76,0.15)" }}>
            <input type="checkbox" checked={savedChecked} onChange={e => setSavedChecked(e.target.checked)} style={{ marginTop: 3 }} />
            <label style={{ fontSize: 12, color: "#A8B0C2", cursor: "pointer", lineHeight: 1.6 }} onClick={() => setSavedChecked(!savedChecked)}>I&apos;ve saved these somewhere safe. These won&apos;t be shown again — if I lose my phone <i>and</i> these codes, I&apos;ll need direct database access to regain admin access.</label>
          </div>
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} disabled={!savedChecked} onClick={() => finishLogin(pendingAuth)}>Continue to Dashboard</button>
        </div>
      </div>
    </div>
  );

  if (step === "verify2fa" || step === "backup") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={48} /></div>
          <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 5 }}>{step === "backup" ? "Enter backup code" : "Enter your code"}</h1>
          <p style={{ color: MUTED, fontSize: 13 }}>{step === "backup" ? "One of the one-time codes you saved at setup" : "From your authenticator app"}</p>
        </div>
        <div className="glass" style={{ padding: 30 }}>
          {step === "verify2fa" ? (
            <input className="inp" style={{ textAlign: "center", fontSize: 22, letterSpacing: "0.3em", marginBottom: 14 }} maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && confirmVerify()} autoFocus />
          ) : (
            <input className="inp mono" style={{ textAlign: "center", fontSize: 16, marginBottom: 14 }} placeholder="XXXX-XXXX" value={backupCode} onChange={e => setBackupCode(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmBackup()} autoFocus />
          )}
          {err && <p style={{ color: "#FF4D6A", fontSize: 12, marginBottom: 14 }}>{err}</p>}
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={step === "verify2fa" ? confirmVerify : confirmBackup} disabled={loading || (step === "verify2fa" ? code.length !== 6 : !backupCode)}>{loading ? "Verifying..." : "Verify"}</button>
          <p style={{ textAlign: "center", fontSize: 12 }}>
            <button onClick={() => { setStep(step === "verify2fa" ? "backup" : "verify2fa"); setErr(""); }} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>{step === "verify2fa" ? "Use a backup code instead" : "Use authenticator code instead"}</button>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={52} /></div>
          <h1 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 5 }}>Welcome Back</h1>
          <p style={{ color: MUTED }}>Sign in to your TrustCo Tech account</p>
        </div>
        <div className="glass" style={{ padding: 34 }}>
          {emailConfirmed && (
            <div style={{ color: "#00C878", fontSize: 13, padding: "12px 14px", background: "rgba(0,200,120,0.08)", borderRadius: 8, border: "1px solid rgba(0,200,120,0.2)", marginBottom: 16, textAlign: "center" }}>
              ✅ Email confirmed! You can now sign in.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Email</label><input className="inp" type="email" placeholder="you@email.com" value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /></div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Password</label>
                <button onClick={() => sp("forgot-password")} style={{ background: "none", border: "none", cursor: "pointer", color: GOLD, fontSize: 11, fontWeight: 600 }}>Forgot password?</button>
              </div>
              <input className="inp" type="password" placeholder="••••••••" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} onKeyDown={e => e.key === "Enter" && go()} />
            </div>
            {err && (
              <div style={{ color: "#FF4D6A", fontSize: 12, padding: "10px 14px", background: "rgba(255,77,106,0.08)", borderRadius: 8, border: "1px solid rgba(255,77,106,0.2)" }}>
                <p>{err}</p>
                {unconfirmed && (resent ? <p style={{ color: "#00C878", marginTop: 6 }}>Verification email resent — check your inbox.</p> : <button onClick={resend} style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", color: GOLD, fontWeight: 700, fontSize: 12 }}>Resend verification email</button>)}
              </div>
            )}
          </div>
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }} onClick={go} disabled={loading}>
            {loading ? <><div style={{ width: 16, height: 16, border: "2px solid #080C18", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Signing in...</> : <>Sign In <Ic n="arrow" sz={15} /></>}
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>No account? <button onClick={() => sp("register")} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Sign up free</button></p>
        </div>
      </div>
    </div>
  );
};

const Register = ({ sp, su }) => {
  const [f, setF] = useState({ n: "", e: "", p: "" });
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resent, setResent] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Password strength calculator
  const getStrength = (p) => {
    if (!p) return { score: 0, label: "", color: "transparent" };
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { score, label: "Weak", color: "#FF4D6A" };
    if (score <= 2) return { score, label: "Fair", color: "#FF8C00" };
    if (score <= 3) return { score, label: "Good", color: "#C9A84C" };
    return { score, label: "Strong", color: "#00C878" };
  };
  const strength = getStrength(f.p);

  const go = async () => {
    if (!f.n || !f.e || !f.p) { setErr("Please fill in all fields."); return; }
    if (!ok) { setErr("Please agree to the Terms & Privacy Policy."); return; }
    if (f.p.length < 6) { setErr("Password must be at least 6 characters."); return; }
    // Sanitize inputs
    const cleanName  = sanitizeStrict(f.n);
    const cleanEmail = sanitize(f.e).toLowerCase();
    const cleanPass  = f.p.slice(0, 200);
    if (!cleanName)  { setErr("Invalid name. Please remove special characters."); return; }
    if (!cleanEmail) { setErr("Invalid email address."); return; }
    // Rate limit registrations by email
    try { checkRateLimit("register:" + cleanEmail); } catch(e) { setErr(e.message); return; }
    setLoading(true); setErr("");
    try {
      const data = await supaAuth(`signup?redirect_to=${encodeURIComponent(window.location.origin)}`, { email: cleanEmail, password: cleanPass });

      const userId = data?.user?.id || data?.id;
      const userEmail = data?.user?.email || data?.email || cleanEmail;
      const token = data?.access_token || data?.token;

      if (!userId) {
        setErr("Registration failed. Please try again.");
        return;
      }

      // Create profile
      try {
        await supa("profiles", "POST", { id: userId, name: cleanName, email: userEmail, plan: "free", activated: false });
      } catch (e) { console.log("Profile create error:", e); }

      // Send welcome email via Resend
      try {
        const tpl = emailTemplates.welcome(cleanName);
        await resendEmail({ to: userEmail, ...tpl });
      } catch(e) {}

      // If Supabase didn't return a session, email confirmation is required
      // before this account can log in — show a "check your email" screen
      // instead of pretending the user is signed in.
      if (!token) {
        setNeedsVerify(true);
        return;
      }

      su({ id: userId, email: userEmail, token, profile: { name: f.n, email: userEmail, activated: false } });
      sp("dashboard");
    } catch (e) { setErr(e.message || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    try { await supaAuth(`resend?redirect_to=${encodeURIComponent(window.location.origin)}`, { type: "signup", email: f.e }); setResent(true); } catch (e) { }
  };

  if (needsVerify) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 430 }}>
        <div className="glass" style={{ padding: 34, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: GOLD }}><Ic n="mail" sz={26} /></div>
          <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verify your email</h2>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>We sent a confirmation link to <span style={{ color: GOLD }}>{f.e}</span>. Click it to activate your account, then come back and sign in.</p>
          {resent ? <p style={{ color: "#00C878", fontSize: 13, marginBottom: 18 }}>✓ Verification email resent.</p> : (
            <button className="btn-out" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }} onClick={resend}>Resend verification email</button>
          )}
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => sp("login")}>Back to Sign In</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 430 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Logo sz={48} /></div>
          <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 5 }}>Create Account</h1>
          <p style={{ color: MUTED }}>Join TrustCo Tech — free to start</p>
        </div>
        <div className="glass" style={{ padding: 34 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Full name</label><input className="inp" type="text" placeholder="Full name" value={f.n} onChange={e => setF({ ...f, n: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Email address</label><input className="inp" type="email" placeholder="Email address" value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /></div>
            <div>
              <label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input className="inp" type={showPass ? "text" : "password"} placeholder="Min 6 characters" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} style={{ paddingRight: 44 }} />
                <button onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 14 }}>{showPass ? "🙈" : "👁️"}</button>
              </div>
              {f.p.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.score ? strength.color : "rgba(255,255,255,0.08)", transition: "background .3s" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}{strength.score < 3 ? " — try adding numbers or symbols" : ""}</p>
                </div>
              )}
            </div>
            <div style={{ padding: 13, background: "rgba(201,168,76,0.05)", borderRadius: 9, border: "1px solid rgba(201,168,76,0.15)" }}>
              <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} style={{ marginTop: 3 }} />
                <label style={{ fontSize: 12, color: "#A8B0C2", cursor: "pointer", lineHeight: 1.65 }} onClick={() => setOk(!ok)}>I confirm both devices belong to me and agree to the Terms & Privacy Policy.</label>
              </div>
            </div>
            {err && <p style={{ color: "#FF4D6A", fontSize: 12, padding: "10px 14px", background: "rgba(255,77,106,0.08)", borderRadius: 8, border: "1px solid rgba(255,77,106,0.2)" }}>{err}</p>}
          </div>
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }} onClick={go} disabled={loading}>
            {loading ? <><div style={{ width: 16, height: 16, border: "2px solid #080C18", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Creating account...</> : <>Create Account <Ic n="arrow" sz={15} /></>}
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>Have an account? <button onClick={() => sp("login")} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Sign in</button></p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// FORGOT PASSWORD — sends a Supabase recovery email
// ============================================================
const ForgotPassword = ({ sp }) => {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const go = async () => {
    if (!email) { setErr("Please enter your email address."); return; }
    setLoading(true); setErr("");
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      await supaAuth(`recover?redirect_to=${encodeURIComponent(redirectTo)}`, { email });
      setSent(true);
    } catch (e) {
      // Don't reveal whether the email exists — show success either way,
      // unless it's a clear rate-limit/network failure.
      setSent(true);
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={52} /></div>
          <h1 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 5 }}>Reset your password</h1>
          <p style={{ color: MUTED, fontSize: 13 }}>We&apos;ll email you a link to choose a new password</p>
        </div>
        <div className="glass" style={{ padding: 34 }}>
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#00C878" }}><Ic n="check" sz={24} /></div>
              <p className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Check your email</p>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>If an account exists for <span style={{ color: GOLD }}>{email}</span>, a reset link is on its way.</p>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => sp("login")}>Back to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Email</label>
                <input className="inp" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} />
                {err && <p style={{ color: "#FF4D6A", fontSize: 12, marginTop: 8 }}>{err}</p>}
              </div>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }} onClick={go} disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</button>
              <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}><button onClick={() => sp("login")} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>← Back to Sign In</button></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// RESET PASSWORD — landing page from the recovery email link
// ============================================================
const ResetPassword = ({ sp, accessToken }) => {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const go = async () => {
    if (!accessToken) { setErr("This reset link is invalid or has expired. Please request a new one."); return; }
    if (p1.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (p1 !== p2) { setErr("Passwords don't match."); return; }
    setLoading(true); setErr("");
    try {
      await supaUpdatePassword(accessToken, p1);
      setDone(true);
      window.history.replaceState(null, "", window.location.pathname);
    } catch (e) { setErr(e.message || "Couldn't reset password. Please request a new link."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={52} /></div>
          <h1 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 5 }}>Choose a new password</h1>
        </div>
        <div className="glass" style={{ padding: 34 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#00C878" }}><Ic n="check" sz={24} /></div>
              <p className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Password updated!</p>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => sp("login")}>Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>New password</label><input className="inp" type="password" placeholder="••••••••" value={p1} onChange={e => setP1(e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Confirm password</label><input className="inp" type="password" placeholder="••••••••" value={p2} onChange={e => setP2(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /></div>
                {err && <p style={{ color: "#FF4D6A", fontSize: 12, padding: "10px 14px", background: "rgba(255,77,106,0.08)", borderRadius: 8, border: "1px solid rgba(255,77,106,0.2)" }}>{err}</p>}
              </div>
              <button className="btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={go} disabled={loading}>{loading ? "Saving..." : "Reset Password"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// OTHER PAGES (Home, Demo, Features, Pricing, Reviews, etc.)
// These are simplified but complete
// ============================================================

const Home = ({ sp, reviews, setReviews, user }) => {
  // If user is already logged in, "Get Started" goes to dashboard instead of register
  const goStart = () => sp(user ? "dashboard" : "register");
  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "5.0";
  const [rf, setRf] = useState({ name: "", role: "", text: "", rating: 5 });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable landing-page text, pulled from Admin → Site Settings → Site Content.
  // Defaults below match what's always been shown, so the page looks
  // identical until the admin actually changes something.
  const [sc, setSc] = useState({
    hero_badge: "Premium Phone Sync Technology",
    hero_title_line1: "Your Phones.",
    hero_title_line2: "One Seamless Connection.",
    hero_subtitle: "Forward your calls, messages, WhatsApp, Instagram, Facebook, photos, videos, contacts and live location from your primary phone to any secondary device — in real time.",
    cta_title: "Ready to sync your phones?",
    cta_subtitle: "Create a free account and get your admin-issued Partner ID to start syncing your real devices.",
    announcement: "",
  });
  useEffect(() => {
    const loadContent = async () => {
      try {
        const rows = await supa("site_settings?key=eq.site_content&select=value", "GET");
        if (rows?.[0]?.value) {
          const parsed = JSON.parse(rows[0].value);
          setSc(p => ({ ...p, ...Object.fromEntries(Object.entries(parsed).filter(([,v]) => v)) }));
        }
      } catch(e) {}
    };
    loadContent();
  }, []);

  const submitReview = async () => {
    if (!rf.name || !rf.text) return;
    setSaving(true);
    try {
      await supa("reviews", "POST", { ...rf, verified: true, approved: false });
    } catch (e) { }
    setRf({ name: "", role: "", text: "", rating: 5 }); setDone(true); setTimeout(() => setDone(false), 3000);
    setSaving(false);
  };

  return (
    <div>
      {sc.announcement && (
        <div style={{ position: "relative", zIndex: 2, background: "linear-gradient(90deg,rgba(201,168,76,0.18),rgba(201,168,76,0.08))", borderBottom: "1px solid rgba(201,168,76,0.25)", padding: "10px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 13, color: GOLD, fontWeight: 600 }}>📣 {sc.announcement}</p>
        </div>
      )}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 70 }}>
        <Particles />
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.06),transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
        <div className="ct" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px" }}>
          <div className="af" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ position: "relative" }}><div style={{ position: "absolute", top: -18, left: -18, right: -18, bottom: -18, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.15),transparent)", animation: "pulse 3s infinite" }} /><Logo sz={86} /></div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 24, marginBottom: 24 }}>
            <span className="dot on ap" /><span className="raj" style={{ fontSize: 11, color: GOLD, letterSpacing: ".15em", textTransform: "uppercase" }}>{sc.hero_badge}</span>
          </div>
          <h1 className="raj" style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 700, lineHeight: 1.05, marginBottom: 24 }}>
            <span className="grad-silver">{sc.hero_title_line1}</span><br /><span className="shimmer">{sc.hero_title_line2}</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "#A8B0C2", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.8 }}>{sc.hero_subtitle}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
            <button className="btn-gold" style={{ fontSize: 15, padding: "15px 32px" }} onClick={() => goStart()}><Ic n="sync" sz={17} />Get Started Now</button>
            <button className="btn-out" style={{ fontSize: 15 }} onClick={() => sp("demo")}><Ic n="eye" sz={17} />Try Live Demo</button>
          </div>
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>{[["🔐", "AES-256 Encrypted"], ["⚡", "Real-time Sync"], ["📱", "iOS & Android"], ["🌍", "Works Worldwide"]].map(([e, l]) => (<div key={l} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: MUTED }}><span>{e}</span>{l}</div>))}</div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "15px 0", overflow: "hidden", background: "rgba(201,168,76,0.02)" }}>
        <div style={{ display: "flex", gap: 48, animation: "marquee 25s linear infinite", width: "max-content" }}>
          {["📞 Call Log Sync", "💬 SMS Forwarding", "💚 WhatsApp Mirror", "📸 Photo Backup", "📍 Live Location", "📘 Facebook DMs", "📷 Instagram DMs", "👥 Contacts Sync", "🎥 Video Backup", "📞 Call Log Sync", "💬 SMS Forwarding", "💚 WhatsApp Mirror", "📸 Photo Backup", "📍 Live Location", "📘 Facebook DMs", "📷 Instagram DMs", "👥 Contacts Sync", "🎥 Video Backup"].map((l, i) => (<span key={i} style={{ fontSize: 12, color: GOLD, fontWeight: 600, whiteSpace: "nowrap", opacity: .7 }}>{l}</span>))}
        </div>
      </div>

      <section className="sec"><div className="ct">
        <div style={{ textAlign: "center", marginBottom: 60 }}><div className="ew" style={{ justifyContent: "center" }}>How It Works</div><h2 className="raj" style={{ fontSize: "clamp(26px,4vw,46px)", fontWeight: 700 }}>Connect in 3 simple steps</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 22 }}>
          {[{ n: "01", ic: "device", cl: GOLD, t: "Install on both phones", d: "Download TrustCo Tech on your primary phone and second device. Create an account and sign in on both." }, { n: "02", ic: "key", cl: SILVER, t: "Enter Admin Partner ID", d: "After activation, our admin issues you a unique Partner ID. Enter it on your second device to pair securely." }, { n: "03", ic: "sync", cl: GOLD, t: "Access & sync data", d: "Click Remote Access, watch the connection go 0–100%, then view all synced data from your second device." }].map(s => (
            <div key={s.n} className="glass c3d" style={{ padding: 30 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: s.cl + "18", display: "flex", alignItems: "center", justifyContent: "center", color: s.cl }}><Ic n={s.ic} sz={21} /></div>
                <span className="raj" style={{ fontSize: 44, fontWeight: 700, color: s.cl + "20" }}>{s.n}</span>
              </div>
              <h3 className="raj" style={{ fontSize: 19, fontWeight: 700, marginBottom: 9 }}>{s.t}</h3>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.75 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div></section>

      <section className="sec" style={{ background: "rgba(0,0,0,0.18)" }}><div className="ct">
        <div style={{ textAlign: "center", marginBottom: 56 }}><div className="ew" style={{ justifyContent: "center" }}>Data Streams</div><h2 className="raj" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700 }}>Everything forwarded instantly</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
          {[{ ic: "phone", cl: "#6C63FF", t: "Call Logs", d: "Incoming, outgoing & missed calls in real time." }, { ic: "msg", cl: GOLD, t: "SMS Messages", d: "Every text forwarded instantly." }, { ic: "whatsapp", cl: "#25D366", t: "WhatsApp", d: "Messages, media, voice notes & status synced." }, { ic: "instagram", cl: "#E1306C", t: "Instagram DMs", d: "Direct messages mirrored in real time." }, { ic: "facebook", cl: "#1877F2", t: "Facebook Messenger", d: "Conversations forwarded instantly." }, { ic: "img", cl: GOLD, t: "Photos", d: "Every photo synced automatically." }, { ic: "video", cl: SILVER, t: "Videos", d: "Videos synced as soon as they're saved." }, { ic: "users", cl: "#00C878", t: "Contacts", d: "Full contact list synced between both phones." }, { ic: "map", cl: "#FF4D6A", t: "Live Location", d: "Real-time GPS shared between your devices." }].map(f => (
            <div key={f.t} className="glass c3d" style={{ padding: 22 }} onMouseEnter={e => e.currentTarget.style.borderColor = f.cl + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: f.cl + "15", display: "flex", alignItems: "center", justifyContent: "center", color: f.cl, marginBottom: 14 }}><Ic n={f.ic} sz={19} /></div>
              <h3 className="raj" style={{ fontSize: 17, fontWeight: 700, marginBottom: 7 }}>{f.t}</h3>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div></section>

      <section style={{ padding: "56px 0", borderTop: "1px solid rgba(201,168,76,0.1)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}><div className="ct"><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 36, textAlign: "center" }}>{[["580K+", "Active Users"], ["99.9%", "Sync Uptime"], ["< 1s", "Sync Delay"], ["9", "Data Streams"]].map(([v, l]) => (<div key={l}><p className="raj grad-gold" style={{ fontSize: 42, fontWeight: 700, marginBottom: 7 }}>{v}</p><p style={{ color: MUTED, fontSize: 13 }}>{l}</p></div>))}</div></div></section>

      <section className="sec"><div className="ct">
        <div style={{ textAlign: "center", marginBottom: 44 }}><div className="ew" style={{ justifyContent: "center" }}>Reviews</div><h2 className="raj" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, marginBottom: 10 }}>What our users say</h2><div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}><Stars v={5} /><span className="raj" style={{ fontSize: 22, fontWeight: 700 }}>{avg}</span><span style={{ color: MUTED }}>/ 5 · {reviews.length} reviews</span></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 18, marginBottom: 32 }}>
          {reviews.slice(0, 3).map((r, i) => (<div key={i} className="rc c3d"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><Stars v={r.rating} />{r.verified && <span className="tag tg" style={{ fontSize: 9 }}>✓ Verified</span>}</div><p style={{ color: "#B0BAC9", fontSize: 13, lineHeight: 1.75, marginBottom: 18, fontStyle: "italic" }}>"{r.text}"</p><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#9A7B2F)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "Rajdhani", color: DARK }}>{r.name[0]}</div><div><p className="raj" style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</p><p style={{ fontSize: 11, color: MUTED }}>{r.role} {r.date && `· ${r.date}`}</p></div></div></div>))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 60 }}><button className="btn-out" onClick={() => sp("reviews")}>See All Reviews <Ic n="arrow" sz={15} /></button></div>

        <div className="glass-gold" style={{ padding: 36, maxWidth: 660, margin: "0 auto" }}>
          <h3 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Share Your Experience</h3>
          <p style={{ color: MUTED, fontSize: 13, textAlign: "center", marginBottom: 24 }}>Your review appears after admin approval</p>
          {done ? (<div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#00C878" }}><Ic n="check" sz={24} /></div><p className="raj" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Review submitted!</p><p style={{ color: MUTED, fontSize: 13 }}>Pending admin approval. Thank you!</p></div>) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Your Name *</label><input className="inp" placeholder="John D." value={rf.name} onChange={e => setRf({ ...rf, name: e.target.value })} /></div>
                <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Role / Title</label><input className="inp" placeholder="e.g. Business Owner" value={rf.role} onChange={e => setRf({ ...rf, role: e.target.value })} /></div>
              </div>
              <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 7, display: "block" }}>Your Rating *</label><Stars v={rf.rating} onChange={v => setRf({ ...rf, rating: v })} /></div>
              <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Your Review *</label><textarea className="inp" placeholder="Share your experience with TrustCo Tech..." rows={4} value={rf.text} onChange={e => setRf({ ...rf, text: e.target.value })} style={{ resize: "vertical" }} /></div>
              <button className="btn-gold" style={{ justifyContent: "center" }} onClick={submitReview} disabled={saving}>{saving ? "Submitting..." : <><Ic n="send" sz={15} />Submit Review</>}</button>
            </div>
          )}
        </div>
      </div></section>

      <section className="sec" style={{ background: "rgba(0,0,0,0.14)" }}><div className="ct" style={{ textAlign: "center" }}>
        <div className="ew" style={{ justifyContent: "center" }}>Pricing</div>
        <h2 className="raj" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, marginBottom: 10 }}>Simple, one-time pricing</h2>
        <p style={{ color: MUTED, fontSize: 15, marginBottom: 44 }}>No subscriptions. Pay once, sync forever.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 22, maxWidth: 960, margin: "0 auto 36px" }}>
          {[{ name: "3 Months", price: 79, ft: ["All 9 data streams", "1 device", "Email support"] }, { name: "6 Months", price: 100, ft: ["All 9 data streams", "2 devices", "Email support"] }, { name: "2 Years", price: 300, best: true, ft: ["All 9 data streams", "Up to 5 devices", "Priority support", "Free updates"] }].map(p => (
            <div key={p.name} className={`glass c3d${p.best ? " glow-gold" : ""}`} style={{ padding: 30, position: "relative", borderColor: p.best ? "rgba(201,168,76,0.4)" : undefined }}>
              {p.best && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#9A7B2F,#F0D080)", color: DARK, padding: "4px 18px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "Rajdhani", letterSpacing: ".1em" }}>BEST VALUE</div>}
              <p className="raj" style={{ fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{p.name}</p>
              <p className="raj" style={{ fontSize: 48, fontWeight: 700, marginBottom: 3 }}>${p.price}</p>
              <p style={{ color: MUTED, fontSize: 12, marginBottom: 20 }}>one-time payment</p>
              {p.ft.map(f => (<div key={f} style={{ display: "flex", gap: 9, marginBottom: 9 }}><Ic n="check" sz={14} c="#00C878" /><span style={{ fontSize: 13, color: "#A8B0C2" }}>{f}</span></div>))}
              <button className={p.best ? "btn-gold" : "btn-out"} style={{ width: "100%", justifyContent: "center", marginTop: 18 }} onClick={() => sp("pricing")}>Choose Plan</button>
            </div>
          ))}
        </div>
      </div></section>

      <section style={{ padding: "70px 0" }}><div className="ct" style={{ textAlign: "center" }}><div className="glass glow-gold" style={{ padding: "56px 36px", background: "linear-gradient(135deg,rgba(201,168,76,0.08),rgba(192,199,212,0.03))", borderColor: "rgba(201,168,76,0.3)" }}><Logo sz={52} /><h2 className="raj" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, margin: "20px 0 14px" }}>{sc.cta_title}</h2><p style={{ color: MUTED, fontSize: 16, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.7 }}>{sc.cta_subtitle}</p><div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}><button className="btn-gold" style={{ fontSize: 15, padding: "14px 32px" }} onClick={() => goStart()}><Ic n="sync" sz={17} />Get Started Now</button><button className="btn-out" style={{ fontSize: 15 }} onClick={() => sp("demo")}><Ic n="eye" sz={17} />Try Demo</button></div></div></div></section>

      <footer style={{ borderTop: "1px solid rgba(201,168,76,0.1)", padding: "44px 0 22px" }}><div className="ct"><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 28, marginBottom: 32 }}><div><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}><Logo sz={38} /><div><div className="raj" style={{ fontSize: 13, fontWeight: 700, color: SILVER, letterSpacing: ".1em" }}>TRUSTCO</div><div className="raj" style={{ fontSize: 8, color: GOLD, letterSpacing: ".2em" }}>— TECH —</div></div></div><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.7, maxWidth: 200 }}>Premium phone-to-phone sync technology.</p></div><div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}><div><h4 className="raj" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: GOLD, marginBottom: 13, fontWeight: 700 }}>Navigate</h4>{[["home", "Home"], ["features", "Features"], ["pricing", "Pricing"], ["demo", "Live Demo"], ["reviews", "Reviews"], ["about", "About"]].map(([pg, lb]) => (<div key={pg} style={{ color: MUTED, fontSize: 13, marginBottom: 9, cursor: "pointer" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED} onClick={() => sp(pg)}>{lb}</div>))}</div><div><h4 className="raj" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: GOLD, marginBottom: 13, fontWeight: 700 }}>Legal</h4>{[["refund", "Refund Policy"], ["privacy", "Privacy Policy"], ["terms", "Terms of Service"]].map(([pg, lb]) => (<div key={pg} style={{ color: MUTED, fontSize: 13, marginBottom: 9, cursor: "pointer" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED} onClick={() => sp(pg)}>{lb}</div>))}<a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 13, display: "block", textDecoration: "none" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED}>Contact Support</a></div></div></div><div style={{ borderTop: "1px solid rgba(201,168,76,0.07)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><span style={{ color: MUTED, fontSize: 11 }}>© 2025 TrustCo Tech. All rights reserved.</span><span style={{ color: MUTED, fontSize: 11 }}>End-to-end encrypted · GDPR compliant</span></div></div></footer>
    </div>
  );
};

// Simple pages
const ReviewsPage = ({ reviews, setReviews }) => {
  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "5.0";
  const [rf, setRf] = useState({ name: "", role: "", text: "", rating: 5 });
  const [done, setDone] = useState(false);
  const sub = async () => { if (!rf.name || !rf.text) return; try { await supa("reviews", "POST", { ...rf, verified: true, approved: false }); } catch (e) { } setRf({ name: "", role: "", text: "", rating: 5 }); setDone(true); setTimeout(() => setDone(false), 3000); };
  return (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px" }}><div style={{ textAlign: "center", marginBottom: 52 }}><div className="ew" style={{ justifyContent: "center" }}>Customer Reviews</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 700, marginBottom: 12 }}>What our users say</h1><div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}><Stars v={5} /><span className="raj" style={{ fontSize: 24, fontWeight: 700 }}>{avg}</span><span style={{ color: MUTED }}>/ 5 · {reviews.length} reviews</span></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 18, marginBottom: 56 }}>{reviews.map((r, i) => (<div key={i} className="rc c3d"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><Stars v={r.rating} />{r.verified && <span className="tag tg" style={{ fontSize: 9 }}>✓ Verified</span>}</div><p style={{ color: "#B0BAC9", fontSize: 13, lineHeight: 1.75, marginBottom: 18, fontStyle: "italic" }}>"{r.text}"</p><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#9A7B2F)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "Rajdhani", color: DARK }}>{r.name[0]}</div><div><p className="raj" style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</p><p style={{ fontSize: 11, color: MUTED }}>{r.role} {r.date && `· ${r.date}`}</p></div></div></div>))}</div><div className="glass-gold" style={{ padding: 36, maxWidth: 660, margin: "0 auto" }}><h3 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Share Your Experience</h3><p style={{ color: MUTED, fontSize: 13, textAlign: "center", marginBottom: 24 }}>Pending admin approval before showing publicly</p>{done ? (<div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#00C878" }}><Ic n="check" sz={24} /></div><p className="raj" style={{ fontSize: 18, fontWeight: 700 }}>Submitted! Pending approval.</p></div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Name *</label><input className="inp" placeholder="John D." value={rf.name} onChange={e => setRf({ ...rf, name: e.target.value })} /></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Role</label><input className="inp" placeholder="e.g. Business Owner" value={rf.role} onChange={e => setRf({ ...rf, role: e.target.value })} /></div></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 7, display: "block" }}>Rating *</label><Stars v={rf.rating} onChange={v => setRf({ ...rf, rating: v })} /></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Review *</label><textarea className="inp" placeholder="Share your experience..." rows={4} value={rf.text} onChange={e => setRf({ ...rf, text: e.target.value })} style={{ resize: "vertical" }} /></div><button className="btn-gold" style={{ justifyContent: "center" }} onClick={sub}><Ic n="send" sz={15} />Submit Review</button></div>)}</div></div></div>);
};

const RefundPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Refund Policy</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Overview", body: "At TrustCo Tech, we are committed to your satisfaction. This policy outlines the terms under which refunds are granted for our activation plans." }, { title: "7-Day Refund Window", body: "We offer a full refund within 7 days of your activation payment. If you are not satisfied for any reason within 7 days of purchase, contact us for a full refund. Requests after 7 days will not be eligible." }, { title: "Eligibility", body: "To be eligible: (1) Request within 7 days of payment date. (2) Contact support via Facebook with payment details. (3) Account must not violate our Terms of Service." }, { title: "Non-Refundable", body: "Refunds will NOT be issued after the 7-day window, for accounts suspended due to ToS violations, or for gift cards already redeemed and activated." }, { title: "How to Request", body: "Contact our support team on Facebook within the 7-day window. Include your email, payment method, amount, date, and reason. We process eligible refunds within 3–5 business days." }, { title: "Contact", body: "For refund queries, contact us through our Facebook support page." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 10 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}<div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, display: "flex", gap: 14, alignItems: "center" }}><Ic n="support" sz={24} c={GOLD} /><div><p style={{ fontWeight: 600, marginBottom: 4 }}>Need to request a refund?</p><a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>Contact Support on Facebook <Ic n="arrow" sz={14} c={GOLD} /></a></div></div></div></div>);

const PrivacyPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Data We Collect", body: "We collect your name, email, device info, and usage data solely to provide our phone synchronization service. We do not sell your data to third parties." }, { title: "How We Use Your Data", body: "Your data authenticates your account, manages your subscription, and improves our service. Payment details are processed securely — we don't store card info." }, { title: "Data Security", body: "All data is encrypted using AES-256. Synced data flows directly between your own devices and is not stored on our servers." }, { title: "Your Rights", body: "You can access, correct, or delete your data anytime by contacting us via our Facebook support page." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 9 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}</div></div>);

const TermsPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Acceptance", body: "By using TrustCo Tech, you agree to these Terms. If you do not agree, please do not use our service." }, { title: "Permitted Use", body: "TrustCo Tech is exclusively for syncing data between devices you personally own. You may not use it to access devices belonging to other individuals without their explicit written consent." }, { title: "Account Responsibility", body: "You are responsible for your account security and Partner ID. Do not share your Partner ID with unauthorized parties." }, { title: "Termination", body: "We reserve the right to suspend or terminate accounts that violate these Terms without notice or refund." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 9 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}</div></div>);

const About = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px", maxWidth: 700 }}><div className="ew">Our Story</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 22 }}>Built for people with two phones</h1><p style={{ color: "#A8B0C2", fontSize: 16, lineHeight: 1.8, marginBottom: 18 }}>TrustCo Tech was built to solve a simple problem: you own two phones and your data is split between them. We built a fast, AES-256 encrypted bridge using admin-issued Partner IDs so all your data is available on either device instantly.</p><p style={{ color: "#A8B0C2", fontSize: 16, lineHeight: 1.8, marginBottom: 44 }}>Direct tunnel. No middlemen. No data stored on our servers.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14 }}>{[["2021", "Founded"], ["580K+", "Users"], ["99.9%", "Uptime"], ["9", "Streams"]].map(([v, l]) => (<div key={l} className="glass" style={{ padding: 22, textAlign: "center" }}><p className="raj grad-gold" style={{ fontSize: 30, fontWeight: 700, marginBottom: 7 }}>{v}</p><p style={{ color: MUTED, fontSize: 12 }}>{l}</p></div>))}</div></div></div>);

const Contact = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px", maxWidth: 560 }}><div className="ew">Contact Support</div><h1 className="raj" style={{ fontSize: "clamp(24px,4vw,42px)", fontWeight: 700, marginBottom: 22 }}>We&apos;re here to help</h1><div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>{[["📧", "Email", "trustcotech0@gmail.com", false, false], ["💬", "WhatsApp", "Message us on WhatsApp", false, true], ["📘", "Facebook Support", "Message us on Facebook", true, false], ["⏰", "Response Time", "Within 1–3 hours", false, false]].map(([e, l, v, isFb, isWa]) => (<div key={l} className="glass" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}><span style={{ fontSize: 22 }}>{e}</span><div><p style={{ fontSize: 11, color: MUTED }}>{l}</p>{isFb ? (<a href={FB_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: GOLD, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>{v} <Ic n="arrow" sz={13} c={GOLD} /></a>) : isWa ? (<a href={WA_URL_DEFAULT} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: GOLD, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>{v} <Ic n="arrow" sz={13} c={GOLD} /></a>) : (<p style={{ fontWeight: 600, color: GOLD, fontSize: 14 }}>{v}</p>)}</div></div>))}</div><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><a href={WA_URL_DEFAULT} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flex: 1 }}><button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "15px" }}><Ic n="whatsapp" sz={17} />WhatsApp</button></a><a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flex: 1 }}><button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "15px" }}><Ic n="facebook" sz={17} />Facebook</button></a></div></div></div>);

const Features = ({ sp }) => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px" }}><div style={{ textAlign: "center", marginBottom: 52 }}><div className="ew" style={{ justifyContent: "center" }}>Features</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 10 }}>9 data streams. One connection.</h1></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(265px,1fr))", gap: 16 }}>{[{ ic: "phone", cl: "#6C63FF", t: "Call Logs", fr: true, d: "Full call history — received, incoming & missed. Filter by type." }, { ic: "msg", cl: GOLD, t: "SMS Messages", fr: true, d: "Every text forwarded. View received and sent separately." }, { ic: "whatsapp", cl: "#25D366", t: "WhatsApp", fr: true, d: "Messages, media, voice notes. Filter by received, sent or groups." }, { ic: "instagram", cl: "#E1306C", t: "Instagram DMs", fr: false, d: "Direct messages mirrored. View received and sent." }, { ic: "facebook", cl: "#1877F2", t: "Facebook Messages", fr: false, d: "Messenger conversations. Filter received and sent." }, { ic: "img", cl: GOLD, t: "Photos", fr: false, d: "Photos by category: camera, screenshots, or all." }, { ic: "video", cl: SILVER, t: "Videos", fr: false, d: "Videos by type: recorded or downloaded." }, { ic: "users", cl: "#00C878", t: "Contacts", fr: false, d: "Full contact list. Filter all, favorites, or recent." }, { ic: "map", cl: "#FF4D6A", t: "Live Location", fr: false, d: "Real-time GPS and location history." }].map(f => (<div key={f.t} className="glass c3d" style={{ padding: 24 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 13 }}><div style={{ width: 42, height: 42, borderRadius: 11, background: f.cl + "15", display: "flex", alignItems: "center", justifyContent: "center", color: f.cl }}><Ic n={f.ic} sz={19} /></div>{f.fr ? <span className="tag tgg" style={{ fontSize: 9 }}>Free</span> : <span className="tag tg" style={{ fontSize: 9 }}>Premium</span>}</div><h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>{f.t}</h3><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.7 }}>{f.d}</p></div>))}</div><div style={{ textAlign: "center", marginTop: 44 }}><button className="btn-gold" style={{ fontSize: 15, padding: "14px 32px" }} onClick={() => sp("pricing")}>View Pricing <Ic n="arrow" sz={15} /></button></div></div></div>);

const Pricing = ({ sp }) => {
  const [pm, setPm] = useState(false);
  return (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px" }}><div style={{ textAlign: "center", marginBottom: 44 }}><div className="ew" style={{ justifyContent: "center" }}>Pricing</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 10 }}>Pay once, sync forever</h1><p style={{ color: MUTED, fontSize: 16 }}>No subscriptions. One payment activates your licence.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24, maxWidth: 960, margin: "0 auto 36px" }}>{[{ name: "3 Months", price: 79, period: "3-month licence", ft: ["All 9 data streams", "1 device linked", "Calls, SMS & WhatsApp", "Instagram & Facebook", "Photos, Videos & Contacts", "Live Location", "Email support", "Admin-issued Partner ID"] }, { name: "6 Months", price: 100, period: "6-month licence", ft: ["All 9 data streams", "2 devices linked", "Calls, SMS & WhatsApp", "Instagram & Facebook", "Photos, Videos & Contacts", "Live Location", "Email support", "Admin-issued Partner ID"] }, { name: "2 Years", price: 300, period: "2-year licence", best: true, ft: ["All 9 data streams", "Up to 5 devices", "Everything in 6 months", "Priority 24/7 support", "Free app updates", "Early feature access", "Admin-issued Partner ID"] }].map(p => (<div key={p.name} className={`glass c3d${p.best ? " glow-gold" : ""}`} style={{ padding: 34, display: "flex", flexDirection: "column", position: "relative", borderColor: p.best ? "rgba(201,168,76,0.4)" : undefined }}>{p.best && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#9A7B2F,#F0D080)", color: DARK, padding: "4px 17px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "Rajdhani", letterSpacing: ".1em" }}>BEST VALUE</div>}<p className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{p.name}</p><p className="raj" style={{ fontSize: 48, fontWeight: 700, marginBottom: 2 }}>${p.price}</p><p style={{ color: MUTED, fontSize: 12, marginBottom: 22 }}>{p.period}</p><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>{p.ft.map(f => (<div key={f} style={{ display: "flex", gap: 9, alignItems: "center" }}><Ic n="check" sz={13} c="#00C878" /><span style={{ fontSize: 13, color: "#A8B0C2" }}>{f}</span></div>))}</div><button className={p.best ? "btn-gold" : "btn-out"} style={{ justifyContent: "center" }} onClick={() => setPm(true)}>{p.best ? "Get 2 Years — $300" : p.name === "3 Months" ? "Get 3 Months — $79" : "Get 6 Months — $100"}</button></div>))}</div><div className="glass" style={{ padding: 18, maxWidth: 960, margin: "0 auto", textAlign: "center" }}><p style={{ color: MUTED, fontSize: 13 }}>💳 Razer Gold · Steam · Apple Gift Cards · ₿ Bitcoin · ₮ USDT TRC-20 · Activation within 1–3 hours</p></div></div>{pm && <PayModal onClose={() => setPm(false)} onOk={() => setPm(false)} />}</div>);
};

const HowItWorks = ({ sp }) => (
  <div style={{ paddingTop: 100 }}>
    <div className="ct" style={{ padding: "56px 24px", maxWidth: 800 }}>
      <div className="ew">Guide</div>
      <h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 12 }}>How TrustCo Tech Works</h1>
      <p style={{ color: MUTED, fontSize: 16, marginBottom: 48, lineHeight: 1.7 }}>3 simple steps to start syncing your devices.</p>
      {[
        { n: "1", ic: "key",  em: "🔑", t: "Receive Partner ID",  d: "Our admin issues a unique Partner ID to your account within 10 mins of registration." },
        { n: "2", ic: "link", em: "🔗", t: "Connect",             d: "Enter the Partner ID to connect to your partner device securely." },
        { n: "3", ic: "zap",  em: "🛒", t: "Choose Your Plan",    d: "Select a subscription that fits your needs and complete payment via your preferred method to instantly access calls, messages, location and more." },
      ].map(s => (
        <div key={s.n} style={{ display: "flex", gap: 20, marginBottom: 36, alignItems: "flex-start" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>{s.em}</div>
          <div>
            <h3 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: GOLD }}>Step {s.n}: {s.t}</h3>
            <p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.d}</p>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 40, padding: "24px 28px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14 }}>
        <p style={{ fontWeight: 600, color: GOLD, marginBottom: 8 }}>Need help getting started?</p>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>Our support team is available on Facebook to guide you through every step.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={WA_URL_DEFAULT} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button className="btn-gold"><Ic n="whatsapp" sz={16} />Contact on WhatsApp</button>
          </a>
          <a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button className="btn-gold"><Ic n="facebook" sz={16} />Contact Support</button>
          </a>
        </div>
      </div>
    </div>
  </div>
);

const Demo = ({ sp }) => {
  const [tab, setTab] = useState(null);
  const [sub, setSub] = useState("all");

  const DEFAULT_STREAMS = [
    { id: "calls",       lb: "Call Log",           ic: "phone",     subs: [{id:"all",lb:"All Calls",icon:"📋"},{id:"received",lb:"Received",icon:"📞"},{id:"outgoing",lb:"Outgoing",icon:"📤"},{id:"missed",lb:"Missed",icon:"❌"}] },
    { id: "sms",         lb: "SMS",                ic: "msg",       subs: [{id:"all",lb:"All Messages",icon:"💬"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"}] },
    { id: "whatsapp",    lb: "WhatsApp",           ic: "whatsapp",  subs: [{id:"all",lb:"All Chats",icon:"💚"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"},{id:"media",lb:"Media",icon:"🖼️"}] },
    { id: "whatsapp_biz",lb: "WhatsApp Business",  ic: "whatsapp",  subs: [{id:"all",lb:"All Chats",icon:"💼"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"catalogs",lb:"Catalogs",icon:"🛍️"}] },
    { id: "snapchat",    lb: "Snapchat",           ic: "snap",      subs: [{id:"all",lb:"All Snaps",icon:"👻"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"stories",lb:"Stories",icon:"⭕"},{id:"memories",lb:"Memories",icon:"💾"}] },
    { id: "telegram",    lb: "Telegram",           ic: "telegram",  subs: [{id:"all",lb:"All Chats",icon:"✈️"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"},{id:"channels",lb:"Channels",icon:"📢"}] },
    { id: "tiktok",      lb: "TikTok",             ic: "tiktok",    subs: [{id:"all",lb:"All DMs",icon:"🎵"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"videos",lb:"Liked Videos",icon:"❤️"}] },
    { id: "instagram",   lb: "Instagram",          ic: "instagram", subs: [{id:"all",lb:"All DMs",icon:"💌"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"requests",lb:"Requests",icon:"📬"}] },
    { id: "facebook",    lb: "Facebook",           ic: "facebook",  subs: [{id:"all",lb:"All Messages",icon:"💬"},{id:"received",lb:"Received",icon:"📥"},{id:"sent",lb:"Sent",icon:"📤"},{id:"groups",lb:"Groups",icon:"👥"}] },
    { id: "media",       lb: "Photos & Videos",    ic: "img",       subs: [{id:"all photos",lb:"All Photos",icon:"🖼️"},{id:"camera",lb:"Camera Roll",icon:"📷"},{id:"screenshots",lb:"Screenshots",icon:"🖥️"},{id:"all videos",lb:"All Videos",icon:"🎬"},{id:"recorded",lb:"Recorded",icon:"🎥"},{id:"downloaded",lb:"Downloaded",icon:"⬇️"}] },
    { id: "contacts",    lb: "Contacts",           ic: "users",     subs: [{id:"all",lb:"All Contacts",icon:"👤"},{id:"favorites",lb:"Favorites",icon:"⭐"},{id:"recent",lb:"Recent",icon:"🕐"}] },
    { id: "location",    lb: "Live Location",      ic: "map",       subs: [{id:"live",lb:"Live GPS",icon:"📍"},{id:"history",lb:"History",icon:"🗺️"},{id:"zones",lb:"Safe Zones",icon:"🏠"}] },
  ];

  const STREAM_KEY = "trustco_streams_v2";
  const [streams, setStreams] = useState(() => {
    try { const s = localStorage.getItem(STREAM_KEY); return s ? JSON.parse(s) : DEFAULT_STREAMS; } catch(e) { return DEFAULT_STREAMS; }
  });

  // Poll localStorage every 2s so admin changes reflect live in Demo
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const s = localStorage.getItem(STREAM_KEY);
        if (s) setStreams(JSON.parse(s));
      } catch(e) {}
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const cur = streams.find(s => s.id === tab);
  const chg = id => { setTab(id); const firstSub = streams.find(s => s.id === id)?.subs?.[0]; setSub(typeof firstSub === 'string' ? firstSub : (firstSub?.id || "all")); };

  const callData = {
    all: [
      { type:"incoming", name:"Mom", num:"+1 (555) 234-7890", dur:"5m 32s", time:"10:42 AM" },
      { type:"outgoing", name:"Jake Williams", num:"+1 (555) 876-4521", dur:"2m 14s", time:"9:15 AM" },
      { type:"missed",   name:"Office HR", num:"+1 (555) 100-2200", dur:"--", time:"8:50 AM" },
      { type:"incoming", name:"Sarah Chen", num:"+1 (555) 332-9981", dur:"8m 03s", time:"Yesterday" },
      { type:"incoming", name:"Dr. Miller", num:"+1 (555) 440-3312", dur:"3m 47s", time:"Yesterday" },
    ],
    received: [
      { type:"incoming", name:"Mom", num:"+1 (555) 234-7890", dur:"5m 32s", time:"10:42 AM" },
      { type:"incoming", name:"Sarah Chen", num:"+1 (555) 332-9981", dur:"8m 03s", time:"Yesterday" },
      { type:"incoming", name:"Dr. Miller", num:"+1 (555) 440-3312", dur:"3m 47s", time:"Yesterday" },
    ],
    outgoing: [
      { type:"outgoing", name:"Jake Williams", num:"+1 (555) 876-4521", dur:"2m 14s", time:"9:15 AM" },
    ],
    missed: [
      { type:"missed", name:"Office HR", num:"+1 (555) 100-2200", dur:"--", time:"8:50 AM" },
    ],
  };
  const smsData = {
    all: [
      { from:"Mom",  prev:"Don't forget dinner is at 7 tonight!", time:"10:45 AM" },
      { from:"Jake", prev:"Sounds good, see you at 7!", time:"9:20 AM", type:"sent" },
      { from:"Bank Alert", prev:"Your balance has been updated.", time:"8:02 AM" },
    ],
    received: [
      { from:"Mom",  prev:"Don't forget dinner is at 7 tonight!", time:"10:45 AM" },
      { from:"Bank Alert", prev:"Your balance has been updated.", time:"8:02 AM" },
    ],
    sent: [
      { from:"Jake", prev:"Sounds good, see you at 7!", time:"9:20 AM", type:"sent" },
    ],
  };
  const waData = {
    all: [
      { from:"Sarah 💚", prev:"Ok sounds good!", time:"Yesterday", av:"S", type:"sent" },
      { from:"Family Group", prev:"Dad: See everyone Sunday 🙌", time:"Yesterday", type:"groups" },
      { from:"Jake Williams", prev:"Bro did you see that game??", time:"2 days ago" },
    ],
    received: [
      { from:"Family Group", prev:"Dad: See everyone Sunday 🙌", time:"Yesterday", type:"groups" },
      { from:"Jake Williams", prev:"Bro did you see that game??", time:"2 days ago" },
    ],
    sent: [
      { from:"Sarah 💚", prev:"Ok sounds good!", time:"Yesterday", av:"S", type:"sent" },
    ],
    groups: [
      { from:"Family Group", prev:"Dad: See everyone Sunday 🙌", time:"Yesterday", type:"groups" },
    ],
    media: [
      { from:"Sarah 💚", prev:"📷 Photo", time:"Yesterday", av:"S" },
    ],
  };
  const igData = {
    all: [
      { from:"mikayla.dances", prev:"omg your last video was so good!!", time:"1h ago" },
      { from:"you", prev:"thanks!! means a lot 🙏", time:"55m ago", type:"sent" },
      { from:"unknown_user22", prev:"Hey! Liked your latest post 👀", time:"3h ago" },
    ],
    received: [
      { from:"mikayla.dances", prev:"omg your last video was so good!!", time:"1h ago" },
      { from:"unknown_user22", prev:"Hey! Liked your latest post 👀", time:"3h ago" },
    ],
    sent: [
      { from:"you", prev:"thanks!! means a lot 🙏", time:"55m ago", type:"sent" },
    ],
    requests: [
      { from:"unknown_user22", prev:"Hey! Liked your latest post 👀", time:"3h ago" },
    ],
  };
  const fbData = {
    all: [
      { from:"Lena K.", prev:"Did you check the flight prices?", time:"2h ago" },
      { from:"you", prev:"Yeah, found one for $340", time:"1h ago", type:"sent" },
      { from:"College Friends", prev:"Tom: reunion next month!", time:"Yesterday", type:"groups" },
    ],
    received: [
      { from:"Lena K.", prev:"Did you check the flight prices?", time:"2h ago" },
    ],
    sent: [
      { from:"you", prev:"Yeah, found one for $340", time:"1h ago", type:"sent" },
    ],
    groups: [
      { from:"College Friends", prev:"Tom: reunion next month!", time:"Yesterday", type:"groups" },
    ],
  };
  const wabizData = {
    all: [
      { from:"Luxe Boutique 💼", prev:"Hi! Your order #4821 is ready 📦", time:"3h ago" },
      { from:"you", prev:"Great, I'll pick it up around 5!", time:"2h ago", type:"sent" },
    ],
    received: [
      { from:"Luxe Boutique 💼", prev:"Hi! Your order #4821 is ready 📦", time:"3h ago" },
    ],
    sent: [
      { from:"you", prev:"Great, I'll pick it up around 5!", time:"2h ago", type:"sent" },
    ],
    catalogs: [
      { from:"Luxe Boutique 💼", prev:"🛍️ New Arrivals Catalog", time:"1 day ago" },
    ],
  };
  const snapData = {
    all: [
      { from:"jake.w", prev:"bro did you see that?? 😭", time:"40m ago" },
      { from:"you", prev:"lmao no what happened 💀", time:"38m ago", type:"sent" },
    ],
    received: [
      { from:"jake.w", prev:"bro did you see that?? 😭", time:"40m ago" },
    ],
    sent: [
      { from:"you", prev:"lmao no what happened 💀", time:"38m ago", type:"sent" },
    ],
    stories: [
      { from:"jake.w", prev:"📍 Story — posted 2h ago", time:"2h ago" },
    ],
    memories: [
      { from:"You", prev:"📸 Memory from last summer", time:"1 week ago" },
    ],
  };
  const tgData = {
    all: [
      { from:"Lena K.", prev:"Did you check the flight prices? ✈️", time:"5h ago" },
      { from:"you", prev:"Yeah, found one for $340 — looks good", time:"4h ago", type:"sent" },
      { from:"Crypto News", prev:"📢 Market update — BTC up 4%", time:"Yesterday", type:"groups" },
    ],
    received: [
      { from:"Lena K.", prev:"Did you check the flight prices? ✈️", time:"5h ago" },
    ],
    sent: [
      { from:"you", prev:"Yeah, found one for $340 — looks good", time:"4h ago", type:"sent" },
    ],
    groups: [
      { from:"Travel Buddies", prev:"Anna: who's in for the trip?", time:"Yesterday", type:"groups" },
    ],
    channels: [
      { from:"Crypto News", prev:"📢 Market update — BTC up 4%", time:"Yesterday", type:"groups" },
    ],
  };
  const ttData = {
    all: [
      { from:"mikayla.dances", prev:"omg your last video was so good!! 🔥", time:"30m ago" },
      { from:"you", prev:"thanks!! means a lot 🙏", time:"25m ago", type:"sent" },
    ],
    received: [
      { from:"mikayla.dances", prev:"omg your last video was so good!! 🔥", time:"30m ago" },
    ],
    sent: [
      { from:"you", prev:"thanks!! means a lot 🙏", time:"25m ago", type:"sent" },
    ],
    videos: [
      { from:"@mikayla.dances", prev:"❤️ Liked video — \"weekend vibes\"", time:"1h ago" },
    ],
  };
  const photos = [
    { n:"IMG_2041.jpg", s:"3.2 MB", d:"Today",     cat:"camera",      img:"https://picsum.photos/seed/cam1/300/300" },
    { n:"IMG_2040.jpg", s:"2.8 MB", d:"Today",     cat:"camera",      img:"https://picsum.photos/seed/cam2/300/300" },
    { n:"IMG_2038.jpg", s:"5.1 MB", d:"Today",     cat:"camera",      img:"https://picsum.photos/seed/cam3/300/300" },
    { n:"IMG_2037.jpg", s:"3.8 MB", d:"Yesterday", cat:"camera",      img:"https://picsum.photos/seed/cam4/300/300" },
    { n:"IMG_2036.jpg", s:"2.2 MB", d:"Yesterday", cat:"camera",      img:"https://picsum.photos/seed/cam5/300/300" },
    { n:"Screenshot_01.png",s:"1.1 MB",d:"Yesterday",cat:"screenshots",img:"https://picsum.photos/seed/ss1/300/300" },
    { n:"Screenshot_02.png",s:"0.9 MB",d:"Mon",    cat:"screenshots", img:"https://picsum.photos/seed/ss2/300/300" },
    { n:"IMG_2035.jpg", s:"4.4 MB", d:"Mon",       cat:"camera",      img:"https://picsum.photos/seed/cam6/300/300" },
    { n:"IMG_2034.jpg", s:"6.1 MB", d:"Mon",       cat:"camera",      img:"https://picsum.photos/seed/cam7/300/300" },
    { n:"IMG_2033.jpg", s:"3.3 MB", d:"Tue",       cat:"camera",      img:"https://picsum.photos/seed/cam8/300/300" },
    { n:"IMG_2032.jpg", s:"2.7 MB", d:"Tue",       cat:"camera",      img:"https://picsum.photos/seed/cam9/300/300" },
    { n:"IMG_2031.jpg", s:"4.9 MB", d:"Wed",       cat:"camera",      img:"https://picsum.photos/seed/cam10/300/300" },
    { n:"VID_0291.mp4", s:"48 MB",  d:"Yesterday", cat:"recorded",    v:true, img:"https://picsum.photos/seed/vid1/300/300" },
    { n:"VID_0290.mp4", s:"112 MB", d:"Mon",       cat:"downloaded",  v:true, img:"https://picsum.photos/seed/vid2/300/300" },
    { n:"VID_0289.mp4", s:"78 MB",  d:"Tue",       cat:"recorded",    v:true, img:"https://picsum.photos/seed/vid3/300/300" },
  ];
  const contacts = [
    { name:"Mom", ph:"+1 (555) 234-7890", tg:"Family", fav:true },
    { name:"Jake Williams", ph:"+1 (555) 876-4521", tg:"Friend", fav:false },
    { name:"Office HR", ph:"+1 (555) 100-2200", tg:"Work", fav:false },
    { name:"Sarah Chen", ph:"+1 (555) 332-9981", tg:"Friend", fav:true },
    { name:"Dr. Miller", ph:"+1 (555) 440-3312", tg:"Doctor", fav:false },
  ];

  const renderMsgList = (data, avatarGrad) => (data || []).map((m, i) => (
    <div key={i} className="glass" style={{ padding:"13px 17px", display:"flex", gap:12, alignItems:"center", marginBottom:7 }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:avatarGrad||`linear-gradient(135deg,${GOLD},#9A7B2F)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:DARK, flexShrink:0 }}>{(m.from||m.av||"?")[0]}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontWeight:600, fontSize:13 }}>{m.from}</span>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {m.type && <span className={`tag ${m.type==="sent"?"tgs":m.type==="groups"?"tgb":"tgg"}`} style={{ fontSize:9 }}>{m.type}</span>}
            <span style={{ fontSize:11, color:MUTED }}>{m.time}</span>
          </div>
        </div>
        <p style={{ color:MUTED, fontSize:12, marginTop:3 }}>{m.prev}</p>
      </div>
    </div>
  ));

  return (
    <div style={{ paddingTop:70, minHeight:"100vh", background:DARK }}>
      {/* Demo banner */}
      <div style={{ background:"linear-gradient(90deg,rgba(201,168,76,0.14),rgba(201,168,76,0.04))", borderBottom:"1px solid rgba(201,168,76,0.2)", padding:"9px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <p style={{ fontSize:12, color:"#A8B0C2", display:"flex", alignItems:"center", gap:8 }}><span className="tag tg">DEMO MODE</span>Simulated data — see how it works before you buy.</p>
        <button onClick={() => sp("register")} className="btn-gold" style={{ fontSize:12, padding:"7px 16px" }}><Ic n="zap" sz={13} />Get Started Free</button>
      </div>

      {/* Drawer open: no stream selected — show full feature card grid */}
      {!tab && (
        <div style={{ padding:"28px 20px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <h2 className="raj" style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Choose a Data Stream</h2>
            <p style={{ color:MUTED, fontSize:13 }}>Tap any stream below to preview what gets synced</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14, maxWidth:900, margin:"0 auto" }}>
            {streams.map(s => {
              const colors = { calls:"#6C63FF", sms:GOLD, whatsapp:"#25D366", whatsapp_biz:"#128C7E", snapchat:"#FFFC00", telegram:"#229ED9", tiktok:"#FF0050", instagram:"#E1306C", facebook:"#1877F2", media:GOLD, contacts:"#00C878", location:"#FF4D6A" };
              const cl = s.color || colors[s.id] || GOLD;
              return (
                <div key={s.id} className="glass" style={{ padding: 16, borderRadius: 16, borderColor: cl + "30", background: `linear-gradient(135deg,${cl}10,${cl}04)`, cursor: "pointer" }} onClick={() => chg(s.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 11, background: cl + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n={s.ic} sz={17} c={cl} /></div>
                      <h3 className="raj" style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{s.lb}</h3>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {s.subs.map(sub => {
                      const lb = typeof sub === "string" ? sub : sub.lb;
                      const id = typeof sub === "string" ? sub : sub.id;
                      return <span key={id} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${cl}35`, color: cl, fontSize: 11, fontWeight: 600 }}>{lb}</span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drawer open: stream selected — slide-in panel */}
      {tab && (
        <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 118px)" }}>

          {/* Stream selector bar — horizontal scrollable pill row */}
          <div style={{ background:"#0A0E1A", borderBottom:"1px solid rgba(201,168,76,0.1)", padding:"10px 16px", display:"flex", gap:8, overflowX:"auto", flexShrink:0, alignItems:"center" }}>
            <button onClick={() => setTab(null)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"7px 12px", cursor:"pointer", color:MUTED, fontSize:12, display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ fontSize:14 }}>☰</span> All
            </button>
            <div style={{ width:1, height:28, background:"rgba(255,255,255,0.08)", flexShrink:0 }} />
            {streams.map(s => {
              const colors = { calls:"#6C63FF", sms:"#C9A84C", whatsapp:"#25D366", instagram:"#E1306C", facebook:"#1877F2", media:"#C9A84C", contacts:"#00C878", location:"#FF4D6A" };
              const cl = s.color || colors[s.id] || GOLD;
              const active = tab === s.id;
              return (
                <button key={s.id} onClick={() => chg(s.id)} style={{ background: active ? `${cl}22` : "rgba(255,255,255,0.04)", border: active ? `1.5px solid ${cl}60` : "1.5px solid rgba(255,255,255,0.07)", borderRadius:22, padding:"7px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:7, flexShrink:0, transition:"all .2s" }}>
                  <Ic n={s.ic} sz={14} c={active ? cl : MUTED} />
                  <span style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? cl : MUTED, whiteSpace:"nowrap" }}>{s.lb}</span>
                </button>
              );
            })}
          </div>

          {/* Main content area */}
          <div className="main-scroll" style={{ flex:1, overflow:"auto", padding:"18px 20px" }}>

            {/* Stream header with active sub title/desc */}
            {(() => {
              const activeSub = (cur?.subs || []).find(s => s.id === sub) || cur?.subs?.[0];
              const colors = { calls:"#6C63FF", sms:"#C9A84C", whatsapp:"#25D366", instagram:"#E1306C", facebook:"#1877F2", media:"#C9A84C", contacts:"#00C878", location:"#FF4D6A" };
              const cl = cur?.color || colors[cur?.id] || GOLD;
              return (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, padding:"14px 18px", background:`linear-gradient(135deg,${cl}10,${cl}04)`, border:`1px solid ${cl}25`, borderRadius:14 }}>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${cl}22`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Ic n={cur?.ic||"link"} sz={20} c={cl} />
                    </div>
                    <div>
                      <h2 className="raj" style={{ fontSize:17, fontWeight:700, marginBottom:2, color:"#E8EAF0" }}>{activeSub?.title || cur?.lb}</h2>
                      <p style={{ color:MUTED, fontSize:12, maxWidth:460, lineHeight:1.5 }}>{activeSub?.desc || "Demo data — forwarded from partner device"}</p>
                    </div>
                  </div>
                  <span className="tag tgg" style={{ fontSize:10, flexShrink:0, marginLeft:10 }}><span className="dot on" style={{ width:6, height:6 }} /> Live</span>
                </div>
              );
            })()}

            {/* Sub-tabs */}
            <div className="sub-tabs" style={{ marginBottom:16 }}>
              {(cur?.subs || []).map(s => (
                <button key={s.id} className={`btn-tab${sub===s.id?" active":""}`} onClick={() => setSub(s.id)} style={{ gap:5, fontSize:12 }}>
                  <span style={{ fontSize:13 }}>{s.icon}</span>{s.lb}
                </button>
              ))}
            </div>

            {/* CALLS */}
            {tab==="calls" && (
              <div className="ad">
                <div className="glass" style={{ overflow:"auto" }}>
                  <table className="tbl">
                    <thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead>
                    <tbody>{(callData[sub]||callData.all).map((c,i) => (
                      <tr key={i}>
                        <td style={{ fontSize:16 }}>{c.type==="incoming"?"📞":c.type==="outgoing"?"📤":"❌"}</td>
                        <td style={{ color:TEXT, fontWeight:600 }}>{c.name}</td>
                        <td className="mono" style={{ fontSize:11 }}>{c.num}</td>
                        <td><span className={`tag ${c.type==="incoming"?"tgg":c.type==="outgoing"?"tgb":"tgr"}`}>{c.type}</span></td>
                        <td>{c.dur}</td>
                        <td style={{ fontSize:11 }}>{c.time}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SMS */}
            {tab==="sms" && <div className="ad">{renderMsgList(smsData[sub]||smsData.all)}</div>}

            {/* WhatsApp */}
            {tab==="whatsapp" && <div className="ad">{renderMsgList(waData[sub]||waData.all, "linear-gradient(135deg,#25D366,#128C7E)")}</div>}

            {/* Instagram */}
            {tab==="instagram" && <div className="ad">{renderMsgList(igData[sub]||igData.all, "linear-gradient(135deg,#E1306C,#833AB4)")}</div>}

            {/* Facebook */}
            {tab==="facebook" && <div className="ad">{renderMsgList(fbData[sub]||fbData.all, "linear-gradient(135deg,#1877F2,#0d5bbb)")}</div>}

            {/* WhatsApp Business */}
            {tab==="whatsapp_biz" && (
              <div className="ad">
                {renderMsgList(wabizData[sub]||wabizData.all, "linear-gradient(135deg,#128C7E,#075E54)")}
                {(sub==="all"||sub==="received") && (
                  <div className="glass" style={{ padding:18, marginTop:14 }}>
                    <p style={{ fontSize:11, color:MUTED, marginBottom:12, textTransform:"uppercase", letterSpacing:".08em" }}>Latest — Luxe Boutique 💼</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                      <div style={{ display:"flex" }}><div className="bub bi">Hi! Your order #4821 is ready 📦</div></div>
                      <div style={{ display:"flex" }}><div className="bub bi">You can collect it any time before 8 PM today 🕗</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">Great, I'll pick it up around 5!</div></div>
                      <div style={{ display:"flex" }}><div className="bub bi">Perfect! We'll keep it at the front desk 👍</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Snapchat */}
            {tab==="snapchat" && (
              <div className="ad">
                {renderMsgList(snapData[sub]||snapData.all, "linear-gradient(135deg,#FFFC00,#F5D800)")}
                {(sub==="all"||sub==="received") && (
                  <div className="glass" style={{ padding:18, marginTop:14 }}>
                    <p style={{ fontSize:11, color:MUTED, marginBottom:12, textTransform:"uppercase", letterSpacing:".08em" }}>Latest — jake.w 👻</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                      <div style={{ display:"flex" }}><div className="bub bi">bro did you see that?? 😭</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">lmao no what happened 💀</div></div>
                      <div style={{ display:"flex" }}><div className="bub bi">check my story rn it's insane</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">omg 😭😭 no way</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Telegram */}
            {tab==="telegram" && (
              <div className="ad">
                {renderMsgList(tgData[sub]||tgData.all, "linear-gradient(135deg,#2AABEE,#1d8fc4)")}
                {(sub==="all"||sub==="received") && (
                  <div className="glass" style={{ padding:18, marginTop:14 }}>
                    <p style={{ fontSize:11, color:MUTED, marginBottom:12, textTransform:"uppercase", letterSpacing:".08em" }}>Latest — Lena K. ✈️</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                      <div style={{ display:"flex" }}><div className="bub bi">Did you check the flight prices? ✈️</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">Yeah, found one for $340 — looks good</div></div>
                      <div style={{ display:"flex" }}><div className="bub bi">Book it!! I'm so ready for this trip 🌍</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">Done! Confirmation sent to your email 📧</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TikTok */}
            {tab==="tiktok" && (
              <div className="ad">
                {renderMsgList(ttData[sub]||ttData.all, "linear-gradient(135deg,#FF0050,#c4003c)")}
                {(sub==="all"||sub==="received") && (
                  <div className="glass" style={{ padding:18, marginTop:14 }}>
                    <p style={{ fontSize:11, color:MUTED, marginBottom:12, textTransform:"uppercase", letterSpacing:".08em" }}>Latest — @mikayla.dances 🎵</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                      <div style={{ display:"flex" }}><div className="bub bi">omg your last video was so good!! 🔥</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">thanks!! means a lot 🙏</div></div>
                      <div style={{ display:"flex" }}><div className="bub bi">how long did it take you to edit??</div></div>
                      <div style={{ display:"flex", justifyContent:"flex-end" }}><div className="bub bo">like 2 hours lol, capcut is life 😭</div></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photos & Videos */}
            {tab==="media" && (
              <div className="ad">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12 }}>
                  {photos.filter(p => {
                    if (sub==="all photos") return !p.v;
                    if (sub==="all videos") return p.v;
                    if (sub==="camera") return p.cat==="camera";
                    if (sub==="screenshots") return p.cat==="screenshots";
                    if (sub==="recorded") return p.cat==="recorded" && p.v;
                    if (sub==="downloaded") return p.cat==="downloaded";
                    return true;
                  }).map((p,i) => (
                    <div key={i} className="glass" style={{ padding:0, overflow:"hidden", borderRadius:13, cursor:"pointer" }}>
                      <div style={{ height:120, position:"relative", overflow:"hidden", background:"#111" }}>
                        <img src={p.img} alt={p.n} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                        <div style={{ display:"none", height:"100%", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg,${p.c||GOLD}33,${p.c||GOLD}11)`, position:"absolute", top:0, left:0, right:0, bottom:0 }}><Ic n={p.v?"video":"img"} sz={28} c={p.c||GOLD} /></div>
                        {p.v && (
                          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", background:"rgba(255,255,255,0.85)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#111"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            </div>
                            <span className="tag tg" style={{ position:"absolute", top:7, right:7, fontSize:8 }}>VIDEO</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"9px 11px" }}>
                        <p style={{ fontSize:11, fontWeight:600, color:TEXT }}>{p.n}</p>
                        <p style={{ fontSize:10, color:MUTED }}>{p.s} · {p.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {tab==="contacts" && (
              <div className="ad">
                <div className="glass" style={{ overflow:"auto" }}>
                  <table className="tbl">
                    <thead><tr><th>Name</th><th>Phone</th><th>Tag</th><th>Fav</th></tr></thead>
                    <tbody>{contacts.filter(c => sub==="favorites" ? c.fav : true).map((c,i) => (
                      <tr key={i}>
                        <td style={{ color:TEXT, fontWeight:600 }}>{c.name}</td>
                        <td className="mono" style={{ fontSize:11 }}>{c.ph}</td>
                        <td><span className={`tag ${c.tg==="Family"?"tgg":c.tg==="Work"?"tgb":c.tg==="Doctor"?"tg":"tgs"}`}>{c.tg}</span></td>
                        <td style={{ fontSize:16 }}>{c.fav?"⭐":""}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Live Location */}
            {tab==="location" && (
              <div className="ad">
                {sub==="live" && (
                  <div className="glass" style={{ overflow:"hidden", height:300 }}>
                    <div style={{ height:"100%", background:"linear-gradient(135deg,rgba(255,77,106,0.06),rgba(201,168,76,0.02))", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
                      <div style={{ position:"relative" }}>
                        <div style={{ position:"absolute", width:56, height:56, borderRadius:"50%", border:"2px solid rgba(255,77,106,0.3)", animation:"ping 1.5s ease-out infinite", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }} />
                        <div style={{ width:18, height:18, borderRadius:"50%", background:"#FF4D6A", boxShadow:"0 0 0 4px rgba(255,77,106,0.2)" }} />
                      </div>
                      <p className="mono" style={{ fontSize:16, color:TEXT }}>37.7749° N, 122.4194° W</p>
                      <p style={{ color:MUTED, fontSize:12 }}>San Francisco, CA — Demo location</p>
                    </div>
                  </div>
                )}
                {sub==="history" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    {[["Today 10:24 AM","TechCorp Office, SF","#FF4D6A"],["Today 08:15 AM","Home, SF","#00C878"],["Yesterday 6:30 PM","Westfield Mall, SF","#6C63FF"],["Yesterday 12:00 PM","Civic Center BART","#C9A84C"]].map(([t,loc,c],i) => (
                      <div key={i} className="glass" style={{ padding:"13px 17px", display:"flex", gap:12, alignItems:"center" }}>
                        <div style={{ width:36, height:36, borderRadius:"50%", background:c+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n="map" sz={16} c={c} /></div>
                        <div><p style={{ fontWeight:600, fontSize:13, color:TEXT }}>{loc}</p><p style={{ fontSize:11, color:MUTED }}>{t}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {sub==="zones" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                    {[["Home","37.7750° N, 122.4195° W","Active","#00C878"],["Work","37.7897° N, 122.3972° W","Active","#00C878"],["School","37.7618° N, 122.4586° W","Inactive","#C9A84C"]].map(([name,coord,status,c],i) => (
                      <div key={i} className="glass" style={{ padding:"13px 17px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background:c+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🏠</div>
                          <div><p style={{ fontWeight:600, fontSize:13, color:TEXT }}>{name}</p><p style={{ fontSize:11, color:MUTED }}>{coord}</p></div>
                        </div>
                        <span className={`tag ${status==="Active"?"tgg":"tg"}`} style={{ fontSize:10 }}>{status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CTA at bottom */}
            <div style={{ marginTop:28, padding:"20px 24px", background:"linear-gradient(135deg,rgba(201,168,76,0.08),rgba(201,168,76,0.02))", border:"1px solid rgba(201,168,76,0.15)", borderRadius:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
              <div>
                <p className="raj" style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>This is simulated data</p>
                <p style={{ fontSize:12, color:MUTED }}>Create an account to connect real devices and see live data.</p>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-out" style={{ fontSize:13 }} onClick={() => sp("pricing")}>View Plans</button>
                <button className="btn-gold" style={{ fontSize:13 }} onClick={() => sp("register")}><Ic n="zap" sz={14} />Get Started</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================
// ROOT APP
// ============================================================
const PUBLIC_PAGES = ["home", "demo", "pricing", "refund", "privacy", "terms", "about", "contact", "howitworks", "features", "reviews", "login", "register", "forgot-password", "reset-password"];

function AppInner() {
  const [pg, setPg] = useState("home");
  const [user, setUserState] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recoveryToken, setRecoveryToken] = useState(null);

  // Mirror `user` into a ref that updates synchronously. setUser() is often
  // called immediately followed by sp("admin") / sp("dashboard") in the same
  // event handler (e.g. right after login). React state from setUserState
  // isn't applied until the next render, so sp()'s auth check would otherwise
  // still see the *old* user (null) and incorrectly bounce back to "login"
  // instead of going to the intended page. Reading userRef.current instead of
  // the `user` closure variable inside sp() avoids that race.
  const userRef = useRef(null);
  const setUser = updater => {
    setUserState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      userRef.current = next;
      try { if (typeof localStorage !== "undefined") { if (next) localStorage.setItem("trustco_session", JSON.stringify(next)); else localStorage.removeItem("trustco_session"); } } catch(e) {}
      return next;
    });
  };

  // Restore page on refresh if user was logged in (Safari-safe)
  useEffect(() => {
    try {
      if (typeof localStorage === "undefined") return;
      const saved = localStorage.getItem("trustco_session");
      if (!saved) return;
      const u = JSON.parse(saved);
      if (!u || !u.id) return;
      userRef.current = u;
      setUserState(u);
      if (u.isAdmin) setPg("admin");
      else setPg("dashboard");
    } catch(e) {
      try { localStorage.removeItem("trustco_session"); } catch(e2) {}
    }
  }, []);

  // Restore flowStep from localStorage
  useEffect(() => {
    try {
      if (typeof localStorage === "undefined") return;
      // flowStep is per user so only restore if user is logged in
    } catch(e) {}
  }, []);

  // Fetch real, admin-approved reviews from Supabase for the public site.
  // (Anyone can read rows where approved = true per the RLS policy.)
  useEffect(() => {
    supa("reviews?approved=eq.true&select=*&order=created_at.desc").then(r => setReviews(r || [])).catch(() => {});
  }, []);

  // Tawk.to Live Chat — only show on public pages
  useEffect(() => {
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a35f4d2a259a01d4cf75f3c/1jrhc8m1o";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);
  }, []);

  // Hide/show Tawk based on current page
  useEffect(() => {
    const hiddenPages = ["dashboard", "admin", "reset-password"];
    const shouldHide = hiddenPages.includes(pg);
    const tryToggle = (attempts = 0) => {
      if (window.Tawk_API && window.Tawk_API.hideWidget) {
        if (shouldHide) window.Tawk_API.hideWidget();
        else window.Tawk_API.showWidget();
      } else if (attempts < 20) {
        setTimeout(() => tryToggle(attempts + 1), 500);
      }
    };
    tryToggle();
  }, [pg]);

  // Supabase's password-recovery email links back to this same page with
  // #access_token=...&type=recovery in the URL hash. Detect that on load and
  // route straight to the Reset Password screen with the token in hand.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const token = params.get("access_token");
      if (token) { setRecoveryToken(token); setPg("reset-password"); }
    }
  }, []);

  // After email confirmation, redirect to login with a success message
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("type") === "signup") {
      window.location.hash = "";
      setPg("login");
    }
  }, []);

  const sp = page => {
    if (!PUBLIC_PAGES.includes(page) && !userRef.current) { setPg("login"); return; }
    setPg(page);
    window.scrollTo(0, 0);
  };

  const isDash = pg === "dashboard";
  const isAdmin = pg === "admin";

  const render = () => {
    if (isDash && user && !user.isAdmin) return <UserDash user={user} setUser={setUser} sp={sp} />;
    if (isAdmin && user?.isAdmin) return <AdminDash user={user} setUser={setUser} sp={sp} />;
    switch (pg) {
      case "home": return <Home sp={sp} reviews={reviews} setReviews={setReviews} user={user} />;
      case "features": return <Features sp={sp} />;
      case "pricing": return <Pricing sp={sp} />;
      case "demo": return <Demo sp={sp} />;
      case "about": return <About />;
      case "contact": return <Contact />;
      case "howitworks": return <HowItWorks sp={sp} />;
      case "reviews": return <ReviewsPage reviews={reviews} setReviews={setReviews} />;
      case "refund": return <RefundPage />;
      case "privacy": return <PrivacyPage />;
      case "terms": return <TermsPage />;
      case "login": return <Login sp={sp} su={setUser} />;
      case "register": return <Register sp={sp} su={setUser} />;
      case "forgot-password": return <ForgotPassword sp={sp} />;
      case "reset-password": return <ResetPassword sp={sp} accessToken={recoveryToken} />;
      default: return <Home sp={sp} reviews={reviews} setReviews={setReviews} user={user} />;
    }
  };

  return (<>
    <Styles />
    {!isDash && !isAdmin && <Nav pg={pg} sp={sp} user={user} su={setUser} />}
    {(isDash || isAdmin) && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 500, height: 70, background: "#0D1020", borderBottom: "1px solid rgba(201,168,76,0.12)", display: "flex", alignItems: "center", padding: "0 24px", gap: 16 }}>
        <button onClick={() => sp("home")} style={{ display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer" }}>
          <Logo sz={34} />
          <div><div className="raj" style={{ fontSize: 13, fontWeight: 700, color: SILVER, letterSpacing: ".1em", lineHeight: 1.1 }}>TRUSTCO</div><div className="raj" style={{ fontSize: 8, color: GOLD, letterSpacing: ".2em", lineHeight: 1 }}>— TECH —</div></div>
        </button>
        {user?.isAdmin && <span className="tag tgr" style={{ fontSize: 10 }}>Admin Panel</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: MUTED }}>{user?.email}</span>
          {user?.profile?.activated && <span className="tag tgg" style={{ fontSize: 10 }}>✓ Active</span>}
          <button className="btn-out" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => sp("home")}>← Back to site</button>
          <button onClick={() => { setUser(null); sp("home"); }} style={{ background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center" }}><Ic n="logout" sz={13} />Out</button>
        </div>
      </div>
    )}
    <main>{render()}</main>
  </>);
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
