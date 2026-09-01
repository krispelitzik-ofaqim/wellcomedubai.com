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
app.get('/api/album', (req, res) => {
  const key = String(req.query.key || '').slice(0, 80);
  const db = readDB();
  const arr = (db.album && db.album[key]) || [];
  res.json({ photos: arr.map(p => p.url) });
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
    const added = files.map(f => ({ url: `/uploads/${f.filename}`, at: new Date().toISOString() }));
    db.album[key].push(...added);
    if (db.album[key].length > 200) db.album[key] = db.album[key].slice(-200); // cap runaway
    writeDB(db);
    res.json({ ok: true, photos: db.album[key].map(p => p.url) });
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
app.get('/api/version', (_req, res) => {
  res.json({
    latestVersion: process.env.LATEST_VERSION || '1.0.0',
    minVersion: process.env.MIN_VERSION || '0.0.0',
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

app.listen(PORT, () => console.log(`Wellcome Dubai server running on port ${PORT}`));
