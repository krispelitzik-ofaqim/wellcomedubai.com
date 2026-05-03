#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PICKS = process.argv[2] || path.join(process.env.HOME, 'Downloads', 'picks.json');
const IMG_DIR = path.join(__dirname, '..', 'images', 'attractions');
const DATA_PATH = path.join(__dirname, '..', 'js', 'data.js');

const picks = JSON.parse(fs.readFileSync(PICKS, 'utf8'));
let copied = 0, skipped = 0, missing = 0;
const updatedIds = new Set();

for (const [id, file] of Object.entries(picks)) {
  if (file === '__skip' || !file) { skipped++; continue; }
  const src = path.join(IMG_DIR, file);
  const dst = path.join(IMG_DIR, `${id}.jpg`);
  if (!fs.existsSync(src)) { console.log(`  ✗ missing: ${file}`); missing++; continue; }
  fs.copyFileSync(src, dst);
  copied++;
  updatedIds.add(parseInt(id, 10));
}

let dataSrc = fs.readFileSync(DATA_PATH, 'utf8');
const backup = DATA_PATH + '.bak.' + Date.now();
fs.writeFileSync(backup, dataSrc);

let dataUpdates = 0;
dataSrc = dataSrc.replace(
  /(\{[^{}]*?id:(\d+)[^{}]*?category:"attractions"[^{}]*?image:")([^"]+)("[^{}]*?\})/g,
  (m, pre, id, oldPath, post) => {
    const idNum = parseInt(id, 10);
    if (!updatedIds.has(idNum)) return m;
    const newPath = `images/attractions/${id}.jpg`;
    if (oldPath === newPath) return m;
    dataUpdates++;
    return pre + newPath + post;
  }
);
fs.writeFileSync(DATA_PATH, dataSrc);

console.log(`\nCopied ${copied}, skipped ${skipped}, missing ${missing}`);
console.log(`data.js: ${dataUpdates} paths updated. Backup: ${backup}`);

// Cleanup candidate files for the picked attractions
let cleaned = 0;
for (const id of updatedIds) {
  for (const letter of ['a','b','c','d','e']) {
    const f = path.join(IMG_DIR, `${id}_${letter}.jpg`);
    if (fs.existsSync(f)) { fs.unlinkSync(f); cleaned++; }
  }
}
console.log(`Cleaned ${cleaned} candidate files`);
