const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3002;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ listings: [] }, null, 2), 'utf-8');

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }));

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
  catch { return { listings: [] }; }
}
function writeDB(d) { fs.writeFileSync(DB_PATH, JSON.stringify(d, null, 2), 'utf-8'); }

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 10000)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v|pdf)$/i.test(file.originalname));
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, time: Date.now() }));

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'audio');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w֐-׿.-]+/g, '_');
    cb(null, safe);
  }
});
const audioUpload = multer({ storage: audioStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// Auto-recover audio files from db.audioMeta (where we store base64)
try {
  const dir = path.join(UPLOADS_DIR, 'audio');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const meta = (JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')).audioMeta) || {};
  for (const [filename, m] of Object.entries(meta)) {
    if (m && m.data) {
      const fp = path.join(dir, filename);
      if (!fs.existsSync(fp)) {
        try { fs.writeFileSync(fp, Buffer.from(m.data, 'base64')); } catch {}
      }
    }
  }
} catch {}

app.post('/api/audio', audioUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const dest = String(req.body.dest || '').trim();
  try {
    const fp = path.join(UPLOADS_DIR, 'audio', req.file.filename);
    const data = fs.readFileSync(fp).toString('base64');
    const db = readDB();
    db.audioMeta = db.audioMeta || {};
    db.audioMeta[req.file.filename] = { dest, uploadedAt: new Date().toISOString(), data };
    writeDB(db);
  } catch {}
  res.json({ success: true, filename: req.file.filename, url: `/uploads/audio/${req.file.filename}`, dest });
});

app.get('/api/audio', (_req, res) => {
  try {
    const meta = (readDB().audioMeta) || {};
    const files = Object.keys(meta).filter(f => /\.(mp3|wav|m4a|aac)$/i.test(f));
    res.json({ files: files.map(f => ({ name: f, url: `/uploads/audio/${f}`, dest: (meta[f] && meta[f].dest) || '' })) });
  } catch { res.json({ files: [] }); }
});

app.delete('/api/audio/:name', (req, res) => {
  try {
    const filename = path.basename(decodeURIComponent(req.params.name));
    const fp = path.join(UPLOADS_DIR, 'audio', filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    const db = readDB();
    if (db.audioMeta && db.audioMeta[filename]) { delete db.audioMeta[filename]; writeDB(db); }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'delete failed' }); }
});

app.get('/api/listings', (_req, res) => {
  const db = readDB();
  const approved = (db.listings || []).filter(l => l.status === 'approved').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  // never expose the owner's secret delete token publicly
  const clean = approved.map(({ delToken, ...rest }) => rest);
  res.json({ listings: clean });
});

// Owner-delete: the device that created the listing holds the secret delToken.
app.delete('/api/listings/:id', (req, res) => {
  const id = req.params.id;
  const token = (req.query && req.query.token) || (req.body && req.body.token);
  const db = readDB();
  const l = (db.listings || []).find(x => x.id === id);
  if (!l) return res.status(404).json({ error: 'not found' });
  if (!token || token !== l.delToken) return res.status(403).json({ error: 'forbidden' });
  db.listings = db.listings.filter(x => x.id !== id);
  writeDB(db);
  try {
    (l.photos || []).concat(l.video ? [l.video] : []).concat(l.brochure ? [l.brochure] : []).forEach(p => {
      const fp = path.join(UPLOADS_DIR, path.basename(String(p)));
      if (fp.startsWith(UPLOADS_DIR) && fs.existsSync(fp)) fs.unlinkSync(fp);
    });
  } catch {}
  res.json({ ok: true });
});

app.post('/api/listings', upload.fields([{ name: 'photos', maxCount: 8 }, { name: 'video', maxCount: 1 }, { name: 'brochure', maxCount: 1 }]), (req, res) => {
  try {
    const { title, type, price, area, desc, phone, size, highlight, developer, units, delivery, yieldPct, email, projectType, lat, lng } = req.body;
    if (!title || !price || !area || !phone) return res.status(400).json({ error: 'missing fields' });
    const files = req.files || {};
    const photos = (files.photos || []).map(f => `/uploads/${f.filename}`);
    const video = files.video && files.video[0] ? `/uploads/${files.video[0].filename}` : '';
    const brochure = files.brochure && files.brochure[0] ? `/uploads/${files.brochure[0].filename}` : '';
    const delToken = crypto.randomBytes(12).toString('hex');
    const listing = {
      id: 'l_' + Date.now() + '_' + Math.round(Math.random() * 1000),
      title, type: type || 'sale', price, area, desc: desc || '', phone, photos, video,
      size: size === 'large' ? 'large' : 'small',
      highlight: ['none','emphasized','negative'].includes(highlight) ? highlight : 'none',
      status: 'pending',
      delToken,
      createdAt: new Date().toISOString()
    };
    if (type === 'project') {
      listing.size = 'large';
      listing.developer = developer || '';
      listing.units = units || '';
      listing.delivery = delivery || '';
      listing.yieldPct = yieldPct || '';
      listing.email = email || '';
      listing.projectType = projectType || 'residential';
      listing.brochure = brochure;
      if (lat && lng) { listing.lat = parseFloat(lat); listing.lng = parseFloat(lng); }
    }
    const db = readDB();
    db.listings = db.listings || [];
    db.listings.unshift(listing);
    writeDB(db);
    res.json({ ok: true, listing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// --- Visitors' photo album (shared across all users), keyed per tour/itinerary ---
// Visitor photos are moderated like Batumi's tour albums: nothing a visitor
// uploads is public until it is approved here.
app.get('/api/album', (req, res) => {
  const key = String(req.query.key || '').slice(0, 80);
  const db = readDB();
  const arr = (db.album && db.album[key]) || [];
  res.json({ photos: arr.filter(p => p.status === 'approved').map(p => p.url) });
});

app.post('/api/album', upload.fields([{ name: 'photos', maxCount: 12 }]), (req, res) => {
  try {
    const key = String((req.body && req.body.key) || '').slice(0, 80);
    if (!key) return res.status(400).json({ error: 'missing key' });
    const files = (req.files && req.files.photos) || [];
    if (!files.length) return res.status(400).json({ error: 'no photos' });
    const db = readDB();
    db.album = db.album || {};
    db.album[key] = db.album[key] || [];
    const added = files.map(f => ({
      id: crypto.randomBytes(6).toString('hex'),
      url: `/uploads/${f.filename}`,
      at: new Date().toISOString(),
      status: 'pending',
    }));
    db.album[key].push(...added);
    if (db.album[key].length > 200) db.album[key] = db.album[key].slice(-200); // cap runaway
    writeDB(db);
    notifyAdmin(
      `📷 ${added.length} תמונות חדשות ממתינות לאישור\n\nאלבום: ${key}\n\n` +
      `לאישור: https://wellcomedubai.com/admin/stats.html\n\n— WellCome Dubai`
    );
    // The uploader still sees only what is public, plus nothing of their own yet.
    res.json({ ok: true, pending: added.length, photos: db.album[key].filter(p => p.status === 'approved').map(p => p.url) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.get('/api/admin/listings', requireAdmin, (_req, res) => {
  const db = readDB();
  res.json({ listings: db.listings || [] });
});

app.post('/api/admin/listings/:id/approve', requireAdmin, (req, res) => {
  const db = readDB();
  const item = (db.listings || []).find(l => l.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  item.status = 'approved';
  item.approvedAt = new Date().toISOString();
  writeDB(db);
  res.json({ ok: true });
});

app.post('/api/admin/listings/:id/reject', requireAdmin, (req, res) => {
  const db = readDB();
  const item = (db.listings || []).find(l => l.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  item.status = 'rejected';
  writeDB(db);
  res.json({ ok: true });
});

// Owner deletes own listing by matching phone
app.delete('/api/listings/:id', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const db = readDB();
  const item = (db.listings || []).find(l => l.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (String(item.phone || '').replace(/\D/g, '') !== phone) return res.status(403).json({ error: 'phone mismatch' });
  db.listings = (db.listings || []).filter(l => l.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.delete('/api/admin/listings/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.listings = (db.listings || []).filter(l => l.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ─── Resolve Google News URL to original article ─────────────
app.get('/api/resolve-url', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, error: 'invalid url' });
  try {
    const resolved = await resolveGoogleNews(url);
    res.json({ success: true, url: resolved });
  } catch { res.json({ success: false, url }); }
});

// ─── OG image scraper (cache 24h, follows Google News redirects) ─────────────
const ogCache = new Map();
async function resolveGoogleNews(url) {
  if (!/news\.google\.com/i.test(url)) return url;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    let resolved = r.url;
    if (resolved.includes('news.google.com')) {
      const html = await r.text();
      const m = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*data-n-au/i)
            || html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^;]+;\s*url=([^"']+)["']/i)
            || html.match(/data-url=["'](https?:\/\/[^"']+)["']/i);
      if (m && m[1]) resolved = m[1].replace(/&amp;/g, '&');
    }
    return resolved;
  } catch { return url; }
}

app.get('/api/og-image', async (req, res) => {
  const url = String(req.query.url || '');
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ success: false, error: 'invalid url' });
  const cached = ogCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < 24 * 60 * 60 * 1000) {
    return res.json({ success: true, image: cached.image, cached: true });
  }
  try {
    const realUrl = await resolveGoogleNews(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(realUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'he,en;q=0.9',
      },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    const html = await r.text();
    const m1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const m2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const m3 = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    let image = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || '';
    if (!image) {
      const img = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpe?g|png|webp))["'][^>]*>/i);
      if (img && img[1]) image = img[1];
    }
    // Reject Google's brand image (returned when redirect to article fails)
    if (image && /googleusercontent\.com|gstatic\.com|google\.com\/.*logo/i.test(image)) image = '';
    ogCache.set(url, { image, fetchedAt: Date.now() });
    res.json({ success: true, image });
  } catch {
    res.json({ success: false, error: 'fetch failed' });
  }
});

// ---- WellCome Dubai AI assistant (closed-domain, Claude via direct fetch) ----
const AI_SYSTEM = `You are the WellCome Dubai AI travel assistant, a warm, knowledgeable local guide.
You ONLY answer questions about visiting Dubai (and nearby Abu Dhabi): attractions, restaurants, hotels,
nightlife, shopping, beaches, transport (metro, taxi, Careem), tips, events, budgets, culture, weather and getting around.
If asked anything unrelated to a Dubai/UAE trip, politely say you can only help with Dubai and steer back.
Keep answers concise and practical: 2-4 short sentences, friendly, specific (name real places when useful).
Do not invent prices/opening-hours you are unsure about; suggest checking in the app.`;

const AI_LANGS = { he: 'Hebrew', en: 'English', ru: 'Russian', hi: 'Hindi', ar: 'Arabic' };

app.post('/api/ai/ask', async (req, res) => {
  try {
    const question = (req.body && req.body.question ? String(req.body.question) : '').slice(0, 600).trim();
    const lang = req.body && req.body.lang;
    if (!question) return res.status(400).json({ error: 'no question' });
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return res.status(500).json({ error: 'AI not configured', answer: '' });
    const langName = AI_LANGS[lang] || 'English';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: AI_SYSTEM + ` Always answer in ${langName}.`,
        messages: [{ role: 'user', content: question }],
      }),
    });
    if (!r.ok) { const t = await r.text().catch(() => ''); return res.status(502).json({ error: 'ai upstream', detail: t.slice(0, 200), answer: '' }); }
    const j = await r.json();
    const answer = (j && j.content && j.content[0] && j.content[0].text) ? j.content[0].text : '';
    res.json({ answer, places: [] });
  } catch (e) {
    res.status(500).json({ error: 'ai failed', answer: '' });
  }
});

// ---- App version gate (drives the in-app "update available" popup) ----
// Bump LATEST_VERSION in Railway Variables to make older installs show the update prompt.
// The published store version, asked of the stores themselves so nobody has to
// bump a number here on every release. Cached for 6h; LATEST_VERSION (env) still
// wins if it is set, and the last known good value is kept if a store is down.
const APPSTORE_ID = process.env.APPSTORE_ID || '6769145087';
const PLAY_PACKAGE = process.env.PLAY_PACKAGE || 'com.wellcomedubai.app';
const STORE_TTL = 6 * 3600 * 1000;
const storeCache = { ios: { v: null, at: 0 }, android: { v: null, at: 0 } };

async function iosVersion() {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${APPSTORE_ID}&t=${Date.now()}`);
  const j = await r.json();
  const v = j && j.results && j.results[0] && j.results[0].version;
  return /^\d+(\.\d+)*$/.test(String(v || '')) ? String(v) : null;
}

async function androidVersion() {
  const r = await fetch(`https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&hl=en&gl=US`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WellComeDubai/1.0)' },
  });
  const html = await r.text();
  // Play embeds the version inside a JS array blob; both shapes have appeared.
  const m = html.match(/\[\[\["(\d+(?:\.\d+)+)"\]\]/) || html.match(/Current Version.{0,80}?(\d+(?:\.\d+)+)/s);
  return m ? m[1] : null;
}

async function storeVersion(platform) {
  const c = storeCache[platform];
  if (c && c.v && (Date.now() - c.at) < STORE_TTL) return c.v;
  try {
    const v = platform === 'android' ? await androidVersion() : await iosVersion();
    if (v) { storeCache[platform] = { v, at: Date.now() }; return v; }
  } catch (e) { console.warn('store lookup failed', platform, e && e.message); }
  return c && c.v ? c.v : null; // keep the last good value rather than prompting wrongly
}

// GET /api/version?platform=ios|android
app.get('/api/version', async (req, res) => {
  const platform = req.query.platform === 'android' ? 'android' : 'ios';
  let latest = process.env.LATEST_VERSION || null;
  if (!latest) latest = await storeVersion(platform);
  res.json({
    latestVersion: latest || '0.0.0', // 0.0.0 = "unknown", which prompts nobody
    minVersion: process.env.MIN_VERSION || '0.0.0',
    platform,
  });
});

// ---- News proxy: fetch Google-News RSS server-side, parse to JSON, cache 30 min ----
// Fixes slow/failing client-side news (rss2json rate limits + CORS). App calls /api/news?rss=<encoded rss url>.
const NEWS_CACHE = new Map(); // rssUrl -> { at, items }
const NEWS_TTL = 30 * 60 * 1000;

function parseRssItems(xml) {
  const items = [];
  const blocks = String(xml).split(/<item>/i).slice(1);
  for (const raw of blocks.slice(0, 12)) {
    const chunk = raw.split(/<\/item>/i)[0];
    const pick = (tag) => {
      const m = chunk.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
      if (!m) return '';
      let v = m[1];
      const cd = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cd) v = cd[1];
      return v.trim();
    };
    const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const title = strip(pick('title'));
    const link = strip(pick('link'));
    const pubDate = strip(pick('pubDate'));
    const description = pick('description');
    let img = '';
    const media = chunk.match(/<media:content[^>]*url="([^"]+)"/i) || chunk.match(/<enclosure[^>]*url="([^"]+)"/i);
    if (media) img = media[1];
    if (!img) { const im = (description || '').match(/<img[^>]*src="([^"]+)"/i); if (im) img = im[1]; }
    if (title && link) items.push({ title, link, pubDate, description: strip(description), thumbnail: img, enclosure: { link: img } });
  }
  return items;
}

app.get('/api/news', async (req, res) => {
  const rss = req.query.rss;
  if (!rss || !/^https?:\/\//.test(rss)) return res.status(400).json({ items: [], error: 'bad rss' });
  const now = Date.now();
  const cached = NEWS_CACHE.get(rss);
  if (cached && (now - cached.at) < NEWS_TTL) return res.json({ items: cached.items, cached: true });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(rss, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WellComeDubai/1.0)' }, signal: ctrl.signal });
    clearTimeout(timer);
    const xml = await r.text();
    const items = parseRssItems(xml);
    if (items.length) { NEWS_CACHE.set(rss, { at: now, items }); return res.json({ items }); }
    return res.json({ items: cached ? cached.items : [], stale: !!cached });
  } catch (e) {
    return res.json({ items: cached ? cached.items : [], stale: !!cached });
  }
});


// ─── Coupons: paid packages for business owners ─────────────────
// A coupon is created as PENDING when the owner starts checkout, and goes live
// ONLY after PayPal confirms the money arrived (capture on return, or webhook if
// the buyer closed the browser). An owner can never publish a coupon for free.
const PAYPAL_ENV = (process.env.PAYPAL_ENV || 'live').toLowerCase();
const PAYPAL_BASE = PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const COUPON_PRICE = '365.00';
const COUPON_DAYS = 365;

function getCoupons(db) { return Array.isArray(db.coupons) ? db.coupons : []; }

async function paypalToken() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) return null;
  try {
    const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const j = await r.json();
    return j.access_token || null;
  } catch { return null; }
}

function serverBase(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// Flip a pending coupon to live. Idempotent: capture and webhook may both fire.
function activateCoupon(couponId, orderId) {
  const db = readDB();
  const list = getCoupons(db);
  const c = list.find(x => x.id === couponId);
  if (!c) return false;
  if (!c.paidAt) {
    c.paidAt = new Date().toISOString();
    c.activeUntil = new Date(Date.now() + COUPON_DAYS * 86400000).toISOString();
    if (orderId) c.orderId = orderId;
    db.coupons = list;
    writeDB(db);
  }
  return true;
}

function isLive(c) { return !!(c.paidAt && c.activeUntil && new Date(c.activeUntil).getTime() > Date.now()); }

// GET /api/coupons — public list: paid and unexpired only.
app.get('/api/coupons', (_req, res) => {
  try {
    const list = getCoupons(readDB()).filter(isLive).map(c => ({
      id: c.id, bizId: c.bizId, bizName: c.bizName, bizCat: c.bizCat, image: c.image,
      type: c.type, pct: c.pct, from: c.from, to: c.to,
    }));
    res.json({ success: true, data: list });
  } catch { res.status(500).json({ success: false, error: 'read error' }); }
});

// POST /api/coupons/pay — start a paid coupon package.
// Saves the coupon as pending (invisible) and returns the PayPal approval URL.
app.post('/api/coupons/pay', async (req, res) => {
  try {
    const b = req.body || {};
    const bizName = String(b.bizName || '').trim();
    const type = b.type === 'variable' ? 'variable' : 'fixed';
    if (!bizName) return res.status(400).json({ success: false, error: 'bizName required' });
    if (type === 'fixed' && !b.pct) return res.status(400).json({ success: false, error: 'pct required' });

    const token = await paypalToken();
    // No credentials → refuse rather than fall back to a manual link, which would
    // let the coupon go live without a confirmed payment.
    if (!token) return res.status(503).json({ success: false, error: 'payments unavailable' });

    const db = readDB();
    const list = getCoupons(db);
    const id = crypto.randomBytes(8).toString('hex');
    const now = new Date();
    const end = new Date(now); end.setFullYear(now.getFullYear() + 1);
    list.push({
      id, bizId: b.bizId ?? null, bizName, bizCat: b.bizCat || 'restaurants',
      image: b.image || '', type, pct: type === 'fixed' ? Number(b.pct) : null,
      from: now.toISOString(), to: end.toISOString(),
      createdAt: now.toISOString(), paidAt: null, activeUntil: null, orderId: null,
    });
    db.coupons = list;
    writeDB(db);

    const base = serverBase(req);
    const lang = String(b.lang || 'en');
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ custom_id: id, description: `Coupon Package · ${bizName}`, amount: { currency_code: 'USD', value: COUPON_PRICE } }],
        application_context: {
          brand_name: 'WellCome Dubai',
          user_action: 'PAY_NOW',
          return_url: `${base}/api/coupons/return?c=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`,
          cancel_url: `${base}/api/coupons/cancel?lang=${encodeURIComponent(lang)}`,
        },
      }),
    });
    const order = await orderRes.json();
    const approve = (order.links || []).find(l => l.rel === 'approve');
    if (!approve) return res.status(502).json({ success: false, error: 'paypal order failed' });
    res.json({ success: true, url: approve.href, couponId: id, orderId: order.id });
  } catch (e) { res.status(500).json({ success: false, error: String((e && e.message) || e) }); }
});

const CPN_PAGE = {
  he: { dir: 'rtl', ok: 'התשלום התקבל', okSub: 'הקופון שלך עלה לאוויר לשנה. אפשר לחזור לאפליקציה.', wait: 'מעבד את התשלום', waitSub: 'אם שילמת, הקופון יופיע בעוד רגע. אפשר לחזור לאפליקציה.', no: 'התשלום בוטל', noSub: 'אפשר לחזור לאפליקציה ולנסות שוב.' },
  en: { dir: 'ltr', ok: 'Payment received', okSub: 'Your coupon is live for one year. You can return to the app.', wait: 'Processing payment', waitSub: 'If you paid, the coupon will appear shortly. You can return to the app.', no: 'Payment cancelled', noSub: 'You can return to the app and try again.' },
  ru: { dir: 'ltr', ok: 'Платёж получен', okSub: 'Ваш купон активен на год. Можно вернуться в приложение.', wait: 'Обработка платежа', waitSub: 'Если вы оплатили, купон появится через минуту.', no: 'Платёж отменён', noSub: 'Вернитесь в приложение и попробуйте снова.' },
  hi: { dir: 'ltr', ok: 'भुगतान प्राप्त हुआ', okSub: 'आपका कूपन एक वर्ष के लिए सक्रिय है। आप ऐप में लौट सकते हैं।', wait: 'भुगतान संसाधित हो रहा है', waitSub: 'यदि आपने भुगतान किया है, कूपन शीघ्र दिखेगा।', no: 'भुगतान रद्द', noSub: 'ऐप में लौटें और पुनः प्रयास करें।' },
  ar: { dir: 'rtl', ok: 'تم استلام الدفع', okSub: 'قسيمتك فعّالة لمدة سنة. يمكنك العودة إلى التطبيق.', wait: 'جارٍ معالجة الدفع', waitSub: 'إذا دفعت، ستظهر القسيمة بعد لحظات.', no: 'تم إلغاء الدفع', noSub: 'يمكنك العودة إلى التطبيق والمحاولة مرة أخرى.' },
};
function cpnPage(lang, mark, head, sub, dir) {
  return `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${head}</title><style>body{font-family:-apple-system,Segoe UI,Arial;background:#F5F1EA;color:#16222C;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center;padding:24px}.c{max-width:340px}.m{font-size:64px;color:#2E9E6B;line-height:1}h1{font-size:22px;margin:14px 0 6px}p{color:#7a7261;font-size:15px}</style></head><body><div class="c"><div class="m">${mark}</div><h1>${head}</h1><p>${sub}</p></div></body></html>`;
}

// GET /api/coupons/return — PayPal sends the buyer back here: capture, then publish.
app.get('/api/coupons/return', async (req, res) => {
  const couponId = String(req.query.c || '');
  const orderId = String(req.query.token || '');
  const L = CPN_PAGE[String(req.query.lang || 'en')] || CPN_PAGE.en;
  let ok = false;
  try {
    const tok = await paypalToken();
    if (tok && orderId) {
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      });
      const cap = await capRes.json();
      if (cap.status === 'COMPLETED') ok = activateCoupon(couponId, orderId);
    }
  } catch (e) { console.warn('coupon capture error', e); }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(ok ? cpnPage(req.query.lang || 'en', '✓', L.ok, L.okSub, L.dir)
              : cpnPage(req.query.lang || 'en', '…', L.wait, L.waitSub, L.dir));
});

app.get('/api/coupons/cancel', (req, res) => {
  const L = CPN_PAGE[String(req.query.lang || 'en')] || CPN_PAGE.en;
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(cpnPage(req.query.lang || 'en', '×', L.no, L.noSub, L.dir));
});

// POST /api/coupons/webhook — backup path when the buyer closes the browser.
app.post('/api/coupons/webhook', async (req, res) => {
  try {
    const event = req.body || {};
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (webhookId) {
      const tok = await paypalToken();
      const v = tok ? await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_algo: req.headers['paypal-auth-algo'],
          cert_url: req.headers['paypal-cert-url'],
          transmission_id: req.headers['paypal-transmission-id'],
          transmission_sig: req.headers['paypal-transmission-sig'],
          transmission_time: req.headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }).then(r => r.json()).catch(() => null) : null;
      if (!v || v.verification_status !== 'SUCCESS') return res.status(400).json({ success: false });
    }
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const cid = (event.resource && event.resource.custom_id) || '';
      if (cid.startsWith('inv:')) featureInvestment(cid.slice(4), event.resource.id || null);
      else if (cid) activateCoupon(cid, event.resource.id || null);
    }
    res.json({ success: true });
  } catch { res.status(200).json({ success: true }); }
});

// Admin: full list (pending included) and manual removal.
app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  res.json({ success: true, data: getCoupons(readDB()) });
});
app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.coupons = getCoupons(db).filter(c => c.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});



