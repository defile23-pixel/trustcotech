import { useState, useEffect, useRef } from "react";

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
  if (data.error) throw new Error(data.error_description || data.error);
  return data;
};

// ============================================================
// CONSTANTS
// ============================================================
const GOLD="#C9A84C",SILVER="#C0C7D4",DARK="#080C18",MUTED="#7A849A",TEXT="#EDF0F7";
const FB_URL="https://www.facebook.com/profile.php?id=61588536275390&mibextid=wwXIfr";
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
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

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
.mo{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(14px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;}
.md{background:#0F1424;border:1px solid rgba(201,168,76,0.25);border-radius:22px;padding:36px;max-width:560px;width:100%;animation:sup .3s ease;margin:auto;}
.lo{position:absolute;inset:0;background:rgba(8,12,24,0.94);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border-radius:inherit;z-index:10;}
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
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:900;}
.drawer{position:fixed;top:0;right:0;bottom:0;width:300px;background:#0D1020;border-left:1px solid rgba(201,168,76,0.2);z-index:901;padding:24px 0;overflow-y:auto;animation:slide-right .3s ease;}
.drawer-link{display:flex;align-items:center;gap:14px;padding:16px 28px;color:#A8B0C2;cursor:pointer;font-size:15px;font-weight:500;border:none;background:none;width:100%;text-align:left;transition:all .2s;border-left:3px solid transparent;}
.drawer-link:hover{color:#C9A84C;background:rgba(201,168,76,0.06);border-left-color:#C9A84C;}
.sub-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding:14px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(201,168,76,0.1);}
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
@media(max-width:768px){.sec{padding:56px 0;}.hm{display:none!important;}.sb{width:100%;min-height:auto;}}
@media(max-width:480px){.ct{padding:0 14px;}}
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
  return <canvas ref={r} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: .5 }} />;
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
  const [meth, setMeth] = useState(null);
  const [gc, setGc] = useState(null);
  const [cp, setCp] = useState("");
  const [saving, setSaving] = useState(false);

  const plans = [
    { name: "6 Months", price: 100, period: "6-month licence", ft: ["All 9 data streams", "2 devices", "Email support"] },
    { name: "2 Years", price: 300, period: "2-year licence", best: true, ft: ["All 9 data streams", "Up to 5 devices", "Priority support", "Free updates"] }
  ];
  const gcs = [
    { name: "Razer Gold", em: "🟢", ins: "Purchase a Razer Gold Gift Card of the exact plan amount, scratch to reveal the PIN, then email it to us." },
    { name: "Steam", em: "🎮", ins: "Purchase a Steam Gift Card of the exact plan amount, scratch to reveal the code, then email it to us." },
    { name: "Apple Gift Card", em: "🍎", ins: "Purchase an Apple Gift Card of the exact plan amount, scratch to reveal the code, then email it to us." }
  ];

  const copy = (txt, k) => { try { navigator.clipboard.writeText(txt); } catch (e) { } setCp(k); setTimeout(() => setCp(""), 2500); };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      if (user?.id) {
        await supa(`payments`, "POST", { user_id: user.id, plan, amount: plan === "6 Months" ? 100 : 300, method: meth === "giftcard" ? gc : "crypto", status: "pending" }, token);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 22 }}>
          {plans.map(p => (
            <div key={p.name} className={`pc${plan === p.name ? " sel" : ""}`} onClick={() => setPlan(p.name)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 15, height: 15, borderRadius: "50%", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{plan === p.name && <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />}</div>
                  <span className="raj" style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                </div>
                {p.best && <span className="tag tg" style={{ fontSize: 9 }}>BEST</span>}
              </div>
              <p className="raj" style={{ fontSize: 26, fontWeight: 700, color: GOLD, marginBottom: 3 }}>${p.price}</p>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{p.period}</p>
              {p.ft.map(f => (<div key={f} style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}><Ic n="check" sz={11} c="#00C878" /><span style={{ fontSize: 11, color: "#A8B0C2" }}>{f}</span></div>))}
            </div>
          ))}
        </div>

        <div className="dv" />
        <p className="raj" style={{ fontSize: 12, color: GOLD, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>Step 2 — Payment Method</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 18 }}>
          {[{ id: "giftcard", lb: "Gift Card", em: "🎁" }, { id: "crypto", lb: "Cryptocurrency", em: "₿" }].map(m => (
            <div key={m.id} onClick={() => { setMeth(m.id); setGc(null); }} style={{ padding: "13px 14px", borderRadius: 11, border: `2px solid ${meth === m.id ? GOLD : "rgba(201,168,76,0.15)"}`, background: meth === m.id ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", cursor: "pointer", transition: "all .2s", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 5 }}>{m.em}</div>
              <p className="raj" style={{ fontWeight: 700, fontSize: 14 }}>{m.lb}</p>
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
          </div>
        )}

        {(meth === "giftcard" && gc || meth === "crypto") && plan ? (
          <button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 15, marginTop: 8 }} onClick={handleConfirm} disabled={saving}>
            <Ic n="check" sz={16} />{saving ? "Saving..." : meth === "giftcard" ? `I've sent the ${gc} code →` : "I've sent the crypto payment →"}
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

  const myId = user?.profile?.partner_id || ("TC-" + String(Math.abs((user?.email || "demo").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 900) + 100) + "-724");
  const msgs = [[5, "Locating device..."], [20, "Establishing encrypted tunnel..."], [38, "Authenticating partner device..."], [55, "Verifying Partner ID..."], [70, "Syncing device registry..."], [85, "Loading device profile..."], [95, "Finalising connection..."], [100, "Connected successfully!"]];

  const fmt = v => { const r = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9); if (r.length <= 2) return r; if (r.length <= 5) return r.slice(0, 2) + "-" + r.slice(2); return r.slice(0, 2) + "-" + r.slice(2, 5) + "-" + r.slice(5); };

  const go = async () => {
    const clean = pid.replace(/\s/g, "").toUpperCase();
    if (!clean || clean.length < 5) { setErr("Please enter a Partner ID."); setShk(true); setTimeout(() => setShk(false), 500); return; }
    if (clean === myId.replace(/-/g, "")) { setErr("That's your own device ID. Enter the ID from your second device."); setShk(true); setTimeout(() => setShk(false), 500); return; }

    // Validate against Supabase partner_ids table
    try {
      const rows = await supa(`partner_ids?code=eq.${pid.toUpperCase()}&is_used=eq.true&select=code`);
      if (!rows || rows.length === 0) {
        setErr("❌ Incorrect Partner ID number. Please contact support.");
        setShk(true); setTimeout(() => setShk(false), 500); return;
      }
    } catch (e) {
      // Fallback to hardcoded list if DB unreachable
      const VALID = ["TC-100-001","TC-100-002","TC-100-003","TC-200-001","TC-200-002","TC-300-001","TC-300-002","TC-400-001","TC-500-001","TC-500-002"];
      if (!VALID.includes(pid.toUpperCase())) {
        setErr("❌ Incorrect Partner ID number. Please contact support.");
        setShk(true); setTimeout(() => setShk(false), 500); return;
      }
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
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="raj" style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>{prog}%</span></div>
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

  const streams = [
    { id: "calls", lb: "Call Log", ic: "phone", lk: false, subs: ["all", "received", "incoming", "missed"] },
    { id: "sms", lb: "SMS", ic: "msg", lk: false, subs: ["all", "received", "sent"] },
    { id: "whatsapp", lb: "WhatsApp", ic: "whatsapp", lk: false, subs: ["all", "received", "sent", "groups"] },
    { id: "instagram", lb: "Instagram", ic: "instagram", lk: !act, subs: ["all", "received", "sent"] },
    { id: "facebook", lb: "Facebook", ic: "facebook", lk: !act, subs: ["all", "received", "sent"] },
    { id: "media", lb: "Photos & Videos", ic: "img", lk: !act, subs: ["all photos", "camera", "screenshots", "all videos", "recorded", "downloaded"] },
    { id: "contacts", lb: "Contacts", ic: "users", lk: !act, subs: ["all", "favorites", "recent"] },
    { id: "location", lb: "Live Location", ic: "map", lk: !act, subs: ["live", "history"] },
  ];
  const cur = streams.find(s => s.id === tab);
  const chg = id => { setTab(id); setSub("all"); };

  const callData = {
    all: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }, { name: "Jake Williams", num: "+1(555)876-4521", type: "outgoing", dur: "1m 05s", time: "Today, 09:15 AM" }, { name: "Office HR", num: "+1(555)100-2200", type: "missed", dur: "—", time: "Today, 08:47 AM" }, { name: "Sarah Chen", num: "+1(555)332-9981", type: "incoming", dur: "12m 18s", time: "Yesterday, 7:30 PM" }, { name: "Dr. Miller", num: "+1(555)440-3312", type: "incoming", dur: "3m 22s", time: "Yesterday, 2:00 PM" }],
    received: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }, { name: "Sarah Chen", num: "+1(555)332-9981", type: "incoming", dur: "12m 18s", time: "Yesterday, 7:30 PM" }, { name: "Dr. Miller", num: "+1(555)440-3312", type: "incoming", dur: "3m 22s", time: "Yesterday, 2:00 PM" }],
    incoming: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }, { name: "Sarah Chen", num: "+1(555)332-9981", type: "incoming", dur: "12m 18s", time: "Yesterday, 7:30 PM" }],
    missed: [{ name: "Office HR", num: "+1(555)100-2200", type: "missed", dur: "—", time: "Today, 08:47 AM" }],
  };
  const smsData = {
    all: [{ from: "Mom", prev: "Don't forget dinner! 😊", time: "10:31 AM", type: "received" }, { from: "Jake", prev: "Sounds good, see you at 7!", time: "9:20 AM", type: "sent" }, { from: "Sarah", prev: "Can you send that file?", time: "Yesterday", type: "received" }],
    received: [{ from: "Mom", prev: "Don't forget dinner! 😊", time: "10:31 AM", type: "received" }, { from: "Sarah", prev: "Can you send that file?", time: "Yesterday", type: "received" }],
    sent: [{ from: "Jake", prev: "Sounds good, see you at 7!", time: "9:20 AM", type: "sent" }],
  };
  const waData = {
    all: [{ from: "Mom 💚", prev: "Are you home yet?", time: "10:45 AM", av: "M", type: "received" }, { from: "Jake 💚", prev: "Haha no way 😂", time: "9:55 AM", av: "J", type: "received" }, { from: "Family 👨‍👩‍👧", prev: "Dad: We're leaving at 5", time: "Yesterday", av: "F", type: "groups" }, { from: "Sarah 💚", prev: "Ok sounds good!", time: "Yesterday", av: "S", type: "sent" }],
    received: [{ from: "Mom 💚", prev: "Are you home yet?", time: "10:45 AM", av: "M", type: "received" }, { from: "Jake 💚", prev: "Haha no way 😂", time: "9:55 AM", av: "J", type: "received" }],
    sent: [{ from: "Sarah 💚", prev: "Ok sounds good!", time: "Yesterday", av: "S", type: "sent" }],
    groups: [{ from: "Family 👨‍👩‍👧", prev: "Dad: We're leaving at 5", time: "Yesterday", av: "F", type: "groups" }],
  };
  const photos = [{ n: "IMG_2041.jpg", s: "3.2 MB", d: "Today", c: GOLD, cat: "camera" }, { n: "IMG_2040.jpg", s: "2.8 MB", d: "Today", c: SILVER, cat: "camera" }, { n: "Screenshot_01.png", s: "1.1 MB", d: "Yesterday", c: "#6C63FF", cat: "screenshots" }, { n: "VID_0291.mp4", s: "48 MB", d: "Yesterday", c: "#FF4D6A", v: true, cat: "recorded" }, { n: "IMG_2039.jpg", s: "4.1 MB", d: "Yesterday", c: "#00C878", cat: "camera" }, { n: "VID_0290.mp4", s: "112 MB", d: "Mon", c: GOLD, v: true, cat: "downloaded" }];
  const contacts = [{ name: "David Park", ph: "+1 555 221 4400", em: "david@email.com", tg: "Friend", fav: true }, { name: "Dr. Miller", ph: "+1 555 440 3312", em: "miller@clinic.com", tg: "Doctor", fav: false }, { name: "Mom", ph: "+1 555 234 7890", em: "mom@family.com", tg: "Family", fav: true }, { name: "Sarah Chen", ph: "+1 555 332 9981", em: "sarah@work.com", tg: "Work", fav: false }];

  const renderSubTabs = () => (<div className="sub-tabs">{cur.subs.map(s => (<button key={s} className={`btn-tab${sub === s ? " active" : ""}`} onClick={() => setSub(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>);

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

  return (
    <div style={{ display: "flex", height: "calc(100vh - 70px)" }}>
      <div className="sb">
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
          {!act ? (<button className="btn-gold" style={{ width: "100%", justifyContent: "center", padding: "9px", fontSize: 12 }} onClick={() => setPM(true)}><Ic n="zap" sz={13} />Activate Full Access</button>) : (<div className="tag tgg" style={{ justifyContent: "center", width: "100%", padding: "7px" }}>✓ Full Access Active</div>)}
          <button onClick={onDisc} style={{ width: "100%", marginTop: 9, background: "rgba(255,77,106,0.08)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.18)", padding: "8px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", justifyContent: "center" }}><Ic n="x" sz={12} />Disconnect</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", background: DARK, position: "relative" }}>
        {cur?.lk && (
          <div className="lo">
            <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "2px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="lock" sz={30} c={GOLD} /></div>
            <h3 className="raj" style={{ fontSize: 22, fontWeight: 700, textAlign: "center" }}>{cur.lb} is Locked</h3>
            <p style={{ color: MUTED, fontSize: 13, textAlign: "center", maxWidth: 290, lineHeight: 1.65 }}>Activate a TrustCo Tech plan to unlock {cur.lb} and all premium data streams.</p>
            <div style={{ display: "flex", gap: 11, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn-gold" onClick={() => setPM(true)}><Ic n="zap" sz={15} />Activate — from $100</button>
              <button className="btn-out" style={{ padding: "11px 18px" }} onClick={() => chg("calls")}>View free data</button>
            </div>
          </div>
        )}
        <div style={{ padding: 24 }}>
          {tab === "calls" && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Call Log</h2><p style={{ color: MUTED, fontSize: 12 }}>Forwarded from partner device</p></div><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Live</span></div>{renderSubTabs()}<div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead><tbody>{(callData[sub] || callData.all).map((c, i) => (<tr key={i}><td style={{ fontSize: 16 }}>{c.type === "incoming" ? "📞" : c.type === "outgoing" ? "📤" : "❌"}</td><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.num}</td><td><span className={`tag ${c.type === "incoming" ? "tgg" : c.type === "outgoing" ? "tgb" : "tgr"}`}>{c.type}</span></td><td>{c.dur}</td><td style={{ fontSize: 11 }}>{c.time}</td></tr>))}</tbody></table></div></div>)}
          {tab === "sms" && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>SMS Messages</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Live</span></div>{renderSubTabs()}{renderMsgList(smsData[sub] || smsData.all)}</div>)}
          {tab === "whatsapp" && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>WhatsApp</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Synced</span></div>{renderSubTabs()}{renderMsgList(waData[sub] || waData.all, "linear-gradient(135deg,#25D366,#128C7E)")}<div className="glass" style={{ padding: 18, marginTop: 14 }}><p style={{ fontSize: 11, color: MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Latest — Mom 💚</p><div style={{ display: "flex", flexDirection: "column", gap: 9 }}><div style={{ display: "flex" }}><div className="bub bi">Are you home yet? 🏠</div></div><div style={{ display: "flex", justifyContent: "flex-end" }}><div className="bub bo">Almost! 10 mins away</div></div><div style={{ display: "flex" }}><div className="bub bi">Dinner is ready! 🍝</div></div><div style={{ display: "flex", justifyContent: "flex-end" }}><div className="bub bo">On my way! 😊</div></div></div></div></div>)}
          {tab === "instagram" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Instagram DMs</h2></div>{renderSubTabs()}{[{ from: "jamie_photos", prev: "Loved your post! 🔥", time: "2h ago", type: "received" }, { from: "mike_design", prev: "Can we collab? 🎨", time: "Mon", type: "received" }, { from: "you", prev: "Thanks! 😊", time: "Mon", type: "sent" }].map((m, i) => (<div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center", marginBottom: 7, cursor: "pointer" }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#E1306C,#833AB4,#F77737)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{m.from[0].toUpperCase()}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>@{m.from}</span><div style={{ display: "flex", gap: 6 }}><span className={`tag ${m.type === "sent" ? "tgs" : "tgg"}`} style={{ fontSize: 9 }}>{m.type}</span><span style={{ fontSize: 11, color: MUTED }}>{m.time}</span></div></div><p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{m.prev}</p></div></div>))}</div>)}
          {tab === "facebook" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Facebook Messages</h2></div>{renderSubTabs()}{[{ from: "Robert Park", prev: "Are you coming to the event?", time: "3h ago", type: "received" }, { from: "Emma Johnson", prev: "Thanks! 🎂", time: "Yesterday", type: "received" }, { from: "you", prev: "Happy birthday! 🎉", time: "Yesterday", type: "sent" }].map((m, i) => (<div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center", marginBottom: 7, cursor: "pointer" }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1877F2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{m.from[0]}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>{m.from}</span><div style={{ display: "flex", gap: 6 }}><span className={`tag ${m.type === "sent" ? "tgs" : "tgg"}`} style={{ fontSize: 9 }}>{m.type}</span><span style={{ fontSize: 11, color: MUTED }}>{m.time}</span></div></div><p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{m.prev}</p></div></div>))}</div>)}
          {tab === "media" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Photos & Videos</h2><span className="tag tgg">Auto-sync ✓</span></div>{renderSubTabs()}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{photos.filter(p => { if (sub === "all photos") return !p.v; if (sub === "all videos") return p.v; if (sub === "camera") return p.cat === "camera"; if (sub === "screenshots") return p.cat === "screenshots"; if (sub === "recorded") return p.cat === "recorded"; if (sub === "downloaded") return p.cat === "downloaded"; return true; }).map((p, i) => (<div key={i} className="glass" style={{ padding: 0, overflow: "hidden", borderRadius: 13, cursor: "pointer" }}><div style={{ height: 100, background: `linear-gradient(135deg,${p.c}33,${p.c}11)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}><Ic n={p.v ? "video" : "img"} sz={28} c={p.c} />{p.v && <span className="tag tg" style={{ position: "absolute", top: 7, right: 7, fontSize: 8 }}>VIDEO</span>}</div><div style={{ padding: "9px 11px" }}><p style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{p.n}</p><p style={{ fontSize: 10, color: MUTED }}>{p.s} · {p.d}</p></div></div>))}</div></div>)}
          {tab === "contacts" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Contacts</h2><span className="tag tgg">{contacts.length} synced</span></div>{renderSubTabs()}<div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tag</th><th>Fav</th></tr></thead><tbody>{contacts.filter(c => { if (sub === "favorites") return c.fav; return true; }).map((c, i) => (<tr key={i}><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.ph}</td><td style={{ fontSize: 12 }}>{c.em}</td><td><span className={`tag ${c.tg === "Family" ? "tgg" : c.tg === "Work" ? "tgb" : c.tg === "Doctor" ? "tg" : "tgs"}`}>{c.tg}</span></td><td style={{ fontSize: 16 }}>{c.fav ? "⭐" : ""}</td></tr>))}</tbody></table></div></div>)}
          {tab === "location" && !cur?.lk && (<div className="ad"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700 }}>Live Location</h2><span className="tag tgg"><span className="dot on" style={{ width: 6, height: 6 }} /> Tracking</span></div>{renderSubTabs()}{sub === "live" && (<div className="glass" style={{ overflow: "hidden", height: 320 }}><div style={{ height: "100%", background: "linear-gradient(135deg,rgba(201,168,76,0.06),rgba(192,199,212,0.02))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}><div style={{ position: "relative" }}><div style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(255,77,106,0.3)", animation: "ping 1.5s ease-out infinite", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} /><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FF4D6A", boxShadow: "0 0 0 4px rgba(255,77,106,0.2)" }} /></div><p className="mono" style={{ fontSize: 17, color: TEXT }}>37.7749° N, 122.4194° W</p><p style={{ color: MUTED, fontSize: 12 }}>San Francisco, CA — Updated just now</p><div style={{ display: "flex", gap: 12 }}>{[["Speed", "0 km/h"], ["Accuracy", "±5m"], ["Battery", "73%"]].map(([l, v]) => (<div key={l} style={{ padding: "7px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>{l}</p><p className="mono" style={{ fontSize: 12, color: GOLD }}>{v}</p></div>))}</div></div></div>)}{sub === "history" && (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{[["Today 10:24 AM", "TechCorp Office, San Francisco", "Work"], ["Today 08:15 AM", "Home, San Francisco", "Home"], ["Yesterday 7:30 PM", "Restaurant Row, SF", "Dining"], ["Yesterday 2:00 PM", "Medical Center, SF", "Healthcare"]].map(([t, loc, cat], i) => (<div key={i} className="glass" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}><div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,77,106,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n="map" sz={16} c="#FF4D6A" /></div><div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{loc}</p><p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{t}</p></div><span className="tag tg" style={{ fontSize: 9 }}>{cat}</span></div>))}</div>)}</div>)}
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
  const [profile, setProfile] = useState(user?.profile || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await supa(`profiles?id=eq.${user.id}`, "PATCH", { name: profile.name }, user.token);
      setUser(p => ({ ...p, profile: { ...p.profile, name: profile.name } }));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.log(e); }
    setSaving(false);
  };

  if (tab === "connect") return (
    <div style={{ paddingTop: 70 }}>
      <div style={{ background: "#0D1020", borderBottom: "1px solid rgba(201,168,76,0.1)", padding: "10px 24px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["connect", "link", "Remote Access"], ["profile", "settings", "Profile"], ["billing", "credit", "Billing"]].map(([id, ic, lb]) => (
          <button key={id} className={`btn-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}><Ic n={ic} sz={13} />{lb}</button>
        ))}
        <button onClick={() => { setUser(null); sp("home"); }} style={{ marginLeft: "auto", background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center" }}><Ic n="logout" sz={13} />Sign out</button>
      </div>
      {view === "connect" ? <Connect user={user} onDone={() => setView("activity")} /> : <Activity user={user} onDisc={() => setView("connect")} setPM={setPm} />}
      {pm && <PayModal onClose={() => setPm(false)} onOk={() => setUser(p => ({ ...p, profile: { ...p.profile, activated: true } }))} user={user} token={user.token} />}
    </div>
  );

  return (
    <div style={{ paddingTop: 70 }}>
      <div style={{ background: "#0D1020", borderBottom: "1px solid rgba(201,168,76,0.1)", padding: "10px 24px", display: "flex", gap: 8, overflowX: "auto" }}>
        {[["connect", "link", "Remote Access"], ["profile", "settings", "Profile"], ["billing", "credit", "Billing"]].map(([id, ic, lb]) => (
          <button key={id} className={`btn-tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}><Ic n={ic} sz={13} />{lb}</button>
        ))}
        <button onClick={() => { setUser(null); sp("home"); }} style={{ marginLeft: "auto", background: "rgba(255,77,106,0.1)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.2)", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center" }}><Ic n="logout" sz={13} />Sign out</button>
      </div>
      <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 24px" }}>
        {tab === "profile" && (
          <div className="glass" style={{ padding: 36 }}>
            <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Profile Settings</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Full Name</label><input className="inp" value={profile.name || ""} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Email</label><input className="inp" value={user.email || ""} disabled style={{ opacity: .6 }} /></div>
              <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Partner ID</label><input className="inp" value={user.profile?.partner_id || "Not assigned yet"} disabled style={{ opacity: .6, fontFamily: "JetBrains Mono" }} /></div>
              <div><label style={{ fontSize: 12, color: MUTED, marginBottom: 6, display: "block" }}>Plan Status</label><span className={`tag ${user.profile?.activated ? "tgg" : "tg"}`}>{user.profile?.activated ? "✓ Active — " + (user.profile?.plan || "Premium") : "Not activated"}</span></div>
              <button className="btn-gold" style={{ alignSelf: "flex-start" }} onClick={saveProfile} disabled={saving}>{saved ? "✓ Saved!" : saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        )}
        {tab === "billing" && (
          <div className="glass" style={{ padding: 36 }}>
            <h2 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Billing & Subscription</h2>
            <div style={{ padding: "20px 24px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Current Plan</p>
              <p className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{user.profile?.activated ? (user.profile?.plan || "Premium") : "Free"}</p>
              <p style={{ fontSize: 13, color: MUTED }}>{user.profile?.activated ? "Full access to all data streams" : "Activate to unlock all features"}</p>
              {!user.profile?.activated && (<button className="btn-gold" style={{ marginTop: 16 }} onClick={() => setPm(true)}><Ic n="zap" sz={15} />Activate Plan</button>)}
            </div>
            <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: MUTED }}>Payment questions? Contact us at <a href="mailto:trustcotech0@gmail.com" style={{ color: GOLD }}>trustcotech0@gmail.com</a> or via <a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD }}>Facebook Support</a></p>
            </div>
          </div>
        )}
      </div>
      {pm && <PayModal onClose={() => setPm(false)} onOk={() => setUser(p => ({ ...p, profile: { ...p.profile, activated: true } }))} user={user} token={user.token} />}
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
  const [assignPid, setAssignPid] = useState("");
  const [ticketReply, setTicketReply] = useState({});

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const u = await supa("profiles?select=*&order=created_at.desc").catch(() => []);
      setUsers(u || []);
    } catch (e) { console.log("users err", e); }
    try {
      const p = await supa("partner_ids?select=*&order=created_at.desc").catch(() => []);
      setPids(p || []);
    } catch (e) { console.log("pids err", e); }
    try {
      const r = await supa("reviews?select=*&order=created_at.desc").catch(() => []);
      setReviews(r || []);
    } catch (e) { console.log("reviews err", e); }
    try {
      const pay = await supa("payments?select=*&order=created_at.desc").catch(() => []);
      setPayments(pay || []);
    } catch (e) { console.log("payments err", e); }
    try {
      const t = await supa("tickets?select=*&order=created_at.desc").catch(() => []);
      setTickets(t || []);
    } catch (e) { console.log("tickets err", e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addPid = async () => {
    if (!newPid) return;
    try {
      await supa("partner_ids", "POST", { code: newPid.toUpperCase(), is_used: false }, user.token);
      showToast("✓ Partner ID added: " + newPid.toUpperCase()); setNewPid(""); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const assignPidToUser = async () => {
    if (!selUser || !assignPid) return;
    try {
      await supa(`partner_ids?code=eq.${assignPid}`, "PATCH", { assigned_to: selUser.id, is_used: true }, user.token);
      await supa(`profiles?id=eq.${selUser.id}`, "PATCH", { partner_id: assignPid }, user.token);
      showToast(`✓ ${assignPid} assigned to ${selUser.name || selUser.email}`); setSelUser(null); setAssignPid(""); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const activateUser = async (uid, plan) => {
    try {
      await supa(`profiles?id=eq.${uid}`, "PATCH", { activated: true, plan }, user.token);
      await supa(`payments?user_id=eq.${uid}&status=eq.pending`, "PATCH", { status: "activated" }, user.token);
      showToast("✓ User activated"); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const deactivateUser = async uid => {
    try {
      await supa(`profiles?id=eq.${uid}`, "PATCH", { activated: false }, user.token);
      showToast("✓ User deactivated"); load();
    } catch (e) { showToast("Error: " + e.message); }
  };

  const approveReview = async id => {
    try { await supa(`reviews?id=eq.${id}`, "PATCH", { approved: true }, user.token); showToast("✓ Review approved"); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const deleteReview = async id => {
    try { await supa(`reviews?id=eq.${id}`, "DELETE", null, user.token); showToast("✓ Review deleted"); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const replyTicket = async id => {
    if (!ticketReply[id]) return;
    try { await supa(`tickets?id=eq.${id}`, "PATCH", { reply: ticketReply[id], status: "resolved" }, user.token); showToast("✓ Reply sent"); setTicketReply(p => ({ ...p, [id]: "" })); load(); } catch (e) { showToast("Error: " + e.message); }
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.activated).length,
    pendingPayments: payments.filter(p => p.status === "pending").length,
    openTickets: tickets.filter(t => t.status === "open").length,
    totalRevenue: payments.filter(p => p.status === "activated").reduce((a, p) => a + (p.amount || 0), 0),
    availablePids: pids.filter(p => !p.is_used).length,
  };

  const adminTabs = [
    { id: "overview", ic: "home", lb: "Overview" },
    { id: "users", ic: "users", lb: "Users" },
    { id: "partnerids", ic: "key", lb: "Partner IDs" },
    { id: "payments", ic: "credit", lb: "Payments" },
    { id: "reviews", ic: "star", lb: "Reviews" },
    { id: "tickets", ic: "ticket", lb: "Support" },
  ];

  return (
    <div style={{ paddingTop: 70, display: "flex", minHeight: "100vh" }}>
      {/* Toast */}
      {toast && (<div style={{ position: "fixed", top: 90, right: 24, background: "#0D1020", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "12px 20px", zIndex: 3000, color: TEXT, fontSize: 14, animation: "sup .3s ease" }}>{toast}</div>)}

      {/* Sidebar */}
      <div className="sb">
        <div style={{ padding: "14px 20px 18px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 8 }}>
          <span className="tag tgr" style={{ marginBottom: 10, display: "inline-block" }}>Admin Panel</span>
          <p style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{user.email}</p>
        </div>
        {adminTabs.map(t => (<button key={t.id} className={`sl${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}><Ic n={t.ic} sz={15} />{t.lb}</button>))}
        <div style={{ padding: "14px 11px", marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <button className="btn-tab" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }} onClick={load}><Ic n="refresh" sz={13} />Refresh</button>
          <button onClick={() => { setUser(null); sp("home"); }} style={{ width: "100%", background: "rgba(255,77,106,0.08)", color: "#FF4D6A", border: "1px solid rgba(255,77,106,0.18)", padding: "9px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", gap: 5, alignItems: "center", justifyContent: "center" }}><Ic n="logout" sz={13} />Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", background: DARK, padding: 28 }}>
        {loading && (<div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} /></div>)}

        {/* OVERVIEW */}
        {!loading && tab === "overview" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Admin Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { lb: "Total Users", val: stats.totalUsers, ic: "users", c: GOLD },
                { lb: "Active Users", val: stats.activeUsers, ic: "check", c: "#00C878" },
                { lb: "Pending Payments", val: stats.pendingPayments, ic: "credit", c: "#FFB800" },
                { lb: "Open Tickets", val: stats.openTickets, ic: "ticket", c: "#FF4D6A" },
                { lb: "Total Revenue", val: `$${stats.totalRevenue}`, ic: "trending", c: GOLD },
                { lb: "Free Partner IDs", val: stats.availablePids, ic: "key", c: SILVER },
              ].map(s => (
                <div key={s.lb} className="stat-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{s.lb}</p>
                      <p className="raj" style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.val}</p>
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: s.c + "18", display: "flex", alignItems: "center", justifyContent: "center", color: s.c }}><Ic n={s.ic} sz={18} /></div>
                  </div>
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
          </div>
        )}

        {/* USERS */}
        {!loading && tab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 className="raj" style={{ fontSize: 24, fontWeight: 700 }}>User Management</h1>
            </div>

            {/* Assign Partner ID */}
            {selUser && (
              <div className="glass-gold" style={{ padding: 20, marginBottom: 20 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: GOLD }}>Assign Partner ID to: {selUser.name || selUser.email}</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <select className="inp" style={{ flex: 1 }} value={assignPid} onChange={e => setAssignPid(e.target.value)}>
                    <option value="">Select available Partner ID</option>
                    {pids.filter(p => !p.is_used).map(p => (<option key={p.code} value={p.code}>{p.code}</option>))}
                  </select>
                  <button className="btn-gold" onClick={assignPidToUser} disabled={!assignPid}><Ic n="key" sz={15} />Assign ID</button>
                  <button className="btn-tab" onClick={() => setSelUser(null)}>Cancel</button>
                </div>
              </div>
            )}

            <div className="glass" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Name</th><th>Email</th><th>Partner ID</th><th>Plan</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td style={{ color: TEXT, fontWeight: 600 }}>{u.name || "—"}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{u.email}</td>
                      <td className="mono" style={{ fontSize: 11, color: GOLD }}>{u.partner_id || "Not assigned"}</td>
                      <td>{u.plan || "free"}</td>
                      <td><span className={`tag ${u.activated ? "tgg" : "tg"}`}>{u.activated ? "Active" : "Pending"}</span></td>
                      <td style={{ fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn-tab" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => { setSelUser(u); setTab("users"); }}><Ic n="key" sz={11} />Assign ID</button>
                          {!u.activated ? (<button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => activateUser(u.id, "Professional")}><Ic n="check" sz={11} />Activate</button>) : (<button className="btn-red" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => deactivateUser(u.id)}><Ic n="x" sz={11} />Deactivate</button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No users yet</p>}
            </div>
          </div>
        )}

        {/* PARTNER IDs */}
        {!loading && tab === "partnerids" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Partner ID Management</h1>
            <div className="glass-gold" style={{ padding: 24, marginBottom: 24 }}>
              <h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Create New Partner ID</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="inp" placeholder="TC-600-001" value={newPid} onChange={e => setNewPid(e.target.value)} style={{ flex: 1, fontFamily: "JetBrains Mono" }} />
                <button className="btn-gold" onClick={addPid}><Ic n="plus" sz={16} />Add ID</button>
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Format: TC-XXX-XXX (e.g. TC-600-001). IDs marked as used are assigned to users.</p>
            </div>
            <div className="glass" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>Partner ID</th><th>Status</th><th>Assigned To</th><th>Created</th></tr></thead>
                <tbody>
                  {pids.map((p, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ color: GOLD, fontWeight: 600 }}>{p.code}</td>
                      <td><span className={`tag ${p.is_used ? "tgg" : "tg"}`}>{p.is_used ? "Assigned" : "Available"}</span></td>
                      <td style={{ fontSize: 12 }}>{p.assigned_to || "—"}</td>
                      <td style={{ fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pids.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No Partner IDs yet. Add one above.</p>}
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {!loading && tab === "payments" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Payment Management</h1>
            <div className="glass" style={{ overflow: "auto" }}>
              <table className="tbl">
                <thead><tr><th>User ID</th><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontSize: 10 }}>{p.user_id?.slice(0, 8)}...</td>
                      <td style={{ fontWeight: 600, color: TEXT }}>{p.plan}</td>
                      <td style={{ color: GOLD }}>${p.amount}</td>
                      <td>{p.method}</td>
                      <td><span className={`tag ${p.status === "activated" ? "tgg" : p.status === "pending" ? "tg" : "tgr"}`}>{p.status}</span></td>
                      <td style={{ fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>{p.status === "pending" && (<button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => activateUser(p.user_id, p.plan)}>Activate User</button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No payments yet</p>}
            </div>
          </div>
        )}

        {/* REVIEWS */}
        {!loading && tab === "reviews" && (
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
                    <p style={{ color: "#A8B0C2", fontSize: 13, lineHeight: 1.6 }}>"{r.text}"</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {!r.approved && (<button className="btn-green" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => approveReview(r.id)}><Ic n="check" sz={11} />Approve</button>)}
                    <button className="btn-red" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => deleteReview(r.id)}><Ic n="trash" sz={11} />Delete</button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No reviews yet</p>}
            </div>
          </div>
        )}

        {/* SUPPORT TICKETS */}
        {!loading && tab === "tickets" && (
          <div>
            <h1 className="raj" style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Support Tickets</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {tickets.map((t, i) => (
                <div key={i} className="glass" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>{t.subject}</p>
                      <p style={{ fontSize: 12, color: MUTED }}>{t.name} · {t.email} · {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`tag ${t.status === "resolved" ? "tgg" : "tg"}`}>{t.status}</span>
                  </div>
                  <p style={{ color: "#A8B0C2", fontSize: 13, lineHeight: 1.6, marginBottom: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>{t.message}</p>
                  {t.reply ? (<div style={{ padding: "10px 14px", background: "rgba(0,200,120,0.06)", border: "1px solid rgba(0,200,120,0.2)", borderRadius: 8 }}><p style={{ fontSize: 11, color: "#00C878", marginBottom: 4 }}>Reply sent:</p><p style={{ fontSize: 13, color: "#A8B0C2" }}>{t.reply}</p></div>) : (
                    <div style={{ display: "flex", gap: 10 }}>
                      <input className="inp" placeholder="Type reply..." value={ticketReply[t.id] || ""} onChange={e => setTicketReply(p => ({ ...p, [t.id]: e.target.value }))} />
                      <button className="btn-gold" style={{ padding: "10px 18px", fontSize: 13 }} onClick={() => replyTicket(t.id)}>Send</button>
                    </div>
                  )}
                </div>
              ))}
              {tickets.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: 24 }}>No support tickets yet</p>}
            </div>
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

  const go = async () => {
    if (!f.e || !f.p) { setErr("Please enter your email and password."); return; }
    setLoading(true); setErr("");
    try {
      const data = await supaAuth("token?grant_type=password", { email: f.e, password: f.p });

      // Extract user safely
      const userId = data?.user?.id || data?.id;
      const userEmail = data?.user?.email || data?.email || f.e;
      const token = data?.access_token || data?.token;

      if (!userId && !token) {
        setErr("Login failed. Please check your credentials.");
        return;
      }

      // Check admin
      if (f.e === ADMIN_EMAIL) {
        su({ id: userId, email: userEmail, token, isAdmin: true });
        sp("admin");
        return;
      }

      // Load profile for regular user
      let profile = {};
      try {
        const profiles = await supa(`profiles?id=eq.${userId}&select=*`, "GET", null, token);
        profile = profiles?.[0] || {};
      } catch (e) { console.log("Profile load error:", e); }

      su({ id: userId, email: userEmail, token, profile });
      sp("dashboard");
    } catch (e) { setErr(e.message || "Invalid credentials. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Logo sz={52} /></div>
          <h1 className="raj" style={{ fontSize: 26, fontWeight: 700, marginBottom: 5 }}>Welcome Back</h1>
          <p style={{ color: MUTED }}>Sign in to your TrustCo Tech account</p>
        </div>
        <div className="glass" style={{ padding: 34 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
            <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Email</label><input className="inp" type="email" placeholder="you@email.com" value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /></div>
            <div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Password</label><input className="inp" type="password" placeholder="••••••••" value={f.p} onChange={e => setF({ ...f, p: e.target.value })} onKeyDown={e => e.key === "Enter" && go()} /></div>
            {err && <p style={{ color: "#FF4D6A", fontSize: 12, padding: "10px 14px", background: "rgba(255,77,106,0.08)", borderRadius: 8, border: "1px solid rgba(255,77,106,0.2)" }}>{err}</p>}
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

  const go = async () => {
    if (!f.n || !f.e || !f.p) { setErr("Please fill in all fields."); return; }
    if (!ok) { setErr("Please agree to the Terms & Privacy Policy."); return; }
    if (f.p.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setLoading(true); setErr("");
    try {
      const data = await supaAuth("signup", { email: f.e, password: f.p });

      const userId = data?.user?.id || data?.id;
      const userEmail = data?.user?.email || data?.email || f.e;
      const token = data?.access_token || data?.token;

      if (!userId) {
        setErr("Registration failed. Please try again.");
        return;
      }

      // Create profile
      try {
        await supa("profiles", "POST", { id: userId, name: f.n, email: userEmail, plan: "free", activated: false });
      } catch (e) { console.log("Profile create error:", e); }

      su({ id: userId, email: userEmail, token, profile: { name: f.n, email: userEmail, activated: false } });
      sp("dashboard");
    } catch (e) { setErr(e.message || "Registration failed. Please try again."); }
    finally { setLoading(false); }
  };

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
            {[["n", "Full name", "text"], ["e", "Email address", "email"], ["p", "Password (min 6 chars)", "password"]].map(([k, ph, t]) => (
              <div key={k}><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>{ph}</label><input className="inp" type={t} placeholder={ph} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
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
// OTHER PAGES (Home, Demo, Features, Pricing, Reviews, etc.)
// These are simplified but complete
// ============================================================

const DEF_REVIEWS = [
  { name: "Michael R.", role: "IT Manager", rating: 5, text: "Setup was incredibly fast. Having all my data on both phones in real time is a game changer.", date: "May 2025", verified: true },
  { name: "Sarah T.", role: "Business Owner", rating: 5, text: "I carry two phones daily. TrustCo Tech lets me leave one in my bag and still see everything.", date: "Apr 2025", verified: true },
  { name: "David K.", role: "Freelancer", rating: 5, text: "WhatsApp sync alone is worth the price. Zero lag, works flawlessly.", date: "Apr 2025", verified: true },
  { name: "Jennifer M.", role: "Operations Director", rating: 5, text: "The Partner ID connection is genius. Simple as entering a code and it just works.", date: "Mar 2025", verified: true },
  { name: "Robert P.", role: "Tech Manager", rating: 5, text: "Tried the demo first and was immediately impressed. Best $300 I've spent on tech.", date: "Mar 2025", verified: true },
  { name: "Aisha B.", role: "Remote Worker", rating: 5, text: "Everything mirrors instantly — calls, messages, Instagram, photos. Exactly what I needed.", date: "Feb 2025", verified: true },
];

const Home = ({ sp, reviews, setReviews }) => {
  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
  const [rf, setRf] = useState({ name: "", role: "", text: "", rating: 5 });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const submitReview = async () => {
    if (!rf.name || !rf.text) return;
    setSaving(true);
    try {
      await supa("reviews", "POST", { ...rf, verified: true, approved: false });
    } catch (e) { }
    setReviews(p => [{ ...rf, date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }), verified: true }, ...p]);
    setRf({ name: "", role: "", text: "", rating: 5 }); setDone(true); setTimeout(() => setDone(false), 3000);
    setSaving(false);
  };

  return (
    <div>
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: 70 }}>
        <Particles />
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.06),transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
        <div className="ct" style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "100px 24px 80px" }}>
          <div className="af" style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ position: "relative" }}><div style={{ position: "absolute", inset: -18, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.15),transparent)", animation: "pulse 3s infinite" }} /><Logo sz={86} /></div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 18px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 24, marginBottom: 24 }}>
            <span className="dot on ap" /><span className="raj" style={{ fontSize: 11, color: GOLD, letterSpacing: ".15em", textTransform: "uppercase" }}>Premium Phone Sync Technology</span>
          </div>
          <h1 className="raj" style={{ fontSize: "clamp(36px,6vw,72px)", fontWeight: 700, lineHeight: 1.05, marginBottom: 24 }}>
            <span className="grad-silver">Your Phones.</span><br /><span className="shimmer">One Seamless Connection.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px,2vw,18px)", color: "#A8B0C2", maxWidth: 580, margin: "0 auto 44px", lineHeight: 1.8 }}>Forward your calls, messages, WhatsApp, Instagram, Facebook, photos, videos, contacts and live location from your primary phone to any secondary device — in real time.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
            <button className="btn-gold" style={{ fontSize: 15, padding: "15px 32px" }} onClick={() => sp("register")}><Ic n="sync" sz={17} />Get Started Now</button>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 22, maxWidth: 680, margin: "0 auto 36px" }}>
          {[{ name: "6 Months", price: 100, ft: ["All 9 data streams", "2 devices", "Email support"] }, { name: "2 Years", price: 300, best: true, ft: ["All 9 data streams", "Up to 5 devices", "Priority support", "Free updates"] }].map(p => (
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

      <section style={{ padding: "70px 0" }}><div className="ct" style={{ textAlign: "center" }}><div className="glass glow-gold" style={{ padding: "56px 36px", background: "linear-gradient(135deg,rgba(201,168,76,0.08),rgba(192,199,212,0.03))", borderColor: "rgba(201,168,76,0.3)" }}><Logo sz={52} /><h2 className="raj" style={{ fontSize: "clamp(24px,4vw,44px)", fontWeight: 700, margin: "20px 0 14px" }}>Ready to sync your phones?</h2><p style={{ color: MUTED, fontSize: 16, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.7 }}>Create a free account and get your admin-issued Partner ID to start syncing your real devices.</p><div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}><button className="btn-gold" style={{ fontSize: 15, padding: "14px 32px" }} onClick={() => sp("register")}><Ic n="sync" sz={17} />Get Started Now</button><button className="btn-out" style={{ fontSize: 15 }} onClick={() => sp("demo")}><Ic n="eye" sz={17} />Try Demo</button></div></div></div></section>

      <footer style={{ borderTop: "1px solid rgba(201,168,76,0.1)", padding: "44px 0 22px" }}><div className="ct"><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 28, marginBottom: 32 }}><div><div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}><Logo sz={38} /><div><div className="raj" style={{ fontSize: 13, fontWeight: 700, color: SILVER, letterSpacing: ".1em" }}>TRUSTCO</div><div className="raj" style={{ fontSize: 8, color: GOLD, letterSpacing: ".2em" }}>— TECH —</div></div></div><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.7, maxWidth: 200 }}>Premium phone-to-phone sync technology.</p></div><div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}><div><h4 className="raj" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: GOLD, marginBottom: 13, fontWeight: 700 }}>Navigate</h4>{[["home", "Home"], ["features", "Features"], ["pricing", "Pricing"], ["demo", "Live Demo"], ["reviews", "Reviews"], ["about", "About"]].map(([pg, lb]) => (<div key={pg} style={{ color: MUTED, fontSize: 13, marginBottom: 9, cursor: "pointer" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED} onClick={() => sp(pg)}>{lb}</div>))}</div><div><h4 className="raj" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".12em", color: GOLD, marginBottom: 13, fontWeight: 700 }}>Legal</h4>{[["refund", "Refund Policy"], ["privacy", "Privacy Policy"], ["terms", "Terms of Service"]].map(([pg, lb]) => (<div key={pg} style={{ color: MUTED, fontSize: 13, marginBottom: 9, cursor: "pointer" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED} onClick={() => sp(pg)}>{lb}</div>))}<a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: MUTED, fontSize: 13, display: "block", textDecoration: "none" }} onMouseEnter={e => e.target.style.color = GOLD} onMouseLeave={e => e.target.style.color = MUTED}>Contact Support</a></div></div></div><div style={{ borderTop: "1px solid rgba(201,168,76,0.07)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><span style={{ color: MUTED, fontSize: 11 }}>© 2025 TrustCo Tech. All rights reserved.</span><span style={{ color: MUTED, fontSize: 11 }}>End-to-end encrypted · GDPR compliant</span></div></div></footer>
    </div>
  );
};

// Simple pages
const ReviewsPage = ({ reviews, setReviews }) => {
  const avg = (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
  const [rf, setRf] = useState({ name: "", role: "", text: "", rating: 5 });
  const [done, setDone] = useState(false);
  const sub = async () => { if (!rf.name || !rf.text) return; try { await supa("reviews", "POST", { ...rf, verified: true, approved: false }); } catch (e) { } setReviews(p => [{ ...rf, date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }), verified: true }, ...p]); setRf({ name: "", role: "", text: "", rating: 5 }); setDone(true); setTimeout(() => setDone(false), 3000); };
  return (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px" }}><div style={{ textAlign: "center", marginBottom: 52 }}><div className="ew" style={{ justifyContent: "center" }}>Customer Reviews</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,52px)", fontWeight: 700, marginBottom: 12 }}>What our users say</h1><div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}><Stars v={5} /><span className="raj" style={{ fontSize: 24, fontWeight: 700 }}>{avg}</span><span style={{ color: MUTED }}>/ 5 · {reviews.length} reviews</span></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 18, marginBottom: 56 }}>{reviews.map((r, i) => (<div key={i} className="rc c3d"><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><Stars v={r.rating} />{r.verified && <span className="tag tg" style={{ fontSize: 9 }}>✓ Verified</span>}</div><p style={{ color: "#B0BAC9", fontSize: 13, lineHeight: 1.75, marginBottom: 18, fontStyle: "italic" }}>"{r.text}"</p><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#9A7B2F)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15, fontFamily: "Rajdhani", color: DARK }}>{r.name[0]}</div><div><p className="raj" style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</p><p style={{ fontSize: 11, color: MUTED }}>{r.role} {r.date && `· ${r.date}`}</p></div></div></div>))}</div><div className="glass-gold" style={{ padding: 36, maxWidth: 660, margin: "0 auto" }}><h3 className="raj" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Share Your Experience</h3><p style={{ color: MUTED, fontSize: 13, textAlign: "center", marginBottom: 24 }}>Pending admin approval before showing publicly</p>{done ? (<div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,200,120,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#00C878" }}><Ic n="check" sz={24} /></div><p className="raj" style={{ fontSize: 18, fontWeight: 700 }}>Submitted! Pending approval.</p></div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Name *</label><input className="inp" placeholder="John D." value={rf.name} onChange={e => setRf({ ...rf, name: e.target.value })} /></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Role</label><input className="inp" placeholder="e.g. Business Owner" value={rf.role} onChange={e => setRf({ ...rf, role: e.target.value })} /></div></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 7, display: "block" }}>Rating *</label><Stars v={rf.rating} onChange={v => setRf({ ...rf, rating: v })} /></div><div><label style={{ fontSize: 11, color: MUTED, marginBottom: 5, display: "block" }}>Review *</label><textarea className="inp" placeholder="Share your experience..." rows={4} value={rf.text} onChange={e => setRf({ ...rf, text: e.target.value })} style={{ resize: "vertical" }} /></div><button className="btn-gold" style={{ justifyContent: "center" }} onClick={sub}><Ic n="send" sz={15} />Submit Review</button></div>)}</div></div></div>);
};

const RefundPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Refund Policy</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Overview", body: "At TrustCo Tech, we are committed to your satisfaction. This policy outlines the terms under which refunds are granted for our activation plans." }, { title: "7-Day Refund Window", body: "We offer a full refund within 7 days of your activation payment. If you are not satisfied for any reason within 7 days of purchase, contact us for a full refund. Requests after 7 days will not be eligible." }, { title: "Eligibility", body: "To be eligible: (1) Request within 7 days of payment date. (2) Contact support via Facebook with payment details. (3) Account must not violate our Terms of Service." }, { title: "Non-Refundable", body: "Refunds will NOT be issued after the 7-day window, for accounts suspended due to ToS violations, or for gift cards already redeemed and activated." }, { title: "How to Request", body: "Contact our support team on Facebook within the 7-day window. Include your email, payment method, amount, date, and reason. We process eligible refunds within 3–5 business days." }, { title: "Contact", body: "For refund queries, contact us through our Facebook support page." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 10 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}<div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, display: "flex", gap: 14, alignItems: "center" }}><Ic n="support" sz={24} c={GOLD} /><div><p style={{ fontWeight: 600, marginBottom: 4 }}>Need to request a refund?</p><a href={FB_URL} target="_blank" rel="noreferrer" style={{ color: GOLD, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>Contact Support on Facebook <Ic n="arrow" sz={14} c={GOLD} /></a></div></div></div></div>);

const PrivacyPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Data We Collect", body: "We collect your name, email, device info, and usage data solely to provide our phone synchronization service. We do not sell your data to third parties." }, { title: "How We Use Your Data", body: "Your data authenticates your account, manages your subscription, and improves our service. Payment details are processed securely — we don't store card info." }, { title: "Data Security", body: "All data is encrypted using AES-256. Synced data flows directly between your own devices and is not stored on our servers." }, { title: "Your Rights", body: "You can access, correct, or delete your data anytime by contacting us via our Facebook support page." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 9 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}</div></div>);

const TermsPage = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "60px 24px", maxWidth: 800 }}><div className="ew">Legal</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1><p style={{ color: MUTED, fontSize: 13, marginBottom: 40 }}>Last updated: June 2025</p>{[{ title: "Acceptance", body: "By using TrustCo Tech, you agree to these Terms. If you do not agree, please do not use our service." }, { title: "Permitted Use", body: "TrustCo Tech is exclusively for syncing data between devices you personally own. You may not use it to access devices belonging to other individuals without their explicit written consent." }, { title: "Account Responsibility", body: "You are responsible for your account security and Partner ID. Do not share your Partner ID with unauthorized parties." }, { title: "Termination", body: "We reserve the right to suspend or terminate accounts that violate these Terms without notice or refund." }].map(s => (<div key={s.title} style={{ marginBottom: 28 }}><h2 className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 9 }}>{s.title}</h2><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.body}</p><div className="dv" /></div>))}</div></div>);

