import { useState, useEffect, useRef } from "react";

const GOLD="#C9A84C",SILVER="#C0C7D4",DARK="#080C18",SURF="#111526",MUTED="#7A849A",TEXT="#EDF0F7";
const FB_LINK="https://www.facebook.com/profile.php?id=61588536275390&mibextid=wwXIfr";
const VALID_IDS=["TC-100-001","TC-100-002","TC-100-003","TC-200-001","TC-200-002","TC-300-001"];

// ── STYLES ──────────────────────────────────────────────────
const Styles=()=>(<style>{`
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#080C18;color:#EDF0F7;font-family:'Inter',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased;}
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
.btn-gold:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-out{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;background:transparent;color:#EDF0F7;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:15px;border:1px solid rgba(201,168,76,0.35);border-radius:10px;cursor:pointer;transition:all .3s;white-space:nowrap;}
.btn-out:hover{border-color:#C9A84C;background:rgba(201,168,76,0.08);transform:translateY(-2px);}
.btn-sm{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(255,255,255,0.04);color:#A8B0C2;font-size:12px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;cursor:pointer;transition:all .2s;}
.btn-sm:hover{border-color:rgba(201,168,76,0.3);color:#EDF0F7;}
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
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;}
.on{background:#00C878;box-shadow:0 0 8px #00C878;}
.nl{color:#7A849A;font-size:14px;font-weight:500;cursor:pointer;transition:color .2s;background:none;border:none;font-family:'Inter',sans-serif;}
.nl:hover,.nl.active{color:#C9A84C;}
.sb{width:235px;min-height:100vh;background:#0D1020;border-right:1px solid rgba(201,168,76,0.1);padding:20px 0;flex-shrink:0;}
.sl{display:flex;align-items:center;gap:12px;padding:12px 20px;color:#7A849A;cursor:pointer;font-size:14px;font-weight:500;border:none;background:none;width:100%;text-align:left;border-left:3px solid transparent;transition:all .2s;font-family:'Inter',sans-serif;}
.sl:hover{color:#EDF0F7;background:rgba(255,255,255,0.03);}
.sl.active{color:#C9A84C;background:rgba(201,168,76,0.08);border-left-color:#C9A84C;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{text-align:left;padding:11px 14px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#7A849A;border-bottom:1px solid rgba(201,168,76,0.1);font-weight:600;}
.tbl td{padding:13px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);color:#A8B0C2;}
.tbl tr:hover td{background:rgba(201,168,76,0.03);}
.pb{height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;}
.pf{height:100%;border-radius:3px;background:linear-gradient(90deg,#9A7B2F,#C9A84C,#F0D080);transition:width .3s ease;}
.mo{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(14px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto;}
.md{background:#0F1424;border:1px solid rgba(201,168,76,0.25);border-radius:22px;padding:36px;max-width:560px;width:100%;animation:sup .3s ease;margin:auto;}
.lo{position:absolute;inset:0;background:rgba(8,12,24,0.94);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;border-radius:inherit;z-index:10;}
.bub{padding:9px 13px;border-radius:16px;font-size:13px;max-width:82%;line-height:1.55;}
.bi{background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.2);color:#EDF0F7;border-bottom-left-radius:4px;}
.bo{background:rgba(192,199,212,0.1);border:1px solid rgba(192,199,212,0.15);color:#EDF0F7;align-self:flex-end;border-bottom-right-radius:4px;}
.sr{position:relative;height:4px;background:rgba(201,168,76,0.08);border-radius:2px;overflow:hidden;margin:8px 0;}
.sp{position:absolute;width:40px;height:4px;background:linear-gradient(90deg,transparent,#C9A84C,#F0D080,transparent);border-radius:2px;animation:sm 1.6s linear infinite;}
.sp:nth-child(2){animation-delay:.53s;}.sp:nth-child(3){animation-delay:1.06s;}
.rc{background:rgba(20,24,40,0.9);border:1px solid rgba(201,168,76,0.15);border-radius:16px;padding:28px;transition:all .3s;}
.rc:hover{border-color:rgba(201,168,76,0.4);transform:translateY(-4px);box-shadow:0 12px 40px rgba(201,168,76,0.1);}
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
.subtab{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(201,168,76,0.2);background:rgba(255,255,255,0.03);color:#7A849A;transition:all .2s;}
.subtab:hover{border-color:rgba(201,168,76,0.4);color:#EDF0F7;}
.subtab.active{background:rgba(201,168,76,0.12);border-color:#C9A84C;color:#C9A84C;}
.drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:600;}
.drawer{position:fixed;top:0;right:0;height:100vh;width:300px;background:#0D1020;border-left:1px solid rgba(201,168,76,0.2);z-index:700;padding:28px 24px;overflow-y:auto;animation:slideIn .3s ease;}
.drawer-link{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:12px;cursor:pointer;transition:all .2s;color:#A8B0C2;font-size:15px;font-weight:500;border:none;background:none;width:100%;text-align:left;}
.drawer-link:hover{background:rgba(201,168,76,0.08);color:#C9A84C;}
@keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}
@keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-13px);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes sup{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes marquee{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
@keyframes fade{from{opacity:0;}to{opacity:1;}}
@keyframes sm{0%{left:-15%;}100%{left:115%;}}
@keyframes ping{0%{transform:scale(1);opacity:.6;}100%{transform:scale(2.6);opacity:0;}}
@keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-6px);}75%{transform:translateX(6px);}}
.af{animation:float 5s ease-in-out infinite;}
.ap{animation:pulse 2s ease-in-out infinite;}
.as{animation:spin 1.1s linear infinite;}
.au{animation:sup .5s ease both;}
.ad{animation:fade .4s ease both;}
.shake{animation:shake .4s ease;}
@media(max-width:768px){.sec{padding:56px 0;}.hm{display:none!important;}.sb{width:100%;min-height:auto;}}
@media(max-width:480px){.ct{padding:0 14px;}}
`}</style>);

// ── LOGO ────────────────────────────────────────────────────
const Logo=({sz=36})=>(<svg width={sz} height={sz} viewBox="0 0 100 100"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A8B0C2"/><stop offset="50%" stopColor="#EDF0F7"/><stop offset="100%" stopColor="#7A849A"/></linearGradient><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9A7B2F"/><stop offset="50%" stopColor="#F0D080"/><stop offset="100%" stopColor="#C9A84C"/></linearGradient></defs><rect x="10" y="15" width="50" height="10" rx="2" fill="url(#sg)"/><rect x="28" y="15" width="12" height="70" rx="2" fill="url(#sg)"/><path d="M90 28 Q90 18 80 18 L62 18 Q52 18 52 28 L52 72 Q52 82 62 82 L80 82 Q90 82 90 72 L90 62 Q90 56 84 56 L78 56 Q74 56 74 60 L74 68 Q74 72 70 72 L65 72 Q62 72 62 68 L62 32 Q62 28 65 28 L70 28 Q74 28 74 32 L74 40 Q74 44 78 44 L84 44 Q90 44 90 38 Z" fill="url(#gg)"/></svg>);

// ── ICONS ───────────────────────────────────────────────────
const I=({n,sz=18,c="currentColor",st})=>{const p={phone:<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12a19.79 19.79 0 0 1-2.07-8.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>,msg:<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,map:<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,img:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,video:<><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,users:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,lock:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,zap:<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,check:<><polyline points="20 6 9 17 4 12"/></>,x:<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,arrow:<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,home:<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,link:<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,sync:<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,device:<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,key:<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,whatsapp:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,instagram:<><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,facebook:<><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></>,copy:<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,send:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,star:<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,menu:<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,mail:<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,info:<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,plus:<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,headphones:<><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></>,};return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={st}>{p[n]}</svg>);};

// ── PARTICLES ───────────────────────────────────────────────
const Particles=()=>{const r=useRef(null),m=useRef({x:0,y:0}),f=useRef(null);useEffect(()=>{const c=r.current;if(!c)return;const x=c.getContext("2d");let pts=[];const rs=()=>{c.width=c.offsetWidth;c.height=c.offsetHeight;pts=Array.from({length:70},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.4+.4,g:Math.random()>.5}));};const dr=()=>{x.clearRect(0,0,c.width,c.height);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>c.width)p.vx*=-1;if(p.y<0||p.y>c.height)p.vy*=-1;x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.fillStyle=p.g?"rgba(201,168,76,0.5)":"rgba(192,199,212,0.3)";x.fill();});for(let i=0;i<pts.length;i++){for(let j=i+1;j<pts.length;j++){const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);if(d<100){x.beginPath();x.moveTo(pts[i].x,pts[i].y);x.lineTo(pts[j].x,pts[j].y);x.strokeStyle=`rgba(201,168,76,${(1-d/100)*.12})`;x.lineWidth=.5;x.stroke();}}const dm=Math.hypot(pts[i].x-m.current.x,pts[i].y-m.current.y);if(dm<150){x.beginPath();x.moveTo(pts[i].x,pts[i].y);x.lineTo(m.current.x,m.current.y);x.strokeStyle=`rgba(201,168,76,${(1-dm/150)*.25})`;x.lineWidth=.8;x.stroke();}}f.current=requestAnimationFrame(dr);};const om=e=>{const rc=c.getBoundingClientRect();m.current={x:e.clientX-rc.left,y:e.clientY-rc.top};};window.addEventListener("resize",rs);c.addEventListener("mousemove",om);rs();dr();return()=>{window.removeEventListener("resize",rs);c.removeEventListener("mousemove",om);cancelAnimationFrame(f.current);};},[]);return<canvas ref={r} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:.55}}/>;};

// ── STARS ───────────────────────────────────────────────────
const Stars=({v,onChange})=>(<div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(s=>(<button key={s} onClick={()=>onChange&&onChange(s)} style={{background:"none",border:"none",cursor:onChange?"pointer":"default",fontSize:22,color:s<=v?GOLD:"#2A3050",transition:"color .15s"}}>★</button>))}</div>);