// ─── Page views ─────────────────────────────────────────────────
// Own analytics, no third party: the app posts a screen key, the server keeps a
// per-day counter. Kept in its own file so coupon writes never race with it, and
// flushed on a timer so a burst of screens is one disk write, not fifty.
const VIEWS_PATH = path.join(DATA_DIR, 'views.json');
const VIEWS_KEEP_DAYS = 120;
let VIEWS = null;
let viewsDirty = false;

function loadViews() {
  if (VIEWS) return VIEWS;
  try { VIEWS = JSON.parse(fs.readFileSync(VIEWS_PATH, 'utf-8')); }
  catch { VIEWS = { daily: {}, total: {} }; }
  if (!VIEWS.daily) VIEWS.daily = {};
  if (!VIEWS.total) VIEWS.total = {};
  return VIEWS;
}
function today() { return new Date().toISOString().slice(0, 10); }
function flushViews() {
  if (!viewsDirty || !VIEWS) return;
  // Drop days past the retention window so the file cannot grow without bound.
  const cutoff = new Date(Date.now() - VIEWS_KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  for (const d of Object.keys(VIEWS.daily)) if (d < cutoff) delete VIEWS.daily[d];
  try { fs.writeFileSync(VIEWS_PATH, JSON.stringify(VIEWS), 'utf-8'); viewsDirty = false; }
  catch (e) { console.warn('views write failed', e); }
}
setInterval(flushViews, 10000).unref?.();

// Screen keys are app-controlled; keep them short and boring so nothing odd
// ends up as a JSON key.
function cleanKey(k) {
  return String(k || '').trim().slice(0, 60).replace(/[^a-zA-Z0-9:_-]/g, '');
}

function bump(key) {
  const v = loadViews();
  const d = today();
  if (!v.daily[d]) v.daily[d] = {};
  v.daily[d][key] = (v.daily[d][key] || 0) + 1;
  v.total[key] = (v.total[key] || 0) + 1;
  viewsDirty = true;
}

// POST /api/views  {key} or {keys:[...]} — count one or more screen opens.
app.post('/api/views', (req, res) => {
  try {
    const b = req.body || {};
    const raw = Array.isArray(b.keys) ? b.keys : [b.key];
    const keys = raw.map(cleanKey).filter(Boolean).slice(0, 20);
    if (!keys.length) return res.status(400).json({ success: false, error: 'key required' });
    keys.forEach(bump);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// GET /api/views?key=coupon:123 — public count for one key (a business owner
// seeing how many people opened their coupon).
app.get('/api/views', (req, res) => {
  const key = cleanKey(req.query.key);
  if (!key) return res.status(400).json({ success: false, error: 'key required' });
  const v = loadViews();
  const days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, n: (v.daily[d] && v.daily[d][key]) || 0 });
  }
  const sum = n => days.slice(0, n).reduce((a, x) => a + x.n, 0);
  res.json({ success: true, key, total: v.total[key] || 0, today: days[0].n, last7: sum(7), last30: sum(30), days });
});

// GET /api/admin/views — everything, most viewed first.
app.get('/api/admin/views', requireAdmin, (_req, res) => {
  const v = loadViews();
  const top = Object.entries(v.total).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, n }));
  res.json({ success: true, total: top, daily: v.daily });
});



