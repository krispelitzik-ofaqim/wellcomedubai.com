// ─── Family finance portal ──────────────────────────────────────
// Reads the household workbook and serves it as JSON, so the portal shows the
// same numbers on every device. Everything here is gated behind KSAFIM_KEY —
// it is private financial data and must never be reachable without it.
const XLSX = require('xlsx');

const num = v => (typeof v === 'number' && isFinite(v)) ? v : 0;
const str = v => (v === null || v === undefined) ? '' : String(v).trim();

// The cash-flow sheet is a stack of year blocks: a marker row carrying
// [age, year], a header row, up to 12 month rows, then the year's totals.
function parseCash(rows) {
  const marks = [];
  rows.forEach((r, i) => {
    const a = r[0], b = r[1];
    if (typeof a === 'number' && typeof b === 'number' && b >= 2015 && b <= 2050 && a >= 40 && a <= 95)
      marks.push({ i, year: Math.round(b), age: Math.round(a) });
  });
  return marks.map((mk, k) => {
    const end = k + 1 < marks.length ? marks[k + 1].i : rows.length;
    const hdr = (rows[mk.i + 1] || []).map(str);
    const col = name => { const j = hdr.indexOf(name); return j < 0 ? null : j; };
    const ci = col('הכנסות'), ce = col('הוצאות');
    const months = [];
    for (let r = mk.i + 2; r < end && months.length < 12; r++) {
      const row = rows[r] || [];
      if (typeof row[0] === 'number' && row[0] >= 1 && row[0] <= 12) {
        const pick = (from, to) => {
          const o = [];
          for (let j = from; j < to; j++) if (hdr[j] && num(row[j])) o.push([hdr[j], Math.round(num(row[j]))]);
          return o.sort((a, b) => b[1] - a[1]);
        };
        months.push({
          m: Math.round(row[0]),
          i: Math.round(num(ci !== null ? row[ci] : 0)),
          e: Math.round(num(ce !== null ? row[ce] : 0)),
          ic: pick(1, ci === null ? 1 : ci),
          ec: pick((ci === null ? 0 : ci) + 1, ce === null ? 0 : ce),
        });
      }
    }
    const roll = key => {
      const t = new Map();
      months.forEach(m => m[key].forEach(([k2, v]) => t.set(k2, (t.get(k2) || 0) + v)));
      return [...t.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
    };
    return {
      year: mk.year, age: mk.age, months,
      income: months.reduce((a, m) => a + m.i, 0),
      expense: months.reduce((a, m) => a + m.e, 0),
      incCats: roll('ic'), expCats: roll('ec'),
    };
  }).filter(y => y.months.length && y.months.length <= 12);
}

function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) : [];
}

function parseWorkbook(buf) {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const years = parseCash(sheetRows(wb, 'מימון'));

  const props = [];
  sheetRows(wb, 'BATUMI').slice(1, 15).forEach(r => {
    if (r && r[2] && typeof r[3] === 'number' && typeof r[6] === 'number')
      props.push({ name: str(r[2]), sqm: num(r[3]), floor: num(r[4]),
                   usd: num(r[6]), ils: num(r[7]), ready: str(r[1]).slice(0, 10) });
  });

  const pension = [];
  sheetRows(wb, 'פנסיה').forEach(r => {
    const lbl = str(r && r[3]);
    if (/^\d+\/\d{4}$/.test(lbl)) {
      const [age, year] = lbl.split('/');
      pension.push({ year: +year, age: +age, total: num(r[6]), monthly: num(r[7]) });
    }
  });

  const solar = [];
  sheetRows(wb, 'סולארי').forEach(r => {
    if (r && typeof r[0] === 'number' && r[0] >= 2015 && r[0] <= 2050 && num(r[2]))
      solar.push({ year: Math.round(r[0]), income: num(r[2]), bank: num(r[6]) });
  });

  const loans = [];
  [['הלוואת יחידות דיור 1', 5, 7], ['הלוואה יחידת דיור 2', 6, 7]].forEach(([name, payIdx, leftIdx]) => {
    const rows = sheetRows(wb, name), out = [];
    let title = '';
    rows.forEach(r => {
      if (!title && r) { const t = r.find(c => typeof c === 'string' && c.includes('הלוואה של')); if (t) title = t; }
      if (r && typeof r[1] === 'number' && r[1] >= 1)
        out.push([Math.round(r[1]), str(r[2]).slice(0, 10), num(r[payIdx]), num(r[leftIdx])]);
    });
    if (out.length) loans.push({ title: title || name, rows: out, left: out[out.length - 1][3] });
  });

  return { years, props, pension, solar, loans, built: new Date().toISOString().slice(0, 10) };
}

module.exports = function mountKsafim(app, { DATA_DIR, path, fs, multer }) {
  const KEY = process.env.KSAFIM_KEY || '';
  const DIR = path.join(DATA_DIR, 'ksafim');
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const JSON_PATH = path.join(DIR, 'data.json');
  const XLSX_PATH = path.join(DIR, 'workbook.xlsx');

  // Private data: without a configured key nothing here answers at all.
  const guard = (req, res, next) => {
    if (!KEY) return res.status(503).json({ error: 'not configured' });
    const given = req.headers['x-ksafim-key'] || req.query.key || (req.body && req.body.key);
    if (given !== KEY) return res.status(401).json({ error: 'unauthorized' });
    next();
  };

  const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  app.post('/api/ksafim/upload', up.single('file'), guard, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    try {
      const parsed = parseWorkbook(req.file.buffer);
      if (!parsed.years.length) return res.status(422).json({ error: 'no year blocks found in מימון' });
      fs.writeFileSync(XLSX_PATH, req.file.buffer);            // keep the original
      fs.writeFileSync(JSON_PATH, JSON.stringify(parsed), 'utf-8');
      res.json({ success: true, years: parsed.years.length, built: parsed.built });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  app.get('/api/ksafim/data', guard, (_req, res) => {
    if (!fs.existsSync(JSON_PATH)) return res.status(404).json({ error: 'no data yet' });
    res.set('Cache-Control', 'no-store');
    res.type('application/json').send(fs.readFileSync(JSON_PATH, 'utf-8'));
  });
};
