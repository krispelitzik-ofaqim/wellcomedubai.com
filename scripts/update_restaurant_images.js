#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'js', 'data.js');
const IMG_DIR = path.join(__dirname, '..', 'images', 'restaurants');
const BACKUP = DATA_PATH + '.bak.' + Date.now();

let src = fs.readFileSync(DATA_PATH, 'utf8');
fs.writeFileSync(BACKUP, src);

// Match each restaurant entry line, find id and rewrite image:"..." to images/restaurants/{id}.jpg
// Only if file exists AND it's a restaurant entry (category:"restaurants")
let updated = 0, skipped = 0;
src = src.replace(
  /(\{[^{}]*?id:(\d+)[^{}]*?category:"restaurants"[^{}]*?image:")([^"]+)("[^{}]*?\})/g,
  (match, pre, id, oldPath, post) => {
    const newPath = `images/restaurants/${id}.jpg`;
    const fullPath = path.join(IMG_DIR, `${id}.jpg`);
    if (!fs.existsSync(fullPath)) { skipped++; return match; }
    if (oldPath === newPath) { skipped++; return match; }
    updated++;
    return pre + newPath + post;
  }
);

fs.writeFileSync(DATA_PATH, src);
console.log(`Updated ${updated} restaurant image paths, skipped ${skipped}`);
console.log(`Backup: ${BACKUP}`);