// Admin: every visitor photo, pending first.
app.get('/api/admin/album', requireAdmin, (_req, res) => {
  const db = readDB();
  const out = [];
  Object.entries(db.album || {}).forEach(([key, arr]) => {
    (arr || []).forEach(p => out.push({ ...p, key, status: p.status || 'approved' }));
  });
  out.sort((a, b) => ((a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)) || (b.at || '').localeCompare(a.at || ''));
  res.json({ success: true, data: out });
});

app.post('/api/admin/album/:key/:id/:action', requireAdmin, (req, res) => {
  const { key, id, action } = req.params;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: 'bad action' });
  const db = readDB();
  const arr = (db.album && db.album[key]) || [];
  const p = arr.find(x => x.id === id);
  if (!p) return res.status(404).json({ success: false, error: 'not found' });
  p.status = action === 'approve' ? 'approved' : 'rejected';
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/admin/album/:key/:id', requireAdmin, (req, res) => {
  const { key, id } = req.params;
  const db = readDB();
  const arr = (db.album && db.album[key]) || [];
  const p = arr.find(x => x.id === id);
  if (!p) return res.status(404).json({ success: false, error: 'not found' });
  db.album[key] = arr.filter(x => x.id !== id);
  writeDB(db);
  try {
    const fp = path.join(UPLOADS_DIR, path.basename(String(p.url)));
    if (fp.startsWith(UPLOADS_DIR) && fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {}
  res.json({ success: true });
});

