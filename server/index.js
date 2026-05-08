const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

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
    cb(null, /\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v)$/i.test(file.originalname));
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
  res.json({ listings: approved });
});

app.post('/api/listings', upload.fields([{ name: 'photos', maxCount: 8 }, { name: 'video', maxCount: 1 }]), (req, res) => {
  try {
    const { title, type, price, area, desc, phone, size, highlight } = req.body;
    if (!title || !price || !area || !phone) return res.status(400).json({ error: 'missing fields' });
    const files = req.files || {};
    const photos = (files.photos || []).map(f => `/uploads/${f.filename}`);
    const video = files.video && files.video[0] ? `/uploads/${files.video[0].filename}` : '';
    const listing = {
      id: 'l_' + Date.now() + '_' + Math.round(Math.random() * 1000),
      title, type: type || 'sale', price, area, desc: desc || '', phone, photos, video,
      size: size === 'large' ? 'large' : 'small',
      highlight: ['none','emphasized','negative'].includes(highlight) ? highlight : 'none',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
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

app.delete('/api/admin/listings/:id', requireAdmin, (req, res) => {
  const db = readDB();
  db.listings = (db.listings || []).filter(l => l.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
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
    ogCache.set(url, { image, fetchedAt: Date.now() });
    res.json({ success: true, image });
  } catch {
    res.json({ success: false, error: 'fetch failed' });
  }
});

app.listen(PORT, () => console.log(`Wellcome Dubai server running on port ${PORT}`));