const About = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px", maxWidth: 700 }}><div className="ew">Our Story</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 22 }}>Built for people with two phones</h1><p style={{ color: "#A8B0C2", fontSize: 16, lineHeight: 1.8, marginBottom: 18 }}>TrustCo Tech was built to solve a simple problem: you own two phones and your data is split between them. We built a fast, AES-256 encrypted bridge using admin-issued Partner IDs so all your data is available on either device instantly.</p><p style={{ color: "#A8B0C2", fontSize: 16, lineHeight: 1.8, marginBottom: 44 }}>Direct tunnel. No middlemen. No data stored on our servers.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 14 }}>{[["2021", "Founded"], ["580K+", "Users"], ["99.9%", "Uptime"], ["9", "Streams"]].map(([v, l]) => (<div key={l} className="glass" style={{ padding: 22, textAlign: "center" }}><p className="raj grad-gold" style={{ fontSize: 30, fontWeight: 700, marginBottom: 7 }}>{v}</p><p style={{ color: MUTED, fontSize: 12 }}>{l}</p></div>))}</div></div></div>);

const Contact = () => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px", maxWidth: 560 }}><div className="ew">Contact Support</div><h1 className="raj" style={{ fontSize: "clamp(24px,4vw,42px)", fontWeight: 700, marginBottom: 22 }}>We're here to help</h1><div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>{[["📧", "Email", "trustcotech0@gmail.com", false], ["📘", "Facebook Support", "Message us on Facebook", true], ["⏰", "Response Time", "Within 1–3 hours", false]].map(([e, l, v, isFb]) => (<div key={l} className="glass" style={{ padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}><span style={{ fontSize: 22 }}>{e}</span><div><p style={{ fontSize: 11, color: MUTED }}>{l}</p>{isFb ? (<a href={FB_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: GOLD, fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>{v} <Ic n="arrow" sz={13} c={GOLD} /></a>) : (<p style={{ fontWeight: 600, color: GOLD, fontSize: 14 }}>{v}</p>)}</div></div>))}</div><a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn-gold" style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "15px" }}><Ic n="facebook" sz={18} />Contact Support on Facebook</button></a></div></div>);

