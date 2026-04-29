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
    case 'restaurants': renderListPage('restaurants', 'מסעדות', ['הכל','יוקרתי מאוד','יוקרתי','עממי','ישראלי','לבנוני','טורקי','אוכל רחוב'], subcategory); break;
    case 'attractions': renderListPage('attractions', 'אטרקציות', ['הכל','ציון דרך','מוזיאון','חוף','פארק מים','פארק שעשועים','סיור','גן חיות'], subcategory); break;
    case 'shopping': renderListPage('shopping', 'קניות', ['הכל','קניון','שוק'], subcategory); break;
    case 'nightlife': renderListPage('nightlife', 'בילויים', ['הכל','מועדון','לאונג\'','בידור','מופע'], subcategory); break;
    case 'transport': renderListPage('transport', 'תחבורה', ['הכל','מטרו','מונית','סירה','אפליקציה'], subcategory); break;
    case 'casino': renderListPage('casino', 'קזינו ומשחקים', ['הכל','קזינו','מרוצים'], subcategory); break;
    case 'map': renderMapPage(); break;
    case 'flights': renderFlightsPage(); break;
    case 'livecams': renderLiveCamsPage(); break;
    case 'weather': renderWeatherPage(); break;
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
}

function cardHTML(item, category) {
  const rating = item.googleRating || item.rating;
  const reviews = item.totalReviews;
  const isRestaurant = (category === 'restaurants' || category === 'shopping');

  if (isRestaurant) {
    // Square card - image top, white block bottom
    return `
      <div style="min-width:180px;width:180px;scroll-snap-align:start;background:#fff;border-radius:6px;overflow:hidden;cursor:pointer;border:1px solid #E5E7EB;box-shadow:0 2px 8px rgba(0,0,0,0.06);" onclick="openDetail('${category}', ${item.id})">
        <div style="width:180px;height:180px;overflow:hidden;">
          <img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
        </div>
        <div style="padding:10px;">
          <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;margin-bottom:2px;">${item.name}</div>
          <div style="font-size:0.7rem;color:#6B7F8D;margin-bottom:4px;"><i class="fas fa-map-marker-alt" style="color:#F4A261;"></i> ${item.address || ''}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="color:#E9C46A;font-size:0.8rem;font-weight:600;"><i class="fas fa-star"></i> ${rating || '-'}</span>
            <span style="color:#E76F51;font-size:0.75rem;font-weight:500;">${item.price || ''}</span>
          </div>
          ${item.isOpen === true ? '<div style="color:#2A9D8F;font-size:0.65rem;font-weight:600;margin-top:3px;">● פתוח</div>' : ''}
        </div>
      </div>`;
  }

  // Default horizontal card for hotels, attractions etc
  return `
    <div class="listing-card" onclick="openDetail('${category}', ${item.id})">
      <img class="card-img" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
      <div class="card-body">
        <div class="card-title" style="color:#2C5F6E;">${item.name}</div>
        <div class="card-location" style="color:#6B7F8D;"><i class="fas fa-map-marker-alt" style="color:#F4A261;"></i> ${item.address || ''}</div>
        ${item.stars ? `<div style="color:#E9C46A;font-size:0.75rem;margin-bottom:4px;">${'★'.repeat(item.stars)}</div>` : ''}
        <div class="card-footer">
          <span class="card-rating" style="color:#E9C46A;">
            <i class="fas fa-star"></i> ${rating || '-'}
            ${reviews ? `<span style="color:#6B7F8D;font-size:0.7rem;">(${reviews})</span>` : ''}
          </span>
          <span class="card-price" style="color:#E76F51;">${item.priceRange || item.price || ''}</span>
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

  // Always show static map first as placeholder
  buildStaticMap(el, items);

  // Then try to load interactive map on top
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
    // Static map already showing as fallback
  }
}

function buildStaticMap(el, items) {
  // Static Google Map image as fallback
  var markers = (items || []).filter(i => i.lat && i.lng).slice(0, 15).map(i => {
    var color = '0xE76F51';
    return `markers=color:${color}|${i.lat},${i.lng}`;
  }).join('&');
  var src = `https://maps.googleapis.com/maps/api/staticmap?center=25.2048,55.2708&zoom=11&size=600x300&maptype=roadmap&${markers}&key=AIzaSyDIqkbn9__0EdYjyCRQv4w-Gi3tHWwSwro`;
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
  'יוקרתי מאוד':'ultra-luxury','יוקרתי':'luxury','עממי':'local','ישראלי':'israeli','לבנוני':'lebanese','טורקי':'turkish','אוכל רחוב':'street',
  'אסייתי':'asian','מקומי':'local','פירות ים':'seafood',
  'ציון דרך':'landmark','מוזיאון':'museum','הרפתקה':'adventure','חוף':'beach','פארק מים':'waterpark','פארק שעשועים':'theme-park','סיור':'tour','גן חיות':'zoo',
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 20px;">
      ${filtered.map(item => `
        <div style="background:#fff;border-radius:6px;overflow:hidden;border:1px solid #E5E7EB;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.05);" onclick="openDetail('${category}', ${item.id})">
          <img src="${item.image}" alt="${item.name}" style="width:100%;height:130px;object-fit:cover;" onerror="this.style.display='none'">
          <div style="padding:10px;">
            <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;margin-bottom:3px;">${item.name}</div>
            ${item.stars ? `<div style="color:#E9C46A;font-size:0.7rem;margin-bottom:3px;">${'★'.repeat(Math.min(item.stars,5))}${item.stars > 5 ? '+' : ''}</div>` : ''}
            <div style="font-size:0.7rem;color:#6B7F8D;margin-bottom:4px;"><i class="fas fa-map-marker-alt" style="color:#F4A261;font-size:0.6rem;"></i> ${item.address || ''}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              ${item.rating ? `<span style="color:#E9C46A;font-size:0.75rem;font-weight:600;"><i class="fas fa-star"></i> ${item.googleRating || item.rating}</span>` : ''}
              <span style="color:#E76F51;font-size:0.65rem;font-weight:600;">${item.priceRange || item.price || ''}</span>
            </div>
            ${item.isOpen === true ? '<div style="color:#2A9D8F;font-size:0.6rem;font-weight:600;margin-top:3px;">● פתוח</div>' : ''}
            <div style="display:flex;gap:6px;margin-top:6px;">
              ${item.lat ? `<a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" onclick="event.stopPropagation()" style="flex:1;padding:5px;border-radius:4px;border:none;background:#E76F51;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;"><i class="fas fa-map-pin"></i> איפה זה</a>` : ''}
              <button onclick="event.stopPropagation();shareItem('${item.name.replace(/'/g,"\\'")}','${(item.address||'').replace(/'/g,"\\'")}')" style="flex:1;padding:5px;border-radius:4px;border:none;background:#FDF6EC;color:#2C5F6E;font-size:0.65rem;font-family:Heebo;cursor:pointer;"><i class="fas fa-share-alt"></i> שתף</button>
              <a href="https://wa.me/?text=${encodeURIComponent(item.name + ' - ' + (item.address||'') + (item.lat ? ' https://maps.google.com/?q='+item.lat+','+item.lng : '') + ' | WellCome Dubai')}" target="_blank" onclick="event.stopPropagation()" style="flex:1;padding:5px;border-radius:4px;border:none;background:#25D366;color:#fff;font-size:0.65rem;text-align:center;text-decoration:none;font-family:Heebo;"><i class="fab fa-whatsapp"></i></a>
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
    const mapEl = document.getElementById('listMap');
    if (mapEl && mapEl.offsetHeight > 0) {
      buildMap('listMap', 11, filtered.map(i => ({ ...i, category })));
    } else {
      // Retry after more time
      setTimeout(() => {
        clearMap();
        buildMap('listMap', 11, filtered.map(i => ({ ...i, category })));
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
        <button onclick="doFlightPageSearch()" style="width:100%;padding:12px;border-radius:8px;background:#E9C46A;color:#2C5F6E;border:none;font-family:Heebo;font-weight:700;cursor:pointer;font-size:0.95rem;">
          <i class="fas fa-search"></i> חפש טיסות
        </button>
        <div id="flightPageResults" style="margin-top:12px;"></div>
      </div>

      <!-- Quick links -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.skyscanner.co.il/transport/flights/tlv/dxb/" target="_blank" style="flex:1;text-align:center;padding:12px;border-radius:8px;background:#fff;border:1px solid #E5E7EB;text-decoration:none;color:#2C5F6E;font-weight:600;font-size:0.8rem;">
          <i class="fas fa-search" style="color:#E76F51;display:block;font-size:1.2rem;margin-bottom:4px;"></i>Skyscanner
        </a>
        <a href="https://www.google.com/travel/flights?q=TLV%20to%20DXB" target="_blank" style="flex:1;text-align:center;padding:12px;border-radius:8px;background:#fff;border:1px solid #E5E7EB;text-decoration:none;color:#2C5F6E;font-weight:600;font-size:0.8rem;">
          <i class="fab fa-google" style="color:#2A9D8F;display:block;font-size:1.2rem;margin-bottom:4px;"></i>Google Flights
        </a>
        <a href="https://www.elal.com" target="_blank" style="flex:1;text-align:center;padding:12px;border-radius:8px;background:#fff;border:1px solid #E5E7EB;text-decoration:none;color:#2C5F6E;font-weight:600;font-size:0.8rem;">
          <i class="fas fa-plane" style="color:#E9C46A;display:block;font-size:1.2rem;margin-bottom:4px;"></i>אל על
        </a>
        <a href="https://www.flydubai.com" target="_blank" style="flex:1;text-align:center;padding:12px;border-radius:8px;background:#fff;border:1px solid #E5E7EB;text-decoration:none;color:#2C5F6E;font-weight:600;font-size:0.8rem;">
          <i class="fas fa-plane-departure" style="color:#F4A261;display:block;font-size:1.2rem;margin-bottom:4px;"></i>FlyDubai
        </a>
      </div>
    </div>
  `;

  renderFlightBoard('flightsPageBoard');
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
    <div style="padding:16px 20px;">
      <div id="weatherPageContent" style="text-align:center;padding:30px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="color:#2A9D8F;font-size:1.3rem;"></i><br>טוען תחזית...</div>
    </div>
  `;

  setTimeout(async () => {
    const el = document.getElementById('weatherPageContent');
    if (!el) return;
    const w = await getDubaiWeather();
    if (!w) { el.innerHTML = '<div style="color:#6B7F8D;">לא ניתן לטעון מזג אוויר כרגע.</div>'; return; }

    el.innerHTML = `
      <!-- Current -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);border-radius:8px;padding:24px;color:#fff;text-align:center;margin-bottom:16px;">
        <div style="font-size:0.85rem;opacity:0.8;">דובאי עכשיו</div>
        <img src="https:${w.icon}" style="width:80px;height:80px;">
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
      <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;margin-bottom:16px;">
        <div style="font-weight:700;color:#2C5F6E;margin-bottom:12px;"><i class="fas fa-calendar-week" style="color:#E9C46A;"></i> תחזית שבועית</div>
        ${w.forecast.map(d => {
          const dayNum = new Date(d.date).getDay();
          const dateStr = new Date(d.date).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'});
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F5EFE6;">
              <div style="width:60px;font-weight:600;color:#2C5F6E;font-size:0.85rem;">${dayNames[dayNum]}</div>
              <div style="color:#6B7F8D;font-size:0.75rem;">${dateStr}</div>
              <img src="https:${d.icon}" style="width:32px;height:32px;">
              <div style="color:#6B7F8D;font-size:0.8rem;width:80px;">${d.condition}</div>
              <div style="font-weight:600;color:#E76F51;">${d.maxTemp}°</div>
              <div style="color:#6B7F8D;">${d.minTemp}°</div>
            </div>`;
        }).join('')}
      </div>

      <!-- Live Cams -->
      <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;">
        <div style="font-weight:700;color:#2C5F6E;margin-bottom:12px;">
          <i class="fas fa-video" style="color:#E76F51;"></i> מצלמות חיות
          <span style="background:rgba(255,0,0,0.8);color:#fff;font-size:0.55rem;padding:2px 6px;border-radius:8px;font-weight:700;margin-right:6px;">LIVE</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <a href="https://www.webcamtaxi.com/en/united-arab-emirates/dubai/burj-khalifa-lake-dubai.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#FDF6EC;border-radius:6px;">
            <i class="fas fa-building" style="font-size:1.2rem;color:#E76F51;"></i>
            <div style="font-size:0.7rem;color:#2C5F6E;font-weight:600;margin-top:4px;">ברג' חליפה</div>
          </a>
          <a href="https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai/dubai-marina.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#FDF6EC;border-radius:6px;">
            <i class="fas fa-ship" style="font-size:1.2rem;color:#2A9D8F;"></i>
            <div style="font-size:0.7rem;color:#2C5F6E;font-weight:600;margin-top:4px;">מרינה</div>
          </a>
          <a href="https://www.skylinewebcams.com/en/webcam/united-arab-emirates/dubai/dubai.html" target="_blank" style="text-decoration:none;text-align:center;padding:12px 8px;background:#FDF6EC;border-radius:6px;">
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
    { name:'ברג\' חליפה - שידור חי', embed:'https://www.youtube.com/embed/xKYvWgyxXXg?autoplay=1&mute=1', color:'#E76F51' },
    { name:'דובאי Downtown', embed:'https://www.youtube.com/embed/EEhaQLAw-M8?autoplay=0&mute=1', color:'#2A9D8F' },
    { name:'דובאי מרינה', embed:'https://www.skylinewebcams.com/embed/webcam/united-arab-emirates/dubai/dubai/dubai-marina.html', color:'#E9C46A' },
    { name:'דובאי - קו הרקיע', embed:'https://www.skylinewebcams.com/embed/webcam/united-arab-emirates/dubai/dubai/dubai.html', color:'#F4A261' },
  ];

  page.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navigateTo('home')"><i class="fas fa-arrow-right"></i></button>
      <h2><i class="fas fa-video" style="color:#E76F51;margin-left:6px;"></i> דובאי עכשיו - שידור חי</h2>
    </div>
    <div style="padding:12px 16px;">
      <div id="liveCamWeather" style="margin-bottom:12px;"></div>

      ${cams.map((cam, i) => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:rgba(255,0,0,0.85);color:#fff;font-size:0.55rem;padding:2px 8px;border-radius:10px;font-weight:700;">● LIVE</span>
            <span style="font-weight:700;color:${cam.color};font-size:0.9rem;">${cam.name}</span>
          </div>
          <div style="position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:6px;overflow:hidden;">
            <iframe src="${cam.embed}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="${i === 0 ? 'eager' : 'lazy'}"></iframe>
          </div>
        </div>
      `).join('')}

      <div style="margin-top:8px;background:#FDF6EC;border-radius:6px;padding:10px;border-right:3px solid #E9C46A;">
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
            <img src="https:${w.icon}" style="width:50px;height:50px;">
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
          ${item.webcam ? `<a href="${item.webcam}" target="_blank" class="modal-btn secondary" style="background:#2A9D8F;color:#fff;border:none;"><i class="fas fa-video"></i> מצלמה חיה</a>` : ''}
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
