/* ================================================
   ChatCat — Core App Utilities (app.js)
   ================================================ */

'use strict';

const KEYS = {
  USERS:        'cc_users',
  MESSAGES:     'cc_messages',
  CURRENT_USER: 'cc_current_user',
  ONLINE:       'cc_online',
  FRIENDS:      'cc_friends',
  SKIPPED:      'cc_skipped',
  SETTINGS:     'cc_settings',
  TYPING:       'cc_typing',
};

const Storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { localStorage.removeItem(key); },
};

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function formatTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function formatDate(ts) {
  const d = new Date(ts), today = new Date(), yest = new Date(today); yest.setDate(yest.getDate()-1);
  if (d.toDateString() === today.toDateString()) return 'اليوم';
  if (d.toDateString() === yest.toDateString()) return 'أمس';
  return d.toLocaleDateString('ar-EG', { month:'short', day:'numeric', year:'numeric' });
}

function timeAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s<60) return 'الآن';
  const m=Math.floor(s/60); if(m<60) return 'منذ '+m+' د';
  const h=Math.floor(m/60); if(h<24) return 'منذ '+h+' س';
  const d=Math.floor(h/24); if(d<7) return 'منذ '+d+' ي';
  return formatDate(ts);
}

function getSettings() { return Storage.get(KEYS.SETTINGS, { darkMode:true, language:'ar', rtl:true }); }
function saveSettings(s) { Storage.set(KEYS.SETTINGS, s); applySettings(s); }

function applySettings(s) {
  const body=document.body, html=document.documentElement;
  if (s.darkMode) body.classList.remove('light-mode'); else body.classList.add('light-mode');
  if (s.rtl) { html.setAttribute('dir','rtl'); html.setAttribute('lang','ar'); }
  else { html.setAttribute('dir','ltr'); html.setAttribute('lang','en'); }
  if (s.language === 'ar') { html.setAttribute('dir','rtl'); html.setAttribute('lang','ar'); }
}

let toastContainer=null;
function showToast(msg, type='info', dur=3000) {
  if(!toastContainer){toastContainer=document.createElement('div');toastContainer.id='toast-container';document.body.appendChild(toastContainer);}
  const icons={success:'✓',error:'✕',info:'ℹ',warning:'⚠'};
  const t=document.createElement('div'); t.className='toast toast-'+type;
  t.innerHTML='<span style="font-size:1rem">'+(icons[type]||icons.info)+'</span> '+msg;
  toastContainer.appendChild(t);
  setTimeout(()=>{t.classList.add('hide');setTimeout(()=>t.remove(),300);},dur);
}

function navigate(p){ window.location.href=p; }

function markOnline(uid){ const o=Storage.get(KEYS.ONLINE,{}); o[uid]=Date.now(); Storage.set(KEYS.ONLINE,o); }
function markOffline(uid){ const o=Storage.get(KEYS.ONLINE,{}); delete o[uid]; Storage.set(KEYS.ONLINE,o); }
function isOnline(uid){ const o=Storage.get(KEYS.ONLINE,{}); if(!o[uid]) return false; return (Date.now()-o[uid])<90000; }
function getOnlineCount(){ const o=Storage.get(KEYS.ONLINE,{}); const c=Date.now()-90000; return Object.values(o).filter(t=>t>c).length; }

function requireAuth() {
  const id=Storage.get(KEYS.CURRENT_USER);
  if(!id){ navigate('login.html'); return null; }
  const users=Storage.get(KEYS.USERS,[]);
  const u=users.find(x=>x.id===id);
  if(!u){ Storage.remove(KEYS.CURRENT_USER); navigate('login.html'); return null; }
  return u;
}

function requireAdmin() {
  const u=requireAuth();
  if(!u||!u.isAdmin){ navigate('home.html'); return null; }
  return u;
}

function $(s,c=document){ return c.querySelector(s); }
function $$(s,c=document){ return [...c.querySelectorAll(s)]; }

function el(tag, attrs={}, ...children) {
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)) {
    if(k==='className') e.className=v;
    else if(k==='innerHTML') e.innerHTML=v;
    else if(k==='textContent') e.textContent=v;
    else if(k==='style') e.setAttribute('style',v);
    else if(k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k,v);
  }
  children.forEach(c=>{ if(typeof c==='string') e.appendChild(document.createTextNode(c)); else if(c) e.appendChild(c); });
  return e;
}

document.addEventListener('click', () => {
  $$('.context-menu').forEach(m=>m.remove());
  $$('.emoji-picker.visible').forEach(p=>p.classList.remove('visible'));
});

const MOCK_AVATARS = ['🐱','🦊','🐺','🦁','🐻','🐼','🦝','🐨','🐯','🦄','🐸','🦋'];