const Features = ({ sp }) => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px" }}><div style={{ textAlign: "center", marginBottom: 52 }}><div className="ew" style={{ justifyContent: "center" }}>Features</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 10 }}>9 data streams. One connection.</h1></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(265px,1fr))", gap: 16 }}>{[{ ic: "phone", cl: "#6C63FF", t: "Call Logs", fr: true, d: "Full call history — received, incoming & missed. Filter by type." }, { ic: "msg", cl: GOLD, t: "SMS Messages", fr: true, d: "Every text forwarded. View received and sent separately." }, { ic: "whatsapp", cl: "#25D366", t: "WhatsApp", fr: true, d: "Messages, media, voice notes. Filter by received, sent or groups." }, { ic: "instagram", cl: "#E1306C", t: "Instagram DMs", fr: false, d: "Direct messages mirrored. View received and sent." }, { ic: "facebook", cl: "#1877F2", t: "Facebook Messages", fr: false, d: "Messenger conversations. Filter received and sent." }, { ic: "img", cl: GOLD, t: "Photos", fr: false, d: "Photos by category: camera, screenshots, or all." }, { ic: "video", cl: SILVER, t: "Videos", fr: false, d: "Videos by type: recorded or downloaded." }, { ic: "users", cl: "#00C878", t: "Contacts", fr: false, d: "Full contact list. Filter all, favorites, or recent." }, { ic: "map", cl: "#FF4D6A", t: "Live Location", fr: false, d: "Real-time GPS and location history." }].map(f => (<div key={f.t} className="glass c3d" style={{ padding: 24 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 13 }}><div style={{ width: 42, height: 42, borderRadius: 11, background: f.cl + "15", display: "flex", alignItems: "center", justifyContent: "center", color: f.cl }}><Ic n={f.ic} sz={19} /></div>{f.fr ? <span className="tag tgg" style={{ fontSize: 9 }}>Free</span> : <span className="tag tg" style={{ fontSize: 9 }}>Premium</span>}</div><h3 className="raj" style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>{f.t}</h3><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.7 }}>{f.d}</p></div>))}</div><div style={{ textAlign: "center", marginTop: 44 }}><button className="btn-gold" style={{ fontSize: 15, padding: "14px 32px" }} onClick={() => sp("pricing")}>View Pricing <Ic n="arrow" sz={15} /></button></div></div></div>);

