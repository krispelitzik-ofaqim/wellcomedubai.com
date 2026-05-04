#!/usr/bin/env node
// Fetch real photos for each restaurant from Google Places API (New)
// Output: data/restaurant-places-photos.json -> { restaurantId: { photos:[{name,attribution}], placeName } }

const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = process.env.PLACES_KEY || 'AIzaSyDVYlYuM6saMxbhi2aKNCtiv6J8mR8LLgw';
const DATA_FILE = path.join(__dirname, '..', 'js', 'data.js');
const OUT_FILE = path.join(__dirname, '..', 'data', 'restaurant-places-photos.json');

function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error(raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function searchRestaurant(name) {
  return postJson('https://places.googleapis.com/v1/places:searchText', {
    textQuery: `${name} Dubai restaurant`,
    maxResultCount: 1,
    locationBias: { circle: { center: { latitude: 25.2048, longitude: 55.2708 }, radius: 50000 } }
  }, {
    'X-Goog-Api-Key': KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.photos'
  });
}

function parseRestaurants() {
  const text = fs.readFileSync(DATA_FILE, 'utf8');
  // Find the restaurants:[...] array boundaries
  const start = text.indexOf('restaurants:');
  const arrStart = text.indexOf('[', start);
  // Find matching close
  let depth = 0, i = arrStart, end = -1;
  for (; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  const arrText = text.slice(arrStart + 1, end);
  // Match each item line: { id:N, name:"..", ...
  const items = [];
  const re = /\{\s*id:(\d+),\s*name:"([^"]+)"/g;
  let m;
  while ((m = re.exec(arrText)) !== null) {
    items.push({ id: parseInt(m[1]), name: m[2] });
  }
  return items;
}

async function run() {
  const restaurants = parseRestaurants();
  console.log(`Found ${restaurants.length} restaurants`);
  let existing = {};
  if (fs.existsSync(OUT_FILE)) {
    try { existing = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch {}
  }
  const out = { ...existing };
  let i = 0;
  for (const h of restaurants) {
    i++;
    if (out[h.id] && out[h.id].photos && out[h.id].photos.length) {
      console.log(`[${i}/${restaurants.length}] #${h.id} ${h.name} — already has ${out[h.id].photos.length} photos, skip`);
      continue;
    }
    try {
      const r = await searchRestaurant(h.name);
      const place = (r.places || [])[0];
      if (!place) { console.log(`[${i}/${restaurants.length}] #${h.id} ${h.name} — no place found`); continue; }
      const photos = (place.photos || []).slice(0, 8).map(p => ({
        name: p.name, // e.g. places/PLACE_ID/photos/PHOTO_REF
        widthPx: p.widthPx, heightPx: p.heightPx,
        attribution: ((p.authorAttributions || [])[0] || {}).displayName || 'Google'
      }));
      out[h.id] = { placeName: place.displayName?.text || h.name, placeId: place.id, photos };
      console.log(`[${i}/${restaurants.length}] #${h.id} ${h.name} -> ${photos.length} photos (${place.displayName?.text})`);
    } catch (e) {
      console.error(`[${i}/${restaurants.length}] #${h.id} ${h.name} -> error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 150)); // rate-limit gentle
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\n✓ Saved ${Object.keys(out).length} restaurant entries to ${OUT_FILE}`);
}

run().catch(e => { console.error(e); process.exit(1); });