// ─── Tour ratings ───────────────────────────────────────────────
// One rating per device per tour, so the average is not a tally of taps. The
// average is public: everyone sees what everyone else thought.
function getRatings(db) { return (db.ratings = db.ratings || {}); }

app.get('/api/ratings', (req, res) => {
  const db = readDB();
  const all = getRatings(db);
  const key = req.query.key ? String(req.query.key).slice(0, 80) : null;
  const summarize = (m) => {
    const vals = Object.values(m || {});
    if (!vals.length) return { avg: 0, count: 0 };
    return { avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10, count: vals.length };
  };
  if (key) return res.json({ success: true, key, ...summarize(all[key]) });
  const out = {};
  Object.keys(all).forEach(k => { out[k] = summarize(all[k]); });
  res.json({ success: true, data: out });
});

app.post('/api/ratings', (req, res) => {
  const b = req.body || {};
  const key = String(b.key || '').slice(0, 80);
  const device = String(b.device || '').slice(0, 64);
  const value = Math.round(Number(b.value));
  if (!key || !device || !(value >= 1 && value <= 5)) return res.status(400).json({ success: false, error: 'bad rating' });
  const db = readDB();
  const all = getRatings(db);
  all[key] = all[key] || {};
  all[key][device] = value; // re-rating replaces, never adds
  writeDB(db);
  const vals = Object.values(all[key]);
  res.json({ success: true, avg: Math.round((vals.reduce((a, x) => a + x, 0) / vals.length) * 10) / 10, count: vals.length });
});

