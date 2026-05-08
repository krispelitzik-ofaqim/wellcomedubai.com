// ===== MAIN APP =====
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelector('.splash-screen').classList.add('hidden');
    document.querySelector('.app').classList.add('active');
  }, 1500);
  initApp();
});

let currentPage = 'home';
let map = null;
let markers = [];

function hasGoogle() {
  return typeof google !== 'undefined' && google.maps && !window._googleMapsBlocked;
}

// iOS detection — open Apple Maps natively on iPhone/iPad
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function navUrl(lat, lng, label) {
  const ll = `${lat},${lng}`;
  const q = label ? `&q=${encodeURIComponent(label)}` : '';
  if (isIOS()) {
    return `https://maps.apple.com/?daddr=${ll}${q}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`;
}
function placeUrl(query) {
  if (isIOS()) {
    return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function initApp() {
  renderHome();
  setupNavigation();
  setupSearch();
  setupHashRouting();
  fetch('data/hotel-photos.json?v=6').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.HOTEL_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/attraction-photos.json?v=2').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.ATTRACTION_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/restaurant-places-photos.json?v=2').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.RESTAURANT_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/shopping-photos.json?v=2').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.SHOPPING_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/nightlife-photos.json?v=2').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.NIGHTLIFE_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/kids-photos.json?v=2').then(r => r.ok ? r.json() : null).then(j => { if (j) { window.KIDS_PHOTOS = j; if (currentPage === 'home') renderHome(); } }).catch(() => {});
  fetch('data/gallery.json?v=3&t=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => { if (j) { window.GALLERY_IMAGES = j; renderHomeGalleryPreview(); } }).catch(() => {});
  // Enrich data with Google Places in background
  setTimeout(() => enrichAllCategories(), 2000);
}

async function enrichAllCategories() {
  if (!hasGoogle()) return;
  const categories = ['hotels','restaurants','attractions','shopping','nightlife'];
  for (const cat of categories) {
    const updated = await enrichCategoryWithGoogle(cat);
    if (updated) renderHome(); // Refresh with new ratings
  }
}

// ===== HASH ROUTING =====
function setupHashRouting() {
  const handle = () => {
    const hash = (location.hash || '').replace(/^#/, '');
    if (!hash) return;
    const [page, sub] = hash.split('/');
    if (page && page !== currentPage) {
      navigateTo(page, sub ? decodeURIComponent(sub) : undefined, { skipHash: true });
    }
  };
  window.addEventListener('hashchange', handle);
  window.addEventListener('popstate', handle);
  if (location.hash && location.hash !== '#home') handle();
}

// ===== NAVIGATION =====
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

function navigateTo(page, subcategory, opts) {
  currentPage = page;
  if (!opts || !opts.skipHash) {
    const hash = subcategory ? `#${page}/${encodeURIComponent(subcategory)}` : `#${page}`;
    if (location.hash !== hash) {
      try { history.pushState({ page, subcategory }, '', hash); } catch (e) { location.hash = hash; }
    }
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) { pageEl.classList.add('active'); pageEl.classList.add('fade-in'); }

  // List pages use page-list
  if (['hotels','restaurants','attractions','shopping','nightlife','transport','casino','kids','abudhabi'].includes(page)) {
    document.getElementById('page-list').classList.add('active');
    document.getElementById('page-home')?.classList.remove('active');
  }

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo(0, 0);

  switch(page) {
    case 'home': renderHome(); break;
    case 'hotels': renderListPage('hotels', 'מלונות', ['הכל','7 כוכבים','5 כוכבים','4-5 כוכבים','3-4 כוכבים','תקציבי'], subcategory); break;
    case 'restaurants': renderListPage('restaurants', 'מסעדות', ['הכל','יוקרתי מאוד','יוקרתי','עממי','ישראלי','לבנוני','טורקי','אוכל רחוב','משלוחים'], subcategory); break;
    case 'attractions': renderListPage('attractions', 'אטרקציות', ['הכל','חובה לביקור','מוזיאון','אומנות','אקסטרים','חוף','פארק מים','פארק שעשועים','סיור','גן חיות','ספארי מדבר','יהדות'], subcategory); break;
    case 'shopping': renderListPage('shopping', 'קניונים ושווקים', ['הכל','הכי מבוקש','קניון','שוק','אלכוהול'], subcategory); break;
    case 'nightlife': renderListPage('nightlife', 'בילויים', ['הכל','מועדון','בר גג','ביץ׳ קלאב','בידור','מופע'], subcategory); break;
    case 'kids': renderListPage('kids', 'ילדים ומשפחות', ['הכל','פארק שעשועים','פארק מים','אקווריום','מתחם ילדים','שלג'], subcategory); break;
    case 'transport': renderListPage('transport', 'תחבורה', ['הכל','מטרו','מונית','סירה','אפליקציה','אוטובוס','השכרת רכב'], subcategory); break;
    case 'casino': renderListPage('casino', 'בידור ומשחקים', ['הכל','קזינו','מרוצים','ספורט'], subcategory); break;
    case 'abudhabi': renderListPage('abudhabi', 'אבו דאבי', ['הכל','חובה לביקור','מוזיאון','דת','פארק שעשועים','פארק מים','קניון','שוק','ספורט'], subcategory); break;
    case 'map': renderMapPage(); break;
    case 'flights': renderFlightsPage(); break;
    case 'livecams': renderLiveCamsPage(); break;
    case 'weather': renderWeatherPage(); break;
    case 'currency': renderCurrencyPage(); break;
    case 'itineraries': renderItinerariesPage(); break;
    case 'legal': renderLegalPage(); break;
    case 'about': renderInfoSubPage('about'); break;
    case 'terms': renderInfoSubPage('terms'); break;
    case 'privacy': renderInfoSubPage('privacy'); break;
    case 'contact': renderInfoSubPage('contact'); break;
    case 'mall': renderMallPage(subcategory); break;
    case 'areas': renderAreasPage(); break;
    case 'info': renderInfoPage(); break;
    case 'near': renderNearMePage(); break;
    case 'mytrip': renderMyTripPage(); break;
    case 'gallery': renderGalleryPage(); break;
    case 'realestate': renderRealEstatePage(); break;
    case 'business': renderBusinessPortal(); break;
  }
}

// ===== MY TRIP =====
const MYTRIP_KEY = 'mytrip_v1';
function getMyTrip() {
  try {
    const raw = localStorage.getItem(MYTRIP_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { startDate: '', days: 3, items: [] };
}
function saveMyTrip(t) { localStorage.setItem(MYTRIP_KEY, JSON.stringify(t)); }

function addToMyTrip(category, id, opts) {
  const item = getItem(category, id);
  if (!item) return;
  const trip = getMyTrip();
  const entry = {
    uid: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    category, id,
    name: item.nameHe || item.name,
    image: item.image,
    address: item.address || '',
    lat: item.lat, lng: item.lng,
    day: opts?.day || 1,
    time: opts?.time || '',
    note: ''
  };
  trip.items.push(entry);
  saveMyTrip(trip);
  showTripToast(`✓ נוסף ל"הטיול שלי": ${entry.name}`);
}

function addItineraryToMyTrip(idx) {
  const it = (window.ITINERARY_STATES || ITINERARIES)[idx];
  if (!it) return;
  const trip = getMyTrip();
  const day = trip.items.length ? Math.max(...trip.items.map(i => i.day)) + 1 : 1;
  it.stops.forEach(s => {
    trip.items.push({
      uid: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      category: 'itinerary-stop', id: 0,
      name: s.name, image: s.image, address: '', lat: s.lat, lng: s.lng,
      day, time: s.time || '', note: it.title
    });
  });
  saveMyTrip(trip);
  showTripToast(`✓ נוסף מסלול "${it.title}" כיום ${day} בטיול שלך`);
}

function showTripToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2A9D8F;color:#fff;padding:10px 18px;border-radius:24px;font-family:Heebo;font-size:0.85rem;font-weight:700;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

function removeTripItem(uid) {
  const trip = getMyTrip();
  trip.items = trip.items.filter(i => i.uid !== uid);
  saveMyTrip(trip);
  renderMyTripPage();
}

function updateTripItemTime(uid, time) {
  const trip = getMyTrip();
  const it = trip.items.find(i => i.uid === uid);
  if (it) { it.time = time; saveMyTrip(trip); }
}
function updateTripItemDay(uid, day) {
  const trip = getMyTrip();
  const it = trip.items.find(i => i.uid === uid);
  if (it) { it.day = parseInt(day) || 1; saveMyTrip(trip); renderMyTripPage(); }
}
function updateTripMeta(field, val) {
  const trip = getMyTrip();
  if (field === 'days') trip.days = Math.max(1, Math.min(30, parseInt(val) || 1));
  else trip[field] = val;
  saveMyTrip(trip);
  renderMyTripPage();
}
function clearMyTrip() {
  if (!confirm('למחוק את כל הטיול שלי?')) return;
  saveMyTrip({ startDate: '', days: 3, items: [] });
  renderMyTripPage();
}

function onTripDragStart(e, uid) {
  e.dataTransfer.setData('text/plain', 'trip|' + uid);
  e.dataTransfer.effectAllowed = 'move';
}
function onTripDrop(e, targetDay, targetUid) {
  e.preventDefault();
  const parts = (e.dataTransfer.getData('text/plain') || '').split('|');
  if (parts[0] !== 'trip') return;
  const srcUid = parts[1];
  const trip = getMyTrip();
  const src = trip.items.find(i => i.uid === srcUid);
  if (!src) return;
  src.day = targetDay;
  if (targetUid && targetUid !== srcUid) {
    const idxSrc = trip.items.indexOf(src);
    trip.items.splice(idxSrc, 1);
    const idxTgt = trip.items.findIndex(i => i.uid === targetUid);
    trip.items.splice(idxTgt, 0, src);
  }
  saveMyTrip(trip);
  renderMyTripPage();
}

function dateForDay(startDate, dayN) {
  if (!startDate) return '';
  const d = new Date(startDate);
  d.setDate(d.getDate() + (dayN - 1));
  return d.toLocaleDateString('he-IL', { weekday:'long', day:'2-digit', month:'2-digit' });
}

function renderMyTripPage() {
  const page = document.getElementById('page-mytrip');
  if (!page) return;
  const trip = getMyTrip();
  const dayBuckets = {};
  for (let d = 1; d <= trip.days; d++) dayBuckets[d] = [];
  trip.items.forEach(i => { (dayBuckets[i.day] || (dayBuckets[i.day] = [])).push(i); });
  Object.keys(dayBuckets).forEach(d => {
    dayBuckets[d].sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  });
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-suitcase-rolling" style="color:#E76F51;margin-left:6px;"></i> הטיול שלי</h2>
    </div>
    <div style="display:flex;gap:6px;padding:10px 16px 0;">
      <button onclick="switchItinView('day');navigateTo('itineraries')" style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:1px solid #E5E7EB;background:#fff;color:#6B7F8D;">📅 מסלולי יום</button>
      <button onclick="switchItinView('star');navigateTo('itineraries')" style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:1px solid #E5E7EB;background:#fff;color:#6B7F8D;">⭐ טיולי כוכב</button>
      <button style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:2px solid #E76F51;background:#FFF5F2;color:#E76F51;">❤️ הטיול שלי</button>
    </div>
    <div style="background:#F5E6CB;border-right:3px solid #E76F51;padding:10px 14px;margin:12px 16px 0;border-radius:6px;font-size:0.82rem;color:#2C5F6E;line-height:1.5;">
      💡 הוסף לכאן אלמנטים לתכנון הטיול שלך על ידי לחיצה על <strong>+</strong> בכל קטגוריה באפליקציה.
    </div>
    <div style="padding:12px 16px 80px;">
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
          <div>
            <label style="font-size:0.75rem;color:#6B7F8D;font-weight:600;">תאריך התחלה</label>
            <input type="date" value="${trip.startDate || ''}" onchange="updateTripMeta('startDate', this.value)" style="width:100%;padding:8px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.88rem;color:#2C5F6E;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:0.75rem;color:#6B7F8D;font-weight:600;">מס׳ ימים</label>
            <input type="number" min="1" max="30" value="${trip.days}" onchange="updateTripMeta('days', this.value)" style="width:100%;padding:8px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.88rem;color:#2C5F6E;box-sizing:border-box;">
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;color:#6B7F8D;">
          <span>${trip.items.length} פריטים בסך הכל</span>
          ${trip.items.length ? `<button onclick="clearMyTrip()" style="background:none;border:none;color:#E76F51;font-family:Heebo;font-size:0.78rem;cursor:pointer;font-weight:600;"><i class="fas fa-trash"></i> מחק הכל</button>` : ''}
        </div>
      </div>
      ${!trip.items.length ? `
        <div style="background:#F5E6CB;border-radius:10px;padding:30px 20px;text-align:center;color:#6B7F8D;">
          <i class="fas fa-suitcase-rolling" style="font-size:2.5rem;color:#E9C46A;margin-bottom:12px;"></i>
          <div style="font-size:0.95rem;font-weight:700;color:#2C5F6E;margin-bottom:8px;">הטיול ריק</div>
          <div style="font-size:0.8rem;line-height:1.6;">לחצו על + בכרטיסים (מלון/מסעדה/אטרקציה) כדי להוסיף לטיול. הפריטים שתבחרו יסומנו בלב ❤️ כאן.</div>
        </div>
      ` : Object.keys(dayBuckets).sort((a,b)=>parseInt(a)-parseInt(b)).map(d => `
        <div ondragover="event.preventDefault()" ondrop="onTripDrop(event, ${d}, null)" style="background:#fff;border-right:4px solid #E76F51;border-radius:8px;padding:12px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #F5EFE6;padding-bottom:8px;">
            <div style="font-weight:800;color:#2C5F6E;font-size:0.95rem;">📅 יום ${d}</div>
            <div style="font-size:0.72rem;color:#6B7F8D;">${dateForDay(trip.startDate, parseInt(d))} · ${dayBuckets[d].length} פריטים</div>
          </div>
          ${dayBuckets[d].length ? dayBuckets[d].map(it => `
            <div draggable="true" ondragstart="onTripDragStart(event, '${it.uid}')" ondragover="event.preventDefault()" ondrop="onTripDrop(event, ${d}, '${it.uid}')" style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #F5EFE6;align-items:center;">
              <i class="fas fa-grip-vertical" style="color:#bbb;cursor:grab;font-size:0.85rem;"></i>
              <span style="font-size:0.95rem;flex-shrink:0;">❤️</span>
              ${it.image ? `<img src="${it.image}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;color:#2C5F6E;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
                ${it.address || it.note ? `<div style="font-size:0.7rem;color:#6B7F8D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.note ? '🗺️ ' + it.note : ''} ${it.address ? '· ' + it.address : ''}</div>` : ''}
              </div>
              <input type="time" value="${it.time || ''}" onchange="updateTripItemTime('${it.uid}', this.value)" style="width:78px;padding:4px;border:1px solid #E5E7EB;border-radius:4px;font-family:Heebo;font-size:0.78rem;flex-shrink:0;">
              <select onchange="updateTripItemDay('${it.uid}', this.value)" style="padding:4px;border:1px solid #E5E7EB;border-radius:4px;font-family:Heebo;font-size:0.75rem;flex-shrink:0;">${Array.from({length:trip.days},(_,i)=>i+1).map(n=>`<option value="${n}" ${n==it.day?'selected':''}>י${n}</option>`).join('')}</select>
              <button onclick="removeTripItem('${it.uid}')" style="background:none;border:none;color:#E76F51;cursor:pointer;font-size:0.95rem;flex-shrink:0;"><i class="fas fa-times"></i></button>
            </div>
          `).join('') : `<div style="text-align:center;color:#9CA3AF;font-size:0.78rem;padding:14px;">אין פריטים ביום זה — גררו לכאן או הוסיפו מהקטגוריות</div>`}
        </div>
      `).join('')}
    </div>
  `;
}

// ===== NEAR ME =====
function nearMeToggleHTML() {
  const id = 'nmt_' + Math.random().toString(36).slice(2,9);
  return `
    <div style="margin:10px 12px;display:flex;align-items:center;justify-content:space-between;background:#fff;border-radius:8px;padding:10px 14px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      <div style="display:flex;align-items:center;gap:8px;">
        <i class="fas fa-location-arrow" style="color:#E76F51;font-size:1rem;"></i>
        <span style="color:#2C5F6E;font-weight:700;font-size:0.88rem;">הראה לי מה קרוב אליי עכשיו</span>
      </div>
      <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" id="${id}" onchange="navigateTo('near')" style="opacity:0;width:0;height:0;">
        <span style="position:absolute;inset:0;background:#E5E7EB;border-radius:24px;transition:0.25s;"></span>
        <span style="position:absolute;top:3px;right:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
      </label>
    </div>`;
}

window.ITIN_RESTAURANTS_ON = window.ITIN_RESTAURANTS_ON || {};
function itinRestaurantsToggleHTML(idx) {
  const id = `irt_${idx}`;
  const isOn = !!window.ITIN_RESTAURANTS_ON[idx];
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#F5E6CB;border-top:1px solid #F5EFE6;border-bottom:1px solid #F5EFE6;padding:8px 14px;">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;">
        <i class="fas fa-utensils" style="color:#E76F51;font-size:0.95rem;"></i>
        <span style="color:#2C5F6E;font-weight:700;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">הפעל חיפוש מסעדות קרובות אליי במהלך הסיור</span>
      </div>
      <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" id="${id}" ${isOn ? 'checked' : ''} onchange="toggleItinRestaurants(${idx}, this)" style="opacity:0;width:0;height:0;">
        <span class="irt-track" style="position:absolute;inset:0;background:${isOn ? '#2A9D8F' : '#9CA3AF'};border-radius:22px;transition:0.25s;"></span>
        <span class="irt-knob" style="position:absolute;top:3px;${isOn ? 'left:3px' : 'right:3px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
      </label>
    </div>`;
}

function toggleItinRestaurants(idx, input) {
  const on = input.checked;
  window.ITIN_RESTAURANTS_ON[idx] = on;
  const label = input.parentElement;
  const track = label.querySelector('.irt-track');
  const knob = label.querySelector('.irt-knob');
  track.style.background = on ? '#2A9D8F' : '#9CA3AF';
  knob.style.left = on ? '3px' : '';
  knob.style.right = on ? '' : '3px';
  renderItinRestaurants(idx);
}

function renderItinRestaurants(idx) {
  const container = document.getElementById(`itin-restaurants-${idx}`);
  if (!container) return;
  if (!window.ITIN_RESTAURANTS_ON[idx]) { container.innerHTML = ''; return; }
  const it = (ITINERARY_STATES || ITINERARIES)[idx];
  if (!it) return;
  const slider = document.getElementById(`itin-slider-${idx}`);
  const cur = slider ? parseInt(slider.dataset.current || '0') : 0;
  const stop = it.stops[cur];
  const restaurants = getAllItems('restaurants').filter(r => r.lat && r.lng);
  let list;
  if (stop && stop.lat && stop.lng) {
    const distKm = (a, b) => {
      const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180;
      const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return 2*R*Math.asin(Math.sqrt(x));
    };
    list = restaurants
      .map(r => ({ ...r, _dist: distKm(stop, r) }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 6);
  } else {
    list = sortByRating(restaurants).slice(0, 6);
  }
  container.innerHTML = `
    <div style="padding:10px 12px 4px;font-size:0.8rem;color:#6B7280;font-weight:600;">🍽️ מסעדות ליד: ${stop ? stop.name : ''}</div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:0 0 8px;">
      ${list.map(item => `
        <div style="position:relative;">
          ${item._dist != null ? `<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.6);color:#fff;font-size:0.65rem;padding:2px 7px;border-radius:10px;z-index:2;">${item._dist.toFixed(1)} ק"מ</div>` : ''}
          ${cardHTML(item, 'restaurants', true)}
        </div>
      `).join('')}
    </div>
  `;
}

function loadHomeNearRow() {
  const el = document.getElementById('topNear');
  if (!el) return;
  if (!navigator.geolocation) { el.innerHTML = ''; return; }
  if (window._homeNearCache) { renderHomeNearRow(window._homeNearCache.lat, window._homeNearCache.lng); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      window._homeNearCache = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      renderHomeNearRow(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      el.innerHTML = `<div onclick="navigateTo('near')" style="background:#fff;border-radius:8px;padding:14px;border:1px dashed #E76F51;color:#E76F51;font-weight:600;text-align:center;cursor:pointer;font-size:0.85rem;">הפעל מיקום לראות מה קרוב אליך →</div>`;
    },
    { timeout: 5000, maximumAge: 600000 }
  );
}

function renderHomeNearRow(myLat, myLng) {
  const el = document.getElementById('topNear');
  if (!el) return;
  const db = getDB();
  const all = [];
  NEAR_CATS.forEach(cat => {
    (db[cat.key] || []).filter(it => it.lat && it.lng).forEach(it => {
      all.push({ ...it, _cat: cat, _dist: haversineKm(myLat, myLng, it.lat, it.lng) });
    });
  });
  all.sort((a, b) => a._dist - b._dist);
  const top = all.slice(0, 6);
  if (!top.length) { el.innerHTML = ''; return; }
  el.style.padding = '0';
  el.className = 'cards-scroll';
  el.innerHTML = top.map(it => `
    <div onclick="navigateTo('near')" style="min-width:160px;width:160px;scroll-snap-align:start;background:#fff;border-radius:8px;overflow:hidden;border-right:4px solid ${it._cat.color};cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <div style="position:relative;height:100px;overflow:hidden;">
        <img src="${it.image}" alt="${it.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
        <div style="position:absolute;top:6px;left:6px;background:${it._cat.color};color:#fff;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;">${it._dist.toFixed(1)} ק"מ</div>
      </div>
      <div style="padding:8px 10px;">
        <div style="font-weight:700;color:#2C5F6E;font-size:0.78rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.nameHe || it.name}</div>
        <div style="color:${it._cat.color};font-size:0.65rem;margin-top:3px;font-weight:600;"><i class="fas ${it._cat.icon}"></i> ${it._cat.label}</div>
      </div>
    </div>`).join('');
}

function toggleNearMe(el) {
  const slider = document.getElementById('nearMeSlider');
  const knob = document.getElementById('nearMeKnob');
  if (el.checked) {
    slider.style.background = '#2A9D8F';
    knob.style.right = '25px';
    navigateTo('near');
  } else {
    slider.style.background = '#E5E7EB';
    knob.style.right = '3px';
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = d => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEAR_CATS = [
  { key:'restaurants', label:'מסעדות', color:'#F4A261', icon:'fa-utensils' },
  { key:'attractions', label:'אטרקציות', color:'#2A9D8F', icon:'fa-landmark' },
  { key:'shopping', label:'קניות', color:'#F4A261', icon:'fa-shopping-bag' },
  { key:'nightlife', label:'בילויים', color:'#B85C8E', icon:'fa-glass-cheers' },
  { key:'kids', label:'ילדים', color:'#E76F51', icon:'fa-child' },
  { key:'hotels', label:'מלונות', color:'#E9C46A', icon:'fa-hotel' }
];

function renderNearMePage() {
  const page = document.getElementById('page-near');
  page.innerHTML = `<div style="padding:20px;text-align:center;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#E76F51;"></i><div style="margin-top:12px;">מבקש את המיקום שלך...</div></div>`;
  if (!navigator.geolocation) {
    page.innerHTML = `<div style="padding:30px 20px;text-align:center;color:#6B7F8D;">הדפדפן לא תומך במיקום</div>`;
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    renderNearList(pos.coords.latitude, pos.coords.longitude);
  }, err => {
    page.innerHTML = `
      <div style="padding:30px 20px;text-align:center;">
        <i class="fas fa-location-slash" style="font-size:2rem;color:#E76F51;"></i>
        <div style="color:#2C5F6E;font-weight:700;margin-top:14px;">לא הצלחנו לאתר את המיקום</div>
        <div style="color:#6B7F8D;font-size:0.85rem;margin-top:6px;">אפשר הרשאת מיקום בדפדפן ונסה שוב</div>
        <button onclick="renderNearMePage()" style="margin-top:16px;padding:10px 22px;background:#2A9D8F;color:#fff;border:none;border-radius:6px;font-family:Heebo;font-weight:600;cursor:pointer;">נסה שוב</button>
      </div>`;
  }, { enableHighAccuracy:true, timeout:10000 });
}

function renderNearList(myLat, myLng) {
  const db = getDB();
  const sections = NEAR_CATS.map(cat => {
    const items = (db[cat.key] || [])
      .filter(it => it.lat && it.lng)
      .map(it => ({ ...it, _dist: haversineKm(myLat, myLng, it.lat, it.lng) }))
      .sort((a, b) => a._dist - b._dist)
      .slice(0, 5);
    if (!items.length) return '';
    const renderRow = it => `
      <div onclick="openDetail('${cat.key}', ${it.id})" style="display:flex;gap:12px;background:#fff;border-radius:8px;overflow:hidden;border-right:4px solid ${cat.color};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.05);align-items:stretch;">
        <div style="width:90px;height:90px;flex-shrink:0;overflow:hidden;background:#E5E7EB;">
          <img src="${it.image}" alt="${it.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
        </div>
        <div style="flex:1;padding:10px 12px 10px 0;display:flex;flex-direction:column;justify-content:center;min-width:0;">
          <div style="font-weight:700;color:#2C5F6E;font-size:0.92rem;line-height:1.2;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.nameHe || it.name}</div>
          <div style="color:#6B7F8D;font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i class="fas fa-map-marker-alt" style="color:${cat.color};font-size:0.65rem;margin-left:4px;"></i>${it.address || ''}</div>
          <div style="margin-top:5px;">
            <span style="background:${cat.color};color:#fff;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;">${it._dist.toFixed(1)} ק"מ</span>
          </div>
        </div>
      </div>`;
    const visible = items.slice(0, 2).map(renderRow).join('');
    const hidden = items.slice(2).map(renderRow).join('');
    const sectionId = `near_${cat.key}_more`;
    const moreBtn = hidden ? `
      <div style="padding:0 20px;">
        <button onclick="document.getElementById('${sectionId}').style.display='flex';this.style.display='none';" style="width:100%;background:transparent;border:1px dashed ${cat.color};color:${cat.color};padding:8px;border-radius:6px;font-family:Heebo;font-weight:600;cursor:pointer;font-size:0.8rem;">עוד ${items.length - 2}...</button>
      </div>
      <div id="${sectionId}" style="display:none;flex-direction:column;gap:8px;padding:8px 20px 0;">${hidden}</div>` : '';
    return `
      <div style="margin-bottom:18px;">
        <h3 style="padding:0 20px 8px;font-size:1rem;font-weight:800;color:${cat.color};display:flex;align-items:center;gap:8px;margin:0;">
          <i class="fas ${cat.icon}"></i>${cat.label}
        </h3>
        <div style="display:flex;flex-direction:column;gap:8px;padding:0 20px 8px;">${visible}</div>
        ${moreBtn}
      </div>`;
  }).join('');

  const page = document.getElementById('page-near');
  page.innerHTML = `
    <div style="padding:14px 20px;background:linear-gradient(135deg,#2C5F6E,#2A9D8F);color:#fff;display:flex;align-items:center;gap:10px;">
      <i class="fas fa-location-arrow" style="font-size:1.1rem;color:#E9C46A;"></i>
      <div style="flex:1;">
        <div style="font-weight:800;font-size:1rem;">קרוב אליך עכשיו</div>
        <div style="font-size:0.72rem;opacity:0.85;">2 הקרובים מכל קטגוריה (עוד 3 בלחיצה)</div>
      </div>
      <button onclick="closeNearMe()" style="background:rgba(255,255,255,0.18);color:#fff;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;">×</button>
    </div>
    <div id="nearMap" style="width:100%;height:220px;background:#E5E7EB;"></div>
    ${sections}
  `;
  setTimeout(() => initNearMap(myLat, myLng, db), 50);
}

function initNearMap(myLat, myLng, db) {
  const el = document.getElementById('nearMap');
  if (!el || typeof L === 'undefined') return;
  const map = L.map(el).setView([myLat, myLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);
  L.marker([myLat, myLng], { title:'אני' }).addTo(map).bindPopup('אני כאן');
  NEAR_CATS.forEach(cat => {
    (db[cat.key] || []).filter(it => it.lat && it.lng)
      .map(it => ({ ...it, _dist: haversineKm(myLat, myLng, it.lat, it.lng) }))
      .sort((a,b) => a._dist - b._dist).slice(0, 5)
      .forEach(it => {
        const dot = L.divIcon({ className:'', html:`<div style="background:${cat.color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>`, iconSize:[14,14] });
        L.marker([it.lat, it.lng], { icon:dot }).addTo(map).bindPopup(`<b>${it.nameHe || it.name}</b><br>${it._dist.toFixed(2)} ק"מ`);
      });
  });
}

function closeNearMe() {
  const t = document.getElementById('nearMeToggle');
  if (t) { t.checked = false; toggleNearMe(t); }
  navigateTo('home');
}

// ===== SEARCH =====
function searchAll(query) {
  const q = query.toLowerCase();
  const db = getDB();
  const cats = ['hotels','restaurants','attractions','shopping','nightlife','transport','casino','kids','abudhabi'];
  const results = [];
  cats.forEach(cat => {
    (db[cat] || []).forEach(item => {
      const hay = [item.name, item.nameEn, item.nameHe, item.description, item.address, ...(item.tags || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (hay.includes(q)) results.push({ ...item, category: cat });
    });
  });
  return results;
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const q = input.value.trim();
      if (q.length >= 2) {
        showSearchResults(q);
      } else if (q.length === 0) {
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchResults').style.display = 'none';
      }
    }, 300);
  });
}

function showSearchResults(query) {
  const results = searchAll(query);
  const container = document.getElementById('searchResults');
  if (!results.length) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gray);">לא נמצאו תוצאות</div>';
    container.style.display = 'block';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = results.slice(0, 8).map(item => `
    <div class="list-card" onclick="openDetail('${item.category}', ${item.id})" style="margin:8px 0;">
      <img class="card-thumb" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
      <div class="card-info">
        <div class="card-title">${item.name}</div>
        <div class="card-desc">${item.description?.substring(0, 60)}...</div>
        <div class="card-meta">
          ${item.rating ? `<span class="card-rating"><i class="fas fa-star"></i> ${item.rating}</span>` : ''}
          ${item.category !== 'transport' ? `<span class="card-price">${item.price || ''}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== HOME PAGE =====
function startDiscoveryRotation() {
  if (window._discoveryInterval) clearInterval(window._discoveryInterval);
  const cats = ['restaurants','attractions','shopping','nightlife','kids','transport','casino'];
  const db = getDB();
  const pool = [];
  cats.forEach(c => (db[c] || []).forEach(i => pool.push({ ...i, _cat: c })));
  if (!pool.length) return;
  const catLabel = { restaurants:'מסעדה', attractions:'אטרקציה', shopping:'קניות', nightlife:'בילוי', kids:'לילדים', transport:'תחבורה', casino:'בידור' };
  const showItem = () => {
    const banner = document.getElementById('discoveryBanner');
    if (!banner) { clearInterval(window._discoveryInterval); return; }
    const item = pool[Math.floor(Math.random() * pool.length)];
    banner.style.transition = 'opacity 1.2s ease';
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.onclick = () => openDetail(item._cat, item.id);
      banner.innerHTML = `
        <div style="position:relative;width:100%;height:140px;overflow:hidden;">
          <img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0) 40%,rgba(0,0,0,0.85) 100%);"></div>
          <div style="position:absolute;top:8px;right:8px;background:#E9C46A;color:#2C5F6E;font-size:0.65rem;padding:3px 10px;border-radius:12px;font-weight:700;">💡 ${catLabel[item._cat] || item._cat}</div>
          ${item.rating ? `<div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.55);color:#E9C46A;font-size:0.7rem;padding:3px 8px;border-radius:10px;font-weight:600;">⭐ ${item.rating}</div>` : ''}
          <div style="position:absolute;bottom:8px;right:12px;left:12px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.7);">
            <div style="font-weight:800;font-size:1rem;line-height:1.2;">${item.name}</div>
            <div style="font-size:0.72rem;opacity:0.95;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${item.description || item.address || ''}</div>
          </div>
        </div>
      `;
      banner.style.opacity = '1';
    }, 1200);
  };
  showItem();
  window._discoveryInterval = setInterval(showItem, 10000);
}

function renderHome() {
  const hotels = sortByRating(getAllItems('hotels')).slice(0, 6);
  const hotelsContainer = document.getElementById('topHotels');
  if (hotelsContainer) hotelsContainer.innerHTML = hotels.map(item => cardHTML(item, 'hotels')).join('');

  const attractions = sortByRating(getAllItems('attractions')).slice(0, 6);
  const attrContainer = document.getElementById('topAttractions');
  if (attrContainer) attrContainer.innerHTML = attractions.map(item => cardHTML(item, 'attractions')).join('');

  const restaurants = sortByRating(getAllItems('restaurants')).slice(0, 6);
  const restContainer = document.getElementById('topRestaurants');
  if (restContainer) restContainer.innerHTML = restaurants.map(item => cardHTML(item, 'restaurants')).join('');

  const shopping = sortByRating(getAllItems('shopping')).slice(0, 6);
  const shopContainer = document.getElementById('topShopping');
  if (shopContainer) shopContainer.innerHTML = shopping.map(item => cardHTML(item, 'shopping', true)).join('');

  const kids = sortByRating(getAllItems('kids')).slice(0, 6);
  const kidsContainer = document.getElementById('topKids');
  if (kidsContainer) kidsContainer.innerHTML = kids.map(item => cardHTML(item, 'kids', true)).join('');

  const nightlife = sortByRating(getAllItems('nightlife')).slice(0, 6);
  const nightlifeContainer = document.getElementById('topNightlife');
  if (nightlifeContainer) nightlifeContainer.innerHTML = nightlife.map(item => cardHTML(item, 'nightlife', true)).join('');

  startDiscoveryRotation();

  // Load live widgets
  loadWeatherWidget();
  loadInlineWeatherBanner();
  loadCurrencyWidget();
  renderHomeGalleryPreview();
  applyRealEstateVisibility();
}

async function loadInlineWeatherBanner() {
  const el = document.getElementById('weatherInlineBanner');
  if (!el) return;
  try {
    const w = await getDubaiWeather();
    if (!w) return;
    el.innerHTML = `
      <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;line-height:1;">${w.icon}</div>
      <div style="position:relative;min-width:0;">
        <div style="color:#fff;font-weight:800;font-size:1rem;line-height:1.2;">${w.temp}°C</div>
        <div style="color:rgba(255,255,255,0.85);font-size:0.74rem;margin-top:3px;">${w.condition}</div>
      </div>
    `;
  } catch(e) {}
}

function isVerifiedImage(item, category) {
  return item.image && new RegExp(`^images/${category}/${item.id}\\.jpg$`).test(item.image);
}
const SUBCAT_HE = {
  '7star':'7 כוכבים','5star':'5 כוכבים','4-5star':'4-5 כוכבים','3-4star':'3-4 כוכבים','luxury':'יוקרה','business':'עסקים','budget':'תקציבי',
  'ultra-luxury':'יוקרתי מאוד','local':'עממי','israeli':'ישראלי','lebanese':'לבנוני','turkish':'טורקי','street':'אוכל רחוב','asian':'אסייתי','seafood':'פירות ים',
  'landmark':'חובה לביקור','museum':'מוזיאון','adventure':'הרפתקה','extreme':'אקסטרים','art':'אומנות','beach':'חוף','waterpark':'פארק מים','theme-park':'פארק שעשועים','tour':'סיור','zoo':'גן חיות','aquarium':'אקווריום','kids-zone':'מתחם ילדים','snow':'שלג','car-rental':'השכרת רכב','desert-safari':'ספארי מדבר',
  'mall':'קניון','souk':'שוק','judaism':'יהדות','alcohol':'אלכוהול',
  'club':'מועדון','lounge':'לאונג\'','rooftop':'בר גג','beach-club':'ביץ׳ קלאב','entertainment':'בידור','show':'מופע',
  'metro':'מטרו','taxi':'מונית','boat':'סירה','app':'אפליקציה','bus':'אוטובוס',
  'casino':'קזינו','racing':'מרוצים','sport':'ספורט','shopping':'קניות'
};
function subcategoryHe(sub) { return SUBCAT_HE[sub] || sub; }
const CATEGORY_TITLE_COLORS = {
  hotels:'#E9C46A', attractions:'#2A9D8F', restaurants:'#F4A261',
  shopping:'#F4A261', nightlife:'#B85C8E', kids:'#E76F51',
  transport:'#2A9D8F', casino:'#E9C46A', abudhabi:'#B85C8E'
};
const VERIFIED_BADGE = '';

function getCategoryPhotosMap() {
  return {
    hotels: window.HOTEL_PHOTOS,
    attractions: window.ATTRACTION_PHOTOS,
    restaurants: window.RESTAURANT_PHOTOS,
    shopping: window.SHOPPING_PHOTOS,
    nightlife: window.NIGHTLIFE_PHOTOS,
    kids: window.KIDS_PHOTOS
  };
}

function pickBestPhoto(photoList, placeName) {
  if (!photoList || !photoList.length) return null;
  const firstWord = placeName ? placeName.toLowerCase().split(' ')[0] : '';
  const selfMatch = photoList.find(p => {
    const attr = (p.authorAttributions?.[0]?.displayName || '').toLowerCase();
    return (p.widthPx || 0) >= 1500 && firstWord && attr.includes(firstWord);
  });
  if (selfMatch) return selfMatch;
  const hiRes = photoList.find(p => (p.widthPx || 0) >= 1500);
  if (hiRes) return hiRes;
  return photoList[0];
}

function getCardImage(item, category) {
  const isGenericTemplate = item.image && /\/(hotel|night|kid|rest)_\d+\.(jpe?g|png|webp)$/i.test(item.image);
  if (item.image && !isGenericTemplate) return item.image;
  const photos = getCategoryPhotosMap()[category];
  const placePhotos = photos && photos[item.id];
  if (placePhotos?.photos?.length) {
    const best = pickBestPhoto(placePhotos.photos, placePhotos.placeName);
    if (best?.name) return placePhotoUrl(best.name, 600);
  }
  return item.image;
}

function cardHTML(item, category, mini) {
  const rating = item.googleRating || item.rating;
  const reviews = item.totalReviews;
  const isRestaurant = (category === 'restaurants' || category === 'shopping' || category === 'nightlife' || category === 'kids' || category === 'attractions');
  const verified = isVerifiedImage(item, category) ? VERIFIED_BADGE : '';

  if (isRestaurant) {
    const w = mini ? 120 : 180;
    const fontTitle = mini ? '0.72rem' : '0.85rem';
    const fontMeta = mini ? '0.6rem' : '0.7rem';
    const fontRate = mini ? '0.65rem' : '0.8rem';
    const pad = mini ? 6 : 10;
    return `
      <div class="card-hover" style="min-width:${w}px;width:${w}px;scroll-snap-align:start;background:#fff;border-radius:6px;overflow:hidden;cursor:pointer;border:1px solid #E5E7EB;box-shadow:0 2px 8px rgba(0,0,0,0.06);position:relative;transition:all 0.3s;" onclick="openDetail('${category}', ${item.id})">
        <button onclick="event.stopPropagation();addToMyTrip('${category}', ${item.id})" title="הוסף לטיול שלי" class="add-trip-btn" style="position:absolute;top:4px;right:6px;background:transparent;color:#fff;border:none;padding:0;cursor:pointer;font-size:1.6rem;font-weight:300;line-height:1;z-index:3;text-shadow:0 2px 6px rgba(0,0,0,0.85),0 0 3px rgba(0,0,0,0.6);">+</button>
        <div style="width:${w}px;height:${w}px;overflow:hidden;position:relative;">
          <img src="${getCardImage(item, category)}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
          ${item.subcategory ? `<div style="position:absolute;top:6px;left:6px;background:${CATEGORY_TITLE_COLORS[category] || 'rgba(0,0,0,0.65)'};color:#fff;padding:${mini ? '2px 7px' : '3px 9px'};border-radius:10px;font-size:${mini ? '0.6rem' : '0.7rem'};font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${subcategoryHe(item.subcategory)}</div>` : ''}
          ${item.nameHe ? `<div style="position:absolute;bottom:8px;right:8px;left:8px;color:#fff;font-weight:800;font-size:${mini ? '0.85rem' : '1.05rem'};text-shadow:0 2px 8px rgba(0,0,0,0.85),0 0 4px rgba(0,0,0,0.7);text-align:right;">${item.nameHe}</div>` : ''}
        </div>
        <div style="padding:${pad}px;">
          <div style="font-weight:600;color:#2C5F6E;font-size:${fontTitle};margin-bottom:2px;">${item.nameEn || item.name}</div>
          <div style="font-size:${fontMeta};color:#6B7F8D;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i class="fas fa-map-marker-alt" style="color:#F4A261;"></i> ${item.address || ''}</div>
          ${item.isOpen === true && !mini ? '<div style="color:#2A9D8F;font-size:0.65rem;font-weight:600;margin-top:3px;">● פתוח</div>' : ''}
        </div>
      </div>`;
  }

  // Default horizontal card for hotels, attractions etc
  return `
    <div class="listing-card" onclick="openDetail('${category}', ${item.id})" style="position:relative;">
      <img class="card-img" src="${getCardImage(item, category)}" alt="${item.name}" onerror="this.style.display='none'">
      <button onclick="event.stopPropagation();addToMyTrip('${category}', ${item.id})" title="הוסף לטיול שלי" class="add-trip-btn" style="position:absolute;top:6px;left:8px;background:transparent;color:#fff;border:none;padding:0;cursor:pointer;font-size:1.9rem;font-weight:300;line-height:1;z-index:3;text-shadow:0 2px 6px rgba(0,0,0,0.85),0 0 3px rgba(0,0,0,0.6);">+</button>
      <div class="card-body">
        <div class="card-title" style="color:#2C5F6E;">${item.name}</div>
        <div class="card-location" style="color:#6B7F8D;"><i class="fas fa-map-marker-alt" style="color:#F4A261;"></i> ${item.address || ''}</div>
        ${item.priceRange && category !== 'transport' ? `<div style="color:#E76F51;font-size:0.75rem;font-weight:500;margin-top:4px;">${item.priceRange}</div>` : ''}
        ${item.isOpen === true ? '<div style="color:#2A9D8F;font-size:0.7rem;font-weight:600;margin-top:4px;">● פתוח עכשיו</div>' : ''}
      </div>
    </div>`;
}

// ===== MAP HELPERS =====
const MARKER_COLORS = {
  hotels:'#E9C46A', restaurants:'#E76F51', attractions:'#2A9D8F',
  shopping:'#F4A261', nightlife:'#E76F51', transport:'#2A9D8F', casino:'#E9C46A'
};
const SUBCAT_COLORS = {
  '7star':'#C9A961', '5star':'#E76F51', '4-5star':'#2A9D8F',
  '3-4star':'#6B8E5A', 'budget':'#6B7F8D'
};
function getMarkerColor(item) {
  if (item.subcategory && SUBCAT_COLORS[item.subcategory]) return SUBCAT_COLORS[item.subcategory];
  return MARKER_COLORS[item.category] || '#E76F51';
}

const DUBAI_METRO = {
  red: ['Centrepoint','Emirates','Airport Terminal 3','Airport Terminal 1','City Centre Deira','Al Rigga','Union','BurJuman','ADCB','Max','World Trade Centre','Emirates Towers','Financial Centre','Burj Khalifa - Dubai Mall','Business Bay','Onpassive','Equiti','Mall of the Emirates','Sharaf DG','Dubai Internet City','Dubai Marina','DMCC','Jumeirah Lakes Towers','Sobha Realty','Ibn Battuta','Energy','Danube','Jebel Ali','UAE Exchange','The Gardens','Discovery Gardens','Al Furjan','Jumeirah Golf Estates','Dubai Investment Park','Expo 2020'],
  green: ['Etisalat','Al Qusais','Dubai Airport Free Zone','Al Nahda','Stadium','Al Qiyadah','Abu Hail','Abu Baker Al Siddique','Salah Al Din','Union','Baniyas Square','Palm Deira','Al Ras','Al Ghubaiba','Sharaf DG','BurJuman','Oud Metha','Dubai Healthcare City','Al Jadaf','Creek'],
  tram: ['Jumeirah Beach Residence 1','Jumeirah Beach Residence 2','Jumeirah Lakes Towers','Dubai Marina','Marina Towers','Mina Seyahi','Media City','Palm Jumeirah','Knowledge Village','Al Sufouh','Palm Gateway']
};

function jumpToMetroStation(line, station) {
  if (!station) return;
  const url = `https://www.google.com/maps/embed/v1/place?key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro&q=${encodeURIComponent(station + ' Metro Station Dubai')}&zoom=16`;
  openInFrame(url, `${station} - תחנת מטרו`);
}

const ITINERARIES = [
  {
    title: 'דובאי הישנה — מורשת ושווקים',
    icon: '🕌', color: '#C9A961',
    duration: 'יום מלא (~9 שעות)', bestFor: 'אוהבי תרבות והיסטוריה',
    stops: [
      { time: '09:00', name: 'Arabian Tea House', desc: 'ארוחת בוקר אמיראתית בלב Al Fahidi.', image: 'https://images.pexels.com/photos/14750357/pexels-photo-14750357.jpeg', lat:25.2631, lng:55.3006 },
      { time: '10:30', name: 'שכונת Al Fahidi', desc: 'סיור רגלי בסמטאות, מוזיאונים וגלריות.', image: 'https://images.pexels.com/photos/30245006/pexels-photo-30245006.jpeg', lat:25.2625, lng:55.2986 },
      { time: '12:00', name: 'אברה — דובאי קריק', desc: 'מעבורת מסורתית מבור דובאי לדיירה (1 דירהם).', image: 'https://images.pexels.com/photos/29196946/pexels-photo-29196946.jpeg', lat:25.2633, lng:55.2975 },
      { time: '12:30', name: 'שוק התבלינים והזהב', desc: 'שוטטות בשווקים המסורתיים בדיירה.', image: 'https://images.pexels.com/photos/14749879/pexels-photo-14749879.jpeg', lat:25.2700, lng:55.3047 },
      { time: '14:00', name: 'Al Ustad Special Kebab', desc: 'ארוחת צהריים ותיקה איראנית-עיראקית.', image: 'https://images.pexels.com/photos/14750466/pexels-photo-14750466.jpeg', lat:25.2595, lng:55.3005 },
      { time: '16:00', name: 'Dubai Frame', desc: 'תצפית 360° מהמסגרת בגן Zabeel.', image: 'https://images.pexels.com/photos/26838210/pexels-photo-26838210.jpeg', lat:25.2353, lng:55.3009 },
      { time: '19:00', name: 'Al Seef Heritage', desc: 'טיול ערב לאורך הקריק עם תאורה.', image: 'https://images.pexels.com/photos/35155690/pexels-photo-35155690.jpeg', lat:25.2615, lng:55.3020 }
    ]
  },
  {
    title: 'דובאי המודרנית — Downtown',
    icon: '🌃', color: '#E76F51',
    duration: 'יום מלא (~10 שעות)', bestFor: 'זוגות וצלמים',
    stops: [
      { time: '10:00', name: 'Burj Khalifa', desc: 'תצפית מקומה 124/148.', image: 'https://images.pexels.com/photos/26838210/pexels-photo-26838210.jpeg', lat:25.1972, lng:55.2744 },
      { time: '12:30', name: 'Dubai Aquarium', desc: 'אקווריום + מנהרת כריש בקניון.', image: 'https://images.pexels.com/photos/14750186/pexels-photo-14750186.jpeg', lat:25.1985, lng:55.2796 },
      { time: '13:30', name: 'Dubai Mall', desc: 'קניות וצהריים — TLV / Mosaica.', image: 'https://images.pexels.com/photos/14750359/pexels-photo-14750359.jpeg', lat:25.1985, lng:55.2796 },
      { time: '17:00', name: 'CÉ LA VI / Atmosphere', desc: 'סאנדאון בבר גג עם נוף.', image: 'https://images.pexels.com/photos/34972118/pexels-photo-34972118.jpeg', lat:25.1965, lng:55.2730 },
      { time: '19:30', name: 'Dubai Fountain', desc: 'מופע מזרקות מים (חינם, כל חצי שעה).', image: 'https://images.pexels.com/photos/29196946/pexels-photo-29196946.jpeg', lat:25.1953, lng:55.2754 },
      { time: '20:30', name: 'HaSalon / Miznon', desc: 'ארוחת ערב ישראלית של אייל שני.', image: 'https://images.pexels.com/photos/14749935/pexels-photo-14749935.jpeg', lat:25.2122, lng:55.2799 }
    ]
  },
  {
    title: 'חוף ומרינה',
    icon: '🏖️', color: '#2A9D8F',
    duration: 'יום מלא', bestFor: 'אוהבי שמש וים',
    stops: [
      { time: '10:00', name: 'JBR Beach', desc: 'חוף, ספורט מים, וגלוש.', image: 'https://images.pexels.com/photos/14750186/pexels-photo-14750186.jpeg', lat:25.0780, lng:55.1340 },
      { time: '13:00', name: 'Cove Beach', desc: 'ביץ׳ קלאב — בריכה, ארוחה, מוזיקה.', image: 'https://images.pexels.com/photos/26838210/pexels-photo-26838210.jpeg', lat:25.0810, lng:55.1240 },
      { time: '16:00', name: 'Bluewaters Island', desc: 'הליכה על Bluewaters.', image: 'https://images.pexels.com/photos/14749932/pexels-photo-14749932.jpeg', lat:25.0797, lng:55.1193 },
      { time: '17:00', name: 'Ain Dubai', desc: 'הגלגל הענק — תצפית של 250 מ׳.', image: 'https://images.pexels.com/photos/14750359/pexels-photo-14750359.jpeg', lat:25.0797, lng:55.1193 },
      { time: '19:00', name: 'Dubai Marina Walk', desc: 'הליכת ערב לאורך המרינה.', image: 'https://images.pexels.com/photos/34596088/pexels-photo-34596088.jpeg', lat:25.0820, lng:55.1410 },
      { time: '20:30', name: 'Pierchic / Drift', desc: 'דגים בנוף יוקרתי.', image: 'https://images.pexels.com/photos/14750466/pexels-photo-14750466.jpeg', lat:25.0950, lng:55.1530 }
    ]
  },
  {
    title: 'משפחות וילדים',
    icon: '🎢', color: '#F4A261',
    duration: 'יום מלא', bestFor: 'הורים עם ילדים',
    stops: [
      { time: '10:00', name: 'Aquaventure / Wild Wadi', desc: 'פארק מים — מגלשות וגלים.', image: 'https://images.pexels.com/photos/26838210/pexels-photo-26838210.jpeg', lat:25.1304, lng:55.1170 },
      { time: '14:00', name: 'Lost Chambers Aquarium', desc: 'אקווריום תת-מימי באטלנטיס.', image: 'https://images.pexels.com/photos/14750186/pexels-photo-14750186.jpeg', lat:25.1304, lng:55.1170 },
      { time: '16:00', name: 'KidZania', desc: 'עיר ילדים במקצועות.', image: 'https://images.pexels.com/photos/14749879/pexels-photo-14749879.jpeg', lat:25.1980, lng:55.2790 },
      { time: '18:00', name: 'Ski Dubai', desc: 'מגלשת שלג + פינגווינים.', image: 'https://images.pexels.com/photos/14749932/pexels-photo-14749932.jpeg', lat:25.1181, lng:55.2005 },
      { time: '20:00', name: 'La Perle Show', desc: 'מופע אקרובטי בלב Al Habtoor.', image: 'https://images.pexels.com/photos/14750359/pexels-photo-14750359.jpeg', lat:25.1850, lng:55.2448 }
    ]
  },
  {
    title: 'מדבר וספארי',
    icon: '🐪', color: '#B85C8E',
    duration: 'אחה״צ + ערב (~7 שעות)', bestFor: 'הרפתקנים',
    stops: [
      { time: '14:30', name: 'איסוף מהמלון', desc: 'רכבי 4x4 לכיוון המדבר.', image: 'https://images.pexels.com/photos/29352929/pexels-photo-29352929.jpeg', lat:25.2048, lng:55.2708 },
      { time: '15:30', name: 'Dune Bashing', desc: 'נסיעה אקסטרים על הדיונות.', image: 'https://images.pexels.com/photos/30245006/pexels-photo-30245006.jpeg', lat:24.8500, lng:55.5300 },
      { time: '17:00', name: 'גמלים + סנדבורד', desc: 'רכיבה ופעילות במדבר.', image: 'https://images.pexels.com/photos/14915303/pexels-photo-14915303.jpeg', lat:24.8400, lng:55.5350 },
      { time: '18:00', name: 'שקיעה במדבר', desc: 'תמונות מרהיבות בזריחת/שקיעת השמש.', image: 'https://images.pexels.com/photos/34698507/pexels-photo-34698507.jpeg', lat:24.8350, lng:55.5400 },
      { time: '19:00', name: 'מחנה בדואי', desc: 'ארוחת ערב, חינה, מופע ריקודים.', image: 'https://images.pexels.com/photos/36794534/pexels-photo-36794534.jpeg', lat:24.8350, lng:55.5400 },
      { time: '22:00', name: 'חזרה למלון', desc: 'הסעה חזרה.', image: 'https://images.pexels.com/photos/29196946/pexels-photo-29196946.jpeg', lat:25.2048, lng:55.2708 }
    ]
  },
  {
    title: 'יום באבו דאבי',
    icon: '🕌', color: '#5B9DC7',
    duration: 'יום מלא (~12 שעות)', bestFor: 'תייר חוזר',
    stops: [
      { time: '07:00', name: 'אוטובוס E101', desc: 'מ-Ibn Battuta לאבו דאבי (~25 דירהם).', image: 'https://images.pexels.com/photos/29352929/pexels-photo-29352929.jpeg', lat:25.0440, lng:55.1230 },
      { time: '09:30', name: 'מסגד שייח׳ זאיד', desc: 'אחד היפים בעולם — לבוש צנוע.', image: 'https://images.pexels.com/photos/14750357/pexels-photo-14750357.jpeg', lat:24.4128, lng:54.4747 },
      { time: '12:00', name: 'Louvre Abu Dhabi', desc: 'מוזיאון אדריכלות מרהיבה.', image: 'https://images.pexels.com/photos/30245006/pexels-photo-30245006.jpeg', lat:24.5354, lng:54.3982 },
      { time: '14:30', name: 'Yas Mall + Yas Marina', desc: 'קניות + Yas Beach.', image: 'https://images.pexels.com/photos/14750359/pexels-photo-14750359.jpeg', lat:24.4895, lng:54.6072 },
      { time: '16:00', name: 'Ferrari World', desc: 'פארק שעשועים מקורה (לחובבי אדרנלין).', image: 'https://images.pexels.com/photos/14749879/pexels-photo-14749879.jpeg', lat:24.4836, lng:54.6075 },
      { time: '20:00', name: 'אוטובוס חזרה', desc: 'חזרה לדובאי.', image: 'https://images.pexels.com/photos/35155690/pexels-photo-35155690.jpeg', lat:25.0440, lng:55.1230 }
    ]
  }
];

function findItemByStopName(name) {
  const matches = findRelatedItems(name, 1);
  if (matches.length) return { category: matches[0].category, id: matches[0].id };
  return null;
}

function findRelatedItems(name, limit = 3) {
  const db = getDB();
  const norm = s => String(s || '').toLowerCase().replace(/[\s\-׳'’\.,/]/g, '');
  const target = norm(name);
  if (!target) return [];
  const results = [];
  for (const cat of Object.keys(db)) {
    for (const item of (db[cat] || [])) {
      const a = norm(item.name);
      const b = norm(item.nameEn);
      let score = 0;
      if (a === target || b === target) score = 100;
      else if (a && (a.includes(target) || target.includes(a))) score = 80;
      else if (b && (b.includes(target) || target.includes(b))) score = 70;
      else {
        const words = name.toLowerCase().split(/\s+|\//);
        for (const w of words) {
          if (w.length < 3) continue;
          const wn = norm(w);
          if (a.includes(wn) || b.includes(wn)) score = Math.max(score, 40);
          if ((item.tags || []).some(t => norm(t).includes(wn))) score = Math.max(score, 30);
        }
      }
      if (score > 0) results.push({ ...item, score });
    }
  }
  results.sort((x, y) => y.score - x.score || (y.rating || 0) - (x.rating || 0));
  return results.slice(0, limit);
}

function buildItineraryMapUrl(it) {
  const stops = it.stops.map(s => encodeURIComponent(s.name + ' Dubai'));
  if (stops.length < 2) return '';
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? '&waypoints=' + waypoints : ''}&travelmode=driving`;
}

function buildItineraryEmbedUrl(it) {
  const stops = it.stops.map(s => encodeURIComponent(s.name + ' Dubai'));
  if (stops.length < 2) return '';
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).map(w => 'to:' + w).join('+');
  return `https://maps.google.com/maps?saddr=${origin}&daddr=${waypoints ? waypoints + '+to:' + destination : destination}&hl=he&output=embed`;
}

function buildItineraryStaticMap(it, size = '600x250') {
  const colorHex = (it.color || '#E76F51').replace('#', '0x');
  const markers = it.stops.map((s, i) => `markers=color:${colorHex}%7Clabel:${i + 1}%7C${encodeURIComponent(s.name + ' Dubai, UAE')}`).join('&');
  const pathPoints = it.stops.map(s => encodeURIComponent(s.name + ' Dubai, UAE')).join('%7C');
  const path = `path=color:${colorHex}%7Cweight:4%7C${pathPoints}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=Dubai&zoom=11&size=${size}&maptype=roadmap&language=en&${path}&${markers}&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro`;
}

let ITINERARY_STATES = null;
async function renderItinerariesPage() {
  const page = document.getElementById('page-itineraries');
  if (!page) return;
  if (!ITINERARY_STATES) ITINERARY_STATES = JSON.parse(JSON.stringify(ITINERARIES));
  await loadAllAlbums();
  const view = window.ITIN_VIEW || 'day';
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-route" style="color:#E9C46A;margin-left:6px;"></i> מסלולים מוכנים</h2>
    </div>
    <div style="display:flex;gap:6px;padding:10px 16px 0;">
      <button onclick="switchItinView('day')" style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:${view==='day'?'2px solid #E76F51':'1px solid #E5E7EB'};background:${view==='day'?'#FFF5F2':'#fff'};color:${view==='day'?'#E76F51':'#6B7F8D'};">📅 מסלולי יום</button>
      <button onclick="switchItinView('star')" style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:${view==='star'?'2px solid #E76F51':'1px solid #E5E7EB'};background:${view==='star'?'#FFF5F2':'#fff'};color:${view==='star'?'#E76F51':'#6B7F8D'};">⭐ טיולי כוכב</button>
      <button onclick="navigateTo('mytrip')" style="flex:1;padding:9px 4px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.78rem;cursor:pointer;border:1px solid #E5E7EB;background:#fff;color:#6B7F8D;">❤️ הטיול שלי</button>
    </div>
    <div style="padding:12px 16px 80px;">
      ${view === 'day' ? `
        <div style="background:#F5E6CB;border-right:3px solid #E9C46A;padding:10px 14px;border-radius:6px;font-size:0.85rem;color:#2C5F6E;margin-bottom:14px;">
          💡 גררו את התחנות (אייקון ⋮⋮) לסדר אישי שלכם. לחיצה על "פתח ניווט" תפתח Google Maps.
        </div>
        <div id="itineraries-list">${ITINERARY_STATES.map((it, idx) => renderItineraryCard(it, idx)).join('')}</div>
      ` : `
        <div style="background:#F5E6CB;border-right:3px solid #E9C46A;padding:10px 14px;border-radius:6px;font-size:0.85rem;color:#2C5F6E;margin-bottom:14px;">
          💡 כל כוכב = נקודת מרכז עם אטרקציות מסביב. בחרו אזור — תכננו את היום בלי לזוז רחוק.
        </div>
        <div>${STAR_HUBS.map((h, i) => renderStarHub(h, i)).join('')}</div>
      `}
    </div>
  `;
}

function switchItinView(v) {
  window.ITIN_VIEW = v;
  renderItinerariesPage();
}

const STAR_HUBS = [
  { name:'דובאי מרינה', icon:'⛵', color:'#5B9DC7', center:{lat:25.0820,lng:55.1410},
    desc:'נמל מודרני עם פרומנדה, יאכטות, מועדוני חוף וגורדי שחקים.',
    spokes:[
      {name:'פרומנדה Marina Walk', lat:25.0820, lng:55.1410},
      {name:'JBR + The Beach', lat:25.0795, lng:55.1340},
      {name:'Ain Dubai (Bluewaters)', lat:25.0786, lng:55.1255},
      {name:'Skydive Dubai', lat:25.0890, lng:55.1370},
      {name:'יאכטה / סירת מנוע', lat:25.0820, lng:55.1410},
      {name:'Zero Gravity Beach Club', lat:25.0930, lng:55.1397}
    ]
  },
  { name:'Downtown Dubai', icon:'🏙️', color:'#E76F51', center:{lat:25.1972,lng:55.2744},
    desc:'לב העיר — מגדל בורג׳ ח׳ליפה, דובאי מול ומופע המזרקות.',
    spokes:[
      {name:'Burj Khalifa', lat:25.1972, lng:55.2744},
      {name:'Dubai Mall', lat:25.1972, lng:55.2796},
      {name:'Dubai Fountain', lat:25.1955, lng:55.2745},
      {name:'Souk Al Bahar', lat:25.1956, lng:55.2773},
      {name:'Dubai Aquarium', lat:25.1972, lng:55.2796},
      {name:'Dubai Opera', lat:25.1936, lng:55.2728}
    ]
  },
  { name:'Palm Jumeirah', icon:'🌴', color:'#F4A261', center:{lat:25.1124,lng:55.1390},
    desc:'אי דקל עם מלונות יוקרה, פארקי מים, מסעדות מישלן וביץ׳ קלאבים.',
    spokes:[
      {name:'Atlantis The Palm', lat:25.1305, lng:55.1175},
      {name:'Aquaventure Waterpark', lat:25.1295, lng:55.1183},
      {name:'The Pointe', lat:25.1342, lng:55.1212},
      {name:'View at the Palm', lat:25.1124, lng:55.1390},
      {name:'Nobu Dubai', lat:25.1305, lng:55.1175},
      {name:'Monorail Palm', lat:25.0917, lng:55.1502}
    ]
  },
  { name:'Old Dubai (Deira)', icon:'🕌', color:'#2A9D8F', center:{lat:25.2655,lng:55.2962},
    desc:'דובאי הישנה — שוקי הזהב והתבלינים, סירות ה-Abra והמחוז ההיסטורי.',
    spokes:[
      {name:'Gold Souk', lat:25.2697, lng:55.2967},
      {name:'Spice Souk', lat:25.2680, lng:55.2960},
      {name:'Abra Boats (Creek)', lat:25.2638, lng:55.2972},
      {name:'Al Fahidi Historic', lat:25.2630, lng:55.2980},
      {name:'Dubai Museum', lat:25.2632, lng:55.2972},
      {name:'Textile Souk', lat:25.2620, lng:55.2980}
    ]
  },
  { name:'Al Barsha (Mall of Emirates)', icon:'❄️', color:'#B85C8E', center:{lat:25.1183,lng:55.2002},
    desc:'אזור Al Barsha סביב Mall of Emirates — קניון ענק עם Ski Dubai, מלונות, מסעדות ותחנת מטרו.',
    spokes:[
      {name:'Mall of Emirates', lat:25.1183, lng:55.2002},
      {name:'Ski Dubai (בקניון)', lat:25.1175, lng:55.1986},
      {name:'Mall of Emirates Metro', lat:25.1184, lng:55.2050},
      {name:'Sheraton Mall of Emirates', lat:25.1160, lng:55.2030},
      {name:'Holiday Inn Al Barsha', lat:25.1102, lng:55.1980},
      {name:'Pullman Dubai Mall of Emirates', lat:25.1196, lng:55.2010}
    ]
  }
];

function buildStarHubMap(h, size = '600x300') {
  const c = `${h.center.lat},${h.center.lng}`;
  const colorHex = h.color.replace('#','0x');
  const centerMarker = `markers=color:${colorHex}%7Csize:mid%7Clabel:%E2%98%85%7C${c}`;
  const spokeMarkers = h.spokes.map((s,i) => `markers=color:${colorHex}%7Csize:small%7Clabel:${i+1}%7C${s.lat},${s.lng}`).join('&');
  // Glow effect: dark wide outline behind + bright neon inside
  const outlinePaths = h.spokes.map(s => `path=color:0x000000FF%7Cweight:7%7C${c}%7C${s.lat},${s.lng}`).join('&');
  const glowPaths = h.spokes.map(s => `path=color:0xFFFF00FF%7Cweight:4%7C${c}%7C${s.lat},${s.lng}`).join('&');
  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&maptype=roadmap&language=en&${centerMarker}&${spokeMarkers}&${outlinePaths}&${glowPaths}&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro`;
}

let STAR_HUB_STATES = null;
function getStarHub(idx) {
  if (!STAR_HUB_STATES) STAR_HUB_STATES = JSON.parse(JSON.stringify(STAR_HUBS));
  return STAR_HUB_STATES[idx];
}

function renderStarHub(h0, idx) {
  const h = getStarHub(idx) || h0;
  return `<div id="star-card-${idx}">${renderStarHubInner(h, idx)}</div>`;
}

function renderStarHubInner(h, idx) {
  const albumKey = 'star-' + idx;
  return `
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <div style="background:${h.color};color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;">
        <div style="font-size:1.6rem;">${h.icon}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:1rem;line-height:1.2;">⭐ ${h.name}</div>
          <div style="font-size:0.72rem;opacity:0.92;margin-top:2px;">${h.spokes.length} זרועות</div>
        </div>
        ${(() => { const r = parseInt(localStorage.getItem(`star-rating-${idx}`) || '0'); return r ? `<div style="background:rgba(0,0,0,0.25);color:#E9C46A;font-size:0.85rem;padding:3px 8px;border-radius:10px;letter-spacing:1px;">${'★'.repeat(r)}${'☆'.repeat(5-r)}</div>` : ''; })()}
      </div>
      <div style="height:240px;background:#F5F5F5;position:relative;cursor:zoom-in;" onclick="openStarHubMapModal(${idx})">
        <img src="${buildStarHubMap(h, '600x300')}" alt="כוכב ${h.name}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
        <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.78rem;padding:6px 12px;border-radius:14px;font-weight:600;display:flex;align-items:center;gap:5px;">
          <i class="fas fa-expand-arrows-alt"></i> הגדל
        </div>
      </div>
      <div style="padding:12px 14px;color:#2C5F6E;font-size:0.85rem;line-height:1.6;background:#F5E6CB;border-bottom:1px solid #F5EFE6;">${h.desc}</div>
      <div style="padding:6px 14px 10px;">
        <div style="font-size:0.72rem;color:#6B7F8D;padding:4px 0 6px;">💡 גררו את הזרועות (⋮⋮) לסדר אישי</div>
        ${h.spokes.map((s, i) => `
          <div draggable="true" ondragstart="onStarSpokeDragStart(event, ${idx}, ${i})" ondragover="event.preventDefault()" ondrop="onStarSpokeDrop(event, ${idx}, ${i})" style="display:flex;align-items:center;gap:10px;padding:7px 0;${i < h.spokes.length-1 ? 'border-bottom:1px solid #F5EFE6;' : ''}">
            <i class="fas fa-grip-vertical" style="color:#bbb;cursor:grab;font-size:0.85rem;"></i>
            <div style="background:${h.color};color:#fff;border-radius:50%;width:22px;height:22px;font-size:0.72rem;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${i+1}</div>
            <div style="flex:1;color:#2C5F6E;font-size:0.85rem;">${s.name}</div>
            <a href="https://www.google.com/maps/dir/?api=1&origin=${h.center.lat},${h.center.lng}&destination=${s.lat},${s.lng}&travelmode=walking" target="_blank" style="color:${h.color};font-size:0.78rem;text-decoration:none;font-weight:600;"><i class="fas fa-walking"></i> נווט</a>
          </div>
        `).join('')}
      </div>
      ${(() => {
        const saved = parseInt(localStorage.getItem(`star-rating-${idx}`) || '0');
        return `
        <div style="background:#F5E6CB;padding:14px 16px;text-align:center;border-top:1px solid #F5EFE6;">
          <div style="font-size:0.9rem;color:#2C5F6E;font-weight:700;margin-bottom:8px;">איך היה הכוכב?</div>
          <div style="display:flex;gap:8px;justify-content:center;">
            ${[1,2,3,4,5].map(n => `<i class="fas fa-star" onclick="rateStarHub(${idx}, ${n})" style="font-size:1.6rem;color:${n <= saved ? '#E9C46A' : '#E5E7EB'};cursor:pointer;transition:color 0.2s;"></i>`).join('')}
          </div>
          ${saved ? `<div style="font-size:0.7rem;color:#6B7F8D;margin-top:6px;">הדירוג שלך: ${saved}/5 ⭐</div>` : '<div style="font-size:0.7rem;color:#6B7F8D;margin-top:6px;">לחצו על כוכב כדי לדרג</div>'}
        </div>`;
      })()}
      ${renderAlbumSection(albumKey)}
    </div>
  `;
}

function rateStarHub(idx, n) {
  localStorage.setItem(`star-rating-${idx}`, String(n));
  const card = document.getElementById(`star-card-${idx}`);
  if (card) card.innerHTML = renderStarHubInner(getStarHub(idx), idx);
}

function openStarHubMapModal(idx) {
  const h = getStarHub(idx);
  if (!h) return;
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  const bigMap = buildStarHubMap(h, '1200x800');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;z-index:1;">
      <div style="background:${h.color};color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.4rem;">${h.icon}</span>
          <div>
            <div style="font-weight:800;font-size:1rem;">⭐ ${h.name}</div>
            <div style="font-size:0.72rem;opacity:0.9;">${h.spokes.length} זרועות · לחץ ✕ לסגור</div>
          </div>
        </div>
        <button onclick="document.getElementById('detailModal').classList.remove('active')" style="background:rgba(255,255,255,0.25);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.1rem;">✕</button>
      </div>
      <div style="flex:1;overflow:auto;background:#000;display:flex;align-items:center;justify-content:center;">
        <img src="${bigMap}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">
      </div>
      <div style="background:#fff;max-height:40vh;overflow-y:auto;padding:12px 16px;flex-shrink:0;">
        <div style="font-weight:700;color:#2C5F6E;font-size:0.9rem;margin-bottom:8px;">תחנות ב${h.name}:</div>
        ${h.spokes.map((s, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #F5EFE6;">
            <div style="background:${h.color};color:#fff;border-radius:50%;width:22px;height:22px;font-size:0.72rem;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${i+1}</div>
            <div style="flex:1;color:#2C5F6E;font-size:0.85rem;">${s.name}</div>
            <a href="https://www.google.com/maps/dir/?api=1&origin=${h.center.lat},${h.center.lng}&destination=${s.lat},${s.lng}&travelmode=walking" target="_blank" style="color:${h.color};font-size:0.78rem;text-decoration:none;font-weight:600;"><i class="fas fa-walking"></i> נווט</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'stretch';
  modal.style.justifyContent = 'stretch';
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function addStarHubToMyTrip(idx) {
  const h = getStarHub(idx);
  if (!h) return;
  const trip = getMyTrip();
  const day = trip.items.length ? Math.max(...trip.items.map(i => i.day)) + 1 : 1;
  h.spokes.forEach(s => {
    trip.items.push({
      uid: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      category: 'star-spoke', id: 0,
      name: s.name, image: '', address: '', lat: s.lat, lng: s.lng,
      day, time: '', note: '⭐ ' + h.name
    });
  });
  saveMyTrip(trip);
  showTripToast(`✓ נוסף טיול כוכב "${h.name}" כיום ${day} בטיול שלך`);
}

function onStarSpokeDragStart(e, idx, spokeIdx) {
  e.dataTransfer.setData('text/plain', `star|${idx}|${spokeIdx}`);
  e.dataTransfer.effectAllowed = 'move';
}
function onStarSpokeDrop(e, idx, targetIdx) {
  e.preventDefault();
  const parts = (e.dataTransfer.getData('text/plain') || '').split('|');
  if (parts[0] !== 'star') return;
  const sIdx = parseInt(parts[1]), spokeIdx = parseInt(parts[2]);
  if (sIdx !== idx || spokeIdx === targetIdx) return;
  const h = getStarHub(idx);
  const [m] = h.spokes.splice(spokeIdx, 1);
  h.spokes.splice(targetIdx, 0, m);
  const card = document.getElementById(`star-card-${idx}`);
  if (card) card.innerHTML = renderStarHubInner(h, idx);
}

function renderItineraryCard(it, idx) {
  const navUrl = buildItineraryMapUrl(it);
  return `<div id="itin-card-${idx}">${renderItineraryCardInner(it, idx)}</div>`;
}

function renderItineraryCardInner(it, idx) {
  const navUrl = buildItineraryMapUrl(it);
  return ITINERARY_TEMPLATE(it, idx, navUrl);
}

function ITINERARY_TEMPLATE(it, idx, navUrl) {
  return `
        <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div class="itin-slider" id="itin-slider-${idx}" data-current="0" data-total="${it.stops.length}" style="position:relative;height:220px;overflow:hidden;">
            ${it.stops.map((s, j) => `
              <div class="itin-slide" data-idx="${j}" style="position:absolute;inset:0;opacity:${j === 0 ? 1 : 0};transition:opacity 0.4s;">
                <img src="${s.image}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 50%,rgba(0,0,0,0.85) 100%);"></div>
                <div style="position:absolute;top:10px;right:12px;display:flex;align-items:center;gap:6px;">
                  ${(() => { const r = parseInt(localStorage.getItem(`itin-rating-${idx}`) || '0'); return r ? `<div style="background:rgba(0,0,0,0.5);color:#E9C46A;font-size:0.85rem;padding:3px 8px;border-radius:10px;letter-spacing:1px;">${'★'.repeat(r)}${'☆'.repeat(5-r)}</div>` : ''; })()}
                  <div style="font-size:1.8rem;">${it.icon}</div>
                </div>
                <div style="position:absolute;top:10px;left:12px;background:rgba(0,0,0,0.5);color:#fff;font-size:0.65rem;padding:3px 8px;border-radius:10px;">${j + 1}/${it.stops.length} · ${s.time}</div>
                <div style="position:absolute;bottom:36px;right:14px;left:14px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.7);">
                  <div style="font-size:1.15rem;font-weight:800;line-height:1.2;">${it.title}</div>
                  <div style="font-size:0.8rem;opacity:0.95;margin-top:3px;">${it.duration} · ${it.bestFor}</div>
                  <div style="font-size:0.72rem;opacity:0.85;margin-top:2px;"><i class="fas fa-map-marker-alt"></i> ${s.name}</div>
                </div>
              </div>
            `).join('')}
            <button onclick="moveSlide('itin-slider-${idx}', -1)" style="position:absolute;top:50%;right:6px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;z-index:3;"><i class="fas fa-chevron-right"></i></button>
            <button onclick="moveSlide('itin-slider-${idx}', 1)" style="position:absolute;top:50%;left:6px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;z-index:3;"><i class="fas fa-chevron-left"></i></button>
            <div style="position:absolute;bottom:8px;left:0;right:0;display:flex;gap:4px;justify-content:center;z-index:2;">
              ${it.stops.map((_, j) => `<div data-dot="${j}" style="width:6px;height:6px;border-radius:50%;background:${j === 0 ? '#fff' : 'rgba(255,255,255,0.4)'};transition:background 0.3s;"></div>`).join('')}
            </div>
          </div>
          <div id="itin-restaurants-${idx}" style="padding:0 12px;"></div>
          <div id="map-${idx}" style="position:relative;height:200px;overflow:hidden;transition:height 0.3s;" data-static="${buildItineraryStaticMap(it, '600x250')}" data-embed="${buildItineraryEmbedUrl(it)}">
            <div id="map-${idx}-content" style="width:100%;height:100%;">
              <img src="${buildItineraryStaticMap(it, '600x250')}" alt="מפת מסלול" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
            </div>
            <button onclick="toggleMapSize('map-${idx}')" id="map-${idx}-btn" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;font-size:0.85rem;padding:6px 10px;border-radius:14px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;z-index:5;">
              <i class="fas fa-expand-arrows-alt"></i> הגדלה אינטראקטיבית
            </button>
          </div>
          ${itinRestaurantsToggleHTML(idx)}
          <a href="${navUrl}" target="_blank" style="display:block;text-decoration:none;background:${it.color};color:#fff;text-align:center;padding:10px;font-weight:700;font-size:0.9rem;">
            <i class="fas fa-directions"></i> פתח ניווט ב-Google Maps
          </a>
          <div style="padding:12px 16px;">
            ${it.stops.map((s, i) => {
              const related = findRelatedItems(s.name, 8).filter(r => r.category === 'restaurants').slice(0, 3);
              return `
              <div draggable="true" ondragstart="onStopDragStart(event, ${idx}, ${i})" ondragover="event.preventDefault()" ondrop="onStopDrop(event, ${idx}, ${i})" style="border-bottom:1px solid #F5EFE6;">
                <div onclick="toggleStopDrawer('drawer-${idx}-${i}')" style="display:flex;gap:10px;padding:8px 0;align-items:center;cursor:pointer;">
                  <i class="fas fa-grip-vertical" style="color:#bbb;cursor:grab;font-size:0.85rem;"></i>
                  <div style="background:${it.color};color:#fff;border-radius:50%;width:24px;height:24px;font-size:0.75rem;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${i + 1}</div>
                  <div style="min-width:46px;font-weight:700;color:${it.color};font-size:0.85rem;direction:ltr;text-align:center;">${s.time}</div>
                  <div style="flex:1;">
                    <div style="font-weight:600;color:#2C5F6E;font-size:0.9rem;">${s.name}</div>
                    <div style="color:#6B7F8D;font-size:0.78rem;line-height:1.4;margin-top:2px;">${s.desc}</div>
                  </div>
                  <i class="fas fa-chevron-down" id="drawer-${idx}-${i}-chevron" style="color:${it.color};font-size:0.85rem;transition:transform 0.3s;"></i>
                </div>
                <div id="drawer-${idx}-${i}" style="max-height:0;overflow:hidden;transition:max-height 0.6s;">
                  <div style="padding:8px 0 12px;">
                    ${related.length ? `
                      <div style="font-size:0.7rem;color:#6B7F8D;margin-bottom:6px;font-weight:600;">ספקים מהמאגר שלנו:</div>
                      <div style="display:flex;flex-direction:column;gap:6px;">
                        ${related.map(r => `
                          <div onclick="event.stopPropagation();openDetail('${r.category}', ${r.id})" style="display:flex;gap:10px;padding:8px;background:#F5E6CB;border-radius:6px;cursor:pointer;align-items:center;">
                            <img src="${r.image}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">
                            <div style="flex:1;">
                              <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;">${r.name}</div>
                              <div style="color:#6B7F8D;font-size:0.7rem;">${r.address || ''} · ⭐ ${r.rating || '-'} · ${r.price || ''}</div>
                            </div>
                            <i class="fas fa-chevron-left" style="color:${it.color};font-size:0.75rem;"></i>
                          </div>
                        `).join('')}
                      </div>
                    ` : `<div style="font-size:0.78rem;color:#6B7F8D;text-align:center;padding:6px;">לא נמצא ספק במאגר.</div>`}
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                      <a href="https://klook.tpk.lv/8HSINbXI" target="_blank" onclick="event.stopPropagation()" style="flex:1;min-width:120px;text-align:center;padding:7px;border-radius:6px;background:#fff;border:1px solid #FF5722;color:#FF5722;text-decoration:none;font-weight:600;font-size:0.75rem;"><i class="fas fa-ticket-alt"></i> Klook</a>
                    </div>
                  </div>
                </div>
              </div>
              `;
            }).join('')}
          </div>
          ${(() => {
            const saved = parseInt(localStorage.getItem(`itin-rating-${idx}`) || '0');
            return `
            <div style="background:#F5E6CB;padding:14px 16px;text-align:center;border-top:1px solid #F5EFE6;">
              <div style="font-size:0.9rem;color:#2C5F6E;font-weight:700;margin-bottom:8px;">איך היה הסיור?</div>
              <div id="rating-${idx}" style="display:flex;gap:8px;justify-content:center;">
                ${[1,2,3,4,5].map(n => `<i class="fas fa-star" data-star="${n}" onclick="rateItinerary(${idx}, ${n})" style="font-size:1.6rem;color:${n <= saved ? '#E9C46A' : '#E5E7EB'};cursor:pointer;transition:color 0.2s;"></i>`).join('')}
              </div>
              ${saved ? `<div style="font-size:0.7rem;color:#6B7F8D;margin-top:6px;">הדירוג שלך: ${saved}/5 ⭐</div>` : '<div style="font-size:0.7rem;color:#6B7F8D;margin-top:6px;">לחצו על כוכב כדי לדרג</div>'}
            </div>`;
          })()}
          ${renderAlbumSection(idx)}
        </div>`;
}

let ALBUM_CACHE = {};

function openAlbumDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wellcome-dubai-albums', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });
}

async function loadAllAlbums() {
  try {
    const db = await openAlbumDB();
    return new Promise(resolve => {
      const tx = db.transaction('entries', 'readonly');
      const store = tx.objectStore('entries');
      const req = store.getAll();
      req.onsuccess = () => {
        ALBUM_CACHE = {};
        (req.result || []).forEach(e => {
          if (!ALBUM_CACHE[e.idx]) ALBUM_CACHE[e.idx] = [];
          ALBUM_CACHE[e.idx].push(e);
        });
        resolve(ALBUM_CACHE);
      };
      req.onerror = () => resolve({});
    });
  } catch (e) { return {}; }
}

async function addAlbumEntryIDB(entry) {
  const db = await openAlbumDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');
    const req = store.add(entry);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e);
  });
}

function compressImage(file, maxDim = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round(height * maxDim / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round(width * maxDim / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAlbumEntries(idx) {
  return ALBUM_CACHE[idx] || [];
}
function renderAlbumSection(idx) {
  const entries = getAlbumEntries(idx);
  return `
    <div style="border-top:1px solid #F5EFE6;">
      <div onclick="toggleStopDrawer('album-${idx}')" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;background:#fff;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-camera" style="color:#E9C46A;"></i>
          <span style="font-weight:700;color:#2C5F6E;font-size:0.95rem;">אלבום הגולשים</span>
          ${entries.length ? `<span style="background:#E9C46A;color:#2C5F6E;font-size:0.7rem;padding:2px 8px;border-radius:10px;font-weight:700;">${entries.length}</span>` : ''}
        </div>
        <i class="fas fa-chevron-down" id="album-${idx}-chevron" style="color:#6B7F8D;font-size:0.85rem;transition:transform 0.3s;"></i>
      </div>
      <div id="album-${idx}" style="max-height:0;overflow:hidden;transition:max-height 0.5s;">
        <div style="padding:0 16px 16px;">
          <div style="background:#F5E6CB;padding:12px;border-radius:8px;margin-bottom:10px;">
            <input type="text" id="album-${idx}-name" placeholder="שם" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;margin-bottom:6px;">
            <input type="text" id="album-${idx}-city" placeholder="עיר" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;margin-bottom:6px;">
            <input type="file" id="album-${idx}-files" accept="image/*" multiple style="width:100%;padding:6px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.8rem;margin-bottom:8px;">
            <button onclick="submitAlbum(${idx})" style="width:100%;padding:9px;border-radius:6px;background:#E76F51;color:#fff;border:none;font-family:Heebo;font-weight:700;font-size:0.85rem;cursor:pointer;">📤 העלה תמונות (עד 3)</button>
          </div>
          <div id="album-${idx}-gallery">${renderAlbumGallery(idx)}</div>
        </div>
      </div>
    </div>`;
}
function renderAlbumGallery(idx) {
  const entries = getAlbumEntries(idx);
  if (!entries.length) return '<div style="text-align:center;color:#6B7F8D;font-size:0.78rem;padding:8px;">עדיין אין תמונות. תהיו הראשונים!</div>';
  const allPhotos = [];
  entries.slice().reverse().forEach(e => (e.images || []).forEach(src => allPhotos.push({ src, name: e.name, city: e.city })));
  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
      ${allPhotos.map(p => `
        <div style="position:relative;aspect-ratio:1/1;border-radius:6px;overflow:hidden;cursor:pointer;" onclick="openImageModal('${p.src}','${p.name.replace(/'/g, "\\'")}','${(p.city || '').replace(/'/g, "\\'")}')">
          <img src="${p.src}" style="width:100%;height:100%;object-fit:cover;display:block;">
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));color:#fff;padding:12px 6px 4px;font-size:0.6rem;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,0.7);">
            <div style="font-weight:700;">${p.name}</div>
            ${p.city ? `<div style="opacity:0.85;font-size:0.55rem;">📍 ${p.city}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
}

function openImageModal(src, name, city) {
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1;padding:20px;">
      <button onclick="document.getElementById('detailModal').classList.remove('active')" style="position:absolute;top:14px;left:14px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;font-size:1.2rem;font-weight:700;z-index:2;">✕</button>
      <img src="${src}" style="max-width:100%;max-height:80vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);">
      <div style="color:#fff;text-align:center;margin-top:14px;">
        <div style="font-weight:700;font-size:1.05rem;">${name}</div>
        ${city ? `<div style="opacity:0.85;font-size:0.85rem;margin-top:2px;">📍 ${city}</div>` : ''}
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'stretch';
  modal.style.justifyContent = 'stretch';
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}
async function submitAlbum(idx) {
  const name = document.getElementById(`album-${idx}-name`).value.trim();
  const city = document.getElementById(`album-${idx}-city`).value.trim();
  const files = document.getElementById(`album-${idx}-files`).files;
  if (!name) { alert('יש להזין שם'); return; }
  if (!files.length) { alert('יש להעלות לפחות תמונה אחת'); return; }
  const sliced = Array.from(files).slice(0, 3);
  try {
    const images = await Promise.all(sliced.map(f => compressImage(f)));
    const entry = { idx, name, city, images, ts: Date.now() };
    const id = await addAlbumEntryIDB(entry);
    entry.id = id;
    if (!ALBUM_CACHE[idx]) ALBUM_CACHE[idx] = [];
    ALBUM_CACHE[idx].push(entry);
    const card = document.getElementById(`itin-card-${idx}`);
    if (card) card.innerHTML = renderItineraryCardInner(ITINERARY_STATES[idx], idx);
    setTimeout(() => toggleStopDrawer(`album-${idx}`), 50);
  } catch (e) {
    console.error(e);
    alert('שגיאה בהעלאת התמונות. נסה שוב.');
  }
}

function rateItinerary(idx, n) {
  localStorage.setItem(`itin-rating-${idx}`, String(n));
  const container = document.getElementById(`rating-${idx}`);
  if (!container) return;
  const stars = container.querySelectorAll('[data-star]');
  stars.forEach(s => {
    const num = parseInt(s.dataset.star);
    s.style.color = num <= n ? '#E9C46A' : '#E5E7EB';
  });
  const card = document.getElementById(`itin-card-${idx}`);
  if (card && ITINERARY_STATES[idx]) {
    card.innerHTML = renderItineraryCardInner(ITINERARY_STATES[idx], idx);
  }
}

function onStopDragStart(e, idx, stopIdx) {
  e.dataTransfer.setData('text/plain', `${idx}|${stopIdx}`);
  e.dataTransfer.effectAllowed = 'move';
}
function onStopDrop(e, idx, targetStopIdx) {
  e.preventDefault();
  const parts = (e.dataTransfer.getData('text/plain') || '').split('|');
  const sourceIdx = parseInt(parts[0]);
  const sourceStopIdx = parseInt(parts[1]);
  if (isNaN(sourceIdx) || isNaN(sourceStopIdx) || sourceIdx !== idx) return;
  if (sourceStopIdx === targetStopIdx) return;
  const it = ITINERARY_STATES[idx];
  const [moved] = it.stops.splice(sourceStopIdx, 1);
  it.stops.splice(targetStopIdx, 0, moved);
  const card = document.getElementById(`itin-card-${idx}`);
  if (card) card.innerHTML = renderItineraryCardInner(it, idx);
}

function toggleMapSize(id) {
  const el = document.getElementById(id);
  const content = document.getElementById(id + '-content');
  const btn = document.getElementById(id + '-btn');
  if (!el || !content) return;
  const isExpanded = el.dataset.expanded === '1';
  if (isExpanded) {
    el.style.height = '200px';
    content.innerHTML = `<img src="${el.dataset.static}" alt="מפת מסלול" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`;
    el.dataset.expanded = '0';
    if (btn) btn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> הגדלה אינטראקטיבית';
  } else {
    el.style.height = '500px';
    const idx = parseInt(id.replace('map-', ''));
    const it = ITINERARY_STATES[idx];
    const stops = it.stops.filter(s => s.lat && s.lng);
    content.innerHTML = `<div id="${id}-leaflet" style="width:100%;height:100%;"></div>`;
    setTimeout(() => {
      const mapEl = document.getElementById(`${id}-leaflet`);
      if (!mapEl || typeof L === 'undefined') return;
      const center = [stops[0].lat, stops[0].lng];
      const m = L.map(mapEl).setView(center, 11);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', { attribution:'&copy; CartoDB &copy; OSM', subdomains:'abcd' }).addTo(m);
      stops.forEach((s, i) => {
        L.marker([s.lat, s.lng]).addTo(m).bindPopup(`<b>${i + 1}. ${s.name}</b><br>${s.time}<br>${s.desc}`);
      });
      L.polyline(stops.map(s => [s.lat, s.lng]), { color: it.color, weight: 4 }).addTo(m);
      m.fitBounds(stops.map(s => [s.lat, s.lng]), { padding: [30, 30] });
    }, 100);
    el.dataset.expanded = '1';
    if (btn) btn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> הקטנה';
  }
}

function toggleStopDrawer(id) {
  const el = document.getElementById(id);
  const chev = document.getElementById(id + '-chevron');
  if (!el) return;
  if (el.style.maxHeight && el.style.maxHeight !== '0px') {
    el.style.maxHeight = '0px';
    if (chev) chev.style.transform = 'rotate(0deg)';
  } else {
    el.style.maxHeight = '500px';
    if (chev) chev.style.transform = 'rotate(180deg)';
  }
}

function moveSlide(sliderId, dir) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const slides = slider.querySelectorAll('.itin-slide');
  const dots = slider.querySelectorAll('[data-dot]');
  const total = slides.length;
  let current = parseInt(slider.dataset.current || '0');
  slides[current].style.opacity = '0';
  if (dots[current]) dots[current].style.background = 'rgba(255,255,255,0.4)';
  current = (current + dir + total) % total;
  slides[current].style.opacity = '1';
  if (dots[current]) dots[current].style.background = '#fff';
  slider.dataset.current = String(current);
  const m = sliderId.match(/^itin-slider-(\d+)$/);
  if (m && window.ITIN_RESTAURANTS_ON && window.ITIN_RESTAURANTS_ON[m[1]]) {
    renderItinRestaurants(parseInt(m[1]));
  }
}

function startItinerarySliders() {}

const MALL_INFO = {
  'Dubai Mall': { brands:['Apple','Chanel','Louis Vuitton','Gucci','Hermès','Versace','Dior'], hours:'10:00–24:00', phone:'+971-800-382246', highlights:['Dubai Aquarium','Dubai Fountain','VR Park','KidZania','Burj Khalifa Lobby'] },
  'Mall of the Emirates': { brands:['Harvey Nichols','Apple','Zara','H&M','Sephora'], hours:'10:00–24:00', phone:'+971-4-409-9000', highlights:['Ski Dubai','Magic Planet','Vox Cinemas'] },
  'Dubai Festival City': { brands:['IKEA','Marks & Spencer','ACE','Carrefour'], hours:'10:00–22:00', phone:'+971-4-213-6213', highlights:['IMAGINE Show','Bounce','Hub Zero'] },
  'Ibn Battuta Mall': { brands:['Carrefour','Centrepoint','Apple'], hours:'10:00–22:00', phone:'+971-4-362-1900', highlights:['Themed Halls (China, India, Persia)','Cinemas'] },
  'City Walk': { brands:['Boutiques and lifestyle','Coffee shops'], hours:'10:00–24:00', phone:'+971-800-637222', highlights:['Hub Zero','Coca-Cola Arena','The Green Planet'] },
  'Mercato Mall': { brands:['Centrepoint','Spinneys','H&M'], hours:'10:00–22:00', phone:'+971-4-344-4161', highlights:['Renaissance European theme','Family-friendly'] },
  'Wafi Mall': { brands:['Designer brands','Wafi Gourmet'], hours:'10:00–22:00', phone:'+971-4-324-4555', highlights:['Egyptian theme architecture','Souk Khan Murjan'] },
  'Nakheel Mall': { brands:['Local brands','Carrefour'], hours:'10:00–24:00', phone:'+971-4-453-0844', highlights:['View of Burj Al Arab','The View at The Palm'] },
  'Cityland Mall': { brands:['Carrefour','Family stores'], hours:'10:00–24:00', phone:'+971-4-274-1414', highlights:['Central Park','Botanical garden'] },
  'Dubai Hills Mall': { brands:['Carrefour','Boots','Sephora'], hours:'10:00–24:00', phone:'+971-4-512-5555', highlights:['Storm — biggest indoor coaster','Roxy Cinemas'] }
};

function findItemsAtLocation(locationName) {
  const db = getDB();
  const norm = s => String(s || '').toLowerCase();
  const target = norm(locationName);
  const results = { restaurants: [], kids: [], attractions: [], nightlife: [], hotels: [] };
  ['restaurants','kids','attractions','nightlife','hotels'].forEach(cat => {
    (db[cat] || []).forEach(item => {
      const addr = norm(item.address);
      if (addr.includes(target)) results[cat].push(item);
    });
  });
  return results;
}

function renderMallPage(mallId) {
  const page = document.getElementById('page-mall');
  if (!page) return;
  const id = parseInt(mallId);
  const mall = (getDB().shopping || []).find(m => m.id === id);
  if (!mall) { page.innerHTML = '<div class="page-header"><button class="back-btn" onclick="navigateTo(\'shopping\')"><i class="fas fa-arrow-right"></i></button><h2>קניון לא נמצא</h2></div>'; return; }
  const info = MALL_INFO[mall.nameEn] || {};
  const inside = findItemsAtLocation(mall.nameEn);

  const sectionHTML = (label, items, cat) => {
    const filtered = items.filter(i => i.id !== mall.id).slice(0, 6);
    if (!filtered.length) return '';
    return `
      <div style="margin-top:18px;">
        <h3 style="margin:0 0 8px;color:#2C5F6E;font-size:1rem;font-weight:700;">${label} (${filtered.length})</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${filtered.map(i => `
            <div onclick="openDetail('${cat}',${i.id})" style="background:#fff;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;cursor:pointer;">
              <img src="${i.image}" style="width:100%;height:90px;object-fit:cover;" onerror="this.style.display='none'">
              <div style="padding:8px;">
                <div style="font-weight:600;color:#2C5F6E;font-size:0.78rem;">${i.name}</div>
                <div style="font-size:0.65rem;color:#6B7F8D;margin-top:2px;">⭐ ${i.rating || '-'} · ${i.price || ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  };

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('shopping')"><i class="fas fa-arrow-right"></i></button>
      <h2>${mall.name}</h2>
    </div>
    <div style="padding:0 0 80px;">
      <img src="${mall.image}" alt="${mall.name}" style="width:100%;height:200px;object-fit:cover;" onerror="this.style.display='none'">
      <div style="padding:14px 16px;">
        <div style="font-weight:800;color:#2C5F6E;font-size:1.2rem;">${mall.name}</div>
        <div style="color:#6B7F8D;font-size:0.85rem;margin-top:2px;"><i class="fas fa-map-marker-alt" style="color:#F4A261;"></i> ${mall.address}</div>

        ${(() => {
          const r = inside.restaurants.length, k = inside.kids.length, a = inside.attractions.length, n = inside.nightlife.length;
          const total = r + k + a + n;
          if (!total) return '';
          return `
            <div style="margin-top:10px;background:linear-gradient(135deg,#E76F51,#F4A261);color:#fff;border-radius:8px;padding:10px 12px;">
              <div style="font-weight:700;font-size:0.9rem;margin-bottom:6px;">🎯 ${total} פעילויות בתוך הקניון:</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:0.7rem;">
                ${r ? `<span style="background:rgba(255,255,255,0.25);padding:3px 9px;border-radius:10px;">🍽️ ${r} מסעדות</span>` : ''}
                ${k ? `<span style="background:rgba(255,255,255,0.25);padding:3px 9px;border-radius:10px;">🎢 ${k} לילדים</span>` : ''}
                ${a ? `<span style="background:rgba(255,255,255,0.25);padding:3px 9px;border-radius:10px;">🎭 ${a} אטרקציות</span>` : ''}
                ${n ? `<span style="background:rgba(255,255,255,0.25);padding:3px 9px;border-radius:10px;">🌃 ${n} בילויים</span>` : ''}
              </div>
            </div>`;
        })()}
        <div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;font-size:0.8rem;">
          ${info.hours ? `<span style="background:#F5E6CB;padding:4px 10px;border-radius:6px;color:#2C5F6E;"><i class="fas fa-clock" style="color:#E9C46A;"></i> ${info.hours}</span>` : ''}
          ${info.phone ? `<a href="tel:${info.phone}" style="background:#F5E6CB;padding:4px 10px;border-radius:6px;color:#2C5F6E;text-decoration:none;"><i class="fas fa-phone" style="color:#2A9D8F;"></i> ${info.phone}</a>` : ''}
        </div>
        <div style="color:#2C5F6E;font-size:0.9rem;line-height:1.6;">${mall.description}</div>

        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          ${mall.lat ? `<a onclick="openInFrame('https://www.google.com/maps?q=${mall.lat},${mall.lng}','${mall.name} - מפה')" style="flex:1;min-width:120px;text-align:center;padding:10px;background:#E76F51;color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.85rem;cursor:pointer;"><i class="fas fa-map-pin"></i> איפה זה?</a>` : ''}
          ${mall.lat ? `<a href="${navUrl(mall.lat, mall.lng, mall.name || '')}" target="_blank" style="flex:1;min-width:120px;text-align:center;padding:10px;background:#2A9D8F;color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:0.85rem;"><i class="fas fa-directions"></i> נווט</a>` : ''}
        </div>

        ${info.highlights ? `
          <div style="margin-top:18px;background:#F5E6CB;border-right:3px solid #E9C46A;padding:10px 14px;border-radius:6px;">
            <div style="font-weight:700;color:#2C5F6E;margin-bottom:6px;font-size:0.9rem;">⭐ אטרקציות בולטות</div>
            <ul style="margin:0;padding-right:18px;color:#2C5F6E;font-size:0.85rem;line-height:1.6;">
              ${info.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${info.brands ? `
          <div style="margin-top:14px;">
            <div style="font-weight:700;color:#2C5F6E;margin-bottom:6px;font-size:0.9rem;">🛍️ מותגים מובילים</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${info.brands.map(b => `<span style="background:#fff;border:1px solid #E5E7EB;padding:4px 10px;border-radius:14px;font-size:0.75rem;color:#2C5F6E;">${b}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${sectionHTML('🍽️ מסעדות בקניון', inside.restaurants, 'restaurants')}
        ${sectionHTML('🎢 לילדים', inside.kids, 'kids')}
        ${sectionHTML('🎭 אטרקציות', inside.attractions, 'attractions')}
        ${sectionHTML('🌃 בילויים', inside.nightlife, 'nightlife')}
        ${sectionHTML('🏨 מלונות סמוכים', inside.hotels, 'hotels')}
      </div>
    </div>
  `;
}

const INFO_SECTIONS = {
  about: {
    key:'about', title:'אודותינו', icon:'fa-info-circle', color:'#2A9D8F',
    body:`WellCome Dubai — המדריך הישראלי המלא לדובאי.\n\nהחזון שלנו\nלהיות הכתובת העברית הראשונה של תייר ישראלי שמתכנן ביקור באמירויות. אנחנו מאמינים שטיול חכם מתחיל במידע אמין, נגיש ועדכני — בעברית, עם רגישות לקודים המקומיים.\n\nמה תמצאו כאן\n• מלונות — מדורגים לפי כוכבים ויוקרה\n• מסעדות — דגש על מסעדות כשרות, ישראליות וים-תיכוניות\n• אטרקציות — חובה לראות, פעילויות מים, פארקי שעשועים, ספארי מדבר\n• תחבורה — מטרו, מוניות, השכרת רכב, אפליקציות הסעה\n• בילוי, קניות, ילדים — והכל במפה אחת\n• מסלולי יום מוכנים, מזג אוויר חי, המרת מטבעות, לוחות טיסות חיים\n\nמקורות המידע\nהנתונים נאספים ממקורות פתוחים (Google Maps, אתרי הספקים, Wikipedia), מתחזקים ע"י משתמשי האתר ומעודכנים באופן שוטף. אנחנו לא מקבלים תשלום מאף ספק — הדירוגים אובייקטיביים.\n\nישראלים בדובאי\nמאז הסכמי אברהם (2020), דובאי הפכה ליעד פופולרי לישראלים. האתר נבנה תוך הבנה של הצרכים הייחודיים של המטייל הישראלי — כשרות, שפה, מנהגים מקומיים וביטחון.`
  },
  terms: {
    key:'terms', title:'תקנון השימוש', icon:'fa-file-contract', color:'#E76F51',
    body:`עודכן לאחרונה: מאי 2026\n\n1. כללי\nהשימוש באתר WellCome Dubai (להלן: "האתר") כפוף לתנאי שימוש אלה. גלישה באתר מהווה הסכמה לכל הסעיפים שלהלן.\n\n2. מהות השירות\nהאתר מספק מידע תיירותי על דובאי לקהל הישראלי. השירות ניתן ללא תשלום, ללא רישום, וללא איסוף נתונים אישיים.\n\n3. אחריות והגבלות\n• כל המידע מסופק "כפי שהוא" (AS-IS), ללא אחריות מפורשת או משתמעת.\n• מחירים, שעות פתיחה, אזורי שירות ופרטי קשר עלולים להשתנות — חובה לוודא ישירות מול בית העסק לפני קבלת החלטות.\n• WellCome Dubai אינו אחראי לטעויות, השמטות, או נזק כלשהו שנגרם משימוש במידע.\n\n4. צד שלישי\nקישורים, מפות, מידע על מלונות/מסעדות/חברות תחבורה הם לצורכי נוחות בלבד. WellCome Dubai אינו אחראי לעסקאות, חוויות או שירותים שמספק כל גורם חיצוני.\n\n5. שימוש מותר\nשימוש באתר מותר למטרות פרטיות בלבד. אסור להעתיק, להפיץ, או לעשות שימוש מסחרי בתכנים ללא אישור בכתב.\n\n6. קניין רוחני\nכל הזכויות שמורות. תמונות הספקים שייכות לבעליהן ומופיעות לצורך זיהוי בלבד.\n\n7. שינויים בתקנון\nWellCome Dubai רשאי לעדכן תנאים אלו בכל עת. המשך שימוש לאחר עדכון מהווה הסכמה לשינויים.\n\n8. סמכות שיפוט\nעל תנאי שימוש אלה יחול הדין הישראלי. סמכות שיפוט בלעדית לבתי המשפט בתל אביב.`
  },
  privacy: {
    key:'privacy', title:'מדיניות פרטיות', icon:'fa-user-shield', color:'#5B9DC7',
    body:`עודכן לאחרונה: מאי 2026\n\nאיזה מידע אנחנו אוספים?\nWellCome Dubai פועל ללא רישום משתמשים. לא נאספים שמות, אימיילים, מספרי טלפון או כל פרט מזהה.\n\nנתוני מיקום (Geolocation)\nכאשר תלחצו על "הראה לי מה קרוב אליי", הדפדפן יבקש הרשאה לגישה למיקום. הנתון משמש אך ורק לחישוב מרחק לאטרקציות, ולא נשלח לשרת או נשמר בשום מקום.\n\nאחסון מקומי (LocalStorage)\nהדפדפן שומר נתונים טכניים על המכשיר שלכם, ללא שליחה לשרת:\n• שערי מטבע ומזג אוויר (זמני, להאצה)\n• נתוני המאגר של ספקים (קטגוריות, מסלולים)\n• דירוגים אישיים שהוספתם למסלולים\n\nתוכלו למחוק את כל הנתונים בכל רגע — Settings → Clear Browsing Data.\n\nשירותי צד שלישי\n• Google Maps — מציג מפות ונווטים. כפוף למדיניות הפרטיות של Google.\n• Open-Meteo — שירות מזג אוויר חינמי, ללא איסוף נתונים.\n• AeroDataBox / Booking — ספקי לוחות טיסות וזמינות מלונות (כאשר רלוונטי).\n• GitHub Pages — אחסון האתר.\n\nעוגיות (Cookies)\nהאתר אינו משתמש בעוגיות שיווק או מעקב.\n\nזכויות המשתמש\n• זכות עיון: כל הנתונים נשמרים מקומית במכשיר שלכם — אתם בשליטה מלאה.\n• זכות מחיקה: ניקוי נתוני הדפדפן ימחק הכל.\n• זכות התנגדות: ניתן לסרב להרשאת מיקום ללא פגיעה ביכולת הגלישה.\n\nשאלות?\nניתן לפנות אלינו בעמוד "צור קשר".`
  },
  contact: {
    key:'contact', title:'צור קשר', icon:'fa-envelope', color:'#E9C46A',
    body:''
  }
};

function renderLegalPage() {
  const page = document.getElementById('page-legal');
  if (!page) return;
  const items = Object.values(INFO_SECTIONS);
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-info-circle" style="color:#2C5F6E;margin-left:6px;"></i> מידע</h2>
    </div>
    <div style="padding:12px 16px 80px;display:flex;flex-direction:column;gap:10px;">
      ${items.map(s => `
        <button onclick="navigateTo('${s.key}')" style="background:#fff;border:1px solid #E5E7EB;border-right:5px solid ${s.color};border-radius:10px;padding:16px;cursor:pointer;display:flex;align-items:center;gap:12px;font-family:Heebo;text-align:right;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="width:40px;height:40px;border-radius:50%;background:${s.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex-shrink:0;"><i class="fas ${s.icon}"></i></div>
          <div style="flex:1;font-weight:700;color:#2C5F6E;font-size:0.95rem;">${s.title}</div>
          <i class="fas fa-chevron-left" style="color:${s.color};font-size:0.85rem;"></i>
        </button>
      `).join('')}
      <div style="text-align:center;color:#6B7F8D;font-size:0.75rem;margin-top:20px;">
        © 2026 WellCome Dubai · גרסה 1.0
      </div>
    </div>
  `;
}

function renderInfoSubPage(key) {
  const page = document.getElementById(`page-${key}`);
  if (!page) return;
  const s = INFO_SECTIONS[key];
  if (!s) return;
  const inner = key === 'contact' ? renderContactForm() : `<div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:18px;font-size:0.92rem;line-height:1.8;color:#2C5F6E;white-space:pre-line;box-shadow:0 2px 8px rgba(0,0,0,0.04);">${s.body}</div>`;
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('legal')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas ${s.icon}" style="color:${s.color};margin-left:6px;"></i> ${s.title}</h2>
    </div>
    <div style="padding:16px 20px 80px;">${inner}</div>
  `;
}

function renderContactForm() {
  return `
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin-bottom:14px;">
      <div style="color:#2C5F6E;font-size:0.92rem;line-height:1.7;margin-bottom:16px;">
        יש לכם הצעה, תיקון, שיתוף תמונה או רעיון לשיתוף פעולה? נשמח לשמוע!
      </div>
      <form onsubmit="submitContactForm(event)">
        <div style="margin-bottom:12px;">
          <label style="display:block;color:#2C5F6E;font-weight:600;font-size:0.85rem;margin-bottom:5px;">שם מלא *</label>
          <input type="text" name="name" required style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.9rem;color:#2C5F6E;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;color:#2C5F6E;font-weight:600;font-size:0.85rem;margin-bottom:5px;">אימייל *</label>
          <input type="email" name="email" required style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.9rem;direction:ltr;text-align:left;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;color:#2C5F6E;font-weight:600;font-size:0.85rem;margin-bottom:5px;">נושא *</label>
          <select name="topic" required style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.9rem;color:#2C5F6E;background:#fff;box-sizing:border-box;">
            <option value="">בחר נושא...</option>
            <option value="error">דיווח על שגיאה / מידע לא מעודכן</option>
            <option value="suggestion">הצעה לשיפור / תוספת</option>
            <option value="photo">שיתוף תמונה אמיתית מהמקום</option>
            <option value="partnership">שיתוף פעולה עסקי</option>
            <option value="other">אחר</option>
          </select>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;color:#2C5F6E;font-weight:600;font-size:0.85rem;margin-bottom:5px;">הודעה *</label>
          <textarea name="message" required rows="5" style="width:100%;padding:10px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.9rem;color:#2C5F6E;resize:vertical;min-height:100px;box-sizing:border-box;"></textarea>
        </div>
        <div style="display:flex;gap:10px;">
          <button type="submit" style="flex:1;background:#E9C46A;color:#2C5F6E;border:none;padding:12px;border-radius:6px;font-family:Heebo;font-weight:700;font-size:0.95rem;cursor:pointer;"><i class="fas fa-envelope"></i> שלח באימייל</button>
          <button type="button" onclick="submitContactForm(null, true)" style="flex:1;background:#25D366;color:#fff;border:none;padding:12px;border-radius:6px;font-family:Heebo;font-weight:700;font-size:0.95rem;cursor:pointer;"><i class="fab fa-whatsapp"></i> שלח בוואטסאפ</button>
        </div>
      </form>
    </div>
    <div style="background:#F5E6CB;border-radius:10px;padding:14px;font-size:0.82rem;color:#2C5F6E;text-align:center;">
      או צור קשר ישיר:<br>
      <a href="mailto:krispelitzik@gmail.com" style="color:#E76F51;font-weight:700;text-decoration:none;">krispelitzik@gmail.com</a>
    </div>
  `;
}

function submitContactForm(e, viaWhatsApp) {
  if (e) e.preventDefault();
  const form = document.querySelector('#page-contact form');
  if (!form) return;
  const fd = new FormData(form);
  const name = fd.get('name'), email = fd.get('email'), topic = fd.get('topic'), message = fd.get('message');
  if (!name || !email || !topic || !message) { alert('נא למלא את כל השדות'); return; }
  const topicLabels = { error:'דיווח על שגיאה', suggestion:'הצעה לשיפור', photo:'שיתוף תמונה', partnership:'שיתוף פעולה', other:'אחר' };
  const subject = `[WellCome Dubai] ${topicLabels[topic] || topic} — ${name}`;
  const body = `שם: ${name}\nאימייל: ${email}\nנושא: ${topicLabels[topic] || topic}\n\n${message}`;
  if (viaWhatsApp) {
    window.open(`https://wa.me/972501234567?text=${encodeURIComponent(subject + '\n\n' + body)}`, '_blank');
  } else {
    window.location.href = `mailto:krispelitzik@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

const CURRENCY_FLAGS = { ILS:'🇮🇱', AED:'🇦🇪', USD:'🇺🇸', EUR:'🇪🇺' };
const CURRENCY_NAMES = { ILS:'שקל', AED:'דירהם', USD:'דולר', EUR:'יורו' };
let _curState = { rates:null, amount:'', from:'ILS', lastUpdate:'', loading:false };

function renderCurrencyPage() {
  const page = document.getElementById('page-currency');
  if (!page) return;
  _curState = { rates:null, amount:'', from:'ILS', lastUpdate:'', loading:true };
  page.innerHTML = `
    <div style="background:linear-gradient(160deg,#E76F51,#F4A261);min-height:100vh;color:#fff;padding:20px 18px 40px;position:relative;">
      <button onclick="navigateTo('home')" style="position:fixed;top:14px;right:14px;width:42px;height:42px;border-radius:50%;background:rgba(0,0,0,0.55);border:2px solid rgba(255,255,255,0.4);color:#fff;font-size:1.3rem;font-weight:700;cursor:pointer;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">✕</button>
      <div style="text-align:center;margin-top:6px;">
        <div style="font-size:1.7rem;font-weight:800;">המרת מטבעות</div>
        <div style="font-size:0.85rem;opacity:0.85;margin-top:2px;">שערים מתעדכנים בזמן אמת</div>
        <div id="curUpdated" style="font-size:0.7rem;opacity:0.7;margin-top:4px;">טוען...</div>
      </div>
      <div style="display:flex;justify-content:center;margin:14px 0 22px;">
        <button onclick="loadCurrencyRates()" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.18);border:none;padding:7px 18px;border-radius:20px;color:#fff;font-family:Heebo;font-weight:600;font-size:0.85rem;cursor:pointer;">
          <span id="curRefreshIcon">🔄</span><span>רענן נתונים</span>
        </button>
      </div>
      <div id="curBody" style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i></div>
    </div>
  `;
  loadCurrencyRates();
}

function loadCurrencyRates() {
  _curState.loading = true;
  const upd = document.getElementById('curUpdated');
  if (upd) upd.textContent = 'טוען...';
  fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json()).then(d => {
    if (d.rates) _curState.rates = { ILS:d.rates.ILS, AED:d.rates.AED, USD:1, EUR:d.rates.EUR };
    const src = d.time_last_update_utc;
    if (src) {
      const dt = new Date(src);
      const pad = n => String(n).padStart(2,'0');
      _curState.lastUpdate = `${pad(dt.getDate())}/${pad(dt.getMonth()+1)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    _curState.loading = false;
    renderCurrencyBody();
  }).catch(() => { _curState.loading = false; renderCurrencyBody(); });
}

function renderCurrencyBody() {
  const body = document.getElementById('curBody');
  const upd = document.getElementById('curUpdated');
  if (upd) upd.textContent = _curState.lastUpdate ? `עודכן: ${_curState.lastUpdate}` : '';
  if (!body) return;
  if (!_curState.rates) { body.innerHTML = `<div style="color:#fff;opacity:0.8;">שגיאה בטעינת שערים</div>`; return; }
  const order = ['EUR','USD','AED','ILS'];
  const others = order.filter(c => c !== _curState.from);
  const fromBtns = order.map(c => {
    const active = c === _curState.from;
    return `<button onclick="setCurrencyFrom('${c}')" style="display:flex;align-items:center;gap:8px;background:${active ? '#fff' : 'rgba(255,255,255,0.15)'};color:${active ? '#2C5F6E' : '#fff'};border:none;padding:11px 16px;border-radius:14px;min-width:110px;justify-content:center;font-family:Heebo;font-weight:600;font-size:0.85rem;cursor:pointer;">
      <span style="font-size:1.1rem;">${CURRENCY_FLAGS[c]}</span>${CURRENCY_NAMES[c]}
    </button>`;
  }).join('');
  const keys = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];
  const keypad = keys.map(k => `<button onclick="curKey('${k}')" style="width:23%;padding:10px 0;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);border-radius:8px;color:#fff;font-family:Heebo;font-weight:700;font-size:1rem;cursor:pointer;">${k}</button>`).join('');
  const results = others.map(c => {
    const v = curConvert(c);
    return `<div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:11px 14px;margin-bottom:8px;">
      <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;">
        <span style="font-size:1.4rem;">${CURRENCY_FLAGS[c]}</span>
        <span style="font-size:1.5rem;font-weight:900;">${v}</span>
        <span style="font-size:0.85rem;font-weight:700;opacity:0.85;">${CURRENCY_NAMES[c]}</span>
      </div>
      <div style="font-size:0.7rem;opacity:0.65;text-align:center;margin-top:3px;">1 ${CURRENCY_NAMES[_curState.from]} = ${(_curState.rates[c]/_curState.rates[_curState.from]).toFixed(4)} ${CURRENCY_NAMES[c]}</div>
    </div>`;
  }).join('');
  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:18px;">${fromBtns}</div>
    <div style="background:rgba(255,255,255,0.15);border-radius:14px;padding:14px;margin-bottom:18px;border:2px solid rgba(255,255,255,0.4);position:relative;">
      <input id="curAmountInput" inputmode="decimal" type="text" value="${_curState.amount}" oninput="curInput(this.value)" placeholder="הקלד סכום ב${CURRENCY_NAMES[_curState.from]}" style="width:100%;background:transparent;border:none;outline:none;color:#fff;font-size:1.6rem;font-weight:900;text-align:center;font-family:Heebo;direction:ltr;">
      ${_curState.amount ? `<button onclick="curKey('clear')" style="position:absolute;top:50%;left:10px;transform:translateY(-50%);background:rgba(0,0,0,0.25);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:0.8rem;">×</button>` : ''}
    </div>
    <div>${results}</div>
    <div style="font-size:0.7rem;opacity:0.6;text-align:center;margin-top:14px;">מקור: open.er-api.com (שערים גלובליים, מתעדכנים יומית)</div>
  `;
  const inp = document.getElementById('curAmountInput');
  if (inp && document.activeElement !== inp) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function curConvert(to) {
  if (!_curState.rates || !_curState.amount) return '—';
  const num = parseFloat(_curState.amount);
  if (isNaN(num)) return '—';
  const inUsd = num / _curState.rates[_curState.from];
  return (inUsd * _curState.rates[to]).toFixed(2);
}

function setCurrencyFrom(c) { _curState.from = c; renderCurrencyBody(); }

function curKey(k) {
  if (k === 'clear') _curState.amount = '';
  renderCurrencyBody();
}

function curInput(v) {
  v = v.replace(/[^0-9.]/g, '');
  const parts = v.split('.');
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
  _curState.amount = v;
  // update only results, not the input itself, to avoid losing focus
  const order = ['EUR','USD','AED','ILS'];
  const others = order.filter(c => c !== _curState.from);
  const resultsHtml = others.map(c => {
    const val = curConvert(c);
    return `<div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:11px 14px;margin-bottom:8px;">
      <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;">
        <span style="font-size:1.4rem;">${CURRENCY_FLAGS[c]}</span>
        <span style="font-size:1.5rem;font-weight:900;">${val}</span>
        <span style="font-size:0.85rem;font-weight:700;opacity:0.85;">${CURRENCY_NAMES[c]}</span>
      </div>
      <div style="font-size:0.7rem;opacity:0.65;text-align:center;margin-top:3px;">1 ${CURRENCY_NAMES[_curState.from]} = ${(_curState.rates[c]/_curState.rates[_curState.from]).toFixed(4)} ${CURRENCY_NAMES[c]}</div>
    </div>`;
  }).join('');
  // find the results container (the div right before the source line)
  const body = document.getElementById('curBody');
  if (!body) return;
  const divs = body.querySelectorAll(':scope > div');
  // last 2 are results + source; replace results
  if (divs.length >= 2) divs[divs.length - 2].innerHTML = resultsHtml;
}

function navigateToNearestMetro() {
  if (!navigator.geolocation) { alert('הדפדפן לא תומך באיתור מיקום'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${pos.coords.latitude},${pos.coords.longitude}&destination=Dubai+Metro+Station&travelmode=walking`;
      window.open(url, '_blank');
    },
    err => alert('לא ניתן לקבל מיקום. אפשר/י גישה למיקום והנסה שוב.')
  );
}

const DUBAI_AREAS = [
  { name:'דאון טאון', color:'#E76F51', desc:'האזור האורבני החדיש והנוצץ — ברג׳ ח׳ליפה, Dubai Mall, מזרקות דובאי, מסעדות וגורדי שחקים. לב התיירות המודרנית.', poly:[[25.2105,55.2705],[25.2098,55.2812],[25.2050,55.2870],[25.1950,55.2870],[25.1830,55.2810],[25.1820,55.2705],[25.1900,55.2640],[25.2010,55.2640]] },
  { name:'מרינה', color:'#2A9D8F', desc:'רצועת חוף 2 ק״מ, יאכטות, מסעדות, חיי לילה וגורדי שחקים. נבחרה ע״י Time Out לאחת מ-50 השכונות המגניבות בעולם.', poly:[[25.0950,55.1340],[25.0945,55.1455],[25.0870,55.1530],[25.0750,55.1530],[25.0700,55.1450],[25.0710,55.1350],[25.0810,55.1310]] },
  { name:'פאלם ג׳ומיירה', color:'#E9C46A', desc:'אי מלאכותי בצורת דקל — אטרקציית סימן הזיהוי של דובאי. אתרי נופש יוקרתיים: Atlantis The Palm, FIVE Palm, Waldorf Astoria. חופים פרטיים ונוף ים.', poly:[[25.1430,55.1380],[25.1430,55.1620],[25.1330,55.1700],[25.1180,55.1700],[25.1040,55.1620],[25.1000,55.1500],[25.1040,55.1380],[25.1180,55.1300],[25.1330,55.1300]] },
  { name:'JBR', color:'#F4A261', desc:'Jumeirah Beach Residence — טיילת תוססת על החוף, מסעדות, פעילויות מים ואקסטרים, מופעי רחוב. פופולרי במשפחות ובמקומיים.', poly:[[25.0930,55.1280],[25.0925,55.1450],[25.0820,55.1470],[25.0735,55.1430],[25.0720,55.1330],[25.0810,55.1280]] },
  { name:'דיירה', color:'#6B8E5A', desc:'האזור המסורתי והוותיק — שוק הזהב, שוק התבלינים, שוק הטקסטיל, שוק הפשפשים. נחל דובאי וסירות אברה. מלונות זולים, ערך מצוין לכסף.', poly:[[25.2950,55.2900],[25.2980,55.3200],[25.2920,55.3380],[25.2780,55.3450],[25.2640,55.3380],[25.2600,55.3200],[25.2640,55.3030]] },
  { name:'בור דובאי', color:'#C9A961', desc:'האזור ההיסטורי למגורים, שכונת אל-פאהידי, מוזיאון דובאי. מחלק את העיר בין צפון לדרום עם נחל דובאי.', poly:[[25.2720,55.2850],[25.2730,55.3050],[25.2680,55.3160],[25.2570,55.3180],[25.2440,55.3100],[25.2420,55.2960],[25.2480,55.2880]] },
  { name:'ביזנס ביי', color:'#B85C8E', desc:'מרכז עסקים מודרני בסמוך לדאון טאון — מגדלי משרדים, מסעדות גורמה, מלונות עסקיים.', poly:[[25.1970,55.2580],[25.1970,55.2780],[25.1860,55.2820],[25.1740,55.2780],[25.1700,55.2680],[25.1780,55.2570]] },
  { name:'DIFC', color:'#5B9DC7', desc:'המרכז הפיננסי של דובאי — בנקים, גלריות אמנות, מסעדות שף יוקרתיות. אווירה אורבנית מתוחכמת.', poly:[[25.2210,55.2740],[25.2200,55.2880],[25.2130,55.2920],[25.2050,55.2870],[25.2050,55.2780],[25.2120,55.2730]] },
  { name:'ג׳ומיירה', color:'#A86F8E', desc:'25 ק״מ של רצועת חוף — מים טורקיז וחול לבן. החוף הציבורי מצוין למשפחות. ממסגד ג׳ומיירה ועד פאלם ג׳ומיירה.', poly:[[25.2300,55.2300],[25.2280,55.2580],[25.2200,55.2700],[25.2100,55.2680],[25.2030,55.2530],[25.2050,55.2350],[25.2150,55.2270]] },
  { name:'אל ברשה', color:'#7FA77F', desc:'אזור מרכזי ושקט — קניון האמירויות, Ski Dubai, מלונות במחירים סבירים, שאטל למרכז. נוח לתחבורה.', poly:[[25.1280,55.1900],[25.1310,55.2100],[25.1230,55.2200],[25.1100,55.2200],[25.1010,55.2120],[25.1020,55.1980],[25.1130,55.1880]] }
];

let areasVisible = false;
let areaShapes = [];

function clearAreas() {
  areaShapes.forEach(s => {
    try {
      if (s.setMap) s.setMap(null);
      else if (map && map.removeLayer) map.removeLayer(s);
    } catch(e) {}
  });
  areaShapes = [];
}

function drawAreas() {
  if (!map) return;
  clearAreas();
  if (typeof google !== 'undefined' && google.maps && map.setOptions) {
    const infoWin = new google.maps.InfoWindow();
    DUBAI_AREAS.forEach(a => {
      const poly = new google.maps.Polygon({
        paths: a.poly.map(p => ({lat:p[0], lng:p[1]})),
        strokeColor: a.color, strokeOpacity:0.8, strokeWeight:2,
        fillColor: a.color, fillOpacity:0.18, map: map, clickable:true
      });
      poly.addListener('click', e => {
        infoWin.setContent(`<div style="direction:rtl;font-family:Heebo,sans-serif;max-width:240px;border-top:4px solid ${a.color};padding-top:6px;">
          <b style="color:${a.color};font-size:1rem;">${a.name}</b>
          <p style="margin:6px 0 0;font-size:0.78rem;line-height:1.5;color:#2C5F6E;">${a.desc || ''}</p>
        </div>`);
        infoWin.setPosition(e.latLng);
        infoWin.open(map);
      });
      areaShapes.push(poly);
      const center = a.poly.reduce((acc,p) => [acc[0]+p[0]/a.poly.length, acc[1]+p[1]/a.poly.length], [0,0]);
      const label = new google.maps.Marker({
        position: {lat:center[0], lng:center[1]}, map: map, clickable:false,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale:0, fillOpacity:0, strokeOpacity:0 },
        label: { text:a.name, color:a.color, fontWeight:'700', fontSize:'12px' }
      });
      areaShapes.push(label);
    });
  } else if (typeof L !== 'undefined' && map.addLayer) {
    DUBAI_AREAS.forEach(a => {
      const poly = L.polygon(a.poly, { color:a.color, fillOpacity:0.18, weight:2 }).addTo(map);
      poly.bindPopup(`<div style="direction:rtl;max-width:220px;border-top:3px solid ${a.color};padding-top:6px;"><b style="color:${a.color};">${a.name}</b><p style="margin:6px 0 0;font-size:0.78rem;line-height:1.4;">${a.desc || ''}</p></div>`);
      poly.bindTooltip(a.name, { permanent:true, direction:'center', className:'area-label' });
      areaShapes.push(poly);
    });
  }
}

function toggleAreas() {
  areasVisible = !areasVisible;
  if (areasVisible) drawAreas(); else clearAreas();
  document.querySelectorAll('.areas-toggle').forEach(b => {
    b.style.background = areasVisible ? '#2A9D8F' : '#fff';
    b.style.color = areasVisible ? '#fff' : '#2C5F6E';
    b.style.borderColor = areasVisible ? '#2A9D8F' : '#E5E7EB';
    b.textContent = areasVisible ? '✓ אזורים — מופעל' : '🗺️ הצג אזורי דובאי';
  });
  const strip = document.getElementById('areasStrip');
  if (strip) strip.style.display = areasVisible ? 'flex' : 'none';
}

function focusOnArea(idx) {
  const a = DUBAI_AREAS[idx];
  if (!a || !map) return;
  const center = a.poly.reduce((acc,p) => [acc[0]+p[0]/a.poly.length, acc[1]+p[1]/a.poly.length], [0,0]);
  if (map.panTo && map.setZoom) {
    map.panTo({ lat: center[0], lng: center[1] });
    map.setZoom(13);
  } else if (map.setView) {
    map.setView(center, 13);
  }
}

function clearMap() {
  try {
    if (map) {
      if (map.remove) map.remove(); // Leaflet
      map = null;
    }
  } catch(e) {
    map = null;
  }
  markers = [];
}

function buildMap(elementId, zoom, items) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // Build static map URL
  var mapMarkers = (items || []).filter(function(i){return i.lat && i.lng}).slice(0,15).map(function(i){
    return 'markers=color:0xE76F51%7C'+i.lat+','+i.lng;
  }).join('&');
  var staticUrl = 'https://maps.googleapis.com/maps/api/staticmap?center=25.2048,55.2708&zoom='+(zoom||11)+'&size=600x300&maptype=roadmap&language=en&'+mapMarkers+'&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro';

  // Show static map immediately
  el.innerHTML = '<img src="'+staticUrl+'" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;height:100%;color:#6B7F8D;text-align:center;\\\'>מפה לא זמינה</div>\'">';

  // Then try interactive on top
  try {
    if (hasGoogle()) {
      el.innerHTML = '';
      buildGoogleMap(el, zoom, items);
    } else if (typeof L !== 'undefined') {
      el.innerHTML = '';
      buildLeafletMap(el, zoom, items);
    }
  } catch(e) {
    console.error('Map error:', e);
  }
}

function buildStaticMap(el, items) {
  // Static Google Map image as fallback
  var markers = (items || []).filter(i => i.lat && i.lng).slice(0, 15).map(i => {
    var color = '0xE76F51';
    return `markers=color:${color}|${i.lat},${i.lng}`;
  }).join('&');
  var src = `https://maps.googleapis.com/maps/api/staticmap?center=25.2048,55.2708&zoom=11&size=600x300&maptype=roadmap&language=en&${markers}&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro`;
  el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:#6B7F8D;text-align:center;\\'>מפה לא זמינה ברשת זו</div>'">`;
}

// --- Google Maps ---
function buildGoogleMap(el, zoom, items) {
  const gmap = new google.maps.Map(el, {
    center: { lat:25.2048, lng:55.2708 },
    zoom: zoom || 11,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    language: 'en'
  });
  const infoWin = new google.maps.InfoWindow();
  markers = [];

  (items || []).forEach(item => {
    if (!item.lat || !item.lng) return;
    const color = getMarkerColor(item);
    const marker = new google.maps.Marker({
      position: { lat:item.lat, lng:item.lng },
      map: gmap, title: item.name,
      icon: { path:google.maps.SymbolPath.CIRCLE, scale:10, fillColor:color, fillOpacity:1, strokeColor:'#fff', strokeWeight:2 }
    });
    marker.addListener('click', () => {
      infoWin.setContent(`
        <div style="direction:rtl;font-family:Heebo,sans-serif;min-width:200px;max-width:280px;border-top:4px solid ${color};border-radius:4px;">
          <div style="padding:8px 10px;background:${color}15;">
            <b style="color:${color};">${item.name}</b><br>
            <span style="color:#666;font-size:12px;">${item.address||''}</span><br>
            ${item.rating ? `⭐ ${item.rating} ` : ''}${item.category !== 'transport' ? (item.price||'') : ''}<br>
            <a href="${navUrl(item.lat, item.lng, item.name || '')}" target="_blank" style="color:${color};font-weight:600;">🧭 נווט</a>
            &nbsp;|&nbsp;
            <a href="#" onclick="openDetail('${item.category}',${item.id});return false;" style="color:#3B82F6;">📋 פרטים</a>
          </div>
        </div>`);
      infoWin.open(gmap, marker);
    });
    markers.push(marker);
  });

  if (markers.length > 1) {
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => bounds.extend(m.getPosition()));
    gmap.fitBounds(bounds, 40);
  }
  map = gmap;
}

// --- Leaflet Fallback ---
function buildLeafletMap(el, zoom, items) {
  map = L.map(el).setView([25.2048, 55.2708], zoom || 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap'
  }).addTo(map);

  (items || []).forEach(item => {
    if (!item.lat || !item.lng) return;
    const color = getMarkerColor(item);
    const icon = L.divIcon({
      className:'custom-marker',
      html:`<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize:[16,16], iconAnchor:[8,8]
    });
    L.marker([item.lat, item.lng], { icon })
      .addTo(map)
      .bindPopup(`<div style="direction:rtl;font-family:Heebo,sans-serif;min-width:180px;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:6px;display:block;" onerror="this.style.display='none'">` : ''}
        <b>${item.name}</b><br>${item.address||''}<br>
        ${item.rating ? '⭐ '+item.rating : ''} ${item.category !== 'transport' ? (item.price||'') : ''}<br>
        <a href="${navUrl(item.lat, item.lng, item.name || '')}" target="_blank" style="color:#E76F51;font-weight:600;">🧭 נווט בגוגל</a>
      </div>`);
  });
}

function focusMapItem(category, id) {
  if (!id) return;
  const item = (getAllItems(category) || []).find(i => String(i.id) === String(id));
  if (!item || !item.lat || !item.lng) return;
  if (!map) return;
  if (map.panTo && map.setZoom) {
    map.panTo({ lat: item.lat, lng: item.lng });
    map.setZoom(15);
    const m = markers.find(mk => mk.getPosition && mk.getPosition().lat() === item.lat && mk.getPosition().lng() === item.lng);
    if (m && google.maps.event) google.maps.event.trigger(m, 'click');
  } else if (map.setView) {
    map.setView([item.lat, item.lng], 15);
    map.eachLayer(l => { if (l.getLatLng && l.getLatLng().lat === item.lat && l.openPopup) l.openPopup(); });
  }
}

// ===== LIST PAGE =====
const SUBCAT_MAP = {
  '7 כוכבים':'7star','5 כוכבים':'5star','4-5 כוכבים':'4-5star','3-4 כוכבים':'3-4star','יוקרה':'luxury','עסקים':'business','תקציבי':'budget',
  'יוקרתי מאוד':'ultra-luxury','יוקרתי':'luxury','עממי':'local','ישראלי':'israeli','לבנוני':'lebanese','טורקי':'turkish','אוכל רחוב':'street',
  'אסייתי':'asian','מקומי':'local','פירות ים':'seafood',
  'חובה לביקור':'landmark','מוזיאון':'museum','הרפתקה':'adventure','אקסטרים':'extreme','אומנות':'art','חוף':'beach','פארק מים':'waterpark','פארק שעשועים':'theme-park','סיור':'tour','גן חיות':'zoo','אקווריום':'aquarium','מתחם ילדים':'kids-zone','שלג':'snow','השכרת רכב':'car-rental','ספארי מדבר':'desert-safari',
  'קניון':'mall','שוק':'souk','יהדות':'judaism','אלכוהול':'alcohol',
  'מועדון':'club','לאונג\'':'lounge','בר גג':'rooftop','ביץ׳ קלאב':'beach-club','בידור':'entertainment','מופע':'show',
  'מטרו':'metro','מונית':'taxi','סירה':'boat','אפליקציה':'app','אוטובוס':'bus',
  'קזינו':'casino','מרוצים':'racing','ספורט':'sport','קניות':'shopping'
};

function cardGridHTML(item, category) {
  const verified = isVerifiedImage(item, category);
  return `
        <div class="card-hover" style="background:#fff;border-radius:6px;overflow:hidden;border:1px solid #E5E7EB;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.05);position:relative;transition:all 0.3s;" onclick="openDetail('${category}', ${item.id})">
          <button onclick="event.stopPropagation();addToMyTrip('${category}', ${item.id})" title="הוסף לטיול שלי" class="add-trip-btn" style="position:absolute;top:8px;right:10px;background:transparent;color:#fff;border:none;padding:0;cursor:pointer;font-size:2.1rem;font-weight:300;line-height:1;z-index:3;text-shadow:0 2px 8px rgba(0,0,0,0.85),0 0 4px rgba(0,0,0,0.6);">+</button>
          <div style="position:relative;">
            <img src="${getCardImage(item, category)}" alt="${item.name}" style="width:100%;height:220px;object-fit:cover;" onerror="this.style.display='none'">
            ${item.subcategory ? `<div style="position:absolute;top:8px;left:8px;background:${CATEGORY_TITLE_COLORS[category] || 'rgba(0,0,0,0.65)'};color:#fff;padding:4px 11px;border-radius:12px;font-size:0.75rem;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.35);">${subcategoryHe(item.subcategory)}</div>` : ''}
            ${item.nameHe ? `<div style="position:absolute;bottom:10px;right:12px;left:12px;color:#fff;font-weight:800;font-size:1.15rem;text-shadow:0 2px 10px rgba(0,0,0,0.85),0 0 5px rgba(0,0,0,0.7);text-align:right;">${item.nameHe}</div>` : ''}
          </div>
          <div style="padding:10px;">
            <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;margin-bottom:3px;">${item.nameEn || item.name}</div>
            <div style="font-size:0.7rem;color:#6B7F8D;margin-bottom:4px;"><i class="fas fa-map-marker-alt" style="color:#F4A261;font-size:0.6rem;"></i> ${item.address || ''}</div>
            ${item.priceRange && category !== 'transport' ? `<div style="color:#E76F51;font-size:0.7rem;font-weight:600;margin-top:2px;">${item.priceRange}</div>` : ''}
            ${item.isOpen === true ? '<div style="color:#2A9D8F;font-size:0.6rem;font-weight:600;margin-top:3px;">● פתוח</div>' : ''}
            <div style="display:flex;gap:6px;margin-top:6px;">
              ${item.lat ? `<a onclick="event.stopPropagation();openInFrame('https://www.google.com/maps?q=${item.lat},${item.lng}','${item.name.replace(/'/g,"\\'")} - מפה')" style="flex:1;padding:5px;border-radius:4px;border:none;background:#C4922F;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;cursor:pointer;"><i class="fas fa-map-pin"></i> איפה זה</a>` : ''}
              ${item.lat ? `<a onclick="event.stopPropagation();openInFrame('${navUrl(item.lat, item.lng, item.name || '')}&travelmode=driving','${item.name.replace(/'/g,"\\'")} - ניווט')" style="flex:1;padding:5px;border-radius:4px;border:none;background:#E76F51;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;cursor:pointer;"><i class="fas fa-directions"></i> נווט</a>` : ''}
              ${category === 'hotels'
                ? `<a href="https://search.hotellook.com/hotels?destination=${encodeURIComponent((item.nameEn || item.name) + ' Dubai')}&adults=2&marker=X5SEJjUA" target="_blank" onclick="event.stopPropagation()" style="flex:1;padding:5px;border-radius:4px;border:none;background:#2A9D8F;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;font-weight:700;"><i class="fas fa-bed"></i> הזמן מלון</a>`
                : category === 'attractions'
                  ? `<a onclick="event.stopPropagation();openInFrame('https://www.google.com/search?igu=1&q=${encodeURIComponent((item.nameEn || item.name) + ' Dubai tickets opening hours')}','${item.name.replace(/'/g,"\\'")} - מחירים ושעות')" style="flex:1;padding:5px;border-radius:4px;border:none;background:#2A9D8F;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;cursor:pointer;font-weight:700;"><i class="fas fa-ticket-alt"></i> מחירים</a>`
                  : `<button onclick="event.stopPropagation();openMenuIframe('${encodeURIComponent((item.nameEn || item.name) + ' Dubai menu hours')}', '${(item.name || '').replace(/'/g, '\\\'')}')" style="flex:1;padding:5px;border-radius:4px;border:none;background:#2A9D8F;color:#fff;font-size:0.65rem;text-align:center;cursor:pointer;font-family:Heebo;"><i class="fas fa-info-circle"></i> תפריט</button>`
              }
            </div>
          </div>
        </div>`;
}

const FOOD_DELIVERY_APPS = [
  { name:'Talabat',     desc:'הפופולרי ביותר באמירויות',          color:'#FF5A00', logo:'https://logo.clearbit.com/talabat.com',    ios:'https://apps.apple.com/app/id470760692',                                  android:'https://play.google.com/store/apps/details?id=com.talabat',                  web:'https://www.talabat.com/uae' },
  { name:'Deliveroo',   desc:'מסעדות יוקרה ופופולריות',           color:'#00CCBC', logo:'https://logo.clearbit.com/deliveroo.ae',   ios:'https://apps.apple.com/app/id1006016824',                                 android:'https://play.google.com/store/apps/details?id=com.deliveroo.orderapp',       web:'https://deliveroo.ae' },
  { name:'Careem Food', desc:'מבית Careem (ריידס + משלוחים)',     color:'#3DCD83', logo:'https://logo.clearbit.com/careem.com',     ios:'https://apps.apple.com/app/id592978487',                                  android:'https://play.google.com/store/apps/details?id=com.careem.acma',              web:'https://www.careem.com' },
  { name:'Smiles',      desc:'הנחות גדולות, של Etisalat',         color:'#0033A0', logo:'https://logo.clearbit.com/smilesuae.ae',  ios:'https://apps.apple.com/app/id1186902537',                                 android:'https://play.google.com/store/apps/details?id=com.emirates.ecpay.smilesuae', web:'https://www.smilesuae.ae' },
  { name:'Noon Food',   desc:'של חנות הענק noon',                 color:'#FEEE00', logo:'https://logo.clearbit.com/noon.com',       ios:'https://apps.apple.com/app/noon-shopping/id1188152083',                   android:'https://play.google.com/store/apps/details?id=com.noon.consumer',            web:'https://food.noon.com' },
];

function renderFoodDeliveryApps() {
  const items = FOOD_DELIVERY_APPS.map(a => `
    <div style="display:flex;align-items:stretch;gap:0;background:#fff;border-radius:12px;overflow:hidden;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #E5E7EB;border-right:5px solid ${a.color};">
      <div style="width:90px;flex-shrink:0;background:${a.color}15;display:flex;align-items:center;justify-content:center;padding:8px;">
        <img src="${a.logo}" alt="${a.name}" style="max-width:100%;max-height:50px;object-fit:contain;" onerror="this.parentElement.innerHTML='<div style=&quot;font-weight:900;color:${a.color};font-size:1rem;&quot;>${a.name}</div>';">
      </div>
      <div style="flex:1;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-weight:800;color:#2C5F6E;font-size:0.95rem;margin-bottom:2px;">${a.name}</div>
          <div style="font-size:0.78rem;color:#6B7F8D;line-height:1.4;">${a.desc}</div>
        </div>
        <div style="display:flex;gap:5px;margin-top:8px;">
          <a href="${a.ios}" target="_blank" style="flex:1;text-align:center;padding:6px;background:#000;color:#fff;border-radius:5px;text-decoration:none;font-size:0.7rem;font-weight:700;">📱 iOS</a>
          <a href="${a.android}" target="_blank" style="flex:1;text-align:center;padding:6px;background:#3DDC84;color:#fff;border-radius:5px;text-decoration:none;font-size:0.7rem;font-weight:700;">🤖 Android</a>
          <a href="${a.web}" target="_blank" style="flex:1;text-align:center;padding:6px;background:#1A6B8A;color:#fff;border-radius:5px;text-decoration:none;font-size:0.7rem;font-weight:700;">🌐 אתר</a>
        </div>
      </div>
    </div>
  `).join('');
  return `
    <div style="padding:0 16px 20px;">
      <div style="background:linear-gradient(135deg,#2A9D8F,#264653);color:#fff;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-weight:800;font-size:1rem;margin-bottom:4px;">🛵 משלוחי אוכל למלון</div>
        <div style="font-size:0.78rem;opacity:0.95;line-height:1.5;">5 אפליקציות מובילות בדובאי שמביאות לך אוכל ישר למלון. הורד את האפליקציה ופשוט הקלד את שם המלון ומספר חדר.</div>
      </div>
      ${items}
    </div>
  `;
}

const TOP_ISRAELI_PRODUCTS = [
  { cat:'זהב ותכשיטים', emoji:'💍', color:'#E9C46A', items:[
    { name:'Gold Souk (Deira)', desc:'שוק הזהב המסורתי — מאות חנויות, מחירי שוק עולמיים', rating:'⭐ 4.8', lat:25.2697, lng:55.2967, image:'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=400&fit=crop&q=80', web:'https://www.visitdubai.com/en/places-to-visit/gold-souk', map:'https://maps.google.com/?q=Gold+Souk+Deira+Dubai', video:'B8b5ZpkMRbo' },
    { name:'Damas — Dubai Mall', desc:'רשת תכשיטים מובילה, סניפים בכל קניון', rating:'⭐ 4.6', lat:25.1972, lng:55.2796, image:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop&q=80', web:'https://www.damasjewellery.com', map:'https://maps.google.com/?q=Damas+Jewellery+Dubai+Mall', video:'qxHc6lZKxCM' },
    { name:'Joyalukkas — Gold Souk', desc:'תכשיטי זהב הודיים — אטרקטיבי לקלאסי', rating:'⭐ 4.7', lat:25.2701, lng:55.2972, image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop&q=80', web:'https://www.joyalukkas.in', map:'https://maps.google.com/?q=Joyalukkas+Dubai', video:'wnBdvB1u8aQ' },
    { name:'Malabar Gold — Karama', desc:'בחירה רחבה במחירים תחרותיים', rating:'⭐ 4.5', lat:25.2497, lng:55.3083, image:'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop&q=80', web:'https://www.malabargoldanddiamonds.com', map:'https://maps.google.com/?q=Malabar+Gold+Karama+Dubai', video:'eQEDavfoR_c' },
  ]},
  { cat:'בשמים ועוד', emoji:'🌹', color:'#B85C8E', items:[
    { name:'Perfume Souk (Deira)', desc:'בשמי oud מסורתיים, ערבוב מותאם אישית', rating:'⭐ 4.7', lat:25.2683, lng:55.2999, image:'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop&q=80', web:'https://www.visitdubai.com/en/places-to-visit/perfume-souk', map:'https://maps.google.com/?q=Perfume+Souk+Deira+Dubai', video:'fJqo8bImD6E' },
    { name:'Ajmal — Mall of Emirates', desc:'מותג עיראקי-אמירותי, oud איכותי', rating:'⭐ 4.7', lat:25.1182, lng:55.2010, image:'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop&q=80', web:'https://www.ajmalperfume.com', map:'https://maps.google.com/?q=Ajmal+Perfumes+Mall+Emirates', video:'dWzYXFD2kmM' },
    { name:'Arabian Oud — Dubai Mall', desc:'הגדול במזה"ת, סניפים בכל קניון', rating:'⭐ 4.6', lat:25.1976, lng:55.2799, image:'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop&q=80', web:'https://www.arabianoud.com', map:'https://maps.google.com/?q=Arabian+Oud+Dubai+Mall', video:'PsKJ3oGyG4Y' },
    { name:'Rasasi — City Centre Deira', desc:'מבצעים מצוינים, איכות גבוהה', rating:'⭐ 4.5', lat:25.2521, lng:55.3308, image:'https://images.unsplash.com/photo-1622445275576-721325763afe?w=400&h=400&fit=crop&q=80', web:'https://www.rasasi.com', map:'https://maps.google.com/?q=Rasasi+City+Centre+Deira', video:'pxpvCi3uQAA' },
  ]},
  { cat:'תמרים וממתקים', emoji:'🌴', color:'#A0522D', items:[
    { name:'Bateel — Dubai Mall', desc:'תמרים מובחרים באריזות מתנה — מתנה אהובה', rating:'⭐ 4.8', lat:25.1973, lng:55.2796, image:'https://images.unsplash.com/photo-1581985673473-0784a7a44e39?w=400&h=400&fit=crop&q=80', web:'https://www.bateel.com', map:'https://maps.google.com/?q=Bateel+Dubai+Mall', video:'7TvYg-6N7Tg' },
    { name:'Patchi — BurJuman Mall', desc:'שוקולד וממתקים פרימיום', rating:'⭐ 4.7', lat:25.2553, lng:55.3025, image:'https://images.unsplash.com/photo-1551529834-525807d6b4f3?w=400&h=400&fit=crop&q=80', web:'https://www.patchi.com', map:'https://maps.google.com/?q=Patchi+BurJuman+Dubai', video:'PxDgFGEgRlc' },
    { name:'Al Aseel Sweets', desc:'תמרים וממתקים ערביים מסורתיים', rating:'⭐ 4.6', lat:25.2300, lng:55.3219, image:'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop&q=80', web:'https://www.alaseelrestaurants.com', map:'https://maps.google.com/?q=Al+Aseel+Sweets+Dubai', video:'jZvyA5O5ZBU' },
    { name:'Date Souk (Deira)', desc:'שוק התמרים בדיירה — מבצעים מקומיים', rating:'⭐ 4.5', lat:25.2740, lng:55.3036, image:'https://images.unsplash.com/photo-1597305877032-0668b3c6413a?w=400&h=400&fit=crop&q=80', web:'https://www.visitdubai.com/en/places-to-visit/deira-spice-souk', map:'https://maps.google.com/?q=Date+Souk+Dubai', video:'nJ7kY8HxZ_M' },
  ]},
  { cat:'אלקטרוניקה', emoji:'📱', color:'#1A6B8A', items:[
    { name:'Sharaf DG — Mall of Emirates', desc:'הרשת המובילה — מכשירים, אביזרים ומבצעים', rating:'⭐ 4.7', lat:25.1180, lng:55.2008, image:'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=400&fit=crop&q=80', web:'https://uae.sharafdg.com', map:'https://maps.google.com/?q=Sharaf+DG+Mall+of+Emirates', video:'PIu8KMdPHgQ' },
    { name:'Jumbo — Dubai Mall', desc:'מבחר רחב, שירות אמין', rating:'⭐ 4.6', lat:25.1972, lng:55.2796, image:'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop&q=80', web:'https://www.jumbo.ae', map:'https://maps.google.com/?q=Jumbo+Electronics+Dubai+Mall', video:'D4qCDCGbo-c' },
    { name:'Lulu Electronics — Karama', desc:'מחירים תחרותיים בקניונים', rating:'⭐ 4.4', lat:25.2510, lng:55.3115, image:'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=400&fit=crop&q=80', web:'https://www.luluhypermarket.com', map:'https://maps.google.com/?q=Lulu+Hypermarket+Karama+Dubai', video:'Vp7M5IGvnSA' },
    { name:'Dubai Mall — Electronics Floor', desc:'Apple, Samsung, Sony — חנויות רשמיות', rating:'⭐ 4.8', lat:25.1972, lng:55.2796, image:'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=400&fit=crop&q=80', web:'https://thedubaimall.com', map:'https://maps.google.com/?q=Dubai+Mall', video:'8jq3SKt5GdM' },
  ]},
];

function renderTopProductsMap() {
  const mapId = 'topProductsMap';
  setTimeout(() => {
    const container = document.getElementById(mapId);
    if (!window.L || !container) return;
    // Remove any stray duplicate maps with same id (defensive)
    document.querySelectorAll('#' + mapId).forEach((el, idx) => { if (idx > 0) el.remove(); });
    if (window._topProdMap) { try { window._topProdMap.remove(); } catch (e) {} container.innerHTML = ''; }
    const map = window.L.map(mapId).setView([25.2050, 55.2700], 11);
    window._topProdMap = map;
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    TOP_ISRAELI_PRODUCTS.forEach(g => {
      g.items.forEach(it => {
        if (!it.lat || !it.lng) return;
        const html = '<div style="direction:rtl;text-align:right;font-family:Heebo;min-width:180px;">' +
          '<strong style="color:' + g.color + ';">' + g.emoji + ' ' + it.name + '</strong>' +
          '<div style="font-size:0.8rem;color:#6B7F8D;margin-top:3px;">' + it.desc + '</div>' +
          '<div style="font-size:0.78rem;color:#92400e;margin-top:4px;font-weight:700;">' + it.rating + '</div>' +
        '</div>';
        const icon = window.L.divIcon({
          html: '<div style="background:' + g.color + ';color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + g.emoji + '</div>',
          className: '', iconSize: [32, 32], iconAnchor: [16, 16]
        });
        window.L.marker([it.lat, it.lng], { icon }).addTo(map).bindPopup(html);
      });
    });
  }, 100);
  return `<div id="${mapId}" style="width:100%;height:300px;border-radius:14px;overflow:hidden;margin-bottom:14px;border:1px solid #E5E7EB;"></div>`;
}

function renderTopProductsForIsraelis() {
  const BANNER_BG = {
    'זהב ותכשיטים': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1200&q=80',
    'בשמים ועוד': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200&q=80',
    'תמרים וממתקים': 'https://images.unsplash.com/photo-1601379760883-1bb497d806dd?w=1200&q=80',
    'אלקטרוניקה': 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80',
  };
  const sections = TOP_ISRAELI_PRODUCTS.map(g => `
    <div style="margin-bottom:24px;">
      <div style="position:relative;height:130px;margin:18px 0 14px;border-radius:18px;overflow:hidden;background-image:linear-gradient(110deg,${g.color}EE 0%,${g.color}AA 50%,transparent 100%),url('${BANNER_BG[g.cat] || ''}');background-size:cover;background-position:center;box-shadow:0 8px 22px ${g.color}66;">
        <div style="position:absolute;top:14px;right:18px;display:flex;align-items:center;gap:12px;">
          <div style="background:rgba(255,255,255,0.95);width:62px;height:62px;border-radius:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
            <span style="font-size:2.2rem;line-height:1;">${g.emoji}</span>
          </div>
          <div>
            <div style="color:rgba(255,255,255,0.95);font-size:0.7rem;font-weight:800;letter-spacing:2px;text-shadow:0 1px 4px rgba(0,0,0,0.5);margin-bottom:2px;">★ הכי מבוקש</div>
            <div style="color:#fff;font-weight:900;font-size:1.5rem;letter-spacing:-0.3px;text-shadow:0 2px 6px rgba(0,0,0,0.5);">${g.cat}</div>
          </div>
        </div>
        <div style="position:absolute;bottom:14px;right:18px;display:flex;gap:6px;align-items:center;">
          <span style="background:#fff;color:${g.color};padding:5px 12px;border-radius:14px;font-weight:900;font-size:0.78rem;box-shadow:0 3px 8px rgba(0,0,0,0.2);">${g.items.length} מקומות מובילים</span>
          <span style="background:rgba(255,255,255,0.25);color:#fff;padding:5px 11px;border-radius:14px;font-weight:700;font-size:0.72rem;backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.3);">⭐ דירוג גולשים</span>
        </div>
      </div>
      ${g.items.map(it => `
        <div style="display:flex;align-items:stretch;background:#fff;border-radius:10px;overflow:hidden;margin-bottom:8px;border:1px solid #E5E7EB;border-right:4px solid ${g.color};box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          ${it.image ? `<img src="${it.image}" style="width:100px;height:100px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
          <div style="flex:1;padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <div style="font-weight:800;color:#2C5F6E;font-size:0.92rem;">${it.name}</div>
              <span style="background:#FFF8E7;color:#92400e;padding:2px 7px;border-radius:8px;font-size:0.7rem;font-weight:700;">${it.rating}</span>
            </div>
            <div style="font-size:0.78rem;color:#6B7F8D;line-height:1.45;margin-bottom:6px;">${it.desc}</div>
            <div style="display:flex;gap:5px;">
              ${it.web ? `<button onclick="openInFrame('${it.web}','${it.name.replace(/'/g,"\\'")}')" style="flex:1;text-align:center;padding:5px;background:#1A6B8A;color:#fff;border-radius:5px;border:none;font-size:0.7rem;font-weight:700;cursor:pointer;font-family:Heebo;">🌐 אתר</button>` : ''}
              ${it.map ? `<button onclick="openInFrame('${it.map}','${it.name.replace(/'/g,"\\'")} - מפה')" style="flex:1;text-align:center;padding:5px;background:#E76F51;color:#fff;border-radius:5px;border:none;font-size:0.7rem;font-weight:700;cursor:pointer;font-family:Heebo;">📍 מפה</button>` : ''}
              <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(it.name + ' Dubai')}" target="_blank" style="flex:1;text-align:center;padding:5px;background:#dc2626;color:#fff;border-radius:5px;text-decoration:none;font-size:0.7rem;font-weight:700;font-family:Heebo;">🎬 סרטון</a>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
  return `
    <div style="padding:0 16px 20px;">
      <div style="background:linear-gradient(135deg,#E9C46A,#F4A261);color:#fff;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-weight:800;font-size:1rem;margin-bottom:4px;">🛍️ הכי מבוקש על ידי ישראלים</div>
        <div style="font-size:0.78rem;opacity:0.95;line-height:1.5;">החנויות והשווקים המומלצים ביותר לזהב, בשמים, תמרים ואלקטרוניקה — בדירוג גולשים.</div>
      </div>
      ${sections}
    </div>
  `;
}

function renderListPage(category, title, filters, activeFilter) {
  const page = document.getElementById('page-list');
  const items = getAllItems(category);
  const active = activeFilter || 'הכל';
  const MAX_PER_PAGE = 20;
  const filtered = sortByRating(active === 'הכל' ? items : items.filter(i => i.subcategory === SUBCAT_MAP[active])).slice(0, MAX_PER_PAGE);

  // Build content - grouped by subcategory when "All" is selected
  let contentHTML;
  if (active === 'הכל') {
    const groups = filters.filter(f => f !== 'הכל');
    contentHTML = groups.map(g => {
      const allInGroup = sortByRating(items.filter(i => i.subcategory === SUBCAT_MAP[g]));
      const groupItems = allInGroup.slice(0, MAX_PER_PAGE);
      if (!groupItems.length) return '';
      const hasMore = allInGroup.length > MAX_PER_PAGE;
      return `
        <div style="padding:14px 16px 6px;display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:1px;background:#E5E7EB;"></div>
          <h3 style="margin:0;color:#2C5F6E;font-size:0.95rem;font-weight:700;">${g} <span style="color:#6B7F8D;font-size:0.75rem;font-weight:500;">(${allInGroup.length})</span></h3>
          <div style="flex:1;height:1px;background:#E5E7EB;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px;padding:0 16px 8px;">
          ${groupItems.map(item => cardGridHTML(item, category)).join('')}
        </div>
        ${hasMore ? `<div style="text-align:center;padding:0 16px 8px;"><button onclick="navigateTo('${category}','${g.replace(/'/g, "\\'")}')" style="background:#E76F51;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:Heebo;font-size:0.85rem;">הצג את כל ${allInGroup.length} →</button></div>` : ''}`;
    }).join('');
  } else {
    contentHTML = `<div style="display:grid;grid-template-columns:1fr;gap:10px;padding:0 16px 20px;">${filtered.map(item => cardGridHTML(item, category)).join('')}</div>`;
  }
  if (category === 'restaurants' && active === 'משלוחים') {
    contentHTML = renderFoodDeliveryApps();
  }
  if (category === 'shopping' && active === 'הכי מבוקש') {
    contentHTML = renderTopProductsForIsraelis();
  }
  if (category === 'transport' && active === 'מטרו') {
    contentHTML = `
      <div style="margin:0 16px 14px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <div style="background:#2C5F6E;color:#fff;padding:10px 14px;font-weight:700;font-size:0.95rem;"><i class="fas fa-clock"></i> לוח זמנים ותדירות</div>
        <div style="padding:12px 14px;font-size:0.85rem;line-height:1.7;color:#2C5F6E;">

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">⏰ שעות פעילות</div>
          <div style="margin-bottom:10px;">
            ראשון–חמישי: 05:00 – 24:00<br>
            שישי: 05:00 – 01:00 (למחרת)<br>
            שבת: 05:00 – 24:00<br>
            ימי חג: 10:00 – 24:00 (משתנה)
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">🚇 תדירות רכבות</div>
          <div style="margin-bottom:10px;">
            <b style="color:#D32F2F;">קו אדום</b><br>
            • שעות שיא (06:30–10:00, 16:00–20:30): כל 4 דקות<br>
            • שעות רגילות: כל 7-8 דקות<br>
            <b style="color:#2A9D8F;">קו ירוק</b><br>
            • שעות שיא: כל 5 דקות<br>
            • שעות רגילות: כל 8-10 דקות<br>
            <b style="color:#E76F00;">טראם</b><br>
            • כל 8-12 דקות
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">🚆 רכבת ראשונה / אחרונה</div>
          <div style="margin-bottom:10px;">
            ראשונה (כל הקווים): <b>05:00</b><br>
            אחרונה (א׳–ה׳, ש׳): <b>~23:30</b><br>
            אחרונה שישי לילה: <b>~00:30</b>
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">📱 לוח זמנים בזמן אמת</div>
          <div style="margin-bottom:6px;">
            לבדיקה מדויקת לפי תחנה — אפליקציית RTA הרשמית או:
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://www.rta.ae/" target="_blank" style="flex:1;text-align:center;padding:10px;background:#E76F51;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.85rem;min-width:130px;"><i class="fas fa-globe"></i> RTA.ae</a>
            <a href="https://apps.apple.com/ae/app/s-rta-dubai/id1483832550" target="_blank" style="flex:1;text-align:center;padding:10px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.85rem;min-width:130px;"><i class="fab fa-apple"></i> אפליקציה iOS</a>
            <a href="https://play.google.com/store/apps/details?id=ae.rta.smart" target="_blank" style="flex:1;text-align:center;padding:10px;background:#34A853;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:0.85rem;min-width:130px;"><i class="fab fa-google-play"></i> אפליקציה Android</a>
          </div>

        </div>
      </div>`;
  }

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2>${title}</h2>
    </div>
    <div class="filter-tabs">
      ${filters.map(f => {
        const count = f === 'הכל' ? items.length : items.filter(i => i.subcategory === SUBCAT_MAP[f]).length;
        const showCount = count > 1;
        return `<button class="filter-tab ${f === active ? 'active' : ''}" onclick="navigateTo('${category}','${f.replace(/'/g, "\\'")}')">${f}${showCount ? ` <span style="opacity:0.7;font-size:0.75rem;">(${count})</span>` : ''}</button>`;
      }).join('')}
      ${category !== 'abudhabi' ? `<button class="filter-tab" onclick="navigateTo('abudhabi')" style="background:#B85C8E;color:#fff;border-color:#B85C8E;font-weight:700;">🏛 אבו דאבי</button>` : ''}
    </div>
    ${category === 'transport' && active === 'מטרו' ? `<div style="padding:0 16px 8px;display:flex;flex-direction:column;gap:8px;">
      <select onchange="jumpToMetroStation('red', this.value)" style="width:100%;padding:10px;border-radius:8px;border:2px solid #D32F2F;background:#fff;font-family:Heebo;color:#D32F2F;font-size:0.9rem;font-weight:600;cursor:pointer;">
        <option value="">🟥 קו אדום — בחר תחנה</option>
        ${DUBAI_METRO.red.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select onchange="jumpToMetroStation('green', this.value)" style="width:100%;padding:10px;border-radius:8px;border:2px solid #2A9D8F;background:#fff;font-family:Heebo;color:#2A9D8F;font-size:0.9rem;font-weight:600;cursor:pointer;">
        <option value="">🟩 קו ירוק — בחר תחנה</option>
        ${DUBAI_METRO.green.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select onchange="jumpToMetroStation('tram', this.value)" style="width:100%;padding:10px;border-radius:8px;border:2px solid #F4A261;background:#fff;font-family:Heebo;color:#E76F00;font-size:0.9rem;font-weight:600;cursor:pointer;">
        <option value="">🟧 טראם — בחר תחנה</option>
        ${DUBAI_METRO.tram.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>` : filtered.length > 0 ? `<div style="padding:0 16px 8px;display:flex;gap:8px;">
      <select onchange="focusMapItem('${category}', this.value)" style="flex:1;padding:10px;border-radius:8px;border:1px solid #E5E7EB;background:#fff;font-family:Heebo;color:#2C5F6E;font-size:0.9rem;cursor:pointer;">
        <option value="">📍 קפוץ למיקום על המפה...</option>
        ${filtered.map(i => `<option value="${i.id}" style="color:${getMarkerColor({...i, category})};font-weight:600;">${i.name}</option>`).join('')}
      </select>
      <button class="areas-toggle" onclick="toggleAreas()" title="הצג/הסתר אזורים" style="padding:10px 12px;border-radius:8px;border:1px solid ${areasVisible ? '#2A9D8F' : '#E5E7EB'};background:${areasVisible ? '#2A9D8F' : '#fff'};color:${areasVisible ? '#fff' : '#2C5F6E'};font-family:Heebo;font-size:0.85rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s;">${areasVisible ? '✓ אזורים' : '🗺️ אזורים'}</button>
    </div>` : ''}
    ${category === 'transport' && active === 'מטרו' ? `
      <div style="margin:0 16px 12px;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;cursor:pointer;background:#fff;" onclick="openInFrame('https://dubaimetrorail.com/dubai-metro-map/','מפת מטרו דובאי')">
        <img src="images/transport/metro-map.png" alt="מפת מטרו דובאי" style="width:100%;height:auto;display:block;">
        <div style="padding:8px;text-align:center;color:#2C5F6E;font-size:0.85rem;font-weight:600;background:#F5E6CB;"><i class="fas fa-external-link-alt"></i> לחץ למפה אינטראקטיבית — DubaiMetroRail.com</div>
      </div>
      <div style="padding:0 16px 12px;">
        <button onclick="navigateToNearestMetro()" style="width:100%;padding:12px;background:linear-gradient(135deg,#E76F51,#D32F2F);color:#fff;border:none;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.95rem;cursor:pointer;box-shadow:0 2px 8px rgba(231,111,81,0.3);">
          <i class="fas fa-location-arrow"></i> נווט לתחנת המטרו הקרובה אליי
        </button>
      </div>
      <div style="margin:0 16px 14px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <div style="background:#2C5F6E;color:#fff;padding:10px 14px;font-weight:700;font-size:0.95rem;"><i class="fas fa-train"></i> מטרו דובאי — המדריך הקצר</div>
        <div style="padding:12px 14px;font-size:0.85rem;line-height:1.7;color:#2C5F6E;">

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">🛤 קווים</div>
          <div style="margin-bottom:10px;">
            <b style="color:#D32F2F;">קו אדום</b> — שדה התעופה DXB ↔ Expo 2020 (52 ק״מ, 35 תחנות). דרך Deira City Centre, BurJuman, Burj Khalifa/Dubai Mall, Mall of the Emirates, Marina, Ibn Battuta.<br>
            <b style="color:#2A9D8F;">קו ירוק</b> — Etisalat ↔ Creek (23 ק״מ, 20 תחנות). דרך Gold Souk, Union, BurJuman, Healthcare City.
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">🕐 שעות פעילות</div>
          <div style="margin-bottom:10px;">
            ראשון–חמישי: 05:00–24:00<br>
            שישי: 05:00–01:00<br>
            שבת: 05:00–24:00
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">💳 כרטיס Nol</div>
          <div style="margin-bottom:10px;">
            כרטיס נטען חכם — חובה לכניסה. סוגים:<br>
            <b>אדום</b> — חד פעמי (לתייר חד פעמי).<br>
            <b>כסוף</b> — לרוב הנוסעים.<br>
            <b>זהב</b> — קרון VIP (פי 2 במחיר).<br>
            ניתן לקנות בכל תחנה בקופה או במכונה.
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">💰 מחירים (שכבות אזוריות)</div>
          <div style="margin-bottom:10px;">
            אזור אחד: ~3 דירהם (₪3)<br>
            שני אזורים: ~5 דירהם (₪5)<br>
            יותר משניים: ~7.5 דירהם (₪7.5)<br>
            יום שלם: 22 דירהם (₪22)
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">⭐ תחנות חשובות לתיירים</div>
          <div style="margin-bottom:10px;">
            • <b>Burj Khalifa / Dubai Mall</b> (אדום)<br>
            • <b>Mall of the Emirates</b> (אדום) — קניון + Ski Dubai<br>
            • <b>Dubai Marina / Ibn Battuta</b> (אדום) — מרינה + JBR<br>
            • <b>BurJuman</b> — נקודת מעבר אדום ↔ ירוק<br>
            • <b>Union</b> — נקודת מעבר אדום ↔ ירוק<br>
            • <b>Gold Souk</b> (ירוק) — שוק הזהב
          </div>

          <div style="font-weight:700;color:#E76F51;margin-bottom:4px;">⚠️ טיפים חשובים</div>
          <div>
            • הקרון הראשון = Gold Class (יקר יותר).<br>
            • קרון ייעודי לנשים וילדים בלבד — אסור לגברים, קנס 100 דירהם.<br>
            • אסור לאכול/לשתות בתחנות וברכבות — קנס.<br>
            • המטרו אוטומטי לחלוטין (ללא נהג).<br>
            • לכל תחנה יציאות ממוספרות — שים לב לפני יציאה.
          </div>

        </div>
      </div>
    ` : `<div class="map-container"><div id="listMap" style="width:100%;height:100%;"></div></div>${nearMeToggleHTML()}`}
    ${contentHTML}
    ${items.length > 10 ? `<button onclick="window.scrollTo({top:0,behavior:'smooth'})" style="position:fixed;bottom:80px;left:16px;background:#E76F51;color:#fff;border:none;width:46px;height:46px;border-radius:50%;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);z-index:50;display:flex;align-items:center;justify-content:center;" title="חזור לראש"><i class="fas fa-arrow-up"></i></button>` : ''}
  `;


  setTimeout(() => {
    clearMap();
    const mapEl = document.getElementById('listMap');
    let pins = filtered.map(i => ({ ...i, category }));
    // For 'הכי מבוקש' filter — use the curated products list
    if (category === 'shopping' && active === 'הכי מבוקש') {
      pins = TOP_ISRAELI_PRODUCTS.flatMap(g => g.items.filter(it => it.lat && it.lng).map(it => ({
        name: it.name, lat: it.lat, lng: it.lng, image: it.image, address: '', category: 'shopping'
      })));
    }
    if (mapEl && mapEl.offsetHeight > 0) {
      buildMap('listMap', 11, pins);
    } else {
      setTimeout(() => {
        clearMap();
        buildMap('listMap', 11, pins);
      }, 500);
    }
  }, 300);
}

// ===== FLIGHTS PAGE =====
function renderFlightsPage() {
  const page = document.getElementById('page-flights');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const weekLater = new Date(tomorrow);
  weekLater.setDate(weekLater.getDate() + 7);

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-plane" style="color:#E9C46A;margin-left:6px;"></i> טיסות ישראל ↔ דובאי</h2>
    </div>
    <div style="padding:16px 20px;">
      <!-- Live Flight Board -->
      <div id="flightsPageBoard" style="margin-bottom:16px;"></div>

      <!-- Search Flights -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);border-radius:8px;padding:20px;color:#fff;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <i class="fas fa-search" style="font-size:1.1rem;color:#E9C46A;"></i>
          <div>
            <div style="font-weight:700;font-size:1rem;">חפש טיסות TLV ✈ DXB</div>
            <div style="font-size:0.75rem;opacity:0.8;">השווה מחירים ומצא את הטיסה הזולה</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-end;">
          <div style="flex:1;">
            <label style="font-size:0.7rem;opacity:0.8;display:block;margin-bottom:3px;">הלוך</label>
            <input type="date" id="flightPageDepart" value="${tomorrow.toISOString().split('T')[0]}" style="width:100%;padding:10px;border-radius:6px;border:none;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
          </div>
          <div style="flex:1;">
            <label style="font-size:0.7rem;opacity:0.8;display:block;margin-bottom:3px;">חזור</label>
            <input type="date" id="flightPageReturn" value="${weekLater.toISOString().split('T')[0]}" style="width:100%;padding:10px;border-radius:6px;border:none;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="doFlightPageSearch()" style="flex:1;padding:12px;border-radius:8px;background:#E9C46A;color:#2C5F6E;border:none;font-family:Heebo;font-weight:700;cursor:pointer;font-size:0.9rem;">
            <i class="fas fa-search"></i> תוצאות מהירות
          </button>
          <button onclick="goToAviasales()" style="flex:1;padding:12px;border-radius:8px;background:#FF6B00;color:#fff;border:none;font-family:Heebo;font-weight:700;cursor:pointer;font-size:0.9rem;">
            <i class="fas fa-external-link-alt"></i> חפש ב-Aviasales
          </button>
        </div>
        <div id="flightPageResults" style="margin-top:12px;"></div>
      </div>

    </div>
  `;

  renderFlightBoard('flightsPageBoard');
}

function goToAviasales() {
  const depart = document.getElementById('flightPageDepart')?.value || '';
  const ret = document.getElementById('flightPageReturn')?.value || '';
  const params = new URLSearchParams({
    origin_iata: 'TLV', destination_iata: 'DXB',
    depart_date: depart, return_date: ret,
    adults: '1', currency: 'ILS', marker: 'X5SEJjUA'
  });
  window.open(`https://aviasales.tpk.lv/X5SEJjUA?${params.toString()}`, '_blank');
}

async function doFlightPageSearch() {
  const depart = document.getElementById('flightPageDepart')?.value;
  const ret = document.getElementById('flightPageReturn')?.value;
  const results = document.getElementById('flightPageResults');
  if (!results) return;

  results.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="color:#E9C46A;"></i> מחפש טיסות TLV → DXB...</div>';

  const flights = await searchFlights(depart, ret);
  if (!flights || flights.length === 0) {
    results.innerHTML = '<div style="text-align:center;padding:16px;font-size:0.85rem;opacity:0.8;">לא נמצאו טיסות. נסה תאריכים אחרים.</div>';
    return;
  }

  results.innerHTML = flights.map(f => {
    const outbound = f.legs[0];
    const inbound = f.legs[1];
    return `
      <div style="background:rgba(255,255,255,0.1);border-radius:6px;padding:12px;margin-bottom:8px;${f.deepLink ? 'cursor:pointer;' : ''}" ${f.deepLink ? `onclick="window.open('${f.deepLink}','_blank')"` : ''}>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:1.1rem;font-weight:700;color:#E9C46A;">${f.price || f.priceRaw + ' ₪'}</span>
          ${outbound?.stops === 0 ? '<span style="background:#2A9D8F;color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;">ישיר</span>' : ''}
        </div>
        ${outbound ? `<div style="font-size:0.8rem;margin-bottom:3px;"><span style="font-weight:600;">${outbound.origin} → ${outbound.destination}</span> | ${outbound.carrier} | ${Math.floor(outbound.duration/60)}ש ${outbound.duration%60}ד</div>` : ''}
        ${inbound ? `<div style="font-size:0.8rem;"><span style="font-weight:600;">${inbound.origin} → ${inbound.destination}</span> | ${inbound.carrier} | ${Math.floor(inbound.duration/60)}ש ${inbound.duration%60}ד</div>` : ''}
      </div>
    `;
  }).join('');
}

// ===== WEATHER PAGE =====
function renderWeatherPage() {
  const page = document.getElementById('page-weather');
  const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-cloud-sun" style="color:#2A9D8F;margin-left:6px;"></i> מזג אוויר + מצלמות חיות</h2>
    </div>
    <div style="padding:0;">
      <div id="weatherPageContent" style="text-align:center;padding:30px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="color:#2A9D8F;font-size:1.3rem;"></i><br>טוען תחזית...</div>
    </div>
  `;

  setTimeout(async () => {
    const el = document.getElementById('weatherPageContent');
    if (!el) return;
    let w;
    try { w = await getDubaiWeather(); }
    catch(e) { el.innerHTML = `<div style="color:#E76F51;padding:20px;">שגיאה: ${e.message}<br><button onclick="renderWeatherPage()" style="margin-top:10px;background:#E76F51;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:Heebo;">נסה שוב</button></div>`; return; }
    if (!w) { el.innerHTML = `<div style="color:#6B7F8D;padding:20px;">לא ניתן לטעון מזג אוויר כרגע.<br><button onclick="localStorage.removeItem('dubai_service_cache');renderWeatherPage()" style="margin-top:10px;background:#E76F51;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:Heebo;">נסה שוב</button></div>`; return; }

    el.innerHTML = `
      <!-- Current -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);padding:24px;color:#fff;text-align:center;margin-bottom:16px;">
        <div style="font-size:0.85rem;opacity:0.8;">דובאי עכשיו</div>
        <div style="font-size:4rem;line-height:1;">${w.icon}</div>
        <div style="font-size:3rem;font-weight:800;">${w.temp}°C</div>
        <div style="font-size:1rem;margin-bottom:8px;">${w.condition}</div>
        <div style="display:flex;gap:16px;justify-content:center;font-size:0.8rem;opacity:0.85;">
          <span><i class="fas fa-thermometer-half"></i> מרגיש ${w.feelsLike}°</span>
          <span><i class="fas fa-tint"></i> לחות ${w.humidity}%</span>
          <span><i class="fas fa-wind"></i> ${w.wind} קמ"ש</span>
          <span><i class="fas fa-sun"></i> UV ${w.uv}</span>
        </div>
      </div>

      <!-- 7 day forecast -->
      <div style="background:#fff;padding:16px;border-bottom:1px solid #E5E7EB;margin-bottom:16px;">
        <div style="font-weight:700;color:#2C5F6E;margin-bottom:12px;"><i class="fas fa-calendar-week" style="color:#E9C46A;"></i> תחזית שבועית</div>
        ${w.forecast.map(d => {
          const dayNum = new Date(d.date).getDay();
          const dateStr = new Date(d.date).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F5EFE6;">
              <div style="width:60px;font-weight:600;color:#2C5F6E;font-size:0.85rem;">${dayNames[dayNum]}</div>
              <div style="color:#6B7F8D;font-size:0.75rem;">${dateStr}</div>
              <div style="font-size:1.7rem;line-height:1;">${d.icon}</div>
              <div style="color:#6B7F8D;font-size:0.8rem;width:80px;">${d.condition}</div>
              <div style="font-weight:600;color:#E76F51;">${d.maxTemp}°</div>
              <div style="color:#6B7F8D;">${d.minTemp}°</div>
            </div>`;
        }).join('')}
      </div>

      <!-- Live Cams -->
      <div style="background:#fff;padding:16px;border-top:1px solid #E5E7EB;">
        <div style="font-weight:700;color:#2C5F6E;margin-bottom:12px;">
          <i class="fas fa-video" style="color:#E76F51;"></i> מצלמות חיות
          <span style="background:rgba(255,0,0,0.8);color:#fff;font-size:0.55rem;padding:2px 6px;border-radius:8px;font-weight:700;margin-right:6px;">LIVE</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <a href="https://www.webcamtaxi.com/en/united-arab-emirates/dubai/burj-khalifa-lake-dubai.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#F5E6CB;border-radius:6px;">
            <i class="fas fa-building" style="font-size:1.2rem;color:#E76F51;"></i>
            <div style="font-size:0.7rem;color:#2C5F6E;font-weight:600;margin-top:4px;">ברג' חליפה</div>
          </a>
          <a href="https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/dubai-marina.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#F5E6CB;border-radius:6px;">
            <i class="fas fa-ship" style="font-size:1.2rem;color:#2A9D8F;"></i>
            <div style="font-size:0.7rem;color:#2C5F6E;font-weight:600;margin-top:4px;">מרינה</div>
          </a>
          <a href="https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#F5E6CB;border-radius:6px;">
            <i class="fas fa-umbrella-beach" style="font-size:1.2rem;color:#F4A261;"></i>
            <div style="font-size:0.7rem;color:#2C5F6E;font-weight:600;margin-top:4px;">חוף</div>
          </a>
        </div>
        <button onclick="navigateTo('livecams')" style="width:100%;margin-top:10px;padding:10px;border-radius:6px;background:#2C5F6E;color:#fff;border:none;font-family:Heebo;font-weight:600;cursor:pointer;font-size:0.85rem;">
          <i class="fas fa-video"></i> כל המצלמות →
        </button>
      </div>
    `;
  }, 100);
}

// ===== LIVE CAMS PAGE =====
function renderLiveCamsPage() {
  const page = document.getElementById('page-livecams');
  const cams = [
    { name:'דובאי מרינה', desc:'מבט פנורמי על המרינה והגלגל הענק', img:'https://images.pexels.com/photos/14750359/pexels-photo-14750359.jpeg', url:'https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/dubai-marina.html', color:'#E9C46A' },
    { name:'דובאי - קו הרקיע', desc:'תצפית רחבה על קו הרקיע של דובאי', img:'https://images.pexels.com/photos/26838210/pexels-photo-26838210.jpeg', url:'https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/dubai.html', color:'#F4A261' },
    { name:'Fairmont The Palm', desc:'מבט מהפאלם — מרינה + גלגל ענק', img:'https://images.pexels.com/photos/14750186/pexels-photo-14750186.jpeg', url:'https://www.webcamtaxi.com/en/united-arab-emirates/dubai/fairmont-thepalm-cam.html', color:'#2A9D8F' },
    { name:'Burj Khalifa Lake', desc:'מזרקת דובאי וברג׳ חליפה', img:'https://images.pexels.com/photos/29196946/pexels-photo-29196946.jpeg', url:'https://www.webcamtaxi.com/en/united-arab-emirates/dubai/burj-khalifa-lake-dubai.html', color:'#E76F51' },
  ];

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-video" style="color:#E76F51;margin-left:6px;"></i> דובאי עכשיו - שידור חי</h2>
    </div>
    <div style="padding:12px 16px;">
      <div id="liveCamWeather" style="margin-bottom:12px;"></div>

      <div style="background:#FFF3CD;color:#856404;padding:8px;font-size:0.75rem;text-align:center;border-radius:6px;margin-bottom:12px;">
        ⚠️ לחיצה על מצלמה תפתח אותה באתר חיצוני (אתרים שמסרבים להיטען בתוך אפליקציה).
      </div>

      ${cams.map(cam => `
        <a href="${cam.url}" target="_blank" style="display:block;text-decoration:none;margin-bottom:14px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="position:relative;height:180px;background:#000;">
            <img src="${cam.img}" style="width:100%;height:100%;object-fit:cover;opacity:0.85;" onerror="this.style.display='none'">
            <div style="position:absolute;top:10px;right:10px;background:rgba(255,0,0,0.85);color:#fff;font-size:0.65rem;padding:3px 10px;border-radius:10px;font-weight:700;">● LIVE</div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <div style="background:rgba(0,0,0,0.6);color:#fff;border-radius:50%;width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;"><i class="fas fa-play"></i></div>
            </div>
            <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));color:#fff;padding:14px 12px 8px;">
              <div style="font-weight:800;font-size:1rem;color:${cam.color};">${cam.name}</div>
              <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;">${cam.desc}</div>
            </div>
          </div>
        </a>
      `).join('')}

      <div style="margin-top:8px;background:#F5E6CB;border-radius:6px;padding:10px;border-right:3px solid #E9C46A;">
        <div style="font-size:0.75rem;color:#2C5F6E;">
          <i class="fas fa-info-circle" style="color:#E9C46A;"></i>
          דובאי UTC+4 | שעה לפני ישראל בחורף, אותו זמן בקיץ
        </div>
      </div>
    </div>
  `;

  // Load weather in cam page too
  setTimeout(async () => {
    const el = document.getElementById('liveCamWeather');
    if (el) {
      const w = await getDubaiWeather();
      if (w) {
        el.innerHTML = `
          <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);border-radius:8px;padding:14px;color:#fff;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:0.75rem;opacity:0.8;">דובאי עכשיו</div>
              <div style="font-size:1.8rem;font-weight:700;">${w.temp}°C</div>
              <div style="font-size:0.8rem;">${w.condition}</div>
            </div>
            <div style="font-size:2.2rem;line-height:1;">${w.icon}</div>
          </div>
        `;
      }
    }
  }, 100);
}

// ===== MAP PAGE =====
function renderMapPage() {
  const page = document.getElementById('page-map');
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2>מפת דובאי ${hasGoogle() ? '(Google Maps)' : '(OpenStreetMap)'}</h2>
    </div>
    <div class="filter-tabs">
      <button class="filter-tab active" onclick="filterMap('all',this)">הכל</button>
      <button class="filter-tab" onclick="filterMap('hotels',this)">מלונות</button>
      <button class="filter-tab" onclick="filterMap('restaurants',this)">מסעדות</button>
      <button class="filter-tab" onclick="filterMap('attractions',this)">אטרקציות</button>
      <button class="filter-tab" onclick="filterMap('shopping',this)">קניות</button>
      <button class="filter-tab" onclick="filterMap('nightlife',this)">בילויים</button>
      <button class="filter-tab" onclick="filterMap('kids',this)">ילדים</button>
      <button class="filter-tab" onclick="filterMap('transport',this)">תחבורה</button>
      <button class="filter-tab" onclick="filterMap('casino',this)">בידור</button>
    </div>
    <div style="padding:0 16px 8px;">
      <button class="areas-toggle" onclick="toggleAreas()" style="width:100%;padding:10px;border-radius:8px;border:1px solid ${areasVisible ? '#2A9D8F' : '#E5E7EB'};background:${areasVisible ? '#2A9D8F' : '#fff'};color:${areasVisible ? '#fff' : '#2C5F6E'};font-family:Heebo;font-size:0.9rem;font-weight:700;cursor:pointer;">${areasVisible ? '✓ אזורים — מופעל' : '🗺️ הצג אזורי דובאי (10)'}</button>
    </div>
    <div id="areasStrip" style="display:${areasVisible ? 'flex' : 'none'};padding:0 16px 8px;overflow-x:auto;gap:8px;scroll-snap-type:x mandatory;">
      ${DUBAI_AREAS.map((a, i) => `
        <div onclick="focusOnArea(${i})" style="min-width:170px;max-width:170px;scroll-snap-align:start;background:#fff;border:2px solid ${a.color};border-radius:8px;padding:8px 10px;cursor:pointer;flex-shrink:0;">
          <div style="font-weight:800;color:${a.color};font-size:0.88rem;margin-bottom:3px;">${a.name}</div>
          <div style="font-size:0.7rem;line-height:1.35;color:#2C5F6E;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${(a.desc || '').split('—').slice(0, 1).join('').slice(0, 100) + '...'}</div>
        </div>
      `).join('')}
    </div>
    <div style="height:calc(100vh - 290px);margin:0 12px;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
      <div id="fullMap" style="width:100%;height:100%;"></div>
    </div>
    ${nearMeToggleHTML()}
  `;

  setTimeout(() => {
    clearMap();
    initFullMap('all');
  }, 200);
}

function initFullMap(filter) {
  const db = getDB();
  const categories = filter === 'all' ? Object.keys(db) : [filter];
  const allItems = [];
  categories.forEach(cat => {
    (db[cat] || []).forEach(item => allItems.push({ ...item, category: cat }));
  });
  buildMap('fullMap', 11, allItems);
}

function filterMap(cat, btn) {
  document.querySelectorAll('#page-map .filter-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  clearMap();
  initFullMap(cat);
}

// ===== INFO PAGE =====
function renderInfoPage() {
  const page = document.getElementById('page-info');
  const info = PRACTICAL_INFO;
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2>מידע שימושי</h2>
    </div>
    <div style="padding:16px 20px;">
      <!-- Transport Quick Actions -->
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-car-alt"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:8px;">הזמן נסיעה עכשיו</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://www.careem.com" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2A9D8F;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:90px;">
            <i class="fas fa-car"></i> Careem
          </a>
          <a href="https://m.uber.com" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2C5F6E;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:90px;">
            <i class="fas fa-car-side"></i> Uber
          </a>
          <a href="https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=Dubai" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#E9C46A;color:#2C5F6E;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:90px;">
            <i class="fas fa-subway"></i> מטרו
          </a>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://play.google.com/store/apps/details?id=com.rta.suhail" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:8px;background:#F5EFE6;color:#2C5F6E;text-decoration:none;font-weight:500;font-size:0.8rem;border:1px solid #E5E7EB;">
            <i class="fas fa-map-signs"></i> S'hail (תכנון מסלול)
          </a>
          <a href="https://play.google.com/store/apps/details?id=com.rta.rtadubai" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:8px;background:#F5EFE6;color:#2C5F6E;text-decoration:none;font-weight:500;font-size:0.8rem;border:1px solid #E5E7EB;">
            <i class="fas fa-id-card"></i> RTA (כרטיס Nol)
          </a>
        </div>
      </div>

      <!-- Order Food -->
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-hamburger"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:8px;">הזמן אוכל</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://www.talabat.com/uae" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#F4A261;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-motorcycle"></i> Talabat
          </a>
          <a href="https://www.deliveroo.ae" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2A9D8F;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-biking"></i> Deliveroo
          </a>
          <a href="https://www.noon.com/uae-en/noon-food/" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#E9C46A;color:#2C5F6E;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-utensils"></i> Noon Food
          </a>
        </div>
      </div>

      <!-- Book Attractions -->
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-ticket-alt"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:8px;">הזמן כרטיסים ואטרקציות</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://www.getyourguide.com/dubai-l173/" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#E76F51;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-star"></i> GetYourGuide
          </a>
          <a href="https://www.viator.com/Dubai/d828-ttd" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2C5F6E;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-map-marked"></i> Viator
          </a>
          <a href="https://www.klook.com/en-US/city/30-dubai-things-to-do/" target="_blank" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#F4A261;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;">
            <i class="fas fa-tags"></i> Klook
          </a>
        </div>
      </div>

      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-passport"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:4px;">ויזה וכניסה</div>
        <div style="font-size:0.9rem;line-height:1.6;">${info.visa}</div>
      </div>
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-coins"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:4px;">מטבע: ${info.currency.name}</div>
        <div style="font-size:0.9rem;">${info.currency.rate}<br>${info.currency.tip}</div>
      </div>
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-sun"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:4px;">מזג אוויר</div>
        <div style="font-size:0.9rem;">${info.weather}</div>
      </div>
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-phone-alt"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:4px;">מספרי חירום</div>
        <div style="font-size:0.9rem;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <span>משטרה: <b>${info.emergency.police}</b></span>
          <span>אמבולנס: <b>${info.emergency.ambulance}</b></span>
          <span>כיבוי: <b>${info.emergency.fire}</b></span>
          <span>משטרת תיירות: <b>${info.emergency.tourist_police}</b></span>
        </div>
      </div>
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-language"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:8px;">מילון עברית-ערבית</div>
        <table style="width:100%;font-size:0.85rem;">
          <tr style="color:var(--gold);"><th style="text-align:right;padding:4px;">עברית</th><th style="text-align:right;padding:4px;">ערבית</th><th style="text-align:right;padding:4px;">הגייה</th></tr>
          ${info.phrases.map(p => `<tr><td style="padding:4px;">${p.he}</td><td style="padding:4px;">${p.ar}</td><td style="padding:4px;">${p.pron}</td></tr>`).join('')}
        </table>
      </div>
      <div class="stat-card" style="margin-bottom:14px;">
        <div class="stat-icon"><i class="fas fa-lightbulb"></i></div>
        <div class="stat-label" style="font-weight:600;color:var(--text);margin-bottom:8px;">טיפים חשובים</div>
        <ul style="font-size:0.85rem;padding-right:16px;line-height:1.8;">
          ${info.tips.map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ===== DETAIL MODAL =====
const PLACES_PHOTO_KEY = 'AIzaSyDVYlYuM6saMxbhi2aKNCtiv6J8mR8LLgw';
function placePhotoUrl(name, w = 900) {
  return `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&key=${PLACES_PHOTO_KEY}`;
}

function renderHotelPhotoSlider(item, data) {
  const photos = data.photos || [];
  return `
    <div style="position:relative;background:#000;">
      <div id="hotelSlider" data-current="0" data-total="${photos.length}" style="position:relative;height:240px;overflow:hidden;">
        ${photos.map((p, i) => `
          <div class="hps-slide" data-idx="${i}" style="position:absolute;inset:0;opacity:${i === 0 ? 1 : 0};transition:opacity 0.4s;">
            <img src="${placePhotoUrl(p.name, 1000)}" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" onerror="this.style.display='none'">
            <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 12px 8px;background:linear-gradient(transparent,rgba(0,0,0,0.7));color:#fff;font-size:0.65rem;text-align:left;direction:ltr;">📷 ${p.attribution}</div>
          </div>
        `).join('')}
        ${photos.length > 1 ? `
          <button onclick="moveHotelSlide(-1)" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;z-index:3;"><i class="fas fa-chevron-right"></i></button>
          <button onclick="moveHotelSlide(1)" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;z-index:3;"><i class="fas fa-chevron-left"></i></button>
          <div style="position:absolute;top:8px;left:0;right:0;display:flex;gap:4px;justify-content:center;z-index:2;">
            ${photos.map((_, i) => `<div data-dot="${i}" style="width:6px;height:6px;border-radius:50%;background:${i === 0 ? '#fff' : 'rgba(255,255,255,0.45)'};transition:0.25s;"></div>`).join('')}
          </div>` : ''}
      </div>
      <button class="modal-close" onclick="closeDetail()"><i class="fas fa-times"></i></button>
      <button onclick="addToMyTrip('${item.category || 'hotels'}', ${item.id})" title="הוסף לטיול שלי" class="add-trip-btn" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.95);color:#2C5F6E;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.6rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 3px 10px rgba(0,0,0,0.4);z-index:3;">+</button>
    </div>
  `;
}

function moveHotelSlide(dir) {
  const slider = document.getElementById('hotelSlider');
  if (!slider) return;
  const slides = slider.querySelectorAll('.hps-slide');
  const dots = slider.querySelectorAll('[data-dot]');
  const total = slides.length;
  let cur = parseInt(slider.dataset.current || '0');
  slides[cur].style.opacity = '0';
  if (dots[cur]) dots[cur].style.background = 'rgba(255,255,255,0.45)';
  cur = (cur + dir + total) % total;
  slides[cur].style.opacity = '1';
  if (dots[cur]) dots[cur].style.background = '#fff';
  slider.dataset.current = String(cur);
}

function galleryImgUrl(name) { return 'images/gallery/' + encodeURIComponent(name); }
function toggleGalleryPreview() {
  const wrap = document.getElementById('homeGalleryWrap');
  const arrow = document.getElementById('galleryArrow');
  if (!wrap) return;
  const isOpen = wrap.style.display !== 'none';
  wrap.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0)' : 'rotate(180deg)';
}
function openGalleryAt(idx) {
  window._galleryPageIdx = idx || 0;
  navigateTo('gallery');
}
// ===== REAL ESTATE PORTAL =====
const RE_ARTICLES = [
  { id:'a1', title:'איך קונים דירה בדובאי כישראלי?', body:'דובאי פתוחה לזרים בכל פרויקטי Freehold. תהליך הרכישה: בחירת נכס → חוזה הזמנה (Reservation, ~10%) → SPA (חוזה רכישה, 10%) → תשלום לפי שלבים → רישום ב-DLD (Dubai Land Department, ~4% מס). זמן לרישום: 30-90 יום. דרושים: דרכון בתוקף 6+ חודשים, אישור הכנסה, ולעיתים פתיחת חשבון בנק מקומי.', icon:'🔑' },
  { id:'a2', title:'איזה אזורים פופולריים להשקעה?', body:'Dubai Marina (תשואה ~7-9%, ביקוש שוכרים גבוה), Downtown (יוקרה, ~5-7%), JVC (כניסה זולה, ~9-11%), Business Bay (מודרני, ~6-8%), Damac Hills 2 (חדש וצומח, ~10-12%), Palm Jumeirah (יוקרתי, ~5-7% + עלייה הונית). המחירים מ-AED 700K (סטודיו ב-JVC) ועד מיליונים ב-Palm.', icon:'📍' },
  { id:'a3', title:'מסים, עלויות ותשואות', body:'אין מס הכנסה אישי על שכר דירה. מס רכישה: 4% (DLD) + עמלות סוכן (2%) + שכ"ט עו"ד (~1%) + רישום (~AED 4,000). תחזוקה: ~AED 15-25 למ"ר/שנה. אחוז שכירות מגג: 8-10% תשואה ברוטו במיקומים ממוצעים. מינימום השקעה: AED 750K לקבלת ויזת משקיע ל-2 שנים, AED 2M ל-Golden Visa (10 שנים).', icon:'📊' },
  { id:'a4', title:'מימון: משכנתא לזרים', body:'בנקים בדובאי מציעים משכנתא לזרים — עד 50-60% מערך הנכס לעיתים. ריבית: ~4-5.5% (משתנה/קבועה). דרישות: דרכון, אישור הכנסה $5K+/חודש, היסטוריית אשראי. בנקים מובילים: Emirates NBD, ADCB, Mashreq, FAB. תקופה: 25 שנה מקסימום (עד גיל 65-70). הון עצמי מינימלי: 20-50% לפי גיל ונכס.', icon:'💰' },
  { id:'a5', title:'Off-Plan vs נכס מוכן', body:'Off-Plan (פרויקט בבנייה): מחיר נמוך יותר, תוכנית תשלומים נוחה (10-30% במהלך הבנייה, השאר במסירה), פוטנציאל עלייה. סיכון: עיכובים, שינויים בפרויקט. נכס מוכן: כניסה מיידית להשכרה, בלי הפתעות, אבל מחיר גבוה יותר. ישראלים מעדיפים בעיקר Off-Plan ב-3 השנים האחרונות.', icon:'🏗️' }
];
const RE_BROKERS_DEFAULT = [
  { id:'b1', name:'גלית שמש', company:'Allsopp & Allsopp', langs:['עברית','אנגלית','ערבית'], phone:'+971-50-100-2233', whatsapp:'971501002233', specialty:'Marina, JBR, JLT', email:'galit@allsopp.ae', years:'8 שנים', verified:true, image:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80' },
  { id:'b2', name:'אבי כהן', company:'Better Homes', langs:['עברית','אנגלית'], phone:'+971-55-222-3344', whatsapp:'971552223344', specialty:'Downtown, Business Bay', email:'avi@betterhomes.ae', years:'6 שנים', verified:true, image:'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80' },
  { id:'b3', name:'מיכאל רובין', company:'Engel & Völkers', langs:['עברית','אנגלית','רוסית'], phone:'+971-52-333-4455', whatsapp:'971523334455', specialty:'Palm, Emirates Hills, יוקרה', email:'michael@ev-dubai.ae', years:'12 שנים', verified:true, image:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
  { id:'b4', name:'שרה לוי', company:'Driven Properties', langs:['עברית','אנגלית'], phone:'+971-58-444-5566', whatsapp:'971584445566', specialty:'JVC, Damac Hills, השקעות זולות', email:'sarah@drivenproperties.ae', years:'5 שנים', verified:true, image:'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80' }
];

const RE_API = 'https://wellcomedubaicom-production.up.railway.app';
window.RE_PUBLIC_LISTINGS = [];

function getREListings() { return window.RE_PUBLIC_LISTINGS || []; }

async function loadREListings() {
  try {
    const r = await fetch(`${RE_API}/api/listings?_t=${Date.now()}`);
    const d = await r.json();
    window.RE_PUBLIC_LISTINGS = (d.listings || []).map(l => ({
      ...l,
      photos: (l.photos || []).map(p => p.startsWith('http') ? p : `${RE_API}${p}`)
    }));
    return window.RE_PUBLIC_LISTINGS;
  } catch (e) { console.error('load listings failed', e); return []; }
}

function renderRealEstatePage() {
  const page = document.getElementById('page-realestate');
  if (!page) return;
  const tab = window.RE_TAB || 'invest';
  const topButtons = [
    { id:'sale',     label:'דירות למכירה',   icon:'🏠', color:'#1A6B8A', sub:'מצא בית חלומות' },
    { id:'rent',     label:'דירות להשכרה',   icon:'🔑', color:'#2A9D8F', sub:'לטווח קצר וארוך' },
    { id:'invest',   label:'פורטל הנדל"ן',   icon:'📊', color:'#E76F51', sub:'מאמרים, גרפים והשקעות' }
  ];
  page.innerHTML = `
    <div class="page-header" style="background:linear-gradient(135deg,#1A6B8A 0%,#2C5F6E 100%);color:#fff;border-bottom:none;">
      <button class="back-btn" onclick="navigateTo('home')" style="color:#fff !important;"><i class="fas fa-arrow-right"></i></button>
      <h2 style="color:#fff;"><i class="fas fa-city" style="color:#E9C46A;margin-left:6px;"></i> פורטל הנדל"ן בדובאי</h2>
    </div>
    <!-- Hero strip with subtle gradient -->
    <div style="background:linear-gradient(180deg,#F5E6CB 0%,transparent 100%);padding:18px 16px 10px;">
      <div style="text-align:center;color:#2C5F6E;font-size:0.85rem;font-weight:600;margin-bottom:14px;line-height:1.5;">
        מצא, השקע, חיה — <span style="color:#E76F51;">הכל בדובאי</span> 🏙️
      </div>
      <div style="display:flex;gap:9px;">
        ${topButtons.map(t => `
          <button onclick="switchRETab('${t.id}')" style="flex:1;padding:14px 6px;border-radius:14px;font-family:Heebo;font-weight:800;font-size:0.78rem;cursor:pointer;border:none;background:${tab===t.id?`linear-gradient(135deg,${t.color},${t.color}dd)`:`#fff`};color:${tab===t.id?'#fff':'#2C5F6E'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:${tab===t.id?`0 6px 18px ${t.color}55`:`0 2px 6px rgba(0,0,0,0.05)`};border:1px solid ${tab===t.id?'transparent':'#E5E7EB'};transition:all 0.25s;">
            <span style="font-size:1.6rem;line-height:1;">${t.icon}</span>
            <span style="line-height:1.15;">${t.label}</span>
            <span style="font-size:0.62rem;opacity:${tab===t.id?'0.85':'0.6'};font-weight:600;">${t.sub}</span>
          </button>
        `).join('')}
      </div>
      <div style="margin-top:12px;">
        <button onclick="navigateTo('business')" style="width:100%;padding:14px 16px;border-radius:12px;border:none;background:linear-gradient(135deg,#E9C46A,#F4A261);color:#2C5F6E;font-family:Heebo;font-weight:800;font-size:0.92rem;cursor:pointer;box-shadow:0 4px 14px rgba(233,196,106,0.4);display:flex;align-items:center;justify-content:center;gap:8px;">
          <span style="font-size:1.3rem;">💼</span>
          <span>פורטל העסקים — בורסות, מניות וזהב</span>
          <span style="font-size:1rem;">←</span>
        </button>
      </div>
    </div>
    <div style="padding:14px 16px 80px;">
      ${tab === 'articles' ? (renderREArticlesWithStats() + renderBrokersBannerBottom())
        : tab === 'invest' ? (renderREArticlesWithStats() + renderREInvestments() + renderBrokersBannerBottom())
        : (renderREListings(tab) + renderBrokersBannerBottom())}
    </div>
  `;
}

function renderBusinessPortal() {
  const page = document.getElementById('page-business');
  if (!page) return;
  page.innerHTML = `
    <div class="page-header" style="background:linear-gradient(135deg,#1A6B8A 0%,#2C5F6E 100%);color:#fff;border-bottom:none;">
      <button class="back-btn" onclick="navigateTo('realestate')" style="color:#fff !important;"><i class="fas fa-arrow-right"></i></button>
      <h2 style="color:#fff;"><i class="fas fa-chart-line" style="color:#E9C46A;margin-left:6px;"></i> פורטל העסקים</h2>
    </div>
    <div style="padding:18px 16px 80px;background:#FAF6EE;">
      <div style="background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="font-weight:800;color:#1A6B8A;font-size:1rem;margin-bottom:6px;">💼 שוק ההון של דובאי</div>
        <div style="color:#2C5F6E;font-size:0.85rem;line-height:1.6;">דובאי מארחת 3 בורסות עיקריות: <b>DFM</b> (מניות מקומיות), <b>Nasdaq Dubai</b> (מניות בינלאומיות) ו-<b>DGCX</b> (זהב, מתכות וסחורות).</div>
      </div>

      <div style="background:#fff;border-radius:12px;padding:14px 14px 10px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="font-weight:700;color:#1A6B8A;font-size:0.95rem;margin-bottom:8px;">📊 DFM — Dubai Financial Market</div>
        <iframe scrolling="no" allowtransparency="true" frameborder="0" style="width:100%;height:380px;border:0;" src="https://www.tradingview-widget.com/embed-widget/symbol-overview/?locale=en#%7B%22symbols%22%3A%5B%5B%22DFM%3ADFM%7C1Y%22%5D%2C%5B%22DFM%3AEMAAR%7C1Y%22%5D%2C%5B%22DFM%3ADIB%7C1Y%22%5D%5D%2C%22chartOnly%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A380%2C%22colorTheme%22%3A%22light%22%7D"></iframe>
      </div>

      <div style="background:#fff;border-radius:12px;padding:14px 14px 10px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="font-weight:700;color:#1A6B8A;font-size:0.95rem;margin-bottom:8px;">🌍 Nasdaq Dubai — מניות בינלאומיות</div>
        <iframe scrolling="no" allowtransparency="true" frameborder="0" style="width:100%;height:380px;border:0;" src="https://www.tradingview-widget.com/embed-widget/symbol-overview/?locale=en#%7B%22symbols%22%3A%5B%5B%22NASDAQ%3AAAPL%7C1Y%22%5D%2C%5B%22NASDAQ%3AGOOGL%7C1Y%22%5D%2C%5B%22NASDAQ%3AMSFT%7C1Y%22%5D%5D%2C%22chartOnly%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A380%2C%22colorTheme%22%3A%22light%22%7D"></iframe>
      </div>

      <div style="background:#fff;border-radius:12px;padding:14px 14px 10px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="font-weight:700;color:#1A6B8A;font-size:0.95rem;margin-bottom:8px;">🪙 DGCX — זהב וסחורות</div>
        <iframe scrolling="no" allowtransparency="true" frameborder="0" style="width:100%;height:380px;border:0;" src="https://www.tradingview-widget.com/embed-widget/symbol-overview/?locale=en#%7B%22symbols%22%3A%5B%5B%22OANDA%3AXAUUSD%7C1Y%22%5D%2C%5B%22OANDA%3AXAGUSD%7C1Y%22%5D%2C%5B%22TVC%3AUSOIL%7C1Y%22%5D%5D%2C%22chartOnly%22%3Afalse%2C%22width%22%3A%22100%25%22%2C%22height%22%3A380%2C%22colorTheme%22%3A%22light%22%7D"></iframe>
      </div>

      <div style="background:linear-gradient(135deg,#E9C46A20,#F4A26120);border:1px solid #E9C46A;border-radius:12px;padding:14px 16px;font-size:0.8rem;color:#7B5E1F;line-height:1.6;">
        ⚠️ הנתונים מסופקים על ידי TradingView לצרכי מידע בלבד. אינם המלצה להשקעה.
      </div>
    </div>
  `;
}

function reSectionTitle(emoji, text, color = '#1A6B8A') {
  return `<div style="display:flex;align-items:center;gap:10px;margin:18px 0 14px;padding:10px 14px;background:linear-gradient(90deg,${color}15,transparent);border-right:5px solid ${color};border-radius:8px;">
    <span style="font-size:1.3rem;line-height:1;">${emoji}</span>
    <span style="font-weight:900;color:${color};font-size:1.15rem;letter-spacing:-0.4px;">${text}</span>
  </div>`;
}

function renderREArticlesWithStats() {
  setTimeout(async () => {
    const el = document.getElementById('uaeStatsBoxArticles');
    if (!el) return;
    const stats = await loadUAEStats();
    el.innerHTML = renderStatsCarousel(stats);
  }, 50);
  return `
    ${reSectionTitle('📊', 'מדדים כלכליים — UAE (4 שנים אחרונות)', '#1A6B8A')}
    <div id="uaeStatsBoxArticles" style="margin-bottom:22px;"><div style="text-align:center;padding:20px;color:#6B7F8D;font-size:0.78rem;"><i class="fas fa-spinner fa-spin"></i> טוען נתונים...</div></div>
    ${reSectionTitle('📚', 'מאמרים ומדריכים', '#5B9DC7')}
    ${renderREArticles()}
  `;
}

function renderBrokersBannerBottom() {
  return `
    <div onclick="switchRETab('brokers-full')" style="margin-top:22px;border-radius:16px;cursor:pointer;aspect-ratio:380/120;background-image:linear-gradient(90deg,rgba(184,92,142,0.85) 0%,rgba(26,107,138,0.6) 100%),url('images/wellcomedubai.stamp/lifestyle-business-woman-feel-happy-jumping-air-celebrating-success.jpg');background-size:cover;background-position:center;display:flex;align-items:center;justify-content:space-between;padding:0 22px;box-shadow:0 8px 24px rgba(184,92,142,0.3);overflow:hidden;box-sizing:border-box;border:1px solid rgba(255,255,255,0.15);position:relative;">
      <div style="position:absolute;top:-30px;left:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(255,255,255,0.18),transparent 70%);border-radius:50%;"></div>
      <div style="color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.6);position:relative;">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:1.5px;opacity:0.85;font-weight:700;margin-bottom:3px;">PREMIUM SERVICE</div>
        <div style="font-weight:800;font-size:1.1rem;line-height:1.15;">🤝 מתווכים מומלצים</div>
        <div style="font-size:0.74rem;margin-top:4px;opacity:0.95;">דוברי עברית · ניסיון עם ישראלים</div>
      </div>
      <div style="background:rgba(255,255,255,0.95);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
        <i class="fas fa-chevron-left" style="color:#B85C8E;font-size:0.85rem;"></i>
      </div>
    </div>
  `;
}
function switchRETab(t) {
  if (t === 'brokers-full') { renderBrokersFullPage(); return; }
  window.RE_TAB = t; renderRealEstatePage();
  if (t === 'sale' || t === 'rent') {
    loadREListings().then(() => renderRealEstatePage());
  }
}

function renderBrokersFullPage() {
  const page = document.getElementById('page-realestate');
  if (!page) return;
  page.innerHTML = `
    <div class="page-header" style="background:linear-gradient(135deg,#B85C8E 0%,#1A6B8A 100%);color:#fff;border-bottom:none;">
      <button class="back-btn" onclick="switchRETab('articles')" style="color:#fff !important;"><i class="fas fa-arrow-right"></i></button>
      <h2 style="color:#fff;"><i class="fas fa-handshake" style="color:#E9C46A;margin-left:6px;"></i> מתווכים מומלצים</h2>
    </div>
    <div style="display:flex;gap:8px;padding:12px 14px;background:#F5E6CB;border-bottom:1px solid #F5EFE6;">
      <button onclick="showBrokerCriteria()" style="flex:1;padding:11px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.82rem;cursor:pointer;background:#fff;border:2px solid #1A6B8A;color:#1A6B8A;">✓ מה נדרש מהמתווך?</button>
      <button onclick="showBrokerSubmit()" style="flex:1;padding:11px;border-radius:8px;font-family:Heebo;font-weight:700;font-size:0.82rem;cursor:pointer;background:#B85C8E;border:none;color:#fff;">+ המלץ על מתווך</button>
    </div>
    <div style="padding:14px 16px 80px;">
      ${renderREBrokers()}
    </div>
  `;
}

function openMenuIframe(query, title) {
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  const url = 'https://www.google.com/search?igu=1&q=' + query;
  modal.innerHTML = `
    <div style="background:#fff;width:96%;max-width:600px;height:88vh;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;">
      <div style="background:#2A9D8F;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
        <button onclick="document.getElementById('detailModal').classList.remove('active')" style="background:rgba(255,255,255,0.25);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;font-family:Heebo;">×</button>
        <div style="font-weight:800;font-size:0.95rem;">📋 ${title}</div>
      </div>
      <iframe src="${url}" style="flex:1;width:100%;border:none;background:#fff;" referrerpolicy="no-referrer"></iframe>
      <div style="padding:8px 14px;background:#f5f5f5;font-size:0.7rem;color:#6B7F8D;text-align:center;">חיפוש בגוגל · ${decodeURIComponent(query)}</div>
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function showBrokerCriteria() {
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  modal.innerHTML = `
    <div style="background:#fff;width:92%;max-width:480px;max-height:88vh;border-radius:14px;overflow-y:auto;padding:0;display:flex;flex-direction:column;">
      <div style="background:linear-gradient(135deg,#1A6B8A,#2A9D8F);color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;font-size:1.05rem;">✓ קריטריונים למתווך מורשה</div>
        <button onclick="document.getElementById('detailModal').classList.remove('active')" style="background:rgba(255,255,255,0.25);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;">×</button>
      </div>
      <div style="padding:18px 22px;color:#2C5F6E;line-height:2;font-size:0.9rem;">
        <div style="margin-bottom:6px;">• ניסיון מוכח בנדל"ן בדובאי — מעל שנתיים</div>
        <div style="margin-bottom:6px;">• רישיון RERA תקף (Real Estate Regulatory Agency)</div>
        <div style="margin-bottom:6px;">• דובר עברית או רקע בעבודה עם ישראלים</div>
        <div style="margin-bottom:6px;">• ערוץ תקשורת מוסדר (אתר/לינקדאין/וואטסאפ)</div>
        <div style="margin-bottom:6px;">• הצגת חוזה מכר/השכרה שביצע</div>
        <div style="margin-bottom:6px;">• שיחת אימות אישית</div>
        <div style="margin-bottom:6px;">• 2 ממליצים לפחות</div>
        <div style="margin-bottom:6px;">• הצגת תעודת זהות וקבלות מסים</div>
      </div>
      <button onclick="document.getElementById('detailModal').classList.remove('active')" style="margin:0 22px 22px;background:#1A6B8A;color:#fff;border:none;padding:12px;border-radius:8px;font-family:Heebo;font-weight:800;cursor:pointer;">הבנתי</button>
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function showBrokerSubmit() {
  const wa = '+972-50-284-4867';
  const text = encodeURIComponent('שלום, אני רוצה להמליץ על מתווך נדל"ן בדובאי. שם המתווך: ');
  window.open(`https://wa.me/972502844867?text=${text}`, '_blank');
}

function renderREArticles() {
  const accents = ['#1A6B8A','#2A9D8F','#E76F51','#F4A261','#B85C8E'];
  return RE_ARTICLES.map((a, i) => {
    const c = accents[i % accents.length];
    return `
    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:0;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);overflow:hidden;">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 14px 12px;background:linear-gradient(180deg,${c}11 0%,transparent 100%);border-bottom:1px solid #F5EFE6;">
        <div style="width:42px;height:42px;border-radius:12px;background:${c};display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;color:#fff;">${a.icon}</div>
        <div style="font-weight:800;color:#2C5F6E;font-size:0.97rem;line-height:1.3;letter-spacing:-0.2px;flex:1;">${a.title}</div>
      </div>
      <div style="padding:13px 16px 16px;color:#2C5F6E;font-size:0.86rem;line-height:1.75;">${a.body}</div>
    </div>
  `;}).join('');
}

const RE_INVESTMENTS = [
  { area:'JVC (Jumeirah Village Circle)', lat:25.0541, lng:55.2050, entry:'AED 700K', yield:'9-11%', highlight:'כניסה זולה, ביקוש שכירות גבוה, תשתיות חדשות' },
  { area:'Damac Hills 2', lat:25.0241, lng:55.2752, entry:'AED 800K', yield:'10-12%', highlight:'פרויקטים חדשים, כביש סלייק, מחירים עולים' },
  { area:'Business Bay', lat:25.1830, lng:55.2659, entry:'AED 1.5M', yield:'6-8%', highlight:'מודרני, צמוד Downtown, ביקוש משכירים עסקיים' },
  { area:'Dubai Marina', lat:25.0820, lng:55.1410, entry:'AED 1.2M', yield:'7-9%', highlight:'אטרקטיבי לתיירים, נוף לים, אטמוספירה תוססת' },
  { area:'Palm Jumeirah', lat:25.1124, lng:55.1390, entry:'AED 2.5M', yield:'5-7%', highlight:'יוקרתי, עלייה הונית, ביקוש קבוע' },
  { area:'Dubai Hills', lat:25.1078, lng:55.2480, entry:'AED 1.8M', yield:'6-8%', highlight:'משפחות, בתי ספר, קרבה לקניון Hills' }
];

function buildInvestmentMap(size = '600x300') {
  const markers = RE_INVESTMENTS.map((i,idx) => `markers=color:0xE76F51%7Csize:mid%7Clabel:${idx+1}%7C${i.lat},${i.lng}`).join('&');
  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&maptype=roadmap&language=en&${markers}&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro`;
}

function renderLiveInvestmentMap() {
  const mapId = 'liveInvMap_' + Date.now();
  setTimeout(() => {
    if (!window.L || !document.getElementById(mapId)) return;
    if (window._liveInvMap) { try { window._liveInvMap.remove(); } catch (e) {} }
    const map = window.L.map(mapId).setView([25.10, 55.20], 11);
    window._liveInvMap = map;
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);
    RE_INVESTMENTS.forEach((inv, idx) => {
      const html =
        '<div style="direction:rtl;text-align:right;font-family:Heebo;min-width:200px;">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span style="background:linear-gradient(135deg,#E76F51,#F4A261);color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;">' + (idx+1) + '</span>' +
            '<strong style="color:#2C5F6E;font-size:0.95rem;">' + inv.area + '</strong>' +
          '</div>' +
          '<div style="font-size:0.8rem;color:#6B7F8D;margin-bottom:3px;">כניסה: <strong style="color:#1A6B8A;">' + inv.entry + '</strong></div>' +
          '<div style="font-size:0.8rem;color:#6B7F8D;margin-bottom:6px;">תשואה: <strong style="color:#E76F51;">⚡ ' + inv.yield + '</strong></div>' +
          '<div style="font-size:0.78rem;color:#2C5F6E;line-height:1.5;">' + inv.highlight + '</div>' +
        '</div>';
      window.L.marker([inv.lat, inv.lng]).addTo(map).bindPopup(html);
    });
  }, 100);
  return `<div id="${mapId}" style="width:100%;height:340px;border-radius:14px;overflow:hidden;"></div>`;
}
const RE_PROJECTS = [
  { name:'Bugatti Residences by Binghatti', dev:'Binghatti', area:'Business Bay', delivery:'2026', from:'AED 19M', tag:'יוקרה אולטרה' },
  { name:'Damac Lagoons', dev:'Damac', area:'Dubailand', delivery:'2025-2027', from:'AED 1.5M', tag:'משפחות' },
  { name:'Emaar Beachfront', dev:'Emaar', area:'Dubai Harbour', delivery:'2025', from:'AED 1.8M', tag:'חוף פרטי' },
  { name:'Sobha Hartland II', dev:'Sobha', area:'MBR City', delivery:'2026', from:'AED 1.7M', tag:'גן ירוק' },
  { name:'Address Residences Zabeel', dev:'Emaar', area:'Zabeel', delivery:'2027', from:'AED 2.3M', tag:'מגדלים תאומים' }
];

const ISRAELI_TO_UAE = { '2021':200000, '2022':450000, '2023':600000, '2024':650000, '2025':700000 };

async function loadUAEStats() {
  const indicators = [
    { code:'NY.GDP.PCAP.CD',  label:'תמ"ג לנפש',     unit:'$',   color:'#1A6B8A', icon:'💵' },
    { code:'NY.GDP.MKTP.KD.ZG', label:'צמיחת תמ"ג',   unit:'%',   color:'#2A9D8F', icon:'📈' },
    { code:'FP.CPI.TOTL.ZG',  label:'אינפלציה',     unit:'%',   color:'#E76F51', icon:'🔥' },
    { code:'ST.INT.ARVL',     label:'תיירים שנתיים', unit:'M',   color:'#F4A261', icon:'✈️' },
    { code:'FR.INR.LEND',     label:'ריבית בנקים',   unit:'%',   color:'#B85C8E', icon:'🏦' }
  ];
  const results = await Promise.all(indicators.map(async i => {
    try {
      const r = await fetch(`https://api.worldbank.org/v2/country/ARE/indicator/${i.code}?format=json&per_page=20`);
      const data = await r.json();
      const list = (data[1] || []).filter(d => d.value != null).slice(0, 4);
      return { ...i, history: list.map(d => ({ year: d.date, value: d.value })) };
    } catch { return { ...i, history: [] }; }
  }));
  return results;
}

function fmtVal(v, unit) {
  if (v == null) return '—';
  if (unit === '$') return '$' + Math.round(v).toLocaleString();
  if (unit === 'M') return (v / 1000000).toFixed(1) + 'M';
  return v.toFixed(1) + '%';
}

function fmtStat(stat) {
  const latest = stat.history?.[0];
  return latest ? fmtVal(latest.value, stat.unit) : '—';
}

const STAT_GRADIENTS = {
  '#1A6B8A': 'linear-gradient(135deg,#1A6B8A,#2A9D8F)',
  '#2A9D8F': 'linear-gradient(135deg,#2A9D8F,#5B9DC7)',
  '#E76F51': 'linear-gradient(135deg,#E76F51,#F4A261)',
  '#F4A261': 'linear-gradient(135deg,#F4A261,#E9C46A)',
  '#B85C8E': 'linear-gradient(135deg,#B85C8E,#5B9DC7)'
};

function renderStatSlide({ icon, label, sublabel, color, rows, valueFormatter }) {
  const max = Math.max(...rows.map(r => Math.abs(r.value || 0))) || 1;
  const gradient = STAT_GRADIENTS[color] || `linear-gradient(135deg,${color},${color})`;
  return `
    <div style="min-width:260px;width:260px;scroll-snap-align:start;background:${gradient};border-radius:14px;padding:16px 18px;color:#fff;flex-shrink:0;box-shadow:0 6px 18px ${color}33;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="font-size:1.8rem;line-height:1;">${icon}</div>
        <div>
          <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:1.3px;opacity:0.9;font-weight:700;">${sublabel || 'מדד כלכלי'}</div>
          <div style="font-weight:800;font-size:1rem;line-height:1.2;">${label}</div>
        </div>
      </div>
      ${rows.length ? rows.map(r => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:42px;font-size:0.72rem;font-weight:700;opacity:0.95;">${r.year}</div>
          <div style="flex:1;background:rgba(255,255,255,0.18);border-radius:4px;height:14px;overflow:hidden;">
            <div style="float:right;height:100%;width:${Math.min(100, Math.abs(r.value||0)/max*100).toFixed(0)}%;background:#fff;border-radius:4px;"></div>
          </div>
          <div style="width:72px;text-align:left;font-weight:800;font-size:0.78rem;direction:ltr;">${valueFormatter(r.value)}</div>
        </div>
      `).join('') : '<div style="opacity:0.85;font-size:0.78rem;text-align:center;padding:14px;">אין נתונים</div>'}
    </div>
  `;
}

function renderStatsCarousel(stats) {
  const israeliRows = Object.entries(ISRAELI_TO_UAE).reverse().slice(0,4).map(([y,v]) => ({ year:y, value:v }));
  const israeliSlide = renderStatSlide({
    icon: '🇮🇱',
    label: 'ישראלים בדובאי',
    sublabel: 'תיירות ישראלית',
    color: '#B85C8E',
    rows: israeliRows,
    valueFormatter: v => (v/1000).toFixed(0) + 'K'
  });
  const uaeSlides = stats.map(s => renderStatSlide({
    icon: s.icon,
    label: s.label,
    sublabel: 'איחוד האמירויות',
    color: s.color,
    rows: s.history,
    valueFormatter: v => fmtVal(v, s.unit)
  })).join('');
  return `
    <div class="no-scrollbar" style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;">
      ${israeliSlide}
      ${uaeSlides}
    </div>
  `;
}

function renderREInvestments() {
  return `
    <div style="background:linear-gradient(135deg,#E76F51,#F4A261);border-radius:14px;padding:16px 18px;color:#fff;margin-bottom:18px;box-shadow:0 6px 18px rgba(231,111,81,0.25);">
      <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:1.3px;opacity:0.9;font-weight:700;margin-bottom:4px;">למה דובאי?</div>
      <div style="font-weight:800;font-size:1rem;margin-bottom:6px;">היעד החם בעולם להשקעות נדל"ן 🔥</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;font-size:0.75rem;font-weight:600;opacity:0.95;line-height:1.5;">
        <div>✓ 0% מס הכנסה אישי</div>
        <div>✓ 4% מס רכישה חד-פעמי</div>
        <div>✓ תשואות 6-12%</div>
        <div>✓ ויזת משקיע מ-AED 750K</div>
      </div>
    </div>
    ${reSectionTitle('🗺️', 'אזורים מובילים — מפה חיה', '#E76F51')}
    <div style="border-radius:14px;overflow:hidden;border:1px solid #E5E7EB;margin-bottom:18px;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
      ${renderLiveInvestmentMap()}
    </div>
    ${reSectionTitle('🏙️', 'אזורי השקעה — לחץ על סמן במפה לפרטים', '#F4A261')}
    <div style="display:none;">
    ${RE_INVESTMENTS.map((i, idx) => `
      <div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px 16px;margin-bottom:11px;box-shadow:0 2px 10px rgba(0,0,0,0.04);position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;right:0;bottom:0;width:5px;background:linear-gradient(180deg,#E76F51,#F4A261);"></div>
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:linear-gradient(135deg,#E76F51,#F4A261);color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;box-shadow:0 2px 6px rgba(231,111,81,0.35);">${idx+1}</span>
            <div style="font-weight:800;color:#2C5F6E;font-size:0.97rem;line-height:1.2;">${i.area}</div>
          </div>
          <div style="background:#F5E6CB;color:#E76F51;padding:4px 10px;border-radius:10px;font-size:0.7rem;font-weight:800;border:1px solid #F4A26133;flex-shrink:0;">⚡ ${i.yield}</div>
        </div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px;">
          <div style="font-size:0.7rem;color:#6B7F8D;font-weight:600;">כניסה מ:</div>
          <div style="font-size:1rem;font-weight:800;color:#1A6B8A;">${i.entry}</div>
        </div>
        <div style="font-size:0.83rem;color:#6B7F8D;line-height:1.6;">${i.highlight}</div>
      </div>
    `).join('')}
    </div>
  `;
}

function renderREProjects() {
  return `
    <div style="font-weight:700;color:#2C5F6E;font-size:0.95rem;margin-bottom:10px;">פרויקטים חדשים בולטים</div>
    ${RE_PROJECTS.map(p => `
      <div style="background:#fff;border:1px solid #E5E7EB;border-right:4px solid #F4A261;border-radius:8px;padding:12px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;gap:8px;">
          <div style="font-weight:800;color:#2C5F6E;font-size:0.95rem;flex:1;">${p.name}</div>
          <span style="background:#F4A261;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.65rem;font-weight:700;flex-shrink:0;">${p.tag}</span>
        </div>
        <div style="font-size:0.78rem;color:#6B7F8D;margin-bottom:4px;">🏢 ${p.dev} · 📍 ${p.area}</div>
        <div style="font-size:0.78rem;color:#6B7F8D;margin-bottom:6px;">📅 מסירה ${p.delivery}</div>
        <div style="color:#E76F51;font-weight:800;font-size:1rem;">החל מ-${p.from}</div>
      </div>
    `).join('')}
  `;
}

function renderREListings(filterType) {
  const all = getREListings();
  const listings = filterType ? all.filter(l => l.type === filterType) : all;
  const typeLabel = filterType === 'sale' ? 'למכירה' : filterType === 'rent' ? 'להשכרה' : '';
  return `
    <div style="margin-bottom:14px;">
      <a onclick="toggleREForm()" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#1A6B8A;color:#fff;padding:11px 14px;border-radius:8px;font-weight:700;font-size:0.9rem;">
        <span>📤 פרסם מודעה חדשה ${typeLabel ? '— ' + typeLabel : ''}</span>
        <i id="reFormArrow" class="fas fa-chevron-down" style="transition:transform 0.3s;"></i>
      </a>
      <div id="reFormBox" style="display:none;background:#F5E6CB;border-radius:0 0 10px 10px;padding:14px;margin-top:-2px;">
        <input id="reTitle" placeholder="כותרת (לדוגמה: 2 חדרים Marina, נוף לים)" style="width:100%;padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;margin-bottom:8px;box-sizing:border-box;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <select id="reType" style="padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;background:#fff;">
            <option value="sale" ${filterType === 'sale' ? 'selected' : ''}>למכירה</option>
            <option value="rent" ${filterType === 'rent' ? 'selected' : ''}>להשכרה</option>
          </select>
          <input id="rePrice" placeholder="מחיר (AED)" style="padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;box-sizing:border-box;">
        </div>
        <input id="reArea" placeholder="אזור (Marina, Downtown, Palm...)" style="width:100%;padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;margin-bottom:8px;box-sizing:border-box;">
        <textarea id="reDesc" placeholder="תיאור הנכס" rows="3" style="width:100%;padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;margin-bottom:8px;box-sizing:border-box;resize:vertical;"></textarea>
        <input id="rePhone" placeholder="טלפון ליצירת קשר" style="width:100%;padding:9px;border:1px solid #E5E7EB;border-radius:6px;font-family:Heebo;font-size:0.85rem;margin-bottom:8px;box-sizing:border-box;">
        <label style="display:block;font-size:0.78rem;color:#2C5F6E;font-weight:600;margin-bottom:4px;">תמונות (עד 8)</label>
        <input id="rePhotos" type="file" accept="image/*" multiple onchange="previewREPhotos(this)" style="width:100%;font-family:Heebo;font-size:0.78rem;margin-bottom:8px;">
        <div id="rePhotosPreview" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>

        <label style="display:block;font-size:0.78rem;color:#2C5F6E;font-weight:600;margin-bottom:4px;">סרטון (עד 3 דקות, אופציונלי)</label>
        <input id="reVideo" type="file" accept="video/*" onchange="previewREVideo(this)" style="width:100%;font-family:Heebo;font-size:0.78rem;margin-bottom:8px;">
        <div id="reVideoPreview" style="margin-bottom:10px;"></div>

        <label style="display:block;font-size:0.78rem;color:#2C5F6E;font-weight:600;margin-bottom:4px;">גודל מודעה (חינם)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:6px;padding:8px;border:2px solid #E5E7EB;border-radius:6px;cursor:pointer;font-size:0.78rem;background:#fff;">
            <input type="radio" name="reSize" value="small" checked> 📏 קטנה (150px)
          </label>
          <label style="display:flex;align-items:center;gap:6px;padding:8px;border:2px solid #E5E7EB;border-radius:6px;cursor:pointer;font-size:0.78rem;background:#fff;">
            <input type="radio" name="reSize" value="large"> 📐 גדולה (300px)
          </label>
        </div>

        <label style="display:block;font-size:0.78rem;color:#2C5F6E;font-weight:600;margin-bottom:4px;">סגנון הדגשה (חינם)</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px;">
          <label style="display:flex;align-items:center;justify-content:center;padding:8px;border:2px solid #E5E7EB;border-radius:6px;cursor:pointer;font-size:0.75rem;background:#fff;">
            <input type="radio" name="reHighlight" value="none" checked style="margin-left:4px;"> רגיל
          </label>
          <label style="display:flex;align-items:center;justify-content:center;padding:8px;border:2px solid #F4A261;border-radius:6px;cursor:pointer;font-size:0.75rem;background:#FFF8E7;">
            <input type="radio" name="reHighlight" value="emphasized" style="margin-left:4px;"> מודגש
          </label>
          <label style="display:flex;align-items:center;justify-content:center;padding:8px;border:2px solid #1E3A8A;border-radius:6px;cursor:pointer;font-size:0.75rem;background:#0A1F3D;color:#fff;">
            <input type="radio" name="reHighlight" value="negative" style="margin-left:4px;"> נגטיב
          </label>
        </div>

        <button onclick="submitREListing(this)" style="width:100%;background:#1A6B8A;color:#fff;border:none;padding:11px;border-radius:6px;font-family:Heebo;font-weight:700;font-size:0.9rem;cursor:pointer;">📤 פרסם מודעה</button>
      </div>
    </div>
    ${listings.length ? renderListingsGrid(listings, typeLabel) : '<div style="text-align:center;color:#6B7F8D;padding:24px;font-size:0.85rem;">אין מודעות עדיין — תהיה הראשון לפרסם!</div>'}
  `;
}

function renderListingsGrid(listings, typeLabel) {
  return `
    <div style="font-weight:700;color:#2C5F6E;font-size:0.95rem;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
      <span style="background:#E76F51;color:#fff;border-radius:4px;padding:2px 8px;font-size:0.7rem;font-weight:800;">${listings.length}</span>
      מודעות ${typeLabel} פעילות
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${listings.map((l, i) => listingFullCard(l, i === 0)).join('')}
    </div>
  `;
}

function listingFullCard(l, isFeatured) {
  const photo = (l.photos && l.photos[0]) || '';
  const typeColor = l.type === 'sale' ? '#E76F51' : '#2A9D8F';
  const imgHeight = l.size === 'large' ? 300 : 150;
  const highlight = l.highlight || 'none';
  const cardBg = highlight === 'negative' ? '#0A1F3D' : highlight === 'emphasized' ? '#FFF8E7' : '#fff';
  const cardBorder = highlight === 'negative' ? '2px solid #1E3A8A' : highlight === 'emphasized' ? '3px solid #F4A261' : '1px solid #E5E7EB';
  const titleColor = highlight === 'negative' ? '#fff' : '#2C5F6E';
  const descColor = highlight === 'negative' ? '#cbd5e1' : '#2C5F6E';
  return `
    <div onclick="openListingModal('${l.id}')" style="background:${cardBg};border-radius:16px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.08);cursor:pointer;border:${cardBorder};position:relative;">
      ${isFeatured ? `<div style="position:absolute;top:12px;right:12px;background:linear-gradient(135deg,#E9C46A,#F4A261);color:#fff;font-size:0.65rem;font-weight:900;padding:4px 10px;border-radius:10px;z-index:2;letter-spacing:0.4px;box-shadow:0 4px 10px rgba(244,162,97,0.4);">⭐ מומלץ</div>` : ''}
      <div style="position:relative;width:100%;height:${imgHeight}px;background:#F5F5F5;overflow:hidden;">
        ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#E5E7EB,#F5F5F5);display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:2.5rem;">🏙️</div>`}
        <div style="position:absolute;bottom:0;right:0;left:0;background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,0.7) 100%);padding:30px 14px 14px;">
          <div style="display:flex;justify-content:space-between;align-items:end;gap:8px;">
            <div style="flex:1;">
              <div style="color:#fff;font-weight:800;font-size:1.05rem;line-height:1.25;text-shadow:0 1px 4px rgba(0,0,0,0.6);">${l.title}</div>
              <div style="color:#F4A261;font-size:0.75rem;font-weight:700;margin-top:3px;">📍 ${l.area}</div>
            </div>
            <div style="background:#fff;color:${typeColor};padding:6px 12px;border-radius:10px;font-weight:900;font-size:0.95rem;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.25);">AED ${Number(l.price).toLocaleString()}</div>
          </div>
        </div>
        ${l.photos && l.photos.length > 1 ? `<div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.65);color:#fff;font-size:0.68rem;font-weight:700;padding:4px 9px;border-radius:10px;">📷 ${l.photos.length}</div>` : ''}
        <span style="position:absolute;top:12px;${isFeatured ? 'left:65px;' : 'left:12px;'}background:${typeColor};color:#fff;font-size:0.65rem;padding:3px 9px;border-radius:10px;font-weight:800;">${l.type === 'sale' ? 'למכירה' : 'להשכרה'}</span>
      </div>
      <div style="padding:12px 14px;">
        ${l.desc ? `<div style="font-size:0.83rem;color:${descColor};line-height:1.55;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${l.desc}</div>` : ''}
        <div style="display:flex;gap:6px;">
          <a onclick="event.stopPropagation()" href="tel:${l.phone}" style="flex:1;padding:9px;background:#2A9D8F;color:#fff;border-radius:8px;text-align:center;text-decoration:none;font-size:0.78rem;font-weight:800;"><i class="fas fa-phone"></i> חייג</a>
          <a onclick="event.stopPropagation()" href="https://wa.me/${l.phone.replace(/\D/g,'')}" target="_blank" style="flex:1;padding:9px;background:#25D366;color:#fff;border-radius:8px;text-align:center;text-decoration:none;font-size:0.78rem;font-weight:800;"><i class="fab fa-whatsapp"></i> וואטסאפ</a>
          <button onclick="event.stopPropagation();openListingModal('${l.id}')" style="flex:0;padding:9px 14px;background:#1A6B8A;color:#fff;border:none;border-radius:8px;font-size:0.78rem;font-weight:800;font-family:Heebo;cursor:pointer;">פרטים ›</button>
        </div>
      </div>
    </div>
  `;
}

function listingHalfCard(l) {
  const photo = (l.photos && l.photos[0]) || '';
  const typeColor = l.type === 'sale' ? '#E76F51' : '#2A9D8F';
  return `
    <div onclick="openListingModal('${l.id}')" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,0.06);cursor:pointer;border:1px solid #E5E7EB;display:flex;flex-direction:column;">
      <div style="position:relative;width:100%;aspect-ratio:4/3;background:#F5F5F5;overflow:hidden;">
        ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#E5E7EB,#F5F5F5);display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:1.6rem;">🏙️</div>`}
        ${l.photos && l.photos.length > 1 ? `<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.65);color:#fff;font-size:0.6rem;font-weight:700;padding:2px 6px;border-radius:8px;">📷 ${l.photos.length}</div>` : ''}
        <span style="position:absolute;top:6px;right:6px;background:${typeColor};color:#fff;font-size:0.58rem;padding:2px 7px;border-radius:8px;font-weight:800;">${l.type === 'sale' ? 'מכירה' : 'השכרה'}</span>
      </div>
      <div style="padding:10px 11px 12px;flex:1;display:flex;flex-direction:column;">
        <div style="font-weight:800;color:#2C5F6E;font-size:0.82rem;line-height:1.3;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.1em;">${l.title}</div>
        <div style="color:${typeColor};font-weight:900;font-size:0.95rem;margin-bottom:3px;">AED ${Number(l.price).toLocaleString()}</div>
        <div style="font-size:0.7rem;color:#6B7F8D;margin-bottom:8px;">📍 ${l.area}</div>
        <div style="margin-top:auto;display:flex;gap:4px;">
          <a onclick="event.stopPropagation()" href="https://wa.me/${l.phone.replace(/\D/g,'')}" target="_blank" style="flex:1;padding:6px;background:#25D366;color:#fff;border-radius:6px;text-align:center;text-decoration:none;font-size:0.7rem;font-weight:800;"><i class="fab fa-whatsapp"></i></a>
          <a onclick="event.stopPropagation()" href="tel:${l.phone}" style="flex:1;padding:6px;background:#2A9D8F;color:#fff;border-radius:6px;text-align:center;text-decoration:none;font-size:0.7rem;font-weight:800;"><i class="fas fa-phone"></i></a>
          <button onclick="event.stopPropagation();openListingModal('${l.id}')" style="flex:1;padding:6px;background:#1A6B8A;color:#fff;border:none;border-radius:6px;font-size:0.7rem;font-weight:800;font-family:Heebo;cursor:pointer;">פרטים</button>
        </div>
      </div>
    </div>
  `;
}

window._listingModal = { id: null, photoIdx: 0 };
function openListingModal(id) {
  const list = getREListings();
  const l = list.find(x => x.id === id);
  if (!l) return;
  window._listingModal = { id, photoIdx: 0, listing: l };
  renderListingModal();
}
function closeListingModal() {
  const m = document.getElementById('detailModal');
  if (m) m.classList.remove('active');
  window._listingModal = { id: null, photoIdx: 0 };
}
function listingPhotoNext() {
  const m = window._listingModal;
  if (!m.listing) return;
  const total = (m.listing.photos || []).length;
  if (total < 2) return;
  m.photoIdx = (m.photoIdx + 1) % total;
  renderListingModal();
}
function listingPhotoPrev() {
  const m = window._listingModal;
  if (!m.listing) return;
  const total = (m.listing.photos || []).length;
  if (total < 2) return;
  m.photoIdx = (m.photoIdx - 1 + total) % total;
  renderListingModal();
}
function renderListingModal() {
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  const { listing: l, photoIdx } = window._listingModal;
  if (!l) return;
  const photos = l.photos || [];
  const photo = photos[photoIdx] || '';
  const typeColor = l.type === 'sale' ? '#E76F51' : '#2A9D8F';
  modal.innerHTML = `
    <div style="background:#fff;width:96%;max-width:500px;max-height:92vh;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
      <div style="position:relative;width:100%;aspect-ratio:16/10;background:#000;">
        ${photo ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;display:block;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:3rem;">🏙️</div>`}
        ${photos.length > 1 ? `
          <button onclick="listingPhotoPrev()" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:1.4rem;cursor:pointer;">›</button>
          <button onclick="listingPhotoNext()" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:1.4rem;cursor:pointer;">‹</button>
          <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:center;gap:5px;">
            ${photos.map((_, i) => `<span style="width:7px;height:7px;border-radius:50%;background:${i === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)'};"></span>`).join('')}
          </div>
          <div style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.6);color:#fff;font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:10px;">📷 ${photoIdx+1}/${photos.length}</div>
        ` : ''}
        <button onclick="closeListingModal()" style="position:absolute;top:10px;right:10px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.7);color:#fff;border:none;font-size:1.1rem;cursor:pointer;font-weight:800;">✕</button>
        <span style="position:absolute;bottom:10px;right:10px;background:${typeColor};color:#fff;font-size:0.7rem;padding:4px 11px;border-radius:10px;font-weight:800;">${l.type === 'sale' ? 'למכירה' : 'להשכרה'}</span>
      </div>
      <div style="padding:18px 20px;overflow-y:auto;flex:1;">
        <div style="font-weight:900;color:#2C5F6E;font-size:1.15rem;line-height:1.3;margin-bottom:6px;">${l.title}</div>
        <div style="color:${typeColor};font-weight:900;font-size:1.6rem;margin-bottom:8px;">AED ${Number(l.price).toLocaleString()}</div>
        <div style="font-size:0.85rem;color:#6B7F8D;margin-bottom:14px;">📍 ${l.area}</div>
        ${l.desc ? `<div style="background:#F5E6CB;border-right:4px solid #1A6B8A;padding:12px 14px;border-radius:8px;font-size:0.88rem;color:#2C5F6E;line-height:1.7;margin-bottom:16px;">${l.desc}</div>` : ''}
        <div style="display:flex;gap:8px;">
          <a href="tel:${l.phone}" style="flex:1;padding:12px;background:#2A9D8F;color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-weight:800;font-size:0.9rem;"><i class="fas fa-phone"></i> ${l.phone}</a>
          <a href="https://wa.me/${l.phone.replace(/\D/g,'')}" target="_blank" style="flex:1;padding:12px;background:#25D366;color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-weight:800;font-size:0.9rem;"><i class="fab fa-whatsapp"></i> וואטסאפ</a>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.onclick = (e) => { if (e.target === modal) closeListingModal(); };
}

function toggleREForm() {
  const box = document.getElementById('reFormBox');
  const arrow = document.getElementById('reFormArrow');
  if (!box) return;
  const open = box.style.display !== 'none';
  box.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? 'rotate(0)' : 'rotate(180deg)';
}

window._rePhotos = [];
window._reVideo = null;

function previewREVideo(input) {
  const file = input.files && input.files[0];
  const box = document.getElementById('reVideoPreview');
  if (!file) { window._reVideo = null; box.innerHTML = ''; return; }
  if (file.size > 80 * 1024 * 1024) {
    alert('הסרטון גדול מ-80MB. נסה דחיסה.');
    input.value = ''; window._reVideo = null; box.innerHTML = ''; return;
  }
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.onloadedmetadata = () => {
    if (v.duration > 181) {
      alert('הסרטון מוגבל ל-3 דקות');
      input.value = ''; window._reVideo = null; box.innerHTML = ''; return;
    }
    window._reVideo = file;
    box.innerHTML = `<div style="font-size:0.78rem;color:#2A9D8F;font-weight:600;">🎥 ${file.name} · ${Math.round(v.duration)} שניות · ${(file.size/1024/1024).toFixed(1)}MB</div>`;
  };
  v.onerror = () => { alert('שגיאה בטעינת סרטון'); input.value = ''; };
  v.src = URL.createObjectURL(file);
}

function compressImageFile(file, maxSize = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('blob fail'));
          resolve({ blob, preview: canvas.toDataURL('image/jpeg', 0.5) });
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function previewREPhotos(input) {
  const files = Array.from(input.files || []).slice(0, 8);
  window._rePhotos = [];
  const previewBox = document.getElementById('rePhotosPreview');
  previewBox.innerHTML = `<div style="color:#6B7F8D;font-size:0.78rem;">⏳ מעבד תמונות…</div>`;
  const out = [];
  for (const f of files) {
    try { out.push(await compressImageFile(f)); }
    catch (e) { console.error('photo compress failed', e); }
  }
  window._rePhotos = out;
  previewBox.innerHTML = out.map(d => `<img src="${d.preview}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #E5E7EB;">`).join('');
}

async function submitREListing(btn) {
  const title = document.getElementById('reTitle').value.trim();
  const type = document.getElementById('reType').value;
  const price = document.getElementById('rePrice').value.trim();
  const area = document.getElementById('reArea').value.trim();
  const desc = document.getElementById('reDesc').value.trim();
  const phone = document.getElementById('rePhone').value.trim();
  if (!title || !price || !area || !phone) { alert('נא למלא: כותרת, מחיר, אזור וטלפון'); return; }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ שולח...'; }
  try {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('type', type);
    fd.append('price', price);
    fd.append('area', area);
    fd.append('desc', desc);
    fd.append('phone', phone);
    const sizeRadio = document.querySelector('input[name="reSize"]:checked');
    const highlightRadio = document.querySelector('input[name="reHighlight"]:checked');
    fd.append('size', sizeRadio ? sizeRadio.value : 'small');
    fd.append('highlight', highlightRadio ? highlightRadio.value : 'none');
    (window._rePhotos || []).slice(0, 8).forEach((p, i) => {
      fd.append('photos', p.blob, `photo_${i}.jpg`);
    });
    if (window._reVideo) {
      fd.append('video', window._reVideo, window._reVideo.name);
    }
    const r = await fetch(`${RE_API}/api/listings`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error('upload failed');
    window._rePhotos = [];
    alert('✓ המודעה נשלחה לאישור — תופיע באתר לאחר אישור המנהל');
    document.getElementById('reTitle').value = '';
    document.getElementById('rePrice').value = '';
    document.getElementById('reArea').value = '';
    document.getElementById('reDesc').value = '';
    document.getElementById('rePhone').value = '';
    document.getElementById('rePhotosPreview').innerHTML = '';
    toggleREForm();
  } catch (e) {
    alert('שגיאה בשליחה — נסה שוב');
    if (btn) { btn.disabled = false; btn.textContent = '📤 פרסם מודעה'; }
  }
}

function renderREBrokers() {
  const accents = ['#1A6B8A','#2A9D8F','#E76F51','#B85C8E','#F4A261','#5B9DC7'];
  return RE_BROKERS_DEFAULT.map((b, i) => {
    const c = accents[i % accents.length];
    return `
    <div style="background:#fff;border:1.5px solid ${c}30;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
      ${b.verified ? `<div style="position:absolute;top:8px;left:8px;background:${c};color:#fff;font-size:0.6rem;font-weight:800;padding:3px 9px;border-radius:10px;letter-spacing:0.5px;">✓ מאומת</div>` : ''}
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        ${b.image ? `<img src="${b.image}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid ${c};flex-shrink:0;" onerror="this.style.display='none'">` : `<div style="width:64px;height:64px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;flex-shrink:0;">${b.name.split(' ')[0][0]}</div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;color:#2C5F6E;font-size:1rem;">${b.name}</div>
          <div style="font-size:0.78rem;color:${c};font-weight:700;">${b.company}</div>
          ${b.years ? `<div style="font-size:0.7rem;color:#6B7F8D;margin-top:2px;">⏱ ${b.years} ניסיון בדובאי</div>` : ''}
        </div>
      </div>
      <div style="background:#F5E6CB;padding:8px 10px;border-radius:8px;margin-bottom:8px;">
        <div style="font-size:0.75rem;color:#2C5F6E;margin-bottom:3px;"><strong>התמחות:</strong> ${b.specialty}</div>
        <div style="font-size:0.72rem;color:#6B7F8D;">🗣️ ${b.langs.join(' · ')}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <a href="tel:${b.phone}" style="flex:1;padding:9px;background:#2A9D8F;color:#fff;border-radius:8px;text-align:center;text-decoration:none;font-size:0.78rem;font-weight:700;"><i class="fas fa-phone"></i> חייג</a>
        <a href="https://wa.me/${b.whatsapp}" target="_blank" style="flex:1;padding:9px;background:#25D366;color:#fff;border-radius:8px;text-align:center;text-decoration:none;font-size:0.78rem;font-weight:700;"><i class="fab fa-whatsapp"></i> וואטסאפ</a>
        <a href="mailto:${b.email}" style="flex:1;padding:9px;background:#1A6B8A;color:#fff;border-radius:8px;text-align:center;text-decoration:none;font-size:0.78rem;font-weight:700;"><i class="fas fa-envelope"></i> אימייל</a>
      </div>
    </div>
  `;}).join('');
}

function applyRealEstateVisibility() {
  const hidden = localStorage.getItem('realestate_hidden') === '1';
  const el = document.getElementById('realestateBlockHome');
  if (el) el.style.display = hidden ? 'none' : '';
}

function renderHomeGalleryPreview() {
  const el = document.getElementById('homeGalleryPreview');
  if (!el) return;
  const imgs = (window.GALLERY_IMAGES || []).slice(0, 12);
  el.innerHTML = imgs.map((name, i) => `
    <div onclick="openGalleryAt(${i})" style="min-width:130px;width:130px;height:130px;scroll-snap-align:start;border-radius:8px;overflow:hidden;cursor:pointer;background:#F5F5F5;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,0.06);">
      <img src="${galleryImgUrl(name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
    </div>
  `).join('');
}

async function renderGalleryPage() {
  const page = document.getElementById('page-gallery');
  if (!page) return;
  if (!window.GALLERY_IMAGES) {
    page.innerHTML = '<div style="padding:40px;text-align:center;color:#6B7F8D;"><i class="fas fa-spinner fa-spin"></i> טוען תמונות...</div>';
    try { const r = await fetch('data/gallery.json?v=3&t=' + Date.now()); if (r.ok) window.GALLERY_IMAGES = await r.json(); } catch {}
  }
  const images = window.GALLERY_IMAGES || [];
  const cur = window._galleryPageIdx || 0;
  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-images" style="color:#E76F51;margin-left:6px;"></i> הגלרייה שלנו</h2>
    </div>
    <div style="padding:12px 14px 80px;">
      <div style="background:#000;border-radius:10px;overflow:hidden;position:relative;aspect-ratio:4/3;margin-bottom:18px;">
        <img id="galleryPageImg" src="${images[cur] ? galleryImgUrl(images[cur]) : ''}" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.style.display='none'">
        ${images.length > 1 ? `
          <button onclick="navGalleryPage(-1)" style="position:absolute;top:50%;right:10px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-chevron-right"></i></button>
          <button onclick="navGalleryPage(1)" style="position:absolute;top:50%;left:10px;transform:translateY(-50%);background:rgba(0,0,0,0.55);color:#fff;border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;"><i class="fas fa-chevron-left"></i></button>
          <div style="position:absolute;bottom:10px;left:0;right:0;text-align:center;color:#fff;font-size:0.78rem;text-shadow:0 1px 3px rgba(0,0,0,0.6);"><span id="galleryPageCount">${cur + 1} / ${images.length}</span></div>
        ` : ''}
      </div>
      <div style="font-weight:700;color:#2C5F6E;font-size:0.95rem;margin-bottom:8px;">כל התמונות (${images.length})</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${images.map((name, i) => `
          <div onclick="openGalleryAt(${i})" style="aspect-ratio:1/1;border-radius:8px;overflow:hidden;cursor:pointer;background:#F5F5F5;border:${i === cur ? '2px solid #E76F51' : '1px solid #E5E7EB'};">
            <img src="${galleryImgUrl(name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function navGalleryPage(dir) {
  const images = window.GALLERY_IMAGES || [];
  if (!images.length) return;
  let idx = (window._galleryPageIdx || 0) + dir;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  window._galleryPageIdx = idx;
  const img = document.getElementById('galleryPageImg');
  const count = document.getElementById('galleryPageCount');
  if (img) img.src = galleryImgUrl(images[idx]);
  if (count) count.textContent = `${idx + 1} / ${images.length}`;
}

function openGalleryImage(idx) {
  const modal = document.getElementById('detailModal');
  if (!modal) return;
  const images = window.GALLERY_IMAGES || [];
  if (typeof idx === 'string') idx = images.indexOf(idx);
  if (idx < 0 || idx >= images.length) return;
  const name = images[idx];
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1;padding:0;">
      <button onclick="document.getElementById('detailModal').classList.remove('active')" style="position:absolute;top:14px;left:14px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;font-size:1.2rem;font-weight:700;z-index:2;">✕</button>
      <img id="galleryViewerImg" src="${galleryImgUrl(name)}" style="max-width:100%;max-height:88vh;object-fit:contain;display:block;">
      <div style="color:#fff;text-align:center;margin-top:14px;font-size:0.78rem;opacity:0.7;">${idx + 1} / ${images.length}</div>
      ${images.length > 1 ? `
        <button onclick="navGallery(-1)" style="position:absolute;top:50%;right:14px;transform:translateY(-50%);background:rgba(255,255,255,0.18);border:none;color:#fff;width:48px;height:48px;border-radius:50%;cursor:pointer;font-size:1.1rem;"><i class="fas fa-chevron-right"></i></button>
        <button onclick="navGallery(1)" style="position:absolute;top:50%;left:14px;transform:translateY(-50%);background:rgba(255,255,255,0.18);border:none;color:#fff;width:48px;height:48px;border-radius:50%;cursor:pointer;font-size:1.1rem;"><i class="fas fa-chevron-left"></i></button>
      ` : ''}
    </div>
  `;
  modal.classList.add('active');
  modal.style.alignItems = 'stretch';
  modal.style.justifyContent = 'stretch';
  window._galleryIdx = idx;
}

function navGallery(dir) {
  const images = window.GALLERY_IMAGES || [];
  if (!images.length) return;
  let idx = (window._galleryIdx || 0) + dir;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  openGalleryImage(idx);
}

async function ensureHotelPhotos() {
  if (window.HOTEL_PHOTOS) return window.HOTEL_PHOTOS;
  try {
    const r = await fetch('data/hotel-photos.json?v=6');
    if (r.ok) window.HOTEL_PHOTOS = await r.json();
  } catch(e) {}
  return window.HOTEL_PHOTOS;
}

function openDetail(category, id) {
  if (category === 'hotels' && !window.HOTEL_PHOTOS) {
    ensureHotelPhotos().then(() => openDetail(category, id));
    return;
  }
  if (category === 'shopping') {
    const item = (getDB().shopping || []).find(i => i.id === id);
    if (item && item.subcategory === 'mall') {
      navigateTo('mall', String(id));
      return;
    }
  }
  const item = getItem(category, id);
  if (!item) return;

  const modal = document.getElementById('detailModal');
  modal.innerHTML = `
    <div class="modal-sheet">
      ${(() => {
        const photos = getCategoryPhotosMap()[category];
        return photos && photos[item.id]?.photos?.length ? renderHotelPhotoSlider(item, photos[item.id]) : null;
      })() || `<div style="position:relative;">
        <img class="modal-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
        <button class="modal-close" onclick="closeDetail()"><i class="fas fa-times"></i></button>
        <button onclick="addToMyTrip('${category}', ${item.id})" title="הוסף לטיול שלי" class="add-trip-btn" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.95);color:#2C5F6E;border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.6rem;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 3px 10px rgba(0,0,0,0.4);z-index:3;">+</button>
      </div>`}
      <div class="modal-body">
        <div class="modal-title">${item.name}</div>
        <div class="modal-subtitle"><i class="fas fa-map-marker-alt"></i> ${item.address || ''}</div>
        <div style="margin-bottom:12px;">${ratingHTML(item)}</div>
        <div class="modal-stats">
          ${item.priceRange && category !== 'transport' ? `<div class="modal-stat"><span class="stat-value">${item.price}</span><span class="stat-label">${item.priceRange}</span></div>` : ''}
          ${item.phone ? `<div class="modal-stat"><span class="stat-value"><i class="fas fa-phone"></i></span><span class="stat-label">${item.phone}</span></div>` : ''}
        </div>
        ${item.hours && item.hours.length ? `
          <details style="margin-bottom:12px;font-size:0.8rem;">
            <summary style="color:#2A9D8F;cursor:pointer;font-weight:600;"><i class="fas fa-clock"></i> שעות פתיחה</summary>
            <div style="padding:8px 0;color:#6B7F8D;line-height:1.8;">${item.hours.join('<br>')}</div>
          </details>
        ` : ''}
        ${item.tags ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">${item.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>` : ''}
        <div class="modal-desc">${item.description}${category === 'hotels' ? ` <a href="${item.website || 'https://www.google.com/search?q=' + encodeURIComponent((item.nameEn || item.name) + ' Dubai official site')}" target="_blank" style="color:#2A9D8F;font-weight:600;text-decoration:underline;font-size:0.85rem;white-space:nowrap;"><i class="fas fa-globe" style="font-size:0.75rem;"></i> אתר רשמי</a>` : ''}</div>
        ${item.googlePhotos && item.googlePhotos.length ? `
          <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;">
            ${item.googlePhotos.map(url => `<img src="${url}" style="height:80px;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">`).join('')}
          </div>
        ` : ''}
        ${reviewsHTML(item)}
        ${item.lat ? `<div class="map-container" style="margin:0 0 12px;height:220px;"><div id="detailMap" style="width:100%;height:100%;"></div></div>${nearMeToggleHTML()}` : ''}
        <div class="modal-actions" style="flex-wrap:wrap;">
          ${category === 'hotels' ? `<a href="https://search.hotellook.com/hotels?destination=${encodeURIComponent((item.nameEn || item.name) + ' Dubai')}&adults=2&marker=X5SEJjUA" target="_blank" class="modal-btn primary" style="background:#2A9D8F;"><i class="fas fa-bed"></i> הזמן מלון</a>` : ''}
          ${item.lat ? `<button class="modal-btn primary" onclick="openNavigation(${item.lat},${item.lng})"><i class="fas fa-directions"></i> נווט</button>` : ''}
          ${item.googleUrl ? `<a href="${item.googleUrl}" target="_blank" class="modal-btn secondary"><i class="fab fa-google"></i> Google Maps</a>` : ''}
          ${category !== 'hotels' ? (category === 'attractions'
            ? `<a onclick="openInFrame('https://www.google.com/search?igu=1&q=${encodeURIComponent((item.nameEn || item.name) + ' Dubai tickets opening hours')}','${(item.name || '').replace(/'/g,"\\'")} - מחירים ושעות')" class="modal-btn secondary" style="cursor:pointer;background:#2A9D8F;color:#fff;border:none;"><i class="fas fa-ticket-alt"></i> מחירים ושעות</a>`
            : `<a href="${item.website || 'https://www.google.com/search?q=' + encodeURIComponent((item.nameEn || item.name) + ' Dubai')}" target="_blank" class="modal-btn secondary"><i class="fas fa-globe"></i> אתר</a>`
          ) : ''}
          ${item.lat ? `<a onclick="event.stopPropagation();openInFrame('https://www.google.com/maps?q=${item.lat},${item.lng}','${(item.name || '').replace(/'/g,"\\'")} - מפה')" class="modal-btn secondary" style="cursor:pointer;background:#C4922F;color:#fff;border:none;"><i class="fas fa-map-marker-alt"></i> איפה זה?</a>` : ''}
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.scrollTop = 0;
  modal.style.alignItems = 'flex-start';
  modal.style.justifyContent = 'center';
  const sheet = modal.querySelector('.modal-sheet');
  if (sheet) sheet.scrollTop = 0;
  modal.scrollTop = 0;
  modal.onclick = (e) => { if (e.target === modal) closeDetail(); };

  if (item.lat) {
    setTimeout(() => {
      const el = document.getElementById('detailMap');
      if (!el) return;
      if (hasGoogle()) {
        const dm = new google.maps.Map(el, {
          center:{lat:item.lat,lng:item.lng}, zoom:16,
          mapTypeControl:false, streetViewControl:true, language:'en'
        });
        new google.maps.Marker({
          position:{lat:item.lat,lng:item.lng}, map:dm, title:item.name,
          animation: google.maps.Animation.DROP,
          icon:{path:google.maps.SymbolPath.CIRCLE, scale:12, fillColor:'#E76F51', fillOpacity:1, strokeColor:'#fff', strokeWeight:3}
        });
      } else {
        const dm = L.map(el).setView([item.lat, item.lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(dm);
        L.marker([item.lat, item.lng]).addTo(dm).bindPopup(item.name).openPopup();
      }
    }, 250);
  }
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('active');
}

function openNavigation(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
}

function shareItem(name, address) {
  if (navigator.share) {
    navigator.share({ title: name, text: `${name} - ${address} | WellCome Dubai` });
  } else {
    navigator.clipboard.writeText(`${name} - ${address}`);
    alert('הקישור הועתק!');
  }
}