// ── DRAWER ──────────────────────────────────────────────────
const Drawer=({open,onClose,sp,user})=>{
  if(!open)return null;
  const items=[
    {label:"How It Works",icon:"sync",action:()=>{sp("home");onClose();}},
    {label:"Pricing",icon:"zap",action:()=>{sp("pricing");onClose();}},
    {label:"Reviews",icon:"star",action:()=>{sp("reviews");onClose();}},
    {label:"Live Demo",icon:"eye",action:()=>{sp("demo");onClose();}},
    {label:"About",icon:"info",action:()=>{sp("about");onClose();}},
    {label:"Refund Policy",icon:"file",action:()=>{sp("refund");onClose();}},
    {label:"Contact Support",icon:"headphones",action:()=>{window.open(FB_LINK,"_blank");onClose();}},
  ];
  return(<>
    <div className="drawer-overlay" onClick={onClose}/>
    <div className="drawer">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:9}}><Logo sz={32}/><div><div className="raj" style={{fontSize:13,fontWeight:700,color:SILVER,letterSpacing:".1em",lineHeight:1.1}}>TRUSTCO</div><div className="raj" style={{fontSize:8,color:GOLD,letterSpacing:".2em"}}>— TECH —</div></div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:MUTED}}><I n="x" sz={20}/></button>
      </div>
      <div className="dv" style={{margin:"0 0 16px"}}/>
      {items.map(it=>(<button key={it.label} className="drawer-link" onClick={it.action}><div style={{width:36,height:36,borderRadius:10,background:"rgba(201,168,76,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:GOLD,flexShrink:0}}><I n={it.icon} sz={16}/></div><span>{it.label}</span></button>))}
      <div className="dv"/>
      {!user?(<div style={{display:"flex",flexDirection:"column",gap:10}}><button className="btn-gold" style={{justifyContent:"center"}} onClick={()=>{sp("register");onClose();}}>Get Started</button><button className="btn-out" style={{justifyContent:"center"}} onClick={()=>{sp("login");onClose();}}>Sign In</button></div>):(<button className="btn-out" style={{justifyContent:"center",width:"100%"}} onClick={()=>{sp("dashboard");onClose();}}>Go to Dashboard</button>)}
    </div>
  </>);
};

// ── NAVBAR ──────────────────────────────────────────────────
const Nav=({pg,sp,user,su,drawerOpen,setDrawerOpen})=>{
  const[sc,setSc]=useState(false);
  useEffect(()=>{const f=()=>setSc(window.scrollY>40);window.addEventListener("scroll",f);return()=>window.removeEventListener("scroll",f);},[]);
  return(<nav style={{position:"fixed",top:0,left:0,right:0,zIndex:500,background:sc?"rgba(8,12,24,0.97)":"transparent",backdropFilter:sc?"blur(24px)":"none",borderBottom:sc?"1px solid rgba(201,168,76,0.12)":"none",transition:"all .4s",padding:"0 24px"}}>
    <div style={{maxWidth:1180,margin:"0 auto",display:"flex",alignItems:"center",height:70,gap:32}}>
      <button onClick={()=>sp("home")} style={{display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer"}}><Logo sz={36}/><div><div className="raj" style={{fontSize:15,fontWeight:700,color:SILVER,letterSpacing:".1em",lineHeight:1.1}}>TRUSTCO</div><div className="raj" style={{fontSize:9,color:GOLD,letterSpacing:".2em",lineHeight:1}}>— TECH —</div></div></button>
      <div className="hm" style={{display:"flex",gap:26,flex:1,justifyContent:"center"}}>
        {["home","features","pricing","demo","about"].map(n=>(<button key={n} className={`nl${pg===n?" active":""}`} onClick={()=>sp(n)}>{n==="demo"?"Live Demo":n[0].toUpperCase()+n.slice(1)}</button>))}
      </div>
      <div style={{display:"flex",gap:12,marginLeft:"auto",alignItems:"center"}}>
        {user?(<><button className="btn-out" style={{padding:"8px 16px",fontSize:13}} onClick={()=>sp("dashboard")}>Dashboard</button><button onClick={()=>{su(null);sp("home");}} style={{background:"rgba(255,77,106,0.1)",color:"#FF4D6A",border:"1px solid rgba(255,77,106,0.2)",padding:"8px 13px",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",gap:6,alignItems:"center"}}><I n="logout" sz={13}/>Out</button></>):(<><button className="nl hm" onClick={()=>sp("login")}>Sign in</button><button className="btn-gold" style={{padding:"9px 20px",fontSize:14}} onClick={()=>sp("register")}>Get Started</button></>)}
        <button onClick={()=>setDrawerOpen(true)} style={{background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:9,padding:"9px 11px",cursor:"pointer",color:GOLD,display:"flex",alignItems:"center"}}><I n="menu" sz={19}/></button>
      </div>
    </div>
  </nav>);
};

// ── DEFAULT REVIEWS ─────────────────────────────────────────
const DEF_REVIEWS=[
  {name:"Michael R.",role:"IT Manager",rating:5,text:"Setup was incredibly fast. Having all my data on both phones in real time is a game changer for my workflow.",date:"May 2025",verified:true},
  {name:"Sarah T.",role:"Business Owner",rating:5,text:"I carry a personal and work phone daily. TrustCo Tech lets me leave one in my bag and still see everything. Worth every dollar.",date:"Apr 2025",verified:true},
  {name:"David K.",role:"Freelancer",rating:5,text:"WhatsApp sync alone is worth the price. My SIM is in one phone but I reply from the other. Works flawlessly.",date:"Apr 2025",verified:true},
  {name:"Jennifer M.",role:"Operations Director",rating:5,text:"The Partner ID connection is genius — simple as entering a code and it just works. Live location is incredibly useful.",date:"Mar 2025",verified:true},
  {name:"Robert P.",role:"Tech Manager",rating:5,text:"Tried the demo first and was immediately impressed. Activated the 2-year plan and haven't looked back. Best $300 I've spent.",date:"Mar 2025",verified:true},
  {name:"Aisha B.",role:"Remote Worker",rating:5,text:"Everything mirrors instantly — calls, messages, Instagram, photos. TrustCo Tech is exactly what I needed.",date:"Feb 2025",verified:true},
];

// ── HOME PAGE ───────────────────────────────────────────────
const Home=({sp,reviews})=>(
<div>
  <section style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",overflow:"hidden",paddingTop:70}}>
    <Particles/>
    <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,168,76,0.06),transparent)",pointerEvents:"none"}}/>
    <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px)",backgroundSize:"60px 60px",pointerEvents:"none"}}/>
    <div className="ct" style={{position:"relative",zIndex:1,textAlign:"center",padding:"100px 24px 80px"}}>
      <div className="af" style={{display:"flex",justifyContent:"center",marginBottom:28}}><div style={{position:"relative"}}><div style={{position:"absolute",inset:-18,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,168,76,0.15),transparent)",animation:"pulse 3s infinite"}}/><Logo sz={86}/></div></div>
      <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"6px 18px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:24,marginBottom:24}}><span className="dot on ap"/><span className="raj" style={{fontSize:11,color:GOLD,letterSpacing:".15em",textTransform:"uppercase"}}>Premium Phone Sync Technology</span></div>
      <h1 className="raj" style={{fontSize:"clamp(36px,6vw,72px)",fontWeight:700,lineHeight:1.05,marginBottom:24}}><span className="grad-silver">Your Phones.</span><br/><span className="shimmer">One Seamless Connection.</span></h1>
      <p style={{fontSize:"clamp(15px,2vw,18px)",color:"#A8B0C2",maxWidth:580,margin:"0 auto 44px",lineHeight:1.8}}>Forward your calls, messages, WhatsApp, Instagram, Facebook, photos, videos, contacts and live location from your primary phone to any secondary device — in real time.</p>
      <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap",marginBottom:52}}>
        <button className="btn-gold" style={{fontSize:15,padding:"15px 32px"}} onClick={()=>sp("register")}><I n="sync" sz={17}/>Get Started Now</button>
        <button className="btn-out" style={{fontSize:15}} onClick={()=>sp("demo")}><I n="eye" sz={17}/>Try Live Demo</button>
      </div>
      <div style={{display:"flex",gap:28,justifyContent:"center",flexWrap:"wrap"}}>{[["🔐","AES-256 Encrypted"],["⚡","Real-time Sync"],["📱","iOS & Android"],["🌍","Works Worldwide"]].map(([e,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:MUTED}}><span>{e}</span>{l}</div>))}</div>
    </div>
  </section>

  <div style={{borderTop:"1px solid rgba(201,168,76,0.12)",borderBottom:"1px solid rgba(201,168,76,0.12)",padding:"15px 0",overflow:"hidden",background:"rgba(201,168,76,0.02)"}}><div style={{display:"flex",gap:48,animation:"marquee 25s linear infinite",width:"max-content"}}>{["📞 Call Log Sync","💬 SMS Forwarding","💚 WhatsApp Mirror","📸 Photo Backup","📍 Live Location","📘 Facebook DMs","📷 Instagram DMs","👥 Contacts Sync","🎥 Video Backup","📞 Call Log Sync","💬 SMS Forwarding","💚 WhatsApp Mirror","📸 Photo Backup","📍 Live Location","📘 Facebook DMs","📷 Instagram DMs","👥 Contacts Sync","🎥 Video Backup"].map((l,i)=>(<span key={i} style={{fontSize:12,color:GOLD,fontWeight:600,whiteSpace:"nowrap",opacity:.7}}>{l}</span>))}</div></div>

  <section className="sec" id="how-it-works">
    <div className="ct">
      <div style={{textAlign:"center",marginBottom:60}}><div className="ew" style={{justifyContent:"center"}}>How It Works</div><h2 className="raj" style={{fontSize:"clamp(26px,4vw,46px)",fontWeight:700}}>Connect in 3 simple steps</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:22}}>
        {[{n:"01",ic:"device",cl:GOLD,t:"Install on both phones",d:"Download TrustCo Tech on your primary phone and second device. Create an account and sign in on both."},{n:"02",ic:"key",cl:SILVER,t:"Enter your Partner ID",d:"Each activated account receives a unique admin-issued Partner ID. Enter your second device's ID to pair securely."},{n:"03",ic:"sync",cl:GOLD,t:"Access & sync data",d:"Click Remote Access, watch the connection go 0–100%, then view all synced data from your second device."}].map(s=>(<div key={s.n} className="glass c3d" style={{padding:30}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}><div style={{width:48,height:48,borderRadius:13,background:s.cl+"18",display:"flex",alignItems:"center",justifyContent:"center",color:s.cl}}><I n={s.ic} sz={21}/></div><span className="raj" style={{fontSize:44,fontWeight:700,color:s.cl+"20"}}>{s.n}</span></div><h3 className="raj" style={{fontSize:19,fontWeight:700,marginBottom:9}}>{s.t}</h3><p style={{color:MUTED,fontSize:13,lineHeight:1.75}}>{s.d}</p></div>))}
      </div>
    </div>
  </section>

  <section className="sec" style={{background:"rgba(0,0,0,0.18)"}}>
    <div className="ct">
      <div style={{textAlign:"center",marginBottom:56}}><div className="ew" style={{justifyContent:"center"}}>Data Streams</div><h2 className="raj" style={{fontSize:"clamp(24px,4vw,44px)",fontWeight:700}}>Everything forwarded instantly</h2></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16}}>
        {[{ic:"phone",cl:"#6C63FF",t:"Call Logs"},{ic:"msg",cl:GOLD,t:"SMS Messages"},{ic:"whatsapp",cl:"#25D366",t:"WhatsApp"},{ic:"instagram",cl:"#E1306C",t:"Instagram DMs"},{ic:"facebook",cl:"#1877F2",t:"Facebook Messenger"},{ic:"img",cl:GOLD,t:"Photos"},{ic:"video",cl:SILVER,t:"Videos"},{ic:"users",cl:"#00C878",t:"Contacts"},{ic:"map",cl:"#FF4D6A",t:"Live Location"}].map(f=>(<div key={f.t} className="glass c3d" style={{padding:22}}><div style={{width:42,height:42,borderRadius:11,background:f.cl+"15",display:"flex",alignItems:"center",justifyContent:"center",color:f.cl,marginBottom:14}}><I n={f.ic} sz={19}/></div><h3 className="raj" style={{fontSize:17,fontWeight:700}}>{f.t}</h3></div>))}
      </div>
    </div>
  </section>

  <section style={{padding:"56px 0",borderTop:"1px solid rgba(201,168,76,0.1)",borderBottom:"1px solid rgba(201,168,76,0.1)"}}><div className="ct"><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:36,textAlign:"center"}}>{[["580K+","Active Users"],["99.9%","Sync Uptime"],["< 1s","Sync Delay"],["9","Data Streams"]].map(([v,l])=>(<div key={l}><p className="raj grad-gold" style={{fontSize:42,fontWeight:700,marginBottom:7}}>{v}</p><p style={{color:MUTED,fontSize:13}}>{l}</p></div>))}</div></div></section>

  <section className="sec">
    <div className="ct">
      <div style={{textAlign:"center",marginBottom:44}}><div className="ew" style={{justifyContent:"center"}}>Customer Reviews</div><h2 className="raj" style={{fontSize:"clamp(24px,4vw,44px)",fontWeight:700,marginBottom:10}}>What our users say</h2><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10}}><Stars v={5}/><span className="raj" style={{fontSize:22,fontWeight:700}}>4.9</span><span style={{color:MUTED}}>/ 5 · {reviews.length} reviews</span></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:18,marginBottom:32}}>
        {reviews.slice(0,3).map((r,i)=>(<div key={i} className="rc c3d"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><Stars v={r.rating}/>{r.verified&&<span className="tag tg" style={{fontSize:9}}>✓ Verified</span>}</div><p style={{color:"#B0BAC9",fontSize:13,lineHeight:1.75,marginBottom:18,fontStyle:"italic"}}>"{r.text}"</p><div style={{display:"flex",alignItems:"center",gap:11}}><div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#9A7B2F)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,fontFamily:"Rajdhani",color:DARK}}>{r.name[0]}</div><div><p className="raj" style={{fontWeight:700,fontSize:14}}>{r.name}</p><p style={{fontSize:11,color:MUTED}}>{r.role} · {r.date}</p></div></div></div>))}
      </div>
      <div style={{textAlign:"center"}}><button className="btn-out" onClick={()=>sp("reviews")}>See All Reviews <I n="arrow" sz={15}/></button></div>
    </div>
  </section>

  <section className="sec" style={{background:"rgba(0,0,0,0.14)"}}><div className="ct" style={{textAlign:"center"}}><div className="ew" style={{justifyContent:"center"}}>Pricing</div><h2 className="raj" style={{fontSize:"clamp(24px,4vw,44px)",fontWeight:700,marginBottom:10}}>Simple, one-time pricing</h2><p style={{color:MUTED,fontSize:15,marginBottom:44}}>No subscriptions. Pay once, sync forever.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:22,maxWidth:680,margin:"0 auto 36px"}}>
      {[{name:"6 Months",price:100,ft:["All 9 data streams","2 devices","Email support"]},{name:"2 Years",price:300,best:true,ft:["All 9 data streams","Up to 5 devices","Priority support","Free updates"]}].map(p=>(<div key={p.name} className={`glass c3d${p.best?" glow-gold":""}`} style={{padding:30,position:"relative",borderColor:p.best?"rgba(201,168,76,0.4)":undefined}}>{p.best&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#9A7B2F,#F0D080)",color:DARK,padding:"4px 17px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:"Rajdhani",letterSpacing:".1em"}}>BEST VALUE</div>}<p className="raj" style={{fontSize:19,fontWeight:700,color:GOLD,marginBottom:4}}>{p.name}</p><p className="raj" style={{fontSize:48,fontWeight:700,marginBottom:3}}>${p.price}</p><p style={{color:MUTED,fontSize:12,marginBottom:20}}>one-time payment</p>{p.ft.map(f=>(<div key={f} style={{display:"flex",gap:9,marginBottom:9}}><I n="check" sz={14} c="#00C878"/><span style={{fontSize:13,color:"#A8B0C2"}}>{f}</span></div>))}<button className={p.best?"btn-gold":"btn-out"} style={{width:"100%",justifyContent:"center",marginTop:18}} onClick={()=>sp("pricing")}>Choose Plan</button></div>))}
    </div>
  </div></section>

  <section style={{padding:"70px 0"}}><div className="ct" style={{textAlign:"center"}}><div className="glass glow-gold" style={{padding:"56px 36px",background:"linear-gradient(135deg,rgba(201,168,76,0.08),rgba(192,199,212,0.03))",borderColor:"rgba(201,168,76,0.3)"}}><Logo sz={52}/><h2 className="raj" style={{fontSize:"clamp(24px,4vw,44px)",fontWeight:700,margin:"20px 0 14px"}}>Ready to sync your phones?</h2><p style={{color:MUTED,fontSize:16,maxWidth:460,margin:"0 auto 32px",lineHeight:1.7}}>Create a free account to get started. Try the demo without signing in.</p><div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}><button className="btn-gold" style={{fontSize:15,padding:"14px 32px"}} onClick={()=>sp("register")}><I n="sync" sz={17}/>Create Account</button><button className="btn-out" style={{fontSize:15}} onClick={()=>sp("demo")}>Try Demo First</button></div></div></div></section>

  <footer style={{borderTop:"1px solid rgba(201,168,76,0.1)",padding:"44px 0 22px"}}><div className="ct"><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:28,marginBottom:32}}><div><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}><Logo sz={38}/><div><div className="raj" style={{fontSize:13,fontWeight:700,color:SILVER,letterSpacing:".1em"}}>TRUSTCO</div><div className="raj" style={{fontSize:8,color:GOLD,letterSpacing:".2em"}}>— TECH —</div></div></div><p style={{color:MUTED,fontSize:12,lineHeight:1.7,maxWidth:200}}>Premium phone-to-phone sync technology.</p></div><div style={{display:"flex",gap:40,flexWrap:"wrap"}}><div><h4 className="raj" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".12em",color:GOLD,marginBottom:13,fontWeight:700}}>Product</h4>{["Features","Pricing","Live Demo","How It Works"].map(l=>(<div key={l} style={{color:MUTED,fontSize:13,marginBottom:9,cursor:"pointer"}} onMouseEnter={e=>e.target.style.color=GOLD} onMouseLeave={e=>e.target.style.color=MUTED}>{l}</div>))}</div><div><h4 className="raj" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".12em",color:GOLD,marginBottom:13,fontWeight:700}}>Legal</h4>{[["Privacy Policy","privacy"],["Refund Policy","refund"],["Terms of Service","terms"]].map(([l,pg])=>(<div key={l} style={{color:MUTED,fontSize:13,marginBottom:9,cursor:"pointer"}} onMouseEnter={e=>e.target.style.color=GOLD} onMouseLeave={e=>e.target.style.color=MUTED}>{l}</div>))}</div><div><h4 className="raj" style={{fontSize:11,textTransform:"uppercase",letterSpacing:".12em",color:GOLD,marginBottom:13,fontWeight:700}}>Support</h4><a href={FB_LINK} target="_blank" rel="noreferrer" style={{color:MUTED,fontSize:13,marginBottom:9,display:"block",textDecoration:"none"}} onMouseEnter={e=>e.target.style.color=GOLD} onMouseLeave={e=>e.target.style.color=MUTED}>Contact Support</a><div style={{color:MUTED,fontSize:13,marginBottom:9,cursor:"pointer"}} onMouseEnter={e=>e.target.style.color=GOLD} onMouseLeave={e=>e.target.style.color=MUTED}>trustcotech0@gmail.com</div></div></div></div><div style={{borderTop:"1px solid rgba(201,168,76,0.07)",paddingTop:18,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}><span style={{color:MUTED,fontSize:11}}>© 2025 TrustCo Tech. All rights reserved.</span><span style={{color:MUTED,fontSize:11}}>End-to-end encrypted · GDPR compliant</span></div></div></footer>
</div>);

