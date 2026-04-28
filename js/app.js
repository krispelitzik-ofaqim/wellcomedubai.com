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

function initApp() {
  renderHome();
  setupNavigation();
  setupSearch();
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

// ===== NAVIGATION =====
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

function navigateTo(page, subcategory) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) { pageEl.classList.add('active'); pageEl.classList.add('fade-in'); }

  // List pages use page-list
  if (['hotels','restaurants','attractions','shopping','nightlife','transport','casino'].includes(page)) {
    document.getElementById('page-list').classList.add('active');
    document.getElementById('page-home')?.classList.remove('active');
  }

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo(0, 0);

  switch(page) {
    case 'home': renderHome(); break;
    case 'hotels': renderListPage('hotels', 'מלונות', ['הכל','7 כוכבים','5 כוכבים','3-4 כוכבים','תקציבי'], subcategory); break;
    case 'restaurants': renderListPage('restaurants', 'מסעדות', ['הכל','אסייתי','מקומי','פירות ים','תקציבי'], subcategory); break;
    case 'attractions': renderListPage('attractions', 'אטרקציות', ['הכל','ציון דרך','מוזיאון','הרפתקה','קניות'], subcategory); break;
    case 'shopping': renderListPage('shopping', 'קניות', ['הכל','קניון','שוק'], subcategory); break;
    case 'nightlife': renderListPage('nightlife', 'בילויים', ['הכל','מועדון','לאונג\'','בידור','מופע'], subcategory); break;
    case 'transport': renderListPage('transport', 'תחבורה', ['הכל','מטרו','מונית','סירה','אפליקציה'], subcategory); break;
    case 'casino': renderListPage('casino', 'קזינו ומשחקים', ['הכל','קזינו','מרוצים'], subcategory); break;
    case 'map': renderMapPage(); break;
    case 'info': renderInfoPage(); break;
  }
}

// ===== SEARCH =====
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
          <span class="card-price">${item.price || ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== HOME PAGE =====
function renderHome() {
  const hotels = sortByRating(getAllItems('hotels')).slice(0, 6);
  const hotelsContainer = document.getElementById('topHotels');
  if (hotelsContainer) hotelsContainer.innerHTML = hotels.map(item => cardHTML(item, 'hotels')).join('');

  const attractions = sortByRating(getAllItems('attractions')).slice(0, 6);
  const attrContainer = document.getElementById('topAttractions');
  if (attrContainer) attrContainer.innerHTML = attractions.map(item => cardHTML(item, 'attractions')).join('');

  const restShop = [...sortByRating(getAllItems('restaurants')).slice(0, 4), ...sortByRating(getAllItems('shopping')).slice(0, 3)];
  const restShopContainer = document.getElementById('topRestShopping');
  if (restShopContainer) restShopContainer.innerHTML = restShop.map(item => cardHTML(item, item.category)).join('');

  // Load live widgets
  loadWeatherWidget();
  loadCurrencyWidget();
  renderFlightBoard('flightBoardWidget');

  // Flights widget
  const flightsEl = document.getElementById('flightsWidget');
  if (flightsEl) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const weekLater = new Date(tomorrow);
    weekLater.setDate(weekLater.getDate() + 7);
    flightsEl.innerHTML = `
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);border-radius:8px;padding:20px;color:#fff;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <i class="fas fa-plane-departure" style="font-size:1.3rem;color:#E9C46A;"></i>
          <div>
            <div style="font-weight:700;font-size:1rem;">טיסות תל אביב ✈ דובאי</div>
            <div style="font-size:0.75rem;opacity:0.8;">מצא את הטיסה הזולה ביותר</div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-end;">
          <div style="flex:1;">
            <label style="font-size:0.7rem;opacity:0.8;display:block;margin-bottom:3px;">הלוך</label>
            <input type="date" id="flightDepart" value="${tomorrow.toISOString().split('T')[0]}" style="width:100%;padding:10px;border-radius:6px;border:none;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
          </div>
          <div style="flex:1;">
            <label style="font-size:0.7rem;opacity:0.8;display:block;margin-bottom:3px;">חזור</label>
            <input type="date" id="flightReturn" value="${weekLater.toISOString().split('T')[0]}" style="width:100%;padding:10px;border-radius:6px;border:none;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
          </div>
        </div>
        <button onclick="doFlightSearch()" style="width:100%;padding:12px;border-radius:8px;background:#E9C46A;color:#2C5F6E;border:none;font-family:Heebo;font-weight:700;cursor:pointer;font-size:0.95rem;">
          <i class="fas fa-search"></i> חפש טיסות
        </button>
        <div id="flightResults" style="margin-top:12px;"></div>
      </div>
    `;
  }
}

