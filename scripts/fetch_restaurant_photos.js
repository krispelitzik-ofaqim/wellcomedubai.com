#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = 'AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro';
const DATA_PATH = path.join(__dirname, '..', 'js', 'data.js');

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const CATEGORY = args[0] || 'restaurants';
const ARG_LIMIT = args[1] ? parseInt(args[1], 10) : null;
const ARG_OVERWRITE = process.argv.includes('--overwrite');
const CAT_OUT_DIR = path.join(__dirname, '..', 'images', CATEGORY);

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
  if (start < 0) throw new Error(cat + ': not found');
  const arrStart = src.indexOf('[', start);
  let depth = 0, i = arrStart;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  const arrText = src.slice(arrStart, i);
  // parse via Function (data.js uses JS object literal syntax)
  return new Function('return ' + arrText)();
}

(async () => {
  const src = fs.readFileSync(DATA_PATH, 'utf8');
  let items = extractCategory(src, CATEGORY);
  if (ARG_LIMIT) items = items.slice(0, ARG_LIMIT);
  if (!fs.existsSync(CAT_OUT_DIR)) fs.mkdirSync(CAT_OUT_DIR, { recursive: true });
  console.log(`Processing ${items.length} ${CATEGORY}...`);

  const results = { ok: [], skipped: [], failed: [] };
  for (const r of items) {
    const dest = path.join(CAT_OUT_DIR, `${r.id}.jpg`);
    if (!ARG_OVERWRITE && fs.existsSync(dest)) {
      results.skipped.push(r.id);
      console.log(`  ⊘ ${r.id} ${r.nameEn} — already exists`);
      continue;
    }
    try {
      const search = await postJson(
        'https://places.googleapis.com/v1/places:searchText',
        { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.photos' },
        { textQuery: `${r.nameEn} Dubai`, locationBias: { circle: { center: { latitude: r.lat, longitude: r.lng }, radius: 2000 } }, maxResultCount: 1 }
      );
      const place = search.places && search.places[0];
      if (!place || !place.photos || !place.photos.length) {
        results.failed.push({ id: r.id, name: r.nameEn, reason: 'no photos' });
        console.log(`  ✗ ${r.id} ${r.nameEn} — no photos`);
        continue;
      }
      const photoName = place.photos[0].name;
      const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${API_KEY}`;
      await downloadFollow(photoUrl, dest);
      results.ok.push(r.id);
      console.log(`  ✓ ${r.id} ${r.nameEn}`);
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      results.failed.push({ id: r.id, name: r.nameEn, reason: e.message });
      console.log(`  ✗ ${r.id} ${r.nameEn} — ${e.message}`);
    }
  }

  console.log(`\nDone: ${results.ok.length} ok, ${results.skipped.length} skipped, ${results.failed.length} failed`);
  if (results.failed.length) console.log('Failed:', JSON.stringify(results.failed, null, 2));
})();
