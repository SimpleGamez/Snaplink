/* ============================================================
   SNAPLINK — SaaS Backend Integration
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  child,
  update
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

// ─── FIREBASE CONFIG ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ─── STATE ────────────────────────────────────────────────────
let currentUser = null;
let links = [];
const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/') + '#/s/';

// ─── DOM REFS ─────────────────────────────────────────────────
// Layouts
const marketingView = document.getElementById('marketingView');
const appView = document.getElementById('appView');

// App Panel
const urlInput = document.getElementById('urlInput');
const aliasInput = document.getElementById('aliasInput');
const formError = document.getElementById('formError');
const shortenBtn = document.getElementById('shortenBtn');
const resultCard = document.getElementById('resultCard');
const resultShort = document.getElementById('resultShortUrl');
const resultOrig = document.getElementById('resultOriginalUrl');
const copyBtn = document.getElementById('copyBtn');
const qrBtn = document.getElementById('qrBtn');
const qrPanel = document.getElementById('qrPanel');
const qrCanvas = document.getElementById('qrCanvas');
const linksList = document.getElementById('linksList');
const linksEmpty = document.getElementById('linksEmpty');
const statTotal = document.getElementById('statTotal');
const statClicks = document.getElementById('statClicks');
const statToday = document.getElementById('statToday');
const searchInput = document.getElementById('searchInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const toast = document.getElementById('toast');

// Navigation & Marketing
const navAuthBtn = document.getElementById('navAuthBtn');
const navAuthText = document.getElementById('navAuthText');
const navSettings = document.getElementById('navSettings');
const navFeatures = document.getElementById('navFeatures');
const heroSignupBtn = document.getElementById('heroSignupBtn');

// Auth Modal
const authModal = document.getElementById('authModal');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authError = document.getElementById('authError');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchBtn = document.getElementById('authSwitchBtn');
let isLoginMode = true;

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsAvatar = document.getElementById('settingsAvatar');
const settingsEmail = document.getElementById('settingsEmail');
const signOutBtn = document.getElementById('signOutBtn');

// ─── HELPERS ──────────────────────────────────────────────────
function generateCode(n = 6) {
  const c = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}
function isValidUrl(s) {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname.includes('.') || u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  }
  catch { return false; }
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}
function truncate(s, max = 52) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, accent = false) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.toggle('accent', accent);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// ─── STATS ────────────────────────────────────────────────────
function updateStats() {
  const today = new Date().toDateString();
  let clicks = 0, todayN = 0;
  links.forEach(l => {
    clicks += l.clicks || 0;
    if (new Date(l.createdAt).toDateString() === today) todayN++;
  });
  animNum(statTotal, links.length);
  animNum(statClicks, clicks);
  animNum(statToday, todayN);
}
function animNum(el, target) {
  const cur = parseInt(el.textContent) || 0;
  if (cur === target) return;
  const steps = 16, diff = target - cur;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    el.textContent = cur + Math.round(diff * i / steps);
    if (i >= steps) { el.textContent = target; clearInterval(iv); }
  }, 20);
}

// ─── AUTHENTICATION STATE ──────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    marketingView.style.display = 'none';
    appView.style.display = 'block';
    navSettings.style.display = 'flex';
    navAuthBtn.style.display = 'none';
    if (navFeatures) navFeatures.style.display = 'none';

    settingsEmail.textContent = user.email;
    settingsAvatar.textContent = user.email.charAt(0).toUpperCase();

    showToast('✓ START SESSION', true);
    closeAuthModal();
    // Load links
    const userLinksRef = ref(db, `users/${user.uid}/links`);
    onValue(userLinksRef, (snapshot) => {
      const data = snapshot.val();
      links = data ? Object.values(data).sort((a, b) => b.createdAt - a.createdAt) : [];
      renderLinks(searchInput.value);
      updateStats();
    });

  } else {
    currentUser = null;
    marketingView.style.display = 'block';
    appView.style.display = 'none';
    navSettings.style.display = 'none';
    navAuthBtn.style.display = 'flex';
    if (navFeatures) navFeatures.style.display = 'flex';
    navAuthText.textContent = "LOG IN";

    links = [];
    renderLinks();
    updateStats();
    resultCard.style.display = 'none';
  }
});



// ─── COMPONENT UI LOGIC ───────────────────────────────────────
heroSignupBtn.addEventListener('click', () => {
  isLoginMode = false;
  toggleAuthStyles();
  authModal.classList.add('show');
});

navAuthBtn.addEventListener('click', () => {
  isLoginMode = true;
  toggleAuthStyles();
  authModal.classList.add('show');
});

closeAuthBtn.addEventListener('click', closeAuthModal);
function closeAuthModal() {
  authModal.classList.remove('show');
  authForm.reset();
  authError.textContent = '';
}

authSwitchBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  toggleAuthStyles();
});
function toggleAuthStyles() {
  authTitle.textContent = isLoginMode ? "Sign In" : "Sign Up";
  authSubmitBtn.querySelector('span').textContent = isLoginMode ? "LOG IN" : "CREATE ACCOUNT";
  authSwitchText.textContent = isLoginMode ? "No account?" : "Already have an account?";
  authSwitchBtn.textContent = isLoginMode ? "[ SIGN UP ]" : "[ LOG IN ]";
  authError.textContent = '';
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  const email = authEmail.value;
  const pass = authPassword.value;
  try {
    if (isLoginMode) await signInWithEmailAndPassword(auth, email, pass);
    else await createUserWithEmailAndPassword(auth, email, pass);
  } catch (error) { authError.textContent = `▸ ${error.message}`; }
});

navSettings.addEventListener('click', () => settingsModal.classList.add('show'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('show'));

signOutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    settingsModal.classList.remove('show');
    showToast('▸ SIGNED OUT');
  });
});

// ─── SHORTEN LOGIC ───────────────────────────────────────────
async function handleShorten() {
  if (!currentUser) return;
  formError.textContent = '';

  let raw = urlInput.value.trim();
  if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) raw = 'https://' + raw;
  if (!raw) { formError.textContent = '▸ URL is required.'; return; }
  if (!isValidUrl(raw)) { formError.textContent = "▸ Invalid URL."; return; }

  let customAlias = aliasInput.value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

  const code = customAlias || generateCode();
  const linkId = Date.now().toString(36);

  // Check alias collision
  try {
    const publicRef = ref(db, `public_links/${code}`);
    const snap = await get(publicRef);
    if (snap.exists() && snap.val().uid !== currentUser.uid) {
      formError.textContent = `▸ Alias "${code}" is already taken.`;
      return;
    }
  } catch (e) {
    console.error("Collision check error", e);
  }

  const newLink = {
    id: linkId,
    code,
    original: raw,
    short: BASE_URL + code,
    createdAt: Date.now()
  };

  try {
    const backupShortenBtn = shortenBtn.innerHTML;
    shortenBtn.innerHTML = '<span>SAVING...</span>';

    // Save to user scope
    await set(ref(db, `users/${currentUser.uid}/links/${linkId}`), newLink);
    // Link global
    await set(ref(db, `public_links/${code}`), { uid: currentUser.uid, linkId });

    urlInput.value = '';
    aliasInput.value = '';
    shortenBtn.innerHTML = backupShortenBtn;
    showResult(newLink);
  } catch (err) {
    showToast('▸ FAILED TO SAVE URL');
    shortenBtn.innerHTML = '<span>GENERATE LINK</span>';
  }
}

shortenBtn.addEventListener('click', handleShorten);
urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleShorten(); });
aliasInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleShorten(); });

function showResult(link) {
  resultShort.textContent = link.short;
  resultOrig.textContent = 'ORIG: ' + truncate(link.original, 68);
  resultCard.style.display = 'block';
  qrPanel.style.display = 'none';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── COPY & QR ────────────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(resultShort.textContent).then(() => {
    showToast('✓ COPIED', true);
    copyBtn.style.color = 'var(--accent)';
    setTimeout(() => { copyBtn.style.color = ''; }, 1400);
  });
});

qrBtn.addEventListener('click', () => {
  if (qrPanel.style.display === 'block') { qrPanel.style.display = 'none'; return; }
  qrPanel.style.display = 'block';
  generateQR(resultShort.textContent, qrCanvas);
});

function generateQR(text, canvas) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width, N = 25, cellSize = Math.floor(size / N);
  const m = Array.from({ length: N }, () => Array(N).fill(0));

  function finder(r, c) {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      const e = i === 0 || i === 6 || j === 0 || j === 6, inner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
      m[r + i][c + j] = (e || inner) ? 1 : 0;
    }
  }
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);

  const res = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8)) res.add(`${r},${c}`);
  }

  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  let seed = h;
  function rng() { seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5; return (seed >>> 0) & 1; }

  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!res.has(`${r},${c}`)) m[r][c] = rng();
  }

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  m.forEach((rArr, r) => {
    rArr.forEach((cell, c) => {
      if (cell) ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    });
  });
}

// ─── RENDER LINKS ─────────────────────────────────────────────
function renderLinks(filter = '') {
  const q = filter.toLowerCase();
  const filtered = links.filter(l => l.short.toLowerCase().includes(q) || l.original.toLowerCase().includes(q));

  linksList.innerHTML = '';
  linksEmpty.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((link, idx) => {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.style.animationDelay = `${idx * 35}ms`;
    row.innerHTML = `
      <div class="td td-num">${(idx + 1).toString().padStart(2, '0')}</div>
      <div class="td td-short"><a href="${link.short}" target="_blank">${link.short}</a></div>
      <div class="td td-orig-cell" title="${link.original}"><span class="td-orig">${truncate(link.original)}</span></div>
      <div class="td td-clicks td-clicks-cell"><span class="clicks-pill">${link.clicks || 0}</span></div>
      <div class="td td-date td-date-cell">${formatDate(link.createdAt)}</div>
      <div class="td td-actions">
        <button class="td-btn" onclick="window.copyLink('${link.short}')" title="Copy">
          <svg viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M2 11V3a1 1 0 011-1h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        </button>
        <button class="td-btn del" onclick="window.deleteLink('${link.id}', '${link.code}')" title="Delete">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3.5 4l.5 9a.5.5 0 00.5.5h7a.5.5 0 00.5-.5l.5-9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;
    linksList.appendChild(row);
  });
}

// ─── GLOBAL ACTIONS ───────────────────────────────────────────
window.copyLink = function (url) {
  navigator.clipboard.writeText(url).then(() => showToast('✓ COPIED', true));
};
window.deleteLink = async function (id, code) {
  if (!currentUser) return;
  try {
    await set(ref(db, `users/${currentUser.uid}/links/${id}`), null);

    // Check if code maps to user to legally be able to delete it mapping
    const codeSnap = await get(ref(db, `public_links/${code}`));
    if (codeSnap.exists() && codeSnap.val().uid === currentUser.uid) {
      await set(ref(db, `public_links/${code}`), null);
    }
    showToast('▸ LINK DELETED');
  } catch (e) { showToast('▸ ERROR DELETING'); }
};

searchInput.addEventListener('input', () => renderLinks(searchInput.value));

clearAllBtn.addEventListener('click', async () => {
  if (!currentUser || !links.length) return;
  if (confirm(`Delete all ${links.length} links? This cannot be undone.`)) {
    try {
      // Loop natively since individual objects need rule checking on their UID
      for (const l of links) {
        await set(ref(db, `public_links/${l.code}`), null);
      }
      await set(ref(db, `users/${currentUser.uid}/links`), null);
      resultCard.style.display = 'none';
      showToast('▸ ALL LINKS CLEARED');
    } catch (e) { }
  }
});

// ─── HASH REDIRECT ────────────────────────────────────────────
async function checkRedirect() {
  const h = decodeURIComponent(window.location.hash);
  const m = h.match(/^#\/s\/([a-z0-9\-_]+)$/i);
  if (m) {
    const code = m[1];
    marketingView.style.display = 'none'; // hide flicker
    const publicRef = ref(db, `public_links/${code}`);
    const snapshot = await get(publicRef);
    if (snapshot.exists()) {
      const { uid, linkId } = snapshot.val();
      const linkRef = ref(db, `users/${uid}/links/${linkId}`);
      const linkSnap = await get(linkRef);
      if (linkSnap.exists()) {
        const linkData = linkSnap.val();
        const clicksRef = ref(db, `users/${uid}/links/${linkId}/clicks`);
        await set(clicksRef, (linkData.clicks || 0) + 1);
        window.location.href = linkData.original;
      }
    }
  }
}

// ─── INIT ─────────────────────────────────────────────────────
checkRedirect();
renderLinks();
updateStats();