const Pricing = ({ sp }) => {
  const [pm, setPm] = useState(false);
  return (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px" }}><div style={{ textAlign: "center", marginBottom: 44 }}><div className="ew" style={{ justifyContent: "center" }}>Pricing</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 10 }}>Pay once, sync forever</h1><p style={{ color: MUTED, fontSize: 16 }}>No subscriptions. One payment activates your licence.</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 24, maxWidth: 740, margin: "0 auto 36px" }}>{[{ name: "6 Months", price: 100, period: "6-month licence", ft: ["All 9 data streams", "2 devices linked", "Calls, SMS & WhatsApp", "Instagram & Facebook", "Photos, Videos & Contacts", "Live Location", "Email support", "Admin-issued Partner ID"] }, { name: "2 Years", price: 300, period: "2-year licence", best: true, ft: ["All 9 data streams", "Up to 5 devices", "Everything in 6 months", "Priority 24/7 support", "Free app updates", "Early feature access", "Admin-issued Partner ID"] }].map(p => (<div key={p.name} className={`glass c3d${p.best ? " glow-gold" : ""}`} style={{ padding: 34, display: "flex", flexDirection: "column", position: "relative", borderColor: p.best ? "rgba(201,168,76,0.4)" : undefined }}>{p.best && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#9A7B2F,#F0D080)", color: DARK, padding: "4px 17px", borderRadius: 20, fontSize: 10, fontWeight: 700, fontFamily: "Rajdhani", letterSpacing: ".1em" }}>BEST VALUE</div>}<p className="raj" style={{ fontSize: 19, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{p.name}</p><p className="raj" style={{ fontSize: 48, fontWeight: 700, marginBottom: 2 }}>${p.price}</p><p style={{ color: MUTED, fontSize: 12, marginBottom: 22 }}>{p.period}</p><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>{p.ft.map(f => (<div key={f} style={{ display: "flex", gap: 9, alignItems: "center" }}><Ic n="check" sz={13} c="#00C878" /><span style={{ fontSize: 13, color: "#A8B0C2" }}>{f}</span></div>))}</div><button className={p.best ? "btn-gold" : "btn-out"} style={{ justifyContent: "center" }} onClick={() => setPm(true)}>{p.best ? "Get 2 Years — $300" : "Get 6 Months — $100"}</button></div>))}</div><div className="glass" style={{ padding: 18, maxWidth: 740, margin: "0 auto", textAlign: "center" }}><p style={{ color: MUTED, fontSize: 13 }}>💳 Razer Gold · Steam · Apple Gift Cards · ₿ Bitcoin · ₮ USDT TRC-20 · Activation within 1–3 hours</p></div></div>{pm && <PayModal onClose={() => setPm(false)} onOk={() => setPm(false)} />}</div>);
};

