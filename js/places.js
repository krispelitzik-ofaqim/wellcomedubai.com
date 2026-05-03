// ===== GOOGLE PLACES INTEGRATION =====
// Fetches real ratings, reviews, photos & opening hours from Google

const PLACES_CACHE_KEY = 'dubai_places_cache';
const PLACES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let placesService = null;

function initPlacesService() {
  if (!hasGoogle() || !google.maps.places) return false;
  // Need a map div for PlacesService
  let div = document.getElementById('placesHelper');
  if (!div) {
    div = document.createElement('div');
    div.id = 'placesHelper';
    div.style.display = 'none';
    document.body.appendChild(div);
  }
  const helperMap = new google.maps.Map(div, { center:{lat:25.2,lng:55.27}, zoom:10 });
  placesService = new google.maps.places.PlacesService(helperMap);
  return true;
}

// Get cached data or null
function getCachedPlace(placeKey) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || '{}');
    const entry = cache[placeKey];
    if (entry && (Date.now() - entry.timestamp < PLACES_CACHE_TTL)) {
      return entry.data;
    }
  } catch(e) {}
  return null;
}

// Save to cache
function setCachedPlace(placeKey, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(PLACES_CACHE_KEY) || '{}');
    cache[placeKey] = { data, timestamp: Date.now() };
    localStorage.setItem(PLACES_CACHE_KEY, JSON.stringify(cache));
  } catch(e) {}
}

// Search for a place by name and location, return Google data
function fetchPlaceData(item) {
  return new Promise((resolve) => {
    if (!placesService) { resolve(null); return; }

    const cacheKey = `${item.nameEn || item.name}_${item.lat}_${item.lng}`;
    const cached = getCachedPlace(cacheKey);
    if (cached) { resolve(cached); return; }

    const request = {
      query: `${item.nameEn || item.name} Dubai`,
      location: new google.maps.LatLng(item.lat || 25.2, item.lng || 55.27),
      radius: 1000
    };

    placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
        const place = results[0];
        // Get details
        placesService.getDetails({
          placeId: place.place_id,
          fields: ['rating','user_ratings_total','reviews','opening_hours','photos','price_level','url','website']
        }, (details, detailStatus) => {
          if (detailStatus === google.maps.places.PlacesServiceStatus.OK && details) {
            const data = {
              googleRating: details.rating || place.rating,
              totalReviews: details.user_ratings_total || 0,
              reviews: (details.reviews || []).slice(0, 3).map(r => ({
                author: r.author_name,
                rating: r.rating,
                text: r.text?.substring(0, 150),
                time: r.relative_time_description
              })),
              isOpen: details.opening_hours?.isOpen?.() ?? null,
              hours: details.opening_hours?.weekday_text || [],
              googlePhotos: (details.photos || []).slice(0, 3).map(p => p.getUrl({ maxWidth: 400 })),
              priceLevel: details.price_level,
              googleUrl: details.url,
              website: details.website,
              placeId: place.place_id
            };
            setCachedPlace(cacheKey, data);
            resolve(data);
          } else {
            const basic = {
              googleRating: place.rating,
              totalReviews: place.user_ratings_total || 0,
              reviews: [],
              placeId: place.place_id
            };
            setCachedPlace(cacheKey, basic);
            resolve(basic);
          }
        });
      } else {
        resolve(null);
      }
    });
  });
}

// Update all items in a category with Google data
async function enrichCategoryWithGoogle(category) {
  if (!initPlacesService()) return;

  const items = getAllItems(category);
  const db = getDB();
  let updated = false;

  for (const item of items) {
    if (!item.lat || !item.lng) continue;
    const data = await fetchPlaceData(item);
    if (data && data.googleRating) {
      const idx = db[category].findIndex(i => i.id === item.id);
      if (idx >= 0) {
        db[category][idx].googleRating = data.googleRating;
        db[category][idx].totalReviews = data.totalReviews;
        db[category][idx].googleReviews = data.reviews;
        db[category][idx].googlePhotos = data.googlePhotos;
        db[category][idx].isOpen = data.isOpen;
        db[category][idx].hours = data.hours;
        db[category][idx].googleUrl = data.googleUrl;
        db[category][idx].website = data.website;
        db[category][idx].placeId = data.placeId;
        updated = true;
      }
    }
    // Small delay to avoid API rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  if (updated) saveDB(db);
  return updated;
}

// Sort items by Google rating
function hasCustomImage(item) {
  const img = (item && item.image) || '';
  if (!img) return false;
  if (img.startsWith('https://images.pexels.com')) return false;
  if (/\/(?:kids|hotel|rest|night|attr|shop|transp|cam|safari|car)_\d+\./i.test(img)) return false;
  if (/\/\d+\.(?:jpg|jpeg|png)$/i.test(img)) return false;
  return true;
}

function sortByRating(items) {
  return [...items].sort((a, b) => {
    const aReal = hasCustomImage(a) ? 1 : 0;
    const bReal = hasCustomImage(b) ? 1 : 0;
    if (bReal !== aReal) return bReal - aReal;
    const rA = a.googleRating || a.rating || 0;
    const rB = b.googleRating || b.rating || 0;
    if (rB !== rA) return rB - rA;
    return (b.totalReviews || 0) - (a.totalReviews || 0);
  });
}

// Build rating HTML with Google data
function ratingHTML(item) {
  const rating = item.googleRating || item.rating;
  if (!rating) return '';

  const stars = Math.round(rating);
  const starsHTML = Array(5).fill(0).map((_, i) =>
    `<i class="fas fa-star" style="color:${i < stars ? '#E9C46A' : '#ddd'};font-size:0.7rem;"></i>`
  ).join('');

  return `
    <div style="display:flex;align-items:center;gap:6px;">
      ${starsHTML}
      <span style="font-weight:600;color:#2C5F6E;">${rating}</span>
      ${item.totalReviews ? `<span style="color:#6B7F8D;font-size:0.75rem;">(${item.totalReviews} ביקורות)</span>` : ''}
      ${item.isOpen === true ? '<span style="color:#2A9D8F;font-size:0.7rem;font-weight:600;">● פתוח</span>' : ''}
      ${item.isOpen === false ? '<span style="color:#E76F51;font-size:0.7rem;font-weight:600;">● סגור</span>' : ''}
    </div>
  `;
}

// Build reviews HTML
function reviewsHTML(item) {
  const reviews = item.googleReviews;
  if (!reviews || !reviews.length) return '';

  return `
    <div style="margin-top:12px;border-top:1px solid #F5EFE6;padding-top:12px;">
      <div style="font-weight:600;color:#2C5F6E;font-size:0.85rem;margin-bottom:8px;">
        <i class="fab fa-google" style="color:#E76F51;"></i> ביקורות מגוגל
      </div>
      ${reviews.map(r => `
        <div style="background:#FDF6EC;border-radius:8px;padding:10px;margin-bottom:6px;font-size:0.8rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:600;color:#2C5F6E;">${r.author}</span>
            <span style="color:#E9C46A;">${'★'.repeat(r.rating)}</span>
          </div>
          <div style="color:#6B7F8D;line-height:1.5;">${r.text || ''}${r.text?.length >= 150 ? '...' : ''}</div>
          <div style="color:#aaa;font-size:0.7rem;margin-top:2px;">${r.time || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}
