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

app.post('/api/audio', audioUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ success: true, filename: req.file.filename, url: `/uploads/audio/${req.file.filename}` });
});

app.get('/api/audio', (_req, res) => {
  try {
    const dir = path.join(UPLOADS_DIR, 'audio');
    if (!fs.existsSync(dir)) return res.json({ files: [] });
    const files = fs.readdirSync(dir).filter(f => /\.(mp3|wav|m4a|aac)$/i.test(f));
    res.json({ files: files.map(f => ({ name: f, url: `/uploads/audio/${f}` })) });
  } catch { res.json({ files: [] }); }
});

app.delete('/api/audio/:name', (req, res) => {
  try {
    const filename = path.basename(decodeURIComponent(req.params.name));
    const fp = path.join(UPLOADS_DIR, 'audio', filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
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

app.listen(PORT, () => console.log(`Wellcome Dubai server running on port ${PORT}`));
