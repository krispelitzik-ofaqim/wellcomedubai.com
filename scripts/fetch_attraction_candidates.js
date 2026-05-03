#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro';
const DATA_PATH = path.join(__dirname, '..', 'js', 'data.js');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CATEGORY = args[0] || 'attractions';
const ARG_LIMIT = args[1] ? parseInt(args[1], 10) : null;
const OUT_DIR = path.join(__dirname, '..', 'images', CATEGORY);
const CANDIDATES_PER = 3;

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, res => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.write(JSON.stringify(body)); req.end();
  });
}

function downloadFollow(url, dest, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
        return resolve(downloadFollow(next, dest, redirects - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', err => { fs.unlink(dest, () => reject(err)); });
    }).on('error', reject);
  });
}

function extractCategory(src, cat) {
  const start = src.indexOf(cat + ':');
  const arrStart = src.indexOf('[', start);
  let depth = 0, i = arrStart;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  return new Function('return ' + src.slice(arrStart, i))();
}

(async () => {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  let items = extractCategory(src, CATEGORY);
  if (ARG_LIMIT) items = items.slice(0, ARG_LIMIT);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Fetching ${CANDIDATES_PER} candidates for ${items.length} ${CATEGORY}...`);

  const meta = [];
  for (const r of items) {
    try {
      const search = await postJson(
        'https://places.googleapis.com/v1/places:searchText',
        { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.photos' },
        { textQuery: `${r.nameEn} Dubai`, locationBias: { circle: { center: { latitude: r.lat, longitude: r.lng }, radius: 2000 } }, maxResultCount: 1 }
      );
      const place = search.places && search.places[0];
      if (!place || !place.photos || !place.photos.length) {
        console.log(`  ✗ ${r.id} ${r.nameEn} — no photos`);
        meta.push({ id: r.id, name: r.nameEn, candidates: [] });
        continue;
      }
      const candidates = [];
      const letters = ['a','b','c','d','e'];
      for (let k = 0; k < Math.min(CANDIDATES_PER, place.photos.length); k++) {
        const dest = path.join(OUT_DIR, `${r.id}_${letters[k]}.jpg`);
        const url = `https://places.googleapis.com/v1/${place.photos[k].name}/media?maxWidthPx=1200&key=${API_KEY}`;
        await downloadFollow(url, dest);
        candidates.push(`${r.id}_${letters[k]}.jpg`);
      }
      meta.push({ id: r.id, name: r.nameEn, candidates });
      console.log(`  ✓ ${r.id} ${r.nameEn} — ${candidates.length} candidates`);
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.log(`  ✗ ${r.id} ${r.nameEn} — ${e.message}`);
      meta.push({ id: r.id, name: r.nameEn, candidates: [], error: e.message });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, '_candidates.json'), JSON.stringify(meta, null, 2));
  console.log(`\nDone. Meta saved to images/attractions/_candidates.json`);
})();