function cardHTML(item, category) {
  const rating = item.googleRating || item.rating;
  const reviews = item.totalReviews;
  return `
    <div class="listing-card" onclick="openDetail('${category}', ${item.id})">
      <img class="card-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
      <div class="card-body">
        <div class="card-title">${item.name}</div>
        <div class="card-location"><i class="fas fa-map-marker-alt"></i> ${item.address || ''}</div>
        <div class="card-footer">
          <span class="card-rating">
            <i class="fas fa-star" style="color:#E9C46A;"></i> ${rating || '-'}
            ${reviews ? `<span style="color:#6B7F8D;font-size:0.7rem;">(${reviews})</span>` : ''}
          </span>
          <span class="card-price">${item.priceRange || item.price || ''}</span>
        </div>
        ${item.isOpen === true ? '<div style="color:#2A9D8F;font-size:0.7rem;font-weight:600;margin-top:4px;">● פתוח עכשיו</div>' : ''}
      </div>
    </div>`;
}

// ===== MAP HELPERS =====
const MARKER_COLORS = {
  hotels:'#E9C46A', restaurants:'#E76F51', attractions:'#2A9D8F',
  shopping:'#F4A261', nightlife:'#E76F51', transport:'#2A9D8F', casino:'#E9C46A'
};

function clearMap() {
  if (map) {
    if (map.remove) map.remove(); // Leaflet
    map = null;
  }
  markers = [];
}

function buildMap(elementId, zoom, items) {
  const el = document.getElementById(elementId);
  if (!el) return;

  try {
    if (hasGoogle()) {
      buildGoogleMap(el, zoom, items);
    } else if (typeof L !== 'undefined') {
      buildLeafletMap(el, zoom, items);
    } else {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray);font-size:0.9rem;text-align:center;padding:20px;"><div><i class="fas fa-map-marked-alt" style="font-size:2rem;color:var(--gold);display:block;margin-bottom:8px;"></i>המפה לא זמינה ברשת הנוכחית.<br>נסה מרשת אחרת או לחץ על "נווט בגוגל" בכרטיס פריט.</div></div>';
    }
  } catch(e) {
    console.error('Map error:', e);
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray);text-align:center;padding:20px;"><div><i class="fas fa-exclamation-triangle" style="font-size:2rem;color:var(--gold);display:block;margin-bottom:8px;"></i>שגיאה בטעינת המפה.<br>נסה לרענן את הדף.</div></div>';
  }
}