const MOCK_USERS = [
  { id:'u_admin', username:'admin', age:30, password:'Admin@2027', avatar:'🦁', bio:'مدير شات كات', country:'السعودية', isAdmin:true, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-90*86400000, lastSeen: Date.now() },
  { id:'u_alice', username:'alice', age:24, password:'pass123', avatar:'🐱', bio:'مرحباً! أحب القطط والدردشة 🐱', country:'مصر', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-60*86400000, lastSeen: Date.now()-3600000 },
  { id:'u_bob',   username:'bob',   age:28, password:'pass123', avatar:'🦊', bio:'فقط ثعلب في عالم البشر 🦊', country:'المغرب', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-45*86400000, lastSeen: Date.now()-7200000 },
  { id:'u_carol', username:'carol', age:22, password:'pass123', avatar:'🦋', bio:'أنشر الإيجابية كل يوم ✨', country:'الإمارات', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-30*86400000, lastSeen: Date.now() },
  { id:'u_dave',  username:'dave',  age:31, password:'pass123', avatar:'🐻', bio:'دائماً في وضع الدب 🐻', country:'العراق', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-20*86400000, lastSeen: Date.now()-86400000 },
  { id:'u_eva',   username:'eva',   age:26, password:'pass123', avatar:'🦄', bio:'طاقة يونيكورن فقط 🦄', country:'الأردن', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-15*86400000, lastSeen: Date.now()-1800000 },
  { id:'u_frank', username:'frank', age:33, password:'pass123', avatar:'🐺', bio:'أحساس الذئب المنفرد 🐺', country:'فلسطين', isAdmin:false, isMuted:false, isBanned:false, followers:[], following:[], joinDate: Date.now()-10*86400000, lastSeen: Date.now()-43200000 },
];

const MOCK_MESSAGES = [
  { id:'m1', userId:'u_alice', text:'مرحباً بالجميع! أهلاً بكم في شات كات 🐱', timestamp: Date.now()-3600000, likes:['u_bob','u_carol'], replyTo:null, isEdited:false, isDeleted:false },
  { id:'m2', userId:'u_bob',   text:'التطبيق رائع! أحب التصميم 🔥', timestamp: Date.now()-3500000, likes:['u_alice'], replyTo:null, isEdited:false, isDeleted:false },
  { id:'m3', userId:'u_carol', text:'سعيدة جداً بوجودي هنا! 🦋✨', timestamp: Date.now()-3400000, likes:[], replyTo:'m1', isEdited:false, isDeleted:false },
  { id:'m4', userId:'u_dave',  text:'شات كات هو مستقبل الدردشة الاجتماعية 🚀', timestamp: Date.now()-3300000, likes:['u_alice','u_bob','u_frank'], replyTo:null, isEdited:false, isDeleted:false },
  { id:'m5', userId:'u_eva',   text:'هل أحد يريد دردشة جماعية؟ 🦄', timestamp: Date.now()-3200000, likes:[], replyTo:null, isEdited:false, isDeleted:false },
  { id:'m6', userId:'u_frank', text:'الوضع الداكن مذهل 😍', timestamp: Date.now()-3100000, likes:['u_eva','u_carol'], replyTo:null, isEdited:false, isDeleted:false },
  { id:'m7', userId:'u_alice', text:'شكراً لكم جميعاً على الانضمام! لنستمتع 🎉', timestamp: Date.now()-3000000, likes:[], replyTo:'m1', isEdited:false, isDeleted:false },
  { id:'m8', userId:'u_bob',   text:'أستمتع بالتواجد هنا 😎🦊', timestamp: Date.now()-2900000, likes:[], replyTo:null, isEdited:false, isDeleted:false },
];

function seedMockData() {
  if (Storage.get(KEYS.USERS, []).length === 0) Storage.set(KEYS.USERS, MOCK_USERS);
  const users = Storage.get(KEYS.USERS, []);
  if (!users.find(u => u.username === 'admin')) { users.unshift(MOCK_USERS[0]); Storage.set(KEYS.USERS, users); }
  if (Storage.get(KEYS.MESSAGES, []).length === 0) Storage.set(KEYS.MESSAGES, MOCK_MESSAGES);
}

function simulateOnlineUsers() {
  const online = Storage.get(KEYS.ONLINE, {});
  ['u_alice','u_bob','u_carol'].forEach(id => online[id] = Date.now());
  Storage.set(KEYS.ONLINE, online);
}

(function initApp() {
  seedMockData();
  simulateOnlineUsers();
  applySettings(getSettings());
  const cur = Storage.get(KEYS.CURRENT_USER);
  if (cur) { markOnline(cur); setInterval(() => markOnline(cur), 60000); }
})();

const EMOJI_LIST = [
  '😀','😁','😂','🤣','😃','😄','😅','😆','😇','😈','😉','😊','😋','😌','😍','😎',
  '😏','😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝','😞',
  '🤩','🥳','😻','😺','😸','😹','😼','😽','🙀','😿','😾','🔥','✨','💫','⭐','🌟',
  '💯','👍','👎','👏','🙌','🤝','🤜','🤛','✊','💪','🎉','🎊','🎈','🎁','💝','💘',
  '❤️','🧡','💛','💚','💙','💜','🖤','💔','❣️','💕','💞','💓','💗','💖','💟','☮️',
  '🐱','🦊','🐺','🦁','🐻','🐼','🦝','🐨','🐯','🦄','🐸','🦋','🐝','🦉','🐧','🦆',
  '🍕','🍔','🌮','🍜','🍣','🍦','🎂','🍰','☕','🧋','🥤','🍺','🌸','🌺','🌻','🌹',
  '🚀','💻','📱','🎮','🎵','🎸','🎹','🎤','📸','🌈','⚡','🌊','🏔','🌙','☀️','🌍',
];

window.CC = { KEYS, Storage, generateId, formatTime, formatDate, timeAgo, getSettings, saveSettings, applySettings, showToast, navigate, markOnline, markOffline, isOnline, getOnlineCount, requireAuth, requireAdmin, $, $$, el, MOCK_AVATARS, EMOJI_LIST };