// ─── Admin WhatsApp notification (Green API, same setup as batumionline.biz) ──
// Silent no-op unless all four env vars are set, so a missing config can never
// break a submission.
const GREEN_URL = process.env.GREEN_API_URL;
const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE;
const GREEN_TOKEN = process.env.GREEN_API_TOKEN;
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP; // international digits, e.g. 972502844867

async function notifyAdmin(message) {
  if (!GREEN_URL || !GREEN_INSTANCE || !GREEN_TOKEN || !ADMIN_WHATSAPP) return;
  let phone = String(ADMIN_WHATSAPP).replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '972' + phone.slice(1);
  try {
    await fetch(`${GREEN_URL}/waInstance${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
    });
  } catch (e) { console.warn('whatsapp notify failed', e && e.message); }
}

// ─── Investment opportunities ───────────────────────────────────
// A promoter submits an offering; it stays pending until an admin approves it,
// exactly like property listings. Nothing a promoter writes is public on its own.
function getInvest(db) { return Array.isArray(db.investments) ? db.investments : []; }

function isFeatured(x) { return !!(x.featuredUntil && new Date(x.featuredUntil).getTime() > Date.now()); }

app.get('/api/investments', (_req, res) => {
  const list = getInvest(readDB())
    .filter(x => x.status === 'approved')
    // Paid listings first, then newest.
    .sort((a, b) => (isFeatured(b) - isFeatured(a)) || (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map(({ contactPhone, contactEmail, delToken, ...pub }) => {
      const featured = isFeatured(pub);
      // A free listing is a one-line strip, so it carries no media at all.
      return featured
        ? { ...pub, featured }
        : { ...pub, featured, photos: [], video: null, brochure: null, website: '', facebook: '', instagram: '', whatsapp: '' };
    });
  res.json({ success: true, data: list });
});

app.post('/api/investments', upload.fields([{ name: 'photos', maxCount: 6 }, { name: 'video', maxCount: 1 }, { name: 'brochure', maxCount: 1 }]), (req, res) => {
  try {
    const b = req.body || {};
    const need = ['title', 'promoter', 'minAmount', 'contactPhone'];
    const missing = need.filter(k => !String(b[k] || '').trim());
    if (missing.length) return res.status(400).json({ success: false, error: 'missing: ' + missing.join(', ') });
    const files = req.files || {};
    const photos = (files.photos || []).map(f => `/uploads/${f.filename}`);
    const db = readDB();
    const list = getInvest(db);
    // The submitting device keeps this token; it is what lets the promoter edit
    // or delete their own listing later without an account.
    const delToken = crypto.randomBytes(16).toString('hex');
    const id = crypto.randomBytes(8).toString('hex');
    list.push({
      id,
      delToken,
      title: String(b.title).slice(0, 120),
      promoter: String(b.promoter).slice(0, 120),
      kind: String(b.kind || 'realestate').slice(0, 40), // realestate | fund | business | other
      area: String(b.area || '').slice(0, 80),
      minAmount: String(b.minAmount).slice(0, 20),
      currency: b.currency === 'USD' ? 'USD' : 'AED',
      yieldPct: String(b.yieldPct || '').slice(0, 10),
      horizon: String(b.horizon || '').slice(0, 40),          // e.g. "3-5 years"
      desc: String(b.desc || '').slice(0, 4000),
      photos,
      video: (files.video || []).map(f => `/uploads/${f.filename}`)[0] || null,
      brochure: (files.brochure || []).map(f => `/uploads/${f.filename}`)[0] || null,
      contactPhone: String(b.contactPhone).slice(0, 40),
      contactEmail: String(b.contactEmail || '').slice(0, 120),
      // Public channels the promoter chooses to show; shown on paid listings only.
      website: String(b.website || '').slice(0, 200),
      facebook: String(b.facebook || '').slice(0, 200),
      instagram: String(b.instagram || '').slice(0, 200),
      whatsapp: String(b.whatsapp || '').slice(0, 40),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    db.investments = list;
    writeDB(db);
    notifyAdmin(
      `🔔 מודעת השקעה חדשה ממתינה לאישור

` +
      `📌 ${b.title}
👤 ${b.promoter}
📍 ${b.area || '-'}
` +
      `💰 ${b.currency === 'USD' ? 'USD' : 'AED'} ${b.minAmount}
📱 ${b.contactPhone}

` +
      `לאישור: https://wellcomedubai.com/admin/stats.html

— WellCome Dubai`
    );
    res.json({ success: true, id, delToken });
  } catch (e) { res.status(500).json({ success: false, error: String((e && e.message) || e) }); }
});

// Public detail view: approved listings only, contact details withheld — an
// enquiry goes through /contact below so the promoter's number is never exposed.
app.get('/api/investments/view/:id', (req, res) => {
  const it = getInvest(readDB()).find(x => x.id === req.params.id && x.status === 'approved');
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  const { contactPhone, contactEmail, delToken, ...pub } = it;
  const featured = isFeatured(pub);
  res.json({ success: true, data: featured
    ? { ...pub, featured }
    : { ...pub, featured, photos: [], video: null, brochure: null, website: '', facebook: '', instagram: '', whatsapp: '' } });
});

// An investor asks about a listing. We relay it rather than hand out the number.
app.post('/api/investments/:id/contact', (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0, 80);
  const phone = String(b.phone || '').trim().slice(0, 40);
  const note = String(b.note || '').trim().slice(0, 600);
  if (!name || !phone) return res.status(400).json({ success: false, error: 'name and phone required' });
  const it = getInvest(readDB()).find(x => x.id === req.params.id && x.status === 'approved');
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  notifyAdmin(
    `💼 פנייה חדשה על מודעת השקעה\n\n` +
    `📌 ${it.title}\n👤 ${it.promoter}\n\n` +
    `מתעניין: ${name}\n📱 ${phone}\n${note ? '\n' + note + '\n' : ''}\n` +
    `היזם: ${it.contactPhone}${it.contactEmail ? ' · ' + it.contactEmail : ''}\n\n— WellCome Dubai`
  );
  res.json({ success: true });
});

// The promoter's own view of one listing (needs the token the device kept).
app.get('/api/investments/:id', (req, res) => {
  const token = req.query.token;
  const it = getInvest(readDB()).find(x => x.id === req.params.id);
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  if (!token || token !== it.delToken) return res.status(403).json({ success: false, error: 'forbidden' });
  res.json({ success: true, data: it });
});

// Edit. Any change sends the listing back for review, so an approved ad cannot be
// quietly swapped for different content.
app.put('/api/investments/:id', upload.fields([{ name: 'photos', maxCount: 6 }, { name: 'video', maxCount: 1 }]), (req, res) => {
  const b = req.body || {};
  const token = b.token || req.query.token;
  const db = readDB();
  const it = getInvest(db).find(x => x.id === req.params.id);
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  if (!token || token !== it.delToken) return res.status(403).json({ success: false, error: 'forbidden' });
  ['title', 'promoter', 'kind', 'area', 'minAmount', 'currency', 'yieldPct', 'horizon', 'desc', 'contactPhone', 'contactEmail',
   'website', 'facebook', 'instagram', 'whatsapp']
    .forEach(k => { if (b[k] !== undefined) it[k] = String(b[k]).slice(0, 4000); });
  const files = req.files || {};
  const newPhotos = (files.photos || []).map(f => `/uploads/${f.filename}`);
  if (newPhotos.length) it.photos = newPhotos;
  const newVideo = (files.video || []).map(f => `/uploads/${f.filename}`)[0];
  if (newVideo) it.video = newVideo;
  it.status = 'pending';
  it.updatedAt = new Date().toISOString();
  db.investments = getInvest(db);
  writeDB(db);
  res.json({ success: true });
});

app.delete('/api/investments/:id', (req, res) => {
  const token = (req.query && req.query.token) || (req.body && req.body.token);
  const db = readDB();
  const it = getInvest(db).find(x => x.id === req.params.id);
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  if (!token || token !== it.delToken) return res.status(403).json({ success: false, error: 'forbidden' });
  db.investments = getInvest(db).filter(x => x.id !== req.params.id);
  writeDB(db);
  try {
    (it.photos || []).concat(it.video ? [it.video] : []).forEach(p => {
      const fp = path.join(UPLOADS_DIR, path.basename(String(p)));
      if (fp.startsWith(UPLOADS_DIR) && fs.existsSync(fp)) fs.unlinkSync(fp);
    });
  } catch {}
  res.json({ success: true });
});

const INVEST_PRICE = '20.00';
const INVEST_DAYS = 90;

// Turn a listing into a paid full ad. Idempotent: capture and webhook may both fire.
function featureInvestment(id, orderId) {
  const db = readDB();
  const list = getInvest(db);
  const it = list.find(x => x.id === id);
  if (!it) return false;
  const base = it.featuredUntil && new Date(it.featuredUntil).getTime() > Date.now()
    ? new Date(it.featuredUntil).getTime()   // extend rather than truncate an active ad
    : Date.now();
  if (it.paidOrderId === orderId) return true;
  it.featuredUntil = new Date(base + INVEST_DAYS * 86400000).toISOString();
  it.paidAt = new Date().toISOString();
  if (orderId) it.paidOrderId = orderId;
  db.investments = list;
  writeDB(db);
  return true;
}

// POST /api/investments/pay {id, token} — $20 for 90 days as a full ad.
app.post('/api/investments/pay', async (req, res) => {
  try {
    const b = req.body || {};
    const it = getInvest(readDB()).find(x => x.id === String(b.id || ''));
    if (!it) return res.status(404).json({ success: false, error: 'not found' });
    if (!b.token || b.token !== it.delToken) return res.status(403).json({ success: false, error: 'forbidden' });
    const token = await paypalToken();
    if (!token) return res.status(503).json({ success: false, error: 'payments unavailable' });
    const base = serverBase(req);
    const lang = String(b.lang || 'en');
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ custom_id: 'inv:' + it.id, description: `Featured listing 90 days · ${it.title}`, amount: { currency_code: 'USD', value: INVEST_PRICE } }],
        application_context: {
          brand_name: 'WellCome Dubai',
          user_action: 'PAY_NOW',
          return_url: `${base}/api/investments/return?i=${encodeURIComponent(it.id)}&lang=${encodeURIComponent(lang)}`,
          cancel_url: `${base}/api/coupons/cancel?lang=${encodeURIComponent(lang)}`,
        },
      }),
    });
    const order = await orderRes.json();
    const approve = (order.links || []).find(l => l.rel === 'approve');
    if (!approve) return res.status(502).json({ success: false, error: 'paypal order failed' });
    res.json({ success: true, url: approve.href, orderId: order.id });
  } catch (e) { res.status(500).json({ success: false, error: String((e && e.message) || e) }); }
});

app.get('/api/investments/return', async (req, res) => {
  const id = String(req.query.i || '');
  const orderId = String(req.query.token || '');
  const L = CPN_PAGE[String(req.query.lang || 'en')] || CPN_PAGE.en;
  let ok = false;
  try {
    const tok = await paypalToken();
    if (tok && orderId) {
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      });
      const cap = await capRes.json();
      if (cap.status === 'COMPLETED') ok = featureInvestment(id, orderId);
    }
  } catch (e) { console.warn('investment capture error', e); }
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(ok ? cpnPage(req.query.lang || 'en', '✓', L.ok, L.okSub, L.dir)
              : cpnPage(req.query.lang || 'en', '…', L.wait, L.waitSub, L.dir));
});

app.get('/api/admin/investments', requireAdmin, (_req, res) => {
  res.json({ success: true, data: getInvest(readDB()) });
});
app.post('/api/admin/investments/:id/:action', requireAdmin, (req, res) => {
  const { id, action } = req.params;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, error: 'bad action' });
  const db = readDB();
  const list = getInvest(db);
  const it = list.find(x => x.id === id);
  if (!it) return res.status(404).json({ success: false, error: 'not found' });
  it.status = action === 'approve' ? 'approved' : 'rejected';
  db.investments = list;
  writeDB(db);
  res.json({ success: true });
});
app.delete('/api/admin/investments/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.investments = getInvest(db).filter(x => x.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});


app.listen(PORT, () => console.log(`Wellcome Dubai server running on port ${PORT}`));