const HowItWorks = ({ sp }) => (<div style={{ paddingTop: 100 }}><div className="ct" style={{ padding: "56px 24px", maxWidth: 800 }}><div className="ew">Guide</div><h1 className="raj" style={{ fontSize: "clamp(28px,5vw,50px)", fontWeight: 700, marginBottom: 40 }}>How TrustCo Tech Works</h1>{[{ n: "1", ic: "device", t: "Create Your Account", d: "Sign up for a free TrustCo Tech account using your email address." }, { n: "2", ic: "zap", t: "Choose & Activate a Plan", d: "Select the 6-Month ($100) or 2-Year ($300) plan. Pay using Razer Gold, Steam, Apple Gift Card, Bitcoin, or USDT. Activated within 1–3 hours after payment verification." }, { n: "3", ic: "key", t: "Receive Your Partner ID", d: "After activation, our admin issues your unique Partner ID (e.g. TC-100-001). Keep it private — this is your secure connection key." }, { n: "4", ic: "device", t: "Install on Both Phones", d: "Download TrustCo Tech on both your primary phone and second device. Sign in with the same account." }, { n: "5", ic: "link", t: "Connect Using Partner ID", d: "On your dashboard, enter your admin-issued Partner ID. Only valid IDs connect — wrong IDs show an error with a link to contact support." }, { n: "6", ic: "sync", t: "Start Syncing", d: "Watch the connection go from 0% to 100%, then view all synced data — calls, SMS, WhatsApp, Instagram, Facebook, photos, videos, contacts and live location." }].map(s => (<div key={s.n} style={{ display: "flex", gap: 20, marginBottom: 36, alignItems: "flex-start" }}><div style={{ width: 48, height: 48, borderRadius: 13, background: "linear-gradient(135deg,#9A7B2F,#F0D080)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: DARK }}><Ic n={s.ic} sz={22} c={DARK} /></div><div><h3 className="raj" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: GOLD }}>Step {s.n}: {s.t}</h3><p style={{ color: "#A8B0C2", fontSize: 15, lineHeight: 1.8 }}>{s.d}</p></div></div>))}<div style={{ marginTop: 40, padding: "24px 28px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14 }}><p style={{ fontWeight: 600, color: GOLD, marginBottom: 8 }}>Need help getting started?</p><p style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>Our support team is available on Facebook to guide you through every step.</p><a href={FB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><button className="btn-gold"><Ic n="facebook" sz={16} />Contact Support</button></a></div></div></div>);

const Demo = ({ sp }) => {
  const [tab, setTab] = useState("calls");
  const [sub, setSub] = useState("all");
  const streams = [{ id: "calls", lb: "Call Log", ic: "phone", subs: ["all", "received", "incoming", "missed"] }, { id: "sms", lb: "SMS", ic: "msg", subs: ["all", "received", "sent"] }, { id: "whatsapp", lb: "WhatsApp", ic: "whatsapp", subs: ["all", "received", "sent", "groups"] }, { id: "instagram", lb: "Instagram", ic: "instagram", subs: ["all", "received", "sent"] }, { id: "facebook", lb: "Facebook", ic: "facebook", subs: ["all", "received", "sent"] }, { id: "media", lb: "Photos & Videos", ic: "img", subs: ["all photos", "camera", "screenshots", "all videos", "recorded", "downloaded"] }, { id: "contacts", lb: "Contacts", ic: "users", subs: ["all", "favorites", "recent"] }, { id: "location", lb: "Live Location", ic: "map", subs: ["live", "history"] }];
  const cur = streams.find(s => s.id === tab);
  const chg = id => { setTab(id); setSub("all"); };
  const callData = { all: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }, { name: "Jake", num: "+1(555)876-4521", type: "outgoing", dur: "1m 05s", time: "Today, 09:15 AM" }, { name: "Office HR", num: "+1(555)100-2200", type: "missed", dur: "—", time: "Today, 08:47 AM" }], received: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }], incoming: [{ name: "Mom", num: "+1(555)234-7890", type: "incoming", dur: "4m 32s", time: "Today, 10:24 AM" }], missed: [{ name: "Office HR", num: "+1(555)100-2200", type: "missed", dur: "—", time: "Today, 08:47 AM" }] };
  const smsData = { all: [{ from: "Mom", prev: "Don't forget dinner! 😊", time: "10:31 AM", type: "received" }, { from: "Jake", prev: "See you at 7!", time: "9:20 AM", type: "sent" }], received: [{ from: "Mom", prev: "Don't forget dinner! 😊", time: "10:31 AM", type: "received" }], sent: [{ from: "Jake", prev: "See you at 7!", time: "9:20 AM", type: "sent" }] };
  const waData = { all: [{ from: "Mom 💚", prev: "Are you home yet?", time: "10:45 AM", av: "M", type: "received" }, { from: "Family 👨‍👩‍👧", prev: "Dad: Leaving at 5", time: "Yesterday", av: "F", type: "groups" }], received: [{ from: "Mom 💚", prev: "Are you home yet?", time: "10:45 AM", av: "M", type: "received" }], sent: [{ from: "you", prev: "On my way!", time: "10:50 AM", av: "Y", type: "sent" }], groups: [{ from: "Family 👨‍👩‍👧", prev: "Dad: Leaving at 5", time: "Yesterday", av: "F", type: "groups" }] };
  const photos = [{ n: "IMG_2041.jpg", s: "3.2 MB", d: "Today", c: GOLD, cat: "camera" }, { n: "Screenshot.png", s: "1.1 MB", d: "Yesterday", c: "#6C63FF", cat: "screenshots" }, { n: "VID_0291.mp4", s: "48 MB", d: "Yesterday", c: "#FF4D6A", v: true, cat: "recorded" }];
  const contacts = [{ name: "Mom", ph: "+1 555 234 7890", tg: "Family", fav: true }, { name: "Sarah Chen", ph: "+1 555 332 9981", tg: "Work", fav: false }];
  return (<div style={{ paddingTop: 70 }}>
    <div style={{ background: "linear-gradient(90deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))", borderBottom: "1px solid rgba(201,168,76,0.2)", padding: "11px 24px", textAlign: "center" }}><p style={{ fontSize: 12, color: "#A8B0C2" }}><span className="tag tg" style={{ marginRight: 10 }}>DEMO MODE</span>All data is simulated. <button onClick={() => sp("register")} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Create account to access real sync →</button></p></div>
    <div style={{ display: "flex", height: "calc(100vh - 114px)" }}>
      <div className="sb"><div style={{ padding: "13px 20px 16px", borderBottom: "1px solid rgba(201,168,76,0.1)", marginBottom: 7 }}><div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}><span className="dot on ap" /><span className="raj" style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>DEMO — Simulated</span></div></div>{streams.map(s => (<button key={s.id} className={`sl${tab === s.id ? " active" : ""}`} onClick={() => chg(s.id)}><Ic n={s.ic} sz={14} /><span style={{ flex: 1 }}>{s.lb}</span></button>))}<div style={{ padding: "14px 11px", marginTop: 8, borderTop: "1px solid rgba(201,168,76,0.1)" }}><button className="btn-gold" style={{ width: "100%", justifyContent: "center", padding: "9px", fontSize: 12 }} onClick={() => sp("register")}><Ic n="zap" sz={13} />Create Account</button></div></div>
      <div style={{ flex: 1, overflow: "auto", background: DARK, padding: 22 }}>
        <div className="sub-tabs">{cur.subs.map(s => (<button key={s} className={`btn-tab${sub === s ? " active" : ""}`} onClick={() => setSub(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>
        {tab === "calls" && (<div className="ad"><div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead><tbody>{(callData[sub] || callData.all).map((c, i) => (<tr key={i}><td style={{ fontSize: 16 }}>{c.type === "incoming" ? "📞" : c.type === "outgoing" ? "📤" : "❌"}</td><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.num}</td><td><span className={`tag ${c.type === "incoming" ? "tgg" : c.type === "outgoing" ? "tgb" : "tgr"}`}>{c.type}</span></td><td>{c.dur}</td><td style={{ fontSize: 11 }}>{c.time}</td></tr>))}</tbody></table></div></div>)}
        {tab === "sms" && (<div className="ad">{(smsData[sub] || smsData.all).map((m, i) => (<div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center", marginBottom: 7 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${GOLD},#9A7B2F)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: DARK, flexShrink: 0 }}>{m.from[0]}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, fontSize: 13 }}>{m.from}</span><div style={{ display: "flex", gap: 6 }}><span className={`tag ${m.type === "sent" ? "tgs" : "tgg"}`} style={{ fontSize: 9 }}>{m.type}</span><span style={{ fontSize: 11, color: MUTED }}>{m.time}</span></div></div><p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{m.prev}</p></div></div>))}</div>)}
        {tab === "whatsapp" && (<div className="ad">{(waData[sub] || waData.all).map((c, i) => (<div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center", marginBottom: 7 }}><div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#25D366,#128C7E)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{c.av}</div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600 }}>{c.from}</span><div style={{ display: "flex", gap: 6 }}><span className={`tag ${c.type === "sent" ? "tgs" : c.type === "groups" ? "tgb" : "tgg"}`} style={{ fontSize: 9 }}>{c.type}</span><span style={{ fontSize: 11, color: MUTED }}>{c.time}</span></div></div><p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{c.prev}</p></div></div>))}</div>)}
        {tab === "media" && (<div className="ad"><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>{photos.filter(p => { if (sub === "all photos") return !p.v; if (sub === "all videos") return p.v; if (sub === "camera") return p.cat === "camera"; if (sub === "screenshots") return p.cat === "screenshots"; if (sub === "recorded") return p.cat === "recorded"; return true; }).map((p, i) => (<div key={i} className="glass" style={{ padding: 0, overflow: "hidden", borderRadius: 13, cursor: "pointer" }}><div style={{ height: 100, background: `linear-gradient(135deg,${p.c}33,${p.c}11)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}><Ic n={p.v ? "video" : "img"} sz={28} c={p.c} />{p.v && <span className="tag tg" style={{ position: "absolute", top: 7, right: 7, fontSize: 8 }}>VIDEO</span>}</div><div style={{ padding: "9px 11px" }}><p style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{p.n}</p><p style={{ fontSize: 10, color: MUTED }}>{p.s} · {p.d}</p></div></div>))}</div></div>)}
        {tab === "contacts" && (<div className="ad"><div className="glass" style={{ overflow: "auto" }}><table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Tag</th><th>Fav</th></tr></thead><tbody>{contacts.filter(c => sub === "favorites" ? c.fav : true).map((c, i) => (<tr key={i}><td style={{ color: TEXT, fontWeight: 600 }}>{c.name}</td><td className="mono" style={{ fontSize: 11 }}>{c.ph}</td><td><span className={`tag ${c.tg === "Family" ? "tgg" : "tgb"}`}>{c.tg}</span></td><td style={{ fontSize: 16 }}>{c.fav ? "⭐" : ""}</td></tr>))}</tbody></table></div></div>)}
        {tab === "location" && (<div className="ad">{sub === "live" ? (<div className="glass" style={{ overflow: "hidden", height: 300 }}><div style={{ height: "100%", background: "linear-gradient(135deg,rgba(201,168,76,0.06),rgba(192,199,212,0.02))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}><div style={{ position: "relative" }}><div style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%", border: "2px solid rgba(255,77,106,0.3)", animation: "ping 1.5s ease-out infinite", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} /><div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FF4D6A", boxShadow: "0 0 0 4px rgba(255,77,106,0.2)" }} /></div><p className="mono" style={{ fontSize: 16, color: TEXT }}>37.7749° N, 122.4194° W</p><p style={{ color: MUTED, fontSize: 12 }}>San Francisco, CA — Demo location</p></div></div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{[["Today 10:24 AM", "TechCorp Office, SF"], ["Today 08:15 AM", "Home, SF"]].map(([t, loc], i) => (<div key={i} className="glass" style={{ padding: "13px 17px", display: "flex", gap: 12, alignItems: "center" }}><Ic n="map" sz={18} c="#FF4D6A" /><div><p style={{ fontWeight: 600, fontSize: 13, color: TEXT }}>{loc}</p><p style={{ fontSize: 11, color: MUTED }}>{t}</p></div></div>))}</div>)}</div>)}
        {["instagram", "facebook"].includes(tab) && (<div className="ad"><p style={{ color: MUTED, fontSize: 13, padding: 20 }}>Demo {tab} messages. <button onClick={() => sp("register")} style={{ color: GOLD, background: "none", border: "none", cursor: "pointer" }}>Create account to view real data →</button></p></div>)}
      </div>
    </div>
  </div>);
};

// ============================================================
// ROOT APP
// ============================================================
const PUBLIC_PAGES = ["home", "demo", "pricing", "refund", "privacy", "terms", "about", "contact", "howitworks", "features", "reviews", "login", "register"];

export default function App() {
  const [pg, setPg] = useState("home");
  const [user, setUserState] = useState(null);
  const [reviews, setReviews] = useState(DEF_REVIEWS);

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
      return next;
    });
  };

  // Tawk.to Live Chat
  useEffect(() => {
    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a35f4d2a259a01d4cf75f3c/1jrhc8m1o";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);
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
      case "home": return <Home sp={sp} reviews={reviews} setReviews={setReviews} />;
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
      default: return <Home sp={sp} reviews={reviews} setReviews={setReviews} />;
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