// --- Google Maps ---
function buildGoogleMap(el, zoom, items) {
  const gmap = new google.maps.Map(el, {
    center: { lat:25.2048, lng:55.2708 },
    zoom: zoom || 11,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: true,
    language: 'he'
  });
  const infoWin = new google.maps.InfoWindow();
  markers = [];

  (items || []).forEach(item => {
    if (!item.lat || !item.lng) return;
    const color = MARKER_COLORS[item.category] || '#E76F51';
    const marker = new google.maps.Marker({
      position: { lat:item.lat, lng:item.lng },
      map: gmap, title: item.name,
      icon: { path:google.maps.SymbolPath.CIRCLE, scale:10, fillColor:color, fillOpacity:1, strokeColor:'#fff', strokeWeight:2 }
    });
    marker.addListener('click', () => {
      infoWin.setContent(`
        <div style="direction:rtl;font-family:Heebo,sans-serif;padding:4px;min-width:180px;">
          <b>${item.name}</b><br>
          <span style="color:#666;font-size:12px;">${item.address||''}</span><br>
          ${item.rating ? `⭐ ${item.rating} ` : ''}${item.price||''}<br>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" style="color:#E76F51;font-weight:600;">🧭 נווט</a>
          &nbsp;|&nbsp;
          <a href="#" onclick="openDetail('${item.category}',${item.id});return false;" style="color:#3B82F6;">📋 פרטים</a>
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
    const color = MARKER_COLORS[item.category] || '#E76F51';
    const icon = L.divIcon({
      className:'custom-marker',
      html:`<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize:[16,16], iconAnchor:[8,8]
    });
    L.marker([item.lat, item.lng], { icon })
      .addTo(map)
      .bindPopup(`<div style="direction:rtl;font-family:Heebo,sans-serif;">
        <b>${item.name}</b><br>${item.address||''}<br>
        ${item.rating ? '⭐ '+item.rating : ''} ${item.price||''}<br>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" style="color:#E76F51;font-weight:600;">🧭 נווט בגוגל</a>
      </div>`);
  });
}

// ===== LIST PAGE =====
const SUBCAT_MAP = {
  '7 כוכבים':'7star','5 כוכבים':'5star','3-4 כוכבים':'3-4star','יוקרה':'luxury','עסקים':'business','תקציבי':'budget',
  'אסייתי':'asian','מקומי':'local','פירות ים':'seafood',
  'ציון דרך':'landmark','מוזיאון':'museum','הרפתקה':'adventure',
  'קניון':'mall','שוק':'souk',
  'מועדון':'club','לאונג\'':'lounge','בידור':'entertainment','מופע':'show',
  'מטרו':'metro','מונית':'taxi','סירה':'boat','אפליקציה':'app',
  'קזינו':'casino','מרוצים':'racing','קניות':'shopping'
};

function renderListPage(category, title, filters, activeFilter) {
  const page = document.getElementById('page-list');
  const items = getAllItems(category);
  const active = activeFilter || 'הכל';
  const filtered = sortByRating(active === 'הכל' ? items : items.filter(i => i.subcategory === SUBCAT_MAP[active]));

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2>${title}</h2>
    </div>
    <div class="filter-tabs">
      ${filters.map(f => `<button class="filter-tab ${f === active ? 'active' : ''}" onclick="renderListPage('${category}','${title}',${JSON.stringify(filters)},'${f}')">${f}</button>`).join('')}
    </div>
    ${category === 'hotels' ? '<div id="bookingWidget" style="padding:0 20px;"></div>' : ''}
    <div class="map-container"><div id="listMap" style="width:100%;height:100%;"></div></div>
    <div class="listings-grid">
      ${filtered.map(item => `
        <div class="list-card" onclick="openDetail('${category}', ${item.id})">
          <img class="card-thumb" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
          <div class="card-info">
            <div class="card-title">${item.name}</div>
            <div class="card-desc">${item.description?.substring(0, 80)}...</div>
            <div class="card-meta">
              ${item.rating ? `<span class="card-rating"><i class="fas fa-star"></i> ${item.rating}</span>` : ''}
              <span class="card-price">${item.priceRange || item.price || ''}</span>
              ${item.tags?.[0] ? `<span class="card-tag">${item.tags[0]}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Booking.com widget for hotels page
  if (category === 'hotels') {
    setTimeout(() => renderBookingWidget('bookingWidget'), 100);
  }

  setTimeout(() => {
    clearMap();
    buildMap('listMap', 11, filtered.map(i => ({ ...i, category })));
  }, 200);
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
      <button class="filter-tab" onclick="filterMap('transport',this)">תחבורה</button>
    </div>
    <div style="height:calc(100vh - 180px);margin:0 12px;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
      <div id="fullMap" style="width:100%;height:100%;"></div>
    </div>
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
function openDetail(category, id) {
  const item = getItem(category, id);
  if (!item) return;

  const modal = document.getElementById('detailModal');
  modal.innerHTML = `
    <div class="modal-sheet">
      <div style="position:relative;">
        <img class="modal-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
        <button class="modal-close" onclick="closeDetail()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="modal-title">${item.name}</div>
        <div class="modal-subtitle"><i class="fas fa-map-marker-alt"></i> ${item.address || ''}</div>
        <div style="margin-bottom:12px;">${ratingHTML(item)}</div>
        <div class="modal-stats">
          ${item.priceRange ? `<div class="modal-stat"><span class="stat-value">${item.price}</span><span class="stat-label">${item.priceRange}</span></div>` : ''}
          ${item.phone ? `<div class="modal-stat"><span class="stat-value"><i class="fas fa-phone"></i></span><span class="stat-label">${item.phone}</span></div>` : ''}
        </div>
        ${item.hours && item.hours.length ? `
          <details style="margin-bottom:12px;font-size:0.8rem;">
            <summary style="color:#2A9D8F;cursor:pointer;font-weight:600;"><i class="fas fa-clock"></i> שעות פתיחה</summary>
            <div style="padding:8px 0;color:#6B7F8D;line-height:1.8;">${item.hours.join('<br>')}</div>
          </details>
        ` : ''}
        ${item.tags ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">${item.tags.map(t => `<span class="card-tag">${t}</span>`).join('')}</div>` : ''}
        <div class="modal-desc">${item.description}</div>
        ${item.googlePhotos && item.googlePhotos.length ? `
          <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;">
            ${item.googlePhotos.map(url => `<img src="${url}" style="height:80px;border-radius:4px;flex-shrink:0;" onerror="this.style.display='none'">`).join('')}
          </div>
        ` : ''}
        ${reviewsHTML(item)}
        ${item.lat ? `<div class="map-container" style="margin:0 0 12px;height:220px;"><div id="detailMap" style="width:100%;height:100%;"></div></div>` : ''}
        <div class="modal-actions" style="flex-wrap:wrap;">
          ${item.lat ? `<button class="modal-btn primary" onclick="openNavigation(${item.lat},${item.lng})"><i class="fas fa-directions"></i> נווט</button>` : ''}
          ${item.googleUrl ? `<a href="${item.googleUrl}" target="_blank" class="modal-btn secondary"><i class="fab fa-google"></i> Google Maps</a>` : ''}
          ${item.website ? `<a href="${item.website}" target="_blank" class="modal-btn secondary"><i class="fas fa-globe"></i> אתר</a>` : ''}
          ${item.phone ? `<a href="tel:${item.phone}" class="modal-btn secondary"><i class="fas fa-phone"></i> התקשר</a>` : ''}
          <button class="modal-btn secondary" onclick="shareItem('${item.name}','${item.address}')"><i class="fas fa-share-alt"></i> שתף</button>
        </div>
        ${item.lat ? `
        <div style="margin-top:12px;border-top:1px solid #F5EFE6;padding-top:12px;">
          <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;margin-bottom:8px;"><i class="fas fa-taxi" style="color:#E9C46A;"></i> הזמן נסיעה לכאן</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://www.careem.com/rides/?pickup=current&dropoff=${item.lat},${item.lng}&dropoff_name=${encodeURIComponent(item.nameEn || item.name)}" target="_blank"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2A9D8F;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:120px;">
              <i class="fas fa-car"></i> Careem
            </a>
            <a href="https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${item.lat}&dropoff[longitude]=${item.lng}&dropoff[nickname]=${encodeURIComponent(item.nameEn || item.name)}" target="_blank"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#2C5F6E;color:#fff;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:120px;">
              <i class="fas fa-car-side"></i> Uber
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=transit" target="_blank"
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:8px;background:#E9C46A;color:#2C5F6E;text-decoration:none;font-weight:600;font-size:0.85rem;min-width:120px;">
              <i class="fas fa-subway"></i> תחבורה ציבורית
            </a>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.onclick = (e) => { if (e.target === modal) closeDetail(); };

  if (item.lat) {
    setTimeout(() => {
      const el = document.getElementById('detailMap');
      if (!el) return;
      if (hasGoogle()) {
        const dm = new google.maps.Map(el, {
          center:{lat:item.lat,lng:item.lng}, zoom:16,
          mapTypeControl:false, streetViewControl:true, language:'he'
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