// ── REVIEWS PAGE ─────────────────────────────────────────────
const ReviewsPage=({reviews,setReviews,user,sp})=>{
  const[rf,setRf]=useState({name:"",role:"",text:"",rating:5});
  const[done,setDone]=useState(false);
  const avg=(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1);
  const sub=()=>{
    if(!rf.name||!rf.text)return;
    if(!user){sp("login");return;}
    setReviews(p=>[{...rf,date:new Date().toLocaleDateString("en-US",{month:"short",year:"numeric"}),verified:true},...p]);
    setRf({name:"",role:"",text:"",rating:5});
    setDone(true);
    setTimeout(()=>setDone(false),3000);
  };
  return(<div style={{paddingTop:100}}><div className="ct" style={{padding:"60px 24px"}}>
    <div style={{textAlign:"center",marginBottom:52}}><div className="ew" style={{justifyContent:"center"}}>Customer Reviews</div><h1 className="raj" style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:700,marginBottom:12}}>What our users say</h1><div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10}}><Stars v={5}/><span className="raj" style={{fontSize:24,fontWeight:700}}>{avg}</span><span style={{color:MUTED}}>/ 5 · {reviews.length} reviews</span></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:60}}>
      {reviews.map((r,i)=>(<div key={i} className="rc c3d"><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><Stars v={r.rating}/>{r.verified&&<span className="tag tg" style={{fontSize:9}}>✓ Verified</span>}</div><p style={{color:"#B0BAC9",fontSize:13,lineHeight:1.75,marginBottom:18,fontStyle:"italic"}}>"{r.text}"</p><div style={{display:"flex",alignItems:"center",gap:11}}><div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${GOLD},#9A7B2F)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,fontFamily:"Rajdhani",color:DARK}}>{r.name[0]}</div><div><p className="raj" style={{fontWeight:700,fontSize:14}}>{r.name}</p><p style={{fontSize:11,color:MUTED}}>{r.role} · {r.date}</p></div></div></div>))}
    </div>
    <div className="glass-gold" style={{padding:36,maxWidth:660,margin:"0 auto"}}>
      <h3 className="raj" style={{fontSize:22,fontWeight:700,marginBottom:6,textAlign:"center"}}>Share Your Experience</h3>
      <p style={{color:MUTED,fontSize:13,textAlign:"center",marginBottom:24}}>{user?"Your review appears instantly":"Sign in to leave a review"}</p>
      {done?(<div style={{textAlign:"center",padding:"20px 0"}}><div style={{width:52,height:52,borderRadius:"50%",background:"rgba(0,200,120,0.12)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"#00C878"}}><I n="check" sz={24}/></div><p className="raj" style={{fontSize:18,fontWeight:700}}>Review posted! Thank you.</p></div>):(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}><div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Your Name *</label><input className="inp" placeholder="John D." value={rf.name} onChange={e=>setRf({...rf,name:e.target.value})}/></div><div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Role / Title</label><input className="inp" placeholder="e.g. Business Owner" value={rf.role} onChange={e=>setRf({...rf,role:e.target.value})}/></div></div>
        <div><label style={{fontSize:11,color:MUTED,marginBottom:7,display:"block"}}>Your Rating *</label><Stars v={rf.rating} onChange={v=>setRf({...rf,rating:v})}/></div>
        <div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Your Review *</label><textarea className="inp" placeholder="Share your experience..." rows={4} value={rf.text} onChange={e=>setRf({...rf,text:e.target.value})} style={{resize:"vertical"}}/></div>
        <button className="btn-gold" style={{justifyContent:"center"}} onClick={sub}>{user?<><I n="send" sz={15}/>Post Review</>:<><I n="lock" sz={15}/>Sign in to Review</>}</button>
      </div>)}
    </div>
  </div></div>);
};

// ── REFUND POLICY PAGE ───────────────────────────────────────
const RefundPage=({sp})=>(<div style={{paddingTop:100}}><div className="ct" style={{padding:"60px 24px",maxWidth:760}}>
  <div className="ew">Legal</div>
  <h1 className="raj" style={{fontSize:"clamp(28px,5vw,48px)",fontWeight:700,marginBottom:8}}>Refund Policy</h1>
  <p style={{color:MUTED,fontSize:13,marginBottom:40}}>Last updated: January 2025</p>
  {[
    {title:"Overview",body:"At TrustCo Tech, we are committed to providing a premium phone synchronisation service. We understand that purchasing decisions are important, which is why we offer a clear and fair refund policy. Please read this policy carefully before making a purchase."},
    {title:"14-Day Money-Back Guarantee",body:"We offer a 14-day money-back guarantee from the date of purchase. If you are not satisfied with TrustCo Tech for any reason within the first 14 days of your subscription, you may request a full refund. No questions asked."},
    {title:"Eligibility for Refund",body:"To be eligible for a refund, your request must be submitted within 14 days of your original purchase date. Refunds are only available for first-time purchases. Renewals and plan upgrades are non-refundable. Your account must not have violated our Terms of Service."},
    {title:"Non-Refundable Situations",body:"Refunds will NOT be issued in the following circumstances: requests made after the 14-day refund window has expired; accounts found to have violated our Terms of Service or used the service for unauthorised purposes; gift card payments that have already been verified and activated; crypto payments after the activation code has been issued."},
    {title:"How to Request a Refund",body:"To request a refund, contact our support team via our Facebook page or email us at trustcotech0@gmail.com. Include your account email address, date of purchase, payment method used, and reason for your refund request. We will process all eligible refund requests within 3–5 business days."},
    {title:"Partial Refunds",body:"In certain circumstances, we may offer partial refunds at our discretion. This may apply if you have used a significant portion of your subscription period. We will assess each case individually and communicate our decision promptly."},
    {title:"Changes to This Policy",body:"TrustCo Tech reserves the right to modify this refund policy at any time. Changes will be effective immediately upon posting to the website. Continued use of the service after changes constitutes your acceptance of the new policy."},
    {title:"Contact Us",body:"If you have questions about this refund policy, please contact our support team via Facebook or email trustcotech0@gmail.com. We aim to respond to all enquiries within 24 hours."},
  ].map(s=>(<div key={s.title} className="glass" style={{padding:28,marginBottom:16}}><h3 className="raj" style={{fontSize:19,fontWeight:700,color:GOLD,marginBottom:10}}>{s.title}</h3><p style={{color:"#A8B0C2",fontSize:14,lineHeight:1.8}}>{s.body}</p></div>))}
  <div style={{textAlign:"center",marginTop:32}}>
    <a href={FB_LINK} target="_blank" rel="noreferrer"><button className="btn-gold"><I n="headphones" sz={16}/>Contact Support on Facebook</button></a>
  </div>
</div></div>);

// ── DEMO PAGE ────────────────────────────────────────────────
const Demo=({sp,user})=>{
  const[tab,setTab]=useState("calls");
  const[sub,setSub]=useState("all");

  const DATA={
    calls:{
      received:[{name:"Mom",num:"+1(555)234-7890",dur:"4m 32s",time:"Today, 10:24 AM"},{name:"Sarah Chen",num:"+1(555)332-9981",dur:"12m 18s",time:"Yesterday, 7:30 PM"},{name:"Dr. Miller",num:"+1(555)440-3312",dur:"3m 22s",time:"Yesterday, 2:00 PM"}],
      incoming:[{name:"Jake Williams",num:"+1(555)876-4521",dur:"1m 05s",time:"Today, 09:15 AM"},{name:"Pizza Palace",num:"+1(555)010-9876",dur:"0m 45s",time:"Yesterday, 6:12 PM"}],
      missed:[{name:"Office HR",num:"+1(555)100-2200",time:"Today, 08:47 AM"},{name:"Bank Alert",num:"+1(555)200-1111",time:"Yesterday, 11:00 AM"}],
    },
    sms:{
      received:[{from:"Mom",prev:"Don't forget dinner on Sunday! 😊",time:"10:31 AM"},{from:"Sarah Chen",prev:"Can you send me that file?",time:"Yesterday"},{from:"Work Group",prev:"Meeting moved to 3pm ✅",time:"Yesterday"}],
      sent:[{from:"Jake Williams",prev:"Sounds good, see you at 7!",time:"9:20 AM"},{from:"David Park",prev:"Thanks for the help today",time:"Mon"}],
    },
    whatsapp:{
      received:[{from:"Mom 💚",prev:"Are you home yet?",time:"10:45 AM",av:"M"},{from:"Family 👨‍👩‍👧",prev:"Dad: We're leaving at 5",time:"Yesterday",av:"F"}],
      sent:[{from:"Jake 💚",prev:"Haha no way 😂",time:"9:55 AM",av:"J"},{from:"Work Chat 💼",prev:"Please review the doc",time:"Mon",av:"W"}],
      groups:[{from:"Family Group 👨‍👩‍👧",prev:"Dad: See you Sunday!",time:"Yesterday",av:"F"},{from:"Work Team 💼",prev:"New task assigned",time:"Mon",av:"T"}],
    },
    instagram:{
      received:[{from:"jamie_photos",prev:"Loved your latest post! 🔥",time:"2h ago"},{from:"mike_design",prev:"Can we collab? 🎨",time:"Mon"}],
      sent:[{from:"travel.with.anna",prev:"Thanks for the tag!",time:"Yesterday"},{from:"design_daily",prev:"Your work is inspiring 🙌",time:"Mon"}],
    },
    facebook:{
      received:[{from:"Robert Park",prev:"Are you coming to the event?",time:"3h ago"},{from:"Tech Community",prev:"New post in the group",time:"Mon"}],
      sent:[{from:"Emma Johnson",prev:"Thanks for the birthday wishes! 🎂",time:"Yesterday"},{from:"Local Events",prev:"I'll be there!",time:"Mon"}],
    },
    photos:{
      all:[{n:"IMG_2041.jpg",s:"3.2 MB",d:"Today",c:GOLD},{n:"IMG_2040.jpg",s:"2.8 MB",d:"Today",c:SILVER},{n:"IMG_2039.jpg",s:"4.1 MB",d:"Yesterday",c:"#6C63FF"},{n:"IMG_2038.jpg",s:"2.2 MB",d:"Mon",c:"#00C878"}],
      camera:[{n:"IMG_2041.jpg",s:"3.2 MB",d:"Today",c:GOLD},{n:"IMG_2039.jpg",s:"4.1 MB",d:"Yesterday",c:"#6C63FF"}],
      screenshots:[{n:"Screenshot_001.jpg",s:"1.1 MB",d:"Today",c:SILVER},{n:"Screenshot_002.jpg",s:"0.8 MB",d:"Yesterday",c:"#E1306C"}],
    },
    videos:{
      all:[{n:"VID_0291.mp4",s:"48 MB",d:"Yesterday",c:"#FF4D6A"},{n:"VID_0290.mp4",s:"112 MB",d:"Mon",c:GOLD}],
      recorded:[{n:"VID_0291.mp4",s:"48 MB",d:"Yesterday",c:"#FF4D6A"}],
      downloaded:[{n:"VID_0290.mp4",s:"112 MB",d:"Mon",c:GOLD}],
    },
    contacts:{
      all:[{name:"David Park",ph:"+1 555 221 4400",em:"david@email.com",tg:"Friend"},{name:"Dr. Miller",ph:"+1 555 440 3312",em:"miller@clinic.com",tg:"Doctor"},{name:"Mom",ph:"+1 555 234 7890",em:"mom@family.com",tg:"Family"},{name:"Sarah Chen",ph:"+1 555 332 9981",em:"sarah@work.com",tg:"Work"}],
      favorites:[{name:"Mom",ph:"+1 555 234 7890",em:"mom@family.com",tg:"Family"},{name:"Jake Williams",ph:"+1 555 876 4521",em:"jake@gmail.com",tg:"Friend"}],
      recent:[{name:"Dr. Miller",ph:"+1 555 440 3312",em:"miller@clinic.com",tg:"Doctor"},{name:"David Park",ph:"+1 555 221 4400",em:"david@email.com",tg:"Friend"}],
    },
    location:{
      live:[{coords:"37.7749° N, 122.4194° W",place:"San Francisco, CA",time:"Updated just now",battery:"73%",speed:"0 km/h",accuracy:"±5m"}],
      history:[{coords:"37.7751° N, 122.4182° W",place:"Near Union Square, SF",time:"2 hours ago"},{coords:"37.7739° N, 122.4312° W",place:"Near Golden Gate Park",time:"5 hours ago"}],
    },
  };

  const TABS=[
    {id:"calls",lb:"Call Log",ic:"phone",subs:["all","received","incoming","missed"]},
    {id:"sms",lb:"SMS",ic:"msg",subs:["all","received","sent"]},
    {id:"whatsapp",lb:"WhatsApp",ic:"whatsapp",subs:["all","received","sent","groups"]},
    {id:"instagram",lb:"Instagram",ic:"instagram",subs:["all","received","sent"]},
    {id:"facebook",lb:"Facebook",ic:"facebook",subs:["all","received","sent"]},
    {id:"photos",lb:"Photos",ic:"img",subs:["all","camera","screenshots"]},
    {id:"videos",lb:"Videos",ic:"video",subs:["all","recorded","downloaded"]},
    {id:"contacts",lb:"Contacts",ic:"users",subs:["all","favorites","recent"]},
    {id:"location",lb:"Live Location",ic:"map",subs:["live","history"]},
  ];

  const getItems=()=>{
    const d=DATA[tab];
    if(!d)return[];
    if(sub==="all"){
      const all=Object.values(d).flat();
      const seen=new Set();
      return all.filter(item=>{const k=JSON.stringify(item);if(seen.has(k))return false;seen.add(k);return true;});
    }
    return d[sub]||[];
  };

  const renderItems=()=>{
    const items=getItems();
    if(tab==="calls"){return(<div className="glass" style={{overflow:"auto"}}><table className="tbl"><thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead><tbody>{items.map((c,i)=>(<tr key={i}><td style={{fontSize:16}}>{sub==="missed"||c.missed?"❌":sub==="incoming"||sub==="sent"?"📤":"📞"}</td><td style={{color:TEXT,fontWeight:600}}>{c.name}</td><td className="mono" style={{fontSize:11}}>{c.num}</td><td><span className={`tag ${sub==="received"||sub==="all"?"tgg":sub==="missed"?"tgr":"tgb"}`}>{sub==="all"?"received":sub}</span></td><td>{c.dur||"—"}</td><td style={{fontSize:11}}>{c.time}</td></tr>))}</tbody></table></div>);}
    if(tab==="sms"||tab==="whatsapp"||tab==="instagram"||tab==="facebook"){const bgMap={whatsapp:"linear-gradient(135deg,#25D366,#128C7E)",instagram:"linear-gradient(135deg,#E1306C,#833AB4,#F77737)",facebook:"#1877F2"};const bg=bgMap[tab]||`linear-gradient(135deg,${GOLD},#9A7B2F)`;return(<div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map((m,i)=>(<div key={i} className="glass" style={{padding:"13px 17px",display:"flex",gap:13,alignItems:"center",cursor:"pointer"}}><div style={{width:40,height:40,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,flexShrink:0}}>{(m.av||m.from[0]).toUpperCase()}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14}}>{tab==="instagram"?"@":""}{m.from}</span><span style={{fontSize:11,color:MUTED}}>{m.time}</span></div><p style={{color:MUTED,fontSize:12,marginTop:2}}>{m.prev}</p></div><span className={`tag ${sub==="sent"?"tgb":"tgg"}`} style={{fontSize:9}}>{sub==="all"?"msg":sub}</span></div>))}</div>);}
    if(tab==="photos"||tab==="videos"){return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>{items.map((p,i)=>(<div key={i} className="glass" style={{padding:0,overflow:"hidden",borderRadius:13,cursor:"pointer"}}><div style={{height:100,background:`linear-gradient(135deg,${p.c}33,${p.c}11)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}><I n={tab==="videos"?"video":"img"} sz={28} c={p.c}/></div><div style={{padding:"9px 11px"}}><p style={{fontSize:11,fontWeight:600,color:TEXT}}>{p.n}</p><p style={{fontSize:10,color:MUTED}}>{p.s} · {p.d}</p></div></div>))}</div>);}
    if(tab==="contacts"){return(<div className="glass" style={{overflow:"auto"}}><table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tag</th></tr></thead><tbody>{items.map((c,i)=>(<tr key={i}><td style={{color:TEXT,fontWeight:600}}>{c.name}</td><td className="mono" style={{fontSize:11}}>{c.ph}</td><td style={{fontSize:12}}>{c.em}</td><td><span className={`tag ${c.tg==="Family"?"tgg":c.tg==="Work"?"tgb":c.tg==="Doctor"?"tg":"tg"}`}>{c.tg}</span></td></tr>))}</tbody></table></div>);}
    if(tab==="location"){return(<div style={{display:"flex",flexDirection:"column",gap:12}}>{items.map((l,i)=>(<div key={i} className="glass" style={{padding:24}}><div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}><div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i===0&&<div style={{position:"absolute",width:32,height:32,borderRadius:"50%",border:"2px solid rgba(255,77,106,0.3)",animation:"ping 1.5s ease-out infinite"}}/>}<div style={{width:14,height:14,borderRadius:"50%",background:"#FF4D6A",boxShadow:"0 0 0 3px rgba(255,77,106,0.2)"}}/></div><div><p className="mono" style={{fontSize:15,color:TEXT}}>{l.coords}</p><p style={{color:MUTED,fontSize:12,marginTop:3}}>{l.place}</p><p style={{color:GOLD,fontSize:11,marginTop:2}}>{l.time}</p></div></div>{l.battery&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{[["Speed",l.speed],["Accuracy",l.accuracy],["Battery",l.battery]].map(([k,v])=>(<div key={k} style={{padding:"6px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8}}><p style={{fontSize:9,color:MUTED,marginBottom:2}}>{k}</p><p className="mono" style={{fontSize:12,color:GOLD}}>{v}</p></div>))}</div>}</div>))}</div>);}
    return null;
  };

  return(<div style={{paddingTop:70}}>
    <div style={{background:"linear-gradient(90deg,rgba(201,168,76,0.12),rgba(201,168,76,0.04))",borderBottom:"1px solid rgba(201,168,76,0.2)",padding:"11px 24px",textAlign:"center"}}>
      <p style={{fontSize:12,color:"#A8B0C2"}}><span className="tag tg" style={{marginRight:10}}>DEMO MODE</span>All data is simulated. <button onClick={()=>sp("pricing")} style={{color:GOLD,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Activate a plan →</button> to sync your real devices.</p>
    </div>
    <div style={{display:"flex",height:"calc(100vh - 114px)"}}>
      <div className="sb">
        <div style={{padding:"13px 20px 16px",borderBottom:"1px solid rgba(201,168,76,0.1)",marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span className="dot on ap"/><span className="raj" style={{fontSize:11,color:GOLD,fontWeight:700}}>DEMO — Simulated</span></div><p style={{fontSize:11,color:MUTED}}>Primary → iPhone 15 Pro</p><p style={{fontSize:11,color:MUTED}}>Mirror → Samsung S24</p></div>
        {TABS.map(t=>(<button key={t.id} className={`sl${tab===t.id?" active":""}`} onClick={()=>{setTab(t.id);setSub(t.subs[0]);}}><I n={t.ic} sz={14}/><span style={{flex:1}}>{t.lb}</span></button>))}
        <div style={{padding:"14px 11px",marginTop:8,borderTop:"1px solid rgba(201,168,76,0.1)"}}><button className="btn-gold" style={{width:"100%",justifyContent:"center",padding:"9px",fontSize:12}} onClick={()=>sp("pricing")}><I n="zap" sz={13}/>Activate Plan</button></div>
      </div>
      <div style={{flex:1,overflow:"auto",background:DARK,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><h2 className="raj" style={{fontSize:20,fontWeight:700}}>{TABS.find(t=>t.id===tab)?.lb}</h2><p style={{color:MUTED,fontSize:12}}>Simulated demo data</p></div>
          <span className="tag tg"><span className="dot on" style={{width:6,height:6}}/> Live Demo</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          {TABS.find(t=>t.id===tab)?.subs.map(s=>(<button key={s} className={`subtab${sub===s?" active":""}`} onClick={()=>setSub(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>))}
        </div>
        {renderItems()}
      </div>
    </div>
  </div>);
};

// ── CONNECT SCREEN ───────────────────────────────────────────
const Connect=({user,onDone})=>{
  const[pid,setPid]=useState("");
  const[st,setSt]=useState("idle");
  const[prog,setProg]=useState(0);
  const[msg,setMsg]=useState("");
  const[err,setErr]=useState("");
  const[shk,setShk]=useState(false);
  const ref=useRef(null);

  const myId=user?"TC-"+String(Math.abs(user.email.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%900)+100)+"-724":"TC-000-000";

  const statusMsgs=[[5,"Locating device..."],[20,"Establishing encrypted tunnel..."],[38,"Authenticating partner device..."],[55,"Verifying Partner ID..."],[70,"Syncing device registry..."],[85,"Loading device profile..."],[95,"Finalising connection..."],[100,"Connected successfully!"]];

  const fmt=v=>{const r=v.replace(/[^A-Za-z0-9-]/g,"").toUpperCase().slice(0,10);return r;};

  const connect=()=>{
    const clean=pid.trim().toUpperCase();
    if(!clean){setErr("Please enter your Partner ID.");return;}
    if(!VALID_IDS.includes(clean)){
      setErr("❌ Incorrect Partner ID. Please contact support.");
      setShk(true);
      setTimeout(()=>setShk(false),500);
      return;
    }
    setErr("");setSt("connecting");setProg(0);
    let cur=0;
    ref.current=setInterval(()=>{
      cur+=Math.random()*3.5+1;
      if(cur>=100){cur=100;clearInterval(ref.current);setProg(100);setMsg("Connected successfully!");setTimeout(()=>setSt("connected"),700);}
      else{setProg(Math.floor(cur));const m=[...statusMsgs].reverse().find(([p])=>cur>=p);if(m)setMsg(m[1]);}
    },110);
  };

  return(<div style={{minHeight:"calc(100vh - 68px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:DARK}}>
    <div style={{width:"100%",maxWidth:500}}>
      {st==="idle"&&(<div className={`glass glow-gold au${shk?" shake":""}`} style={{padding:44,borderColor:"rgba(201,168,76,0.3)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:17,background:"linear-gradient(135deg,#9A7B2F,#F0D080)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}><I n="link" sz={28} c={DARK}/></div>
          <h2 className="raj" style={{fontSize:26,fontWeight:700,marginBottom:7}}>Connect Your Device</h2>
          <p style={{color:MUTED,fontSize:14,lineHeight:1.65}}>Enter the <strong style={{color:GOLD}}>Partner ID</strong> issued to your second device by TrustCo Tech admin.</p>
        </div>
        <div style={{background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:11,padding:"13px 17px",marginBottom:26,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><p style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:".08em",marginBottom:4}}>Your Partner ID (this device)</p><p className="mono" style={{fontSize:19,fontWeight:500,color:GOLD,letterSpacing:5}}>{myId}</p></div>
          <div style={{position:"relative"}}><span className="dot on ap"/></div>
        </div>
        <div style={{marginBottom:8}}>
          <label style={{fontSize:12,color:"#A8B0C2",marginBottom:9,display:"block",fontWeight:500}}>Second device Partner ID</label>
          <input className={`pid${err?" err":""}`} placeholder="TC-XXX-XXX" value={pid} onChange={e=>{setErr("");setPid(fmt(e.target.value));}} onKeyDown={e=>e.key==="Enter"&&connect()} maxLength={12}/>
        </div>
        {err&&(<div style={{padding:"10px 14px",background:"rgba(255,77,106,0.08)",border:"1px solid rgba(255,77,106,0.2)",borderRadius:9,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <I n="x" sz={14} c="#FF4D6A"/>
          <div>
            <p style={{color:"#FF4D6A",fontSize:13,fontWeight:600}}>{err}</p>
            <a href={FB_LINK} target="_blank" rel="noreferrer" style={{color:GOLD,fontSize:12,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,marginTop:4}}>
              <I n="headphones" sz={12} c={GOLD}/>Contact Support on Facebook
            </a>
          </div>
        </div>)}
        <p style={{fontSize:12,color:MUTED,marginBottom:16,textAlign:"center"}}>
          Don't know your Partner ID?{" "}
          <a href={FB_LINK} target="_blank" rel="noreferrer" style={{color:GOLD,textDecoration:"none",fontWeight:600}}>Contact support</a>
        </p>
        <button className="btn-gold" style={{width:"100%",justifyContent:"center",fontSize:15,padding:"14px"}} onClick={connect} disabled={pid.length<5}>
          <I n="link" sz={17}/>Remote Access
        </button>
        <p style={{textAlign:"center",fontSize:11,color:MUTED,marginTop:12}}><I n="shield" sz={11} c={MUTED}/> Admin-issued IDs only · End-to-end encrypted</p>
      </div>)}

      {st==="connecting"&&(<div className="glass au" style={{padding:44,textAlign:"center",borderColor:"rgba(201,168,76,0.25)"}}>
        <div style={{position:"relative",width:84,height:84,margin:"0 auto 26px"}}><div style={{width:84,height:84,borderRadius:"50%",border:"3px solid rgba(201,168,76,0.12)",position:"absolute"}}/><div style={{width:84,height:84,borderRadius:"50%",border:"3px solid transparent",borderTopColor:GOLD,position:"absolute",animation:"spin 1s linear infinite"}}/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span className="raj" style={{fontSize:18,fontWeight:700,color:GOLD}}>{prog}%</span></div></div>
        <h3 className="raj" style={{fontSize:22,fontWeight:700,marginBottom:7}}>{prog<100?"Connecting...":"Connected!"}</h3>
        <p style={{color:MUTED,fontSize:13,marginBottom:26,minHeight:18}}>{msg}</p>
        <div style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,marginBottom:7}}><span>Your Device</span><span>Partner Device</span></div><div className="sr"><div className="sp"/><div className="sp"/><div className="sp"/></div></div>
        <div className="pb"><div className="pf" style={{width:`${prog}%`}}/></div>
        <p style={{fontSize:11,color:prog===100?"#00C878":MUTED,marginTop:7}}>{prog}% {prog<100?"establishing secure connection":"✓ connection established"}</p>
      </div>)}

      {st==="connected"&&(<div className="glass au" style={{padding:44,textAlign:"center",borderColor:"rgba(0,200,120,0.3)"}}>
        <div style={{width:68,height:68,borderRadius:"50%",background:"rgba(0,200,120,0.1)",border:"2px solid rgba(0,200,120,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",color:"#00C878"}}><I n="check" sz={30}/></div>
        <h3 className="raj" style={{fontSize:26,fontWeight:700,marginBottom:7}}>Device Connected!</h3>
        <p style={{color:MUTED,marginBottom:5}}>Secure tunnel established to</p>
        <p className="mono" style={{fontSize:19,color:GOLD,letterSpacing:5,marginBottom:28}}>{pid}</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:28}}>{[["Ping","22ms","#00C878"],["Encryption","AES-256",GOLD],["Signal","Excellent",SILVER]].map(([l,v,c])=>(<div key={l} style={{padding:"11px 7px",background:"rgba(255,255,255,0.03)",borderRadius:9,border:"1px solid rgba(255,255,255,0.06)"}}><p style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{l}</p><p className="mono" style={{fontSize:12,color:c,fontWeight:600}}>{v}</p></div>))}</div>
        <button className="btn-gold" style={{width:"100%",justifyContent:"center",fontSize:15,padding:"14px"}} onClick={onDone}><I n="eye" sz={17}/>View Device Activity</button>
        <button onClick={()=>{setSt("idle");setPid("");}} style={{marginTop:11,background:"none",border:"none",cursor:"pointer",color:MUTED,fontSize:12}}>← Disconnect</button>
      </div>)}
    </div>
  </div>);
};

// ── ACTIVITY DASHBOARD ───────────────────────────────────────
const Activity=({user,onDisc,setPM})=>{
  const[tab,setTab]=useState("calls");
  const[sub,setSub]=useState("all");
  const act=user?.activated;

  const DATA={
    calls:{received:[{name:"Mom",num:"+1(555)234-7890",dur:"4m 32s",time:"Today, 10:24 AM"},{name:"Sarah Chen",num:"+1(555)332-9981",dur:"12m 18s",time:"Yesterday, 7:30 PM"}],incoming:[{name:"Jake Williams",num:"+1(555)876-4521",dur:"1m 05s",time:"Today, 09:15 AM"}],missed:[{name:"Office HR",num:"+1(555)100-2200",dur:"—",time:"Today, 08:47 AM"}]},
    sms:{received:[{from:"Mom",prev:"Don't forget dinner! 😊",time:"10:31 AM"},{from:"Sarah Chen",prev:"Can you send me that file?",time:"Yesterday"}],sent:[{from:"Jake Williams",prev:"Sounds good, see you at 7!",time:"9:20 AM"}]},
    whatsapp:{received:[{from:"Mom 💚",prev:"Are you home yet?",time:"10:45 AM",av:"M"},{from:"Family 👨‍👩‍👧",prev:"Dad: We're leaving at 5",time:"Yesterday",av:"F"}],sent:[{from:"Jake 💚",prev:"Haha no way 😂",time:"9:55 AM",av:"J"}],groups:[{from:"Family Group",prev:"See you Sunday!",time:"Yesterday",av:"F"}]},
    instagram:{received:[{from:"jamie_photos",prev:"Loved your post! 🔥",time:"2h ago"}],sent:[{from:"travel.with.anna",prev:"Thanks for the tag!",time:"Yesterday"}]},
    facebook:{received:[{from:"Robert Park",prev:"Coming to the event?",time:"3h ago"}],sent:[{from:"Emma Johnson",prev:"Happy birthday! 🎂",time:"Yesterday"}]},
    photos:{all:[{n:"IMG_2041.jpg",s:"3.2 MB",d:"Today",c:GOLD},{n:"IMG_2040.jpg",s:"2.8 MB",d:"Today",c:SILVER}],camera:[{n:"IMG_2041.jpg",s:"3.2 MB",d:"Today",c:GOLD}],screenshots:[{n:"Screen_001.jpg",s:"1.1 MB",d:"Today",c:SILVER}]},
    videos:{all:[{n:"VID_0291.mp4",s:"48 MB",d:"Yesterday",c:"#FF4D6A"}],recorded:[{n:"VID_0291.mp4",s:"48 MB",d:"Yesterday",c:"#FF4D6A"}],downloaded:[{n:"VID_0290.mp4",s:"112 MB",d:"Mon",c:GOLD}]},
    contacts:{all:[{name:"Mom",ph:"+1 555 234 7890",em:"mom@family.com",tg:"Family"},{name:"Sarah Chen",ph:"+1 555 332 9981",em:"sarah@work.com",tg:"Work"}],favorites:[{name:"Mom",ph:"+1 555 234 7890",em:"mom@family.com",tg:"Family"}],recent:[{name:"Sarah Chen",ph:"+1 555 332 9981",em:"sarah@work.com",tg:"Work"}]},
    location:{live:[{coords:"37.7749° N, 122.4194° W",place:"San Francisco, CA",time:"Just now",battery:"73%",speed:"0 km/h",accuracy:"±5m"}],history:[{coords:"37.7751° N, 122.4182° W",place:"Near Union Square",time:"2h ago"}]},
  };

  const TABS=[
    {id:"calls",lb:"Call Log",ic:"phone",lk:false,subs:["all","received","incoming","missed"]},
    {id:"sms",lb:"SMS",ic:"msg",lk:false,subs:["all","received","sent"]},
    {id:"whatsapp",lb:"WhatsApp",ic:"whatsapp",lk:false,subs:["all","received","sent","groups"]},
    {id:"instagram",lb:"Instagram",ic:"instagram",lk:!act,subs:["all","received","sent"]},
    {id:"facebook",lb:"Facebook",ic:"facebook",lk:!act,subs:["all","received","sent"]},
    {id:"photos",lb:"Photos",ic:"img",lk:!act,subs:["all","camera","screenshots"]},
    {id:"videos",lb:"Videos",ic:"video",lk:!act,subs:["all","recorded","downloaded"]},
    {id:"contacts",lb:"Contacts",ic:"users",lk:!act,subs:["all","favorites","recent"]},
    {id:"location",lb:"Live Location",ic:"map",lk:!act,subs:["live","history"]},
  ];

  const cur=TABS.find(t=>t.id===tab);

  const getItems=()=>{
    const d=DATA[tab];if(!d)return[];
    if(sub==="all"){const all=Object.values(d).flat();const seen=new Set();return all.filter(item=>{const k=JSON.stringify(item);if(seen.has(k))return false;seen.add(k);return true;});}
    return d[sub]||[];
  };

  const renderItems=()=>{
    const items=getItems();
    if(tab==="calls"){return(<div className="glass" style={{overflow:"auto"}}><table className="tbl"><thead><tr><th></th><th>Contact</th><th>Number</th><th>Type</th><th>Duration</th><th>Time</th></tr></thead><tbody>{items.map((c,i)=>(<tr key={i}><td style={{fontSize:16}}>{sub==="missed"?"❌":sub==="incoming"?"📤":"📞"}</td><td style={{color:TEXT,fontWeight:600}}>{c.name}</td><td className="mono" style={{fontSize:11}}>{c.num}</td><td><span className={`tag ${sub==="received"||sub==="all"?"tgg":sub==="missed"?"tgr":"tgb"}`}>{sub==="all"?"received":sub}</span></td><td>{c.dur||"—"}</td><td style={{fontSize:11}}>{c.time}</td></tr>))}</tbody></table></div>);}
    if(["sms","whatsapp","instagram","facebook"].includes(tab)){const bgMap={whatsapp:"linear-gradient(135deg,#25D366,#128C7E)",instagram:"linear-gradient(135deg,#E1306C,#833AB4)",facebook:"#1877F2"};const bg=bgMap[tab]||`linear-gradient(135deg,${GOLD},#9A7B2F)`;return(<div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map((m,i)=>(<div key={i} className="glass" style={{padding:"13px 17px",display:"flex",gap:12,alignItems:"center",cursor:"pointer"}}><div style={{width:40,height:40,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,flexShrink:0}}>{(m.av||m.from[0]).toUpperCase()}</div><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600,fontSize:14}}>{m.from}</span><span style={{fontSize:11,color:MUTED}}>{m.time}</span></div><p style={{color:MUTED,fontSize:12,marginTop:2}}>{m.prev}</p></div><span className={`tag ${sub==="sent"?"tgb":"tgg"}`} style={{fontSize:9}}>{sub==="all"?"msg":sub}</span></div>))}</div>);}
    if(["photos","videos"].includes(tab)){return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>{items.map((p,i)=>(<div key={i} className="glass" style={{padding:0,overflow:"hidden",borderRadius:13,cursor:"pointer"}}><div style={{height:100,background:`linear-gradient(135deg,${p.c}33,${p.c}11)`,display:"flex",alignItems:"center",justifyContent:"center"}}><I n={tab==="videos"?"video":"img"} sz={28} c={p.c}/></div><div style={{padding:"9px 11px"}}><p style={{fontSize:11,fontWeight:600,color:TEXT}}>{p.n}</p><p style={{fontSize:10,color:MUTED}}>{p.s} · {p.d}</p></div></div>))}</div>);}
    if(tab==="contacts"){return(<div className="glass" style={{overflow:"auto"}}><table className="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Tag</th></tr></thead><tbody>{items.map((c,i)=>(<tr key={i}><td style={{color:TEXT,fontWeight:600}}>{c.name}</td><td className="mono" style={{fontSize:11}}>{c.ph}</td><td style={{fontSize:12}}>{c.em}</td><td><span className={`tag ${c.tg==="Family"?"tgg":c.tg==="Work"?"tgb":"tg"}`}>{c.tg}</span></td></tr>))}</tbody></table></div>);}
    if(tab==="location"){return(<div style={{display:"flex",flexDirection:"column",gap:12}}>{items.map((l,i)=>(<div key={i} className="glass" style={{padding:24}}><div style={{display:"flex",gap:16,alignItems:"center",marginBottom:l.battery?16:0}}><div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:24,flexShrink:0}}>{i===0&&<div style={{position:"absolute",width:28,height:28,borderRadius:"50%",border:"2px solid rgba(255,77,106,0.3)",animation:"ping 1.5s ease-out infinite"}}/>}<div style={{width:12,height:12,borderRadius:"50%",background:"#FF4D6A",boxShadow:"0 0 0 3px rgba(255,77,106,0.2)"}}/></div><div><p className="mono" style={{fontSize:14,color:TEXT}}>{l.coords}</p><p style={{color:MUTED,fontSize:12,marginTop:2}}>{l.place}</p><p style={{color:GOLD,fontSize:11,marginTop:2}}>{l.time}</p></div></div>{l.battery&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{[["Speed",l.speed],["Accuracy",l.accuracy],["Battery",l.battery]].map(([k,v])=>(<div key={k} style={{padding:"6px 12px",background:"rgba(255,255,255,0.04)",borderRadius:8}}><p style={{fontSize:9,color:MUTED,marginBottom:2}}>{k}</p><p className="mono" style={{fontSize:12,color:GOLD}}>{v}</p></div>))}</div>}</div>))}</div>);}
    return null;
  };

  return(<div style={{display:"flex",height:"calc(100vh - 70px)"}}>
    <div className="sb">
      <div style={{padding:"13px 20px 17px",borderBottom:"1px solid rgba(201,168,76,0.1)",marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span className="dot on ap"/><span className="raj" style={{fontSize:11,color:"#00C878",fontWeight:700}}>CONNECTED</span></div><p style={{fontSize:13,color:TEXT,fontWeight:600}}>Partner Device</p><p className="mono" style={{fontSize:10,color:GOLD,marginTop:2}}>Active Session</p></div>
      {TABS.map(t=>(<button key={t.id} className={`sl${tab===t.id?" active":""}`} onClick={()=>{setTab(t.id);setSub(t.subs[0]);}}><I n={t.ic} sz={14} c={t.lk?"#2A3050":undefined}/><span style={{flex:1,color:t.lk?"#2A3050":undefined}}>{t.lb}</span>{t.lk&&<I n="lock" sz={12} c={GOLD}/>}</button>))}
      <div style={{padding:"14px 11px",marginTop:8,borderTop:"1px solid rgba(201,168,76,0.1)"}}>
        {!act?(<button className="btn-gold" style={{width:"100%",justifyContent:"center",padding:"9px",fontSize:12}} onClick={()=>setPM(true)}><I n="zap" sz={13}/>Activate Full Access</button>):(<div className="tag tgg" style={{justifyContent:"center",width:"100%",padding:"7px"}}>✓ Full Access Active</div>)}
        <button onClick={onDisc} style={{width:"100%",marginTop:9,background:"rgba(255,77,106,0.08)",color:"#FF4D6A",border:"1px solid rgba(255,77,106,0.18)",padding:"8px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",gap:5,alignItems:"center",justifyContent:"center"}}><I n="x" sz={12}/>Disconnect</button>
      </div>
    </div>
    <div style={{flex:1,overflow:"auto",background:DARK,position:"relative"}}>
      {cur?.lk&&(<div className="lo"><div style={{width:68,height:68,borderRadius:"50%",background:"rgba(201,168,76,0.08)",border:"2px solid rgba(201,168,76,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}><I n="lock" sz={30} c={GOLD}/></div><h3 className="raj" style={{fontSize:22,fontWeight:700,textAlign:"center"}}>{cur.lb} is Locked</h3><p style={{color:MUTED,fontSize:13,textAlign:"center",maxWidth:290,lineHeight:1.65}}>Activate a TrustCo Tech plan to unlock {cur.lb}.</p><button className="btn-gold" onClick={()=>setPM(true)}><I n="zap" sz={15}/>Activate — from $100</button><a href={FB_LINK} target="_blank" rel="noreferrer" style={{color:GOLD,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:6}}><I n="headphones" sz={14} c={GOLD}/>Contact Support</a></div>)}
      <div style={{padding:26}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><h2 className="raj" style={{fontSize:20,fontWeight:700}}>{cur?.lb}</h2><p style={{color:MUTED,fontSize:12}}>Forwarded from partner device</p></div>
          <span className="tag tgg"><span className="dot on" style={{width:6,height:6}}/> Live</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
          {cur?.subs.map(s=>(<button key={s} className={`subtab${sub===s?" active":""}`} onClick={()=>setSub(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>))}
        </div>
        {!cur?.lk&&renderItems()}
      </div>
    </div>
  </div>);
};

// ── PAYMENT MODAL ─────────────────────────────────────────────
const PayModal=({onClose,onOk})=>{
  const[plan,setPlan]=useState(null);
  const[meth,setMeth]=useState(null);
  const[gc,setGc]=useState(null);
  const[cp,setCp]=useState("");
  const copy=(txt,k)=>{try{navigator.clipboard.writeText(txt);}catch(e){}setCp(k);setTimeout(()=>setCp(""),2500);};
  const gcs=[{name:"Razer Gold",em:"🟢",ins:"Purchase a Razer Gold Gift Card of the exact plan amount, scratch to reveal the PIN, then email the code to trustcotech0@gmail.com for verification."},{name:"Steam",em:"🎮",ins:"Purchase a Steam Gift Card of the exact plan amount, scratch to reveal the code, then email it to trustcotech0@gmail.com for verification."},{name:"Apple Gift Card",em:"🍎",ins:"Purchase an Apple Gift Card of the exact plan amount, scratch to reveal the code, then email it to trustcotech0@gmail.com for verification."}];
  return(<div className="mo" onClick={onClose}><div className="md" onClick={e=>e.stopPropagation()} style={{maxWidth:580}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}><div><h3 className="raj" style={{fontSize:24,fontWeight:700,marginBottom:3}}>Activate Full Access</h3><p style={{color:MUTED,fontSize:13}}>Choose your plan and payment method</p></div><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:MUTED}}><I n="x" sz={21}/></button></div>
    <p className="raj" style={{fontSize:12,color:GOLD,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>Step 1 — Choose Plan</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:20}}>
      {[{name:"6 Months",price:100,ft:["All 9 streams","2 devices","Email support"]},{name:"2 Years",price:300,best:true,ft:["All 9 streams","5 devices","Priority support","Free updates"]}].map(p=>(<div key={p.name} className={`pc${plan===p.name?" sel":""}`} onClick={()=>setPlan(p.name)}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{plan===p.name&&<div style={{width:6,height:6,borderRadius:"50%",background:GOLD}}/>}</div><span className="raj" style={{fontWeight:700,fontSize:15}}>{p.name}</span></div>{p.best&&<span className="tag tg" style={{fontSize:9}}>BEST</span>}</div><p className="raj" style={{fontSize:26,fontWeight:700,color:GOLD,marginBottom:3}}>${p.price}</p>{p.ft.map(f=>(<div key={f} style={{display:"flex",gap:5,marginBottom:3}}><I n="check" sz={11} c="#00C878"/><span style={{fontSize:11,color:"#A8B0C2"}}>{f}</span></div>))}</div>))}
    </div>
    <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent)",margin:"16px 0"}}/>
    <p className="raj" style={{fontSize:12,color:GOLD,textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>Step 2 — Payment Method</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
      {[{id:"giftcard",lb:"Gift Card",em:"🎁"},{id:"crypto",lb:"Cryptocurrency",em:"₿"}].map(m=>(<div key={m.id} onClick={()=>{setMeth(m.id);setGc(null);}} style={{padding:"13px 14px",borderRadius:11,border:`2px solid ${meth===m.id?GOLD:"rgba(201,168,76,0.15)"}`,background:meth===m.id?"rgba(201,168,76,0.08)":"rgba(255,255,255,0.02)",cursor:"pointer",transition:"all .2s",textAlign:"center"}}><div style={{fontSize:22,marginBottom:5}}>{m.em}</div><p className="raj" style={{fontWeight:700,fontSize:14}}>{m.lb}</p></div>))}
    </div>
    {meth==="giftcard"&&(<div style={{marginBottom:16}}>{gcs.map(g=>(<div key={g.name} className={`gc${gc===g.name?" sel":""}`} style={{marginBottom:9}} onClick={()=>setGc(g.name)}><div style={{display:"flex",alignItems:"center",gap:11}}><div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${GOLD}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{gc===g.name&&<div style={{width:6,height:6,borderRadius:"50%",background:GOLD}}/>}</div><span style={{fontSize:18}}>{g.em}</span><span className="raj" style={{fontWeight:700,fontSize:14}}>{g.name}</span></div>{gc===g.name&&(<div style={{marginTop:11,padding:"11px 14px",background:"rgba(201,168,76,0.06)",borderRadius:9,border:"1px solid rgba(201,168,76,0.15)"}}><p style={{fontSize:12,color:"#A8B0C2",lineHeight:1.7,marginBottom:10}}>{g.ins}</p><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><I n="mail" sz={13} c={GOLD}/><span className="mono" style={{fontSize:11,color:GOLD}}>trustcotech0@gmail.com</span><button className="btn-sm" onClick={()=>copy("trustcotech0@gmail.com","em")}><I n="copy" sz={11}/>{cp==="em"?"Copied!":"Copy"}</button></div><p style={{fontSize:10,color:MUTED,marginTop:8}}>Subject: "{plan} Gift Card — {g.name}"</p></div>)}</div>))}</div>)}
    {meth==="crypto"&&(<div style={{marginBottom:16}}><p style={{fontSize:12,color:MUTED,marginBottom:11}}>Send exact amount, then email TX ID to <span style={{color:GOLD}}>trustcotech0@gmail.com</span></p>
      <div className="wb" style={{marginBottom:10}} onClick={()=>copy("bc1qrap03ecs3kgnxjfdxqw6neukn5eu6hj5ejqp8j","btc")}><div style={{display:"flex",alignItems:"center",gap:11,marginBottom:8}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(247,147,26,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:16}}>₿</span></div><div><p className="raj" style={{fontWeight:700,fontSize:14}}>Bitcoin (BTC)</p><p style={{fontSize:10,color:MUTED}}>Click to copy</p></div><div style={{marginLeft:"auto"}}><span className="tag tg" style={{fontSize:9}}>{cp==="btc"?"✓ Copied!":"Copy"}</span></div></div><p className="mono" style={{fontSize:10,color:GOLD,wordBreak:"break-all",lineHeight:1.6}}>bc1qrap03ecs3kgnxjfdxqw6neukn5eu6hj5ejqp8j</p></div>
      <div className="wb" onClick={()=>copy("TYxJnSECJnvieATcibeRpGmHEEXnv8wd8E","usdt")}><div style={{display:"flex",alignItems:"center",gap:11,marginBottom:8}}><div style={{width:32,height:32,borderRadius:8,background:"rgba(38,161,123,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:14,fontWeight:700,color:"#26A17B"}}>₮</span></div><div><p className="raj" style={{fontWeight:700,fontSize:14}}>USDT TRC-20</p><p style={{fontSize:10,color:MUTED}}>Click to copy</p></div><div style={{marginLeft:"auto"}}><span className="tag tgg" style={{fontSize:9}}>{cp==="usdt"?"✓ Copied!":"Copy"}</span></div></div><p className="mono" style={{fontSize:10,color:"#26A17B",wordBreak:"break-all",lineHeight:1.6}}>TYxJnSECJnvieATcibeRpGmHEEXnv8wd8E</p></div>
      <p style={{fontSize:11,color:MUTED,marginTop:10,lineHeight:1.7}}>Subject: "<strong>{plan||"Plan"} Crypto Payment</strong>" · Activated within 1–3 hours.</p>
    </div>)}
    {(meth==="giftcard"&&gc||meth==="crypto")&&plan?(<button className="btn-gold" style={{width:"100%",justifyContent:"center",fontSize:15,marginTop:4}} onClick={()=>{onOk();onClose();}}><I n="check" sz={16}/>{meth==="giftcard"?`I've sent the ${gc} code →`:"I've sent the crypto payment →"}</button>):(<button className="btn-gold" style={{width:"100%",justifyContent:"center",fontSize:15,opacity:.4}} disabled>Select plan and payment method above</button>)}
    <p style={{textAlign:"center",fontSize:11,color:MUTED,marginTop:11}}>🔒 Manual verification · Activation 1–3 hours · trustcotech0@gmail.com</p>
  </div></div>);
};

// ── DASHBOARD ─────────────────────────────────────────────────
const Dash=({user,setUser,sp})=>{
  const[view,setView]=useState("connect");
  const[pm,setPm]=useState(false);
  return(<div style={{paddingTop:70}}>
    {view==="connect"?<Connect user={user} onDone={()=>setView("activity")}/>:<Activity user={user} onDisc={()=>setView("connect")} setPM={setPm}/>}
    {pm&&<PayModal onClose={()=>setPm(false)} onOk={()=>setUser(p=>({...p,activated:true,plan:"Premium"}))}/>}
  </div>);
};

// ── AUTH PAGES ─────────────────────────────────────────────────
const Login=({sp,su})=>{
  const[f,setF]=useState({e:"",p:""});
  const go=()=>{if(f.e&&f.p){su({name:"Alex Johnson",email:f.e,plan:"Free",activated:false});sp("dashboard");}};
  return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{width:"100%",maxWidth:410}}>
    <div style={{textAlign:"center",marginBottom:32}}><div style={{display:"flex",justifyContent:"center",marginBottom:14}}><Logo sz={52}/></div><h1 className="raj" style={{fontSize:26,fontWeight:700,marginBottom:5}}>Welcome Back</h1><p style={{color:MUTED}}>Sign in to your TrustCo Tech account</p></div>
    <div className="glass" style={{padding:34}}>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:18}}>
        <div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Email</label><input className="inp" type="email" placeholder="you@email.com" value={f.e} onChange={e=>setF({...f,e:e.target.value})}/></div>
        <div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Password</label><input className="inp" type="password" placeholder="••••••••" value={f.p} onChange={e=>setF({...f,p:e.target.value})} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
      </div>
      <button className="btn-gold" style={{width:"100%",justifyContent:"center",marginBottom:14}} onClick={go}>Sign In <I n="arrow" sz={15}/></button>
      <p style={{textAlign:"center",fontSize:12,color:MUTED}}>No account? <button onClick={()=>sp("register")} style={{color:GOLD,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Sign up free</button></p>
    </div>
  </div></div>);
};

const Reg=({sp,su})=>{
  const[f,setF]=useState({n:"",e:"",p:""});
  const[ok,setOk]=useState(false);
  const go=()=>{if(f.n&&f.e&&f.p&&ok){su({name:f.n,email:f.e,plan:"Free",activated:false});sp("dashboard");}};
  return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{width:"100%",maxWidth:430}}>
    <div style={{textAlign:"center",marginBottom:28}}><div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Logo sz={48}/></div><h1 className="raj" style={{fontSize:24,fontWeight:700,marginBottom:5}}>Create Account</h1><p style={{color:MUTED}}>Join TrustCo Tech — free to start</p></div>
    <div className="glass" style={{padding:34}}>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:18}}>
        {[["n","Full name","text"],["e","Email address","email"],["p","Password","password"]].map(([k,ph,t])=>(<div key={k}><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>{ph}</label><input className="inp" type={t} placeholder={ph} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></div>))}
        <div style={{padding:13,background:"rgba(201,168,76,0.05)",borderRadius:9,border:"1px solid rgba(201,168,76,0.15)"}}><div style={{display:"flex",gap:9,alignItems:"flex-start"}}><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)} style={{marginTop:3}}/><label style={{fontSize:12,color:"#A8B0C2",cursor:"pointer",lineHeight:1.65}} onClick={()=>setOk(!ok)}>I confirm both devices belong to me and agree to the Terms & Privacy Policy.</label></div></div>
      </div>
      <button className="btn-gold" style={{width:"100%",justifyContent:"center",marginBottom:14,opacity:ok?1:.5}} onClick={go}>Create Account <I n="arrow" sz={15}/></button>
      <p style={{textAlign:"center",fontSize:12,color:MUTED}}>Have an account? <button onClick={()=>sp("login")} style={{color:GOLD,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>Sign in</button></p>
    </div>
  </div></div>);
};

// ── OTHER PAGES ───────────────────────────────────────────────
const Feat=({sp})=>(<div style={{paddingTop:100}}><div className="ct" style={{padding:"56px 24px"}}><div style={{textAlign:"center",marginBottom:52}}><div className="ew" style={{justifyContent:"center"}}>Features</div><h1 className="raj" style={{fontSize:"clamp(28px,5vw,50px)",fontWeight:700,marginBottom:10}}>9 data streams. One connection.</h1></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(265px,1fr))",gap:16}}>{[{ic:"phone",cl:"#6C63FF",t:"Call Logs",fr:true,d:"Full call history — received, incoming & missed calls in real time."},{ic:"msg",cl:GOLD,t:"SMS Messages",fr:true,d:"Received and sent messages forwarded instantly."},{ic:"whatsapp",cl:"#25D366",t:"WhatsApp",fr:true,d:"Messages, media, voice notes and groups synced."},{ic:"instagram",cl:"#E1306C",t:"Instagram DMs",fr:false,d:"Received and sent Instagram messages mirrored."},{ic:"facebook",cl:"#1877F2",t:"Facebook Messages",fr:false,d:"Received and sent Messenger conversations forwarded."},{ic:"img",cl:GOLD,t:"Photos",fr:false,d:"All photos, camera shots and screenshots synced."},{ic:"video",cl:SILVER,t:"Videos",fr:false,d:"Recorded and downloaded videos synced automatically."},{ic:"users",cl:"#00C878",t:"Contacts",fr:false,d:"All contacts, favorites and recent in sync."},{ic:"map",cl:"#FF4D6A",t:"Live Location",fr:false,d:"Live and historical GPS location between your devices."}].map(f=>(<div key={f.t} className="glass c3d" style={{padding:24}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:13}}><div style={{width:42,height:42,borderRadius:11,background:f.cl+"15",display:"flex",alignItems:"center",justifyContent:"center",color:f.cl}}><I n={f.ic} sz={19}/></div>{f.fr?<span className="tag tgg" style={{fontSize:9}}>Free</span>:<span className="tag tg" style={{fontSize:9}}>Premium</span>}</div><h3 className="raj" style={{fontSize:16,fontWeight:700,marginBottom:7}}>{f.t}</h3><p style={{color:MUTED,fontSize:12,lineHeight:1.7}}>{f.d}</p></div>))}</div><div style={{textAlign:"center",marginTop:44}}><button className="btn-gold" style={{fontSize:15,padding:"14px 32px"}} onClick={()=>sp("pricing")}>View Pricing <I n="arrow" sz={15}/></button></div></div></div>);

const Pricing=({sp})=>{
  const[pm,setPm]=useState(false);
  return(<div style={{paddingTop:100}}><div className="ct" style={{padding:"56px 24px"}}><div style={{textAlign:"center",marginBottom:44}}><div className="ew" style={{justifyContent:"center"}}>Pricing</div><h1 className="raj" style={{fontSize:"clamp(28px,5vw,50px)",fontWeight:700,marginBottom:10}}>Pay once, sync forever</h1><p style={{color:MUTED,fontSize:16}}>No subscriptions. One payment activates your licence.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:24,maxWidth:740,margin:"0 auto 36px"}}>{[{name:"6 Months",price:100,period:"6-month licence",ft:["All 9 data streams","2 devices linked","Calls, SMS & WhatsApp","Instagram & Facebook","Photos, Videos & Contacts","Live Location","Email support"]},{name:"2 Years",price:300,period:"2-year licence",best:true,ft:["All 9 data streams","Up to 5 devices","Everything in 6 months","Priority 24/7 support","Free app updates","Early feature access"]}].map(p=>(<div key={p.name} className={`glass c3d${p.best?" glow-gold":""}`} style={{padding:34,display:"flex",flexDirection:"column",position:"relative",borderColor:p.best?"rgba(201,168,76,0.4)":undefined}}>{p.best&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(90deg,#9A7B2F,#F0D080)",color:DARK,padding:"4px 17px",borderRadius:20,fontSize:10,fontWeight:700,fontFamily:"Rajdhani",letterSpacing:".1em"}}>BEST VALUE</div>}<p className="raj" style={{fontSize:19,fontWeight:700,color:GOLD,marginBottom:4}}>{p.name}</p><p className="raj" style={{fontSize:48,fontWeight:700,marginBottom:2}}>${p.price}</p><p style={{color:MUTED,fontSize:12,marginBottom:22}}>{p.period}</p><div style={{flex:1,display:"flex",flexDirection:"column",gap:9,marginBottom:24}}>{p.ft.map(f=>(<div key={f} style={{display:"flex",gap:9,alignItems:"center"}}><I n="check" sz={13} c="#00C878"/><span style={{fontSize:13,color:"#A8B0C2"}}>{f}</span></div>))}</div><button className={p.best?"btn-gold":"btn-out"} style={{justifyContent:"center"}} onClick={()=>setPm(true)}>{p.best?"Get 2 Years — $300":"Get 6 Months — $100"}</button></div>))}</div>
  <div className="glass" style={{padding:18,maxWidth:740,margin:"0 auto",textAlign:"center"}}><p style={{color:MUTED,fontSize:13}}>💳 Gift Cards (Razer Gold, Steam, Apple) · ₿ Bitcoin · ₮ USDT TRC-20 · Activation 1–3 hours</p></div>
  </div>{pm&&<PayModal onClose={()=>setPm(false)} onOk={()=>setPm(false)}/>}</div>);
};

const About=()=>(<div style={{paddingTop:100}}><div className="ct" style={{padding:"56px 24px",maxWidth:700}}><div className="ew">Our Story</div><h1 className="raj" style={{fontSize:"clamp(28px,5vw,50px)",fontWeight:700,marginBottom:22}}>Built for people with two phones</h1><p style={{color:"#A8B0C2",fontSize:16,lineHeight:1.8,marginBottom:18}}>TrustCo Tech was built to solve a simple but frustrating problem: you own two phones and constantly have to choose which one to carry because your data is split between them.</p><p style={{color:"#A8B0C2",fontSize:16,lineHeight:1.8,marginBottom:44}}>We built a fast, AES-256 encrypted bridge using admin-issued Partner IDs — similar to how TeamViewer connects computers — so all your data is available on either device instantly. Direct tunnel. No middlemen. No data stored on our servers.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:14}}>{[["2021","Founded"],["580K+","Users"],["99.9%","Uptime"],["9","Streams"]].map(([v,l])=>(<div key={l} className="glass" style={{padding:22,textAlign:"center"}}><p className="raj grad-gold" style={{fontSize:30,fontWeight:700,marginBottom:7}}>{v}</p><p style={{color:MUTED,fontSize:12}}>{l}</p></div>))}</div></div></div>);

const Contact=()=>{
  const[done,setDone]=useState(false);
  return(<div style={{paddingTop:100}}><div className="ct" style={{padding:"56px 24px",maxWidth:580}}><div className="ew">Contact Us</div><h1 className="raj" style={{fontSize:"clamp(24px,4vw,42px)",fontWeight:700,marginBottom:22}}>Get in touch</h1>
  <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>{[["📧","Email","trustcotech0@gmail.com"],["⏰","Response Time","Within 1–3 hours"],["📘","Facebook Support",FB_LINK]].map(([e,l,v])=>(<div key={l} className="glass" style={{padding:"13px 17px",display:"flex",gap:13,alignItems:"center"}}><span style={{fontSize:20}}>{e}</span><div><p style={{fontSize:11,color:MUTED}}>{l}</p>{l==="Facebook Support"?<a href={v} target="_blank" rel="noreferrer" style={{fontWeight:600,color:GOLD,fontSize:14,textDecoration:"none"}}>Message us on Facebook</a>:<p style={{fontWeight:600,color:GOLD,fontSize:14}}>{v}</p>}</div></div>))}</div>
  {done?(<div className="glass" style={{padding:44,textAlign:"center"}}><div style={{width:50,height:50,borderRadius:"50%",background:"rgba(0,200,120,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",color:"#00C878"}}><I n="check" sz={24}/></div><h3 className="raj" style={{fontSize:18,fontWeight:700,marginBottom:7}}>Message sent!</h3><p style={{color:MUTED,fontSize:13}}>We'll reply within 1–3 hours.</p></div>):(<div className="glass" style={{padding:32}}><div style={{display:"flex",flexDirection:"column",gap:12}}>{[["Name","text"],["Email","email"],["Subject","text"]].map(([ph,t])=>(<div key={ph}><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>{ph}</label><input className="inp" type={t} placeholder={ph}/></div>))}<div><label style={{fontSize:11,color:MUTED,marginBottom:5,display:"block"}}>Message</label><textarea className="inp" placeholder="Your message..." rows={5} style={{resize:"vertical"}}/></div><button className="btn-gold" style={{justifyContent:"center"}} onClick={()=>setDone(true)}>Send Message <I n="arrow" sz={15}/></button></div></div>)}
  <div style={{textAlign:"center",marginTop:24}}><a href={FB_LINK} target="_blank" rel="noreferrer"><button className="btn-out" style={{gap:10}}><I n="headphones" sz={15}/>Contact Support on Facebook</button></a></div>
  </div></div>);
};

const Privacy=()=>(<div style={{paddingTop:100}}><div className="ct" style={{padding:"56px 24px",maxWidth:760}}><div className="ew">Legal</div><h1 className="raj" style={{fontSize:"clamp(28px,5vw,48px)",fontWeight:700,marginBottom:8}}>Privacy Policy</h1><p style={{color:MUTED,fontSize:13,marginBottom:40}}>Last updated: January 2025</p>{[{title:"Data We Collect",body:"We collect your name, email address, and account activity data necessary to provide the TrustCo Tech service. We do not collect or store the content of your synced messages, calls, or media files."},{title:"How We Use Your Data",body:"Your data is used solely to manage your account, process payments, and provide customer support. We never sell your data to third parties."},{title:"Data Security",body:"All data is encrypted using AES-256 encryption in transit and at rest. We implement industry-standard security measures to protect your information."},{title:"Your Rights",body:"You may request deletion of your account and associated data at any time by contacting us at trustcotech0@gmail.com. We will process all deletion requests within 30 days."},{title:"Contact",body:"For privacy concerns, contact us at trustcotech0@gmail.com or via our Facebook support page."}].map(s=>(<div key={s.title} className="glass" style={{padding:28,marginBottom:16}}><h3 className="raj" style={{fontSize:18,fontWeight:700,color:GOLD,marginBottom:10}}>{s.title}</h3><p style={{color:"#A8B0C2",fontSize:14,lineHeight:1.8}}>{s.body}</p></div>))}</div></div>);

// ── PROTECTED ROUTE WRAPPER ───────────────────────────────────
const Protected=({user,sp,children})=>{
  useEffect(()=>{if(!user)sp("login");},[user]);
  if(!user)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div className="glass" style={{padding:48,textAlign:"center",maxWidth:400}}><div style={{width:60,height:60,borderRadius:"50%",background:"rgba(201,168,76,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",color:GOLD}}><I n="lock" sz={28}/></div><h2 className="raj" style={{fontSize:22,fontWeight:700,marginBottom:10}}>Account Required</h2><p style={{color:MUTED,fontSize:14,lineHeight:1.7,marginBottom:24}}>You need an account to access this feature. Sign in or create a free account to get started.</p><div style={{display:"flex",gap:12,justifyContent:"center"}}><button className="btn-gold" onClick={()=>sp("register")}>Create Account</button><button className="btn-out" onClick={()=>sp("login")}>Sign In</button></div></div></div>);
  return children;
};

// ── ROOT APP ──────────────────────────────────────────────────
const DEF_REVIEWS=[
  {name:"Michael R.",role:"IT Manager",rating:5,text:"Setup was incredibly fast. Having all my data on both phones in real time is a game changer.",date:"May 2025",verified:true},
  {name:"Sarah T.",role:"Business Owner",rating:5,text:"I carry a personal and work phone daily. TrustCo Tech lets me leave one in my bag and still see everything.",date:"Apr 2025",verified:true},
  {name:"David K.",role:"Freelancer",rating:5,text:"WhatsApp sync alone is worth the price. My SIM is in one phone but I reply from the other. Flawless.",date:"Apr 2025",verified:true},
  {name:"Jennifer M.",role:"Operations Director",rating:5,text:"The Partner ID connection is genius — enter a code and it just works. Live location is incredibly useful.",date:"Mar 2025",verified:true},
  {name:"Robert P.",role:"Tech Manager",rating:5,text:"Tried the demo first and was immediately impressed. Best $300 I've spent on tech.",date:"Mar 2025",verified:true},
  {name:"Aisha B.",role:"Remote Worker",rating:5,text:"Everything mirrors instantly — calls, messages, Instagram, photos. Exactly what I needed.",date:"Feb 2025",verified:true},
];

export default function App(){
  const[pg,setPg]=useState("home");
  const[user,setUser]=useState(null);
  const[reviews,setReviews]=useState(DEF_REVIEWS);
  const[drawer,setDrawer]=useState(false);

  const sp=(page)=>{setPg(page);window.scrollTo(0,0);};

  const PUBLIC_PAGES=["home","demo","pricing","refund","contact","privacy","about","login","register","reviews"];
  const isDash=pg==="dashboard";

  const render=()=>{
    if(!PUBLIC_PAGES.includes(pg)&&!user){return<Protected user={user} sp={sp}><div/></Protected>;}
    switch(pg){
      case"home": return<Home sp={sp} reviews={reviews}/>;
      case"features": return<Feat sp={sp}/>;
      case"pricing": return<Pricing sp={sp}/>;
      case"demo": return<Demo sp={sp} user={user}/>;
      case"about": return<About/>;
      case"contact": return<Contact/>;
      case"privacy": return<Privacy/>;
      case"refund": return<RefundPage sp={sp}/>;
      case"reviews": return<ReviewsPage reviews={reviews} setReviews={setReviews} user={user} sp={sp}/>;
      case"login": return<Login sp={sp} su={setUser}/>;
      case"register": return<Reg sp={sp} su={setUser}/>;
      case"dashboard": return<Protected user={user} sp={sp}><Dash user={user} setUser={setUser} sp={sp}/></Protected>;
      default: return<Home sp={sp} reviews={reviews}/>;
    }
  };

  return(<>
    <Styles/>
    <Drawer open={drawer} onClose={()=>setDrawer(false)} sp={sp} user={user}/>
    {!isDash&&<Nav pg={pg} sp={sp} user={user} su={setUser} drawerOpen={drawer} setDrawerOpen={setDrawer}/>}
    {isDash&&(<div style={{position:"fixed",top:0,left:0,right:0,zIndex:500,height:70,background:"#0D1020",borderBottom:"1px solid rgba(201,168,76,0.12)",display:"flex",alignItems:"center",padding:"0 24px",gap:16}}>
      <button onClick={()=>sp("home")} style={{display:"flex",alignItems:"center",gap:9,background:"none",border:"none",cursor:"pointer"}}><Logo sz={34}/><div><div className="raj" style={{fontSize:13,fontWeight:700,color:SILVER,letterSpacing:".1em",lineHeight:1.1}}>TRUSTCO</div><div className="raj" style={{fontSize:8,color:GOLD,letterSpacing:".2em",lineHeight:1}}>— TECH —</div></div></button>
      <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center"}}>
        <span style={{fontSize:12,color:MUTED}}>Welcome, {user?.name}</span>
        {user?.activated&&<span className="tag tg">✓ Active Plan</span>}
        <button className="btn-out" style={{padding:"7px 14px",fontSize:12}} onClick={()=>sp("home")}>← Back to site</button>
        <button onClick={()=>{setUser(null);sp("home");}} style={{background:"rgba(255,77,106,0.1)",color:"#FF4D6A",border:"1px solid rgba(255,77,106,0.2)",padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,display:"flex",gap:5,alignItems:"center"}}><I n="logout" sz={12}/>Out</button>
      </div>
    </div>)}
    <main>{render()}</main>
  </>);
}
