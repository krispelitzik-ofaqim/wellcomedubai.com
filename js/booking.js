// ===== BOOKING.COM VIA RAPIDAPI =====
const RAPIDAPI_KEY = '425b399aaamsh5f1513665b08931p1f07b6jsne67eed469583';
const RAPIDAPI_HOST = 'booking-com.p.rapidapi.com';
const BOOKING_CACHE_KEY = 'dubai_booking_cache';
const BOOKING_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Search hotels in Dubai with real prices
async function searchBookingHotels(checkIn, checkOut, adults, sortBy) {
  const cacheKey = `${checkIn}_${checkOut}_${adults}_${sortBy}`;
  const cached = getBookingCache(cacheKey);
  if (cached) return cached;

  try {
    // First get Dubai destination ID
    const destResp = await fetch('https://booking-com.p.rapidapi.com/v1/hotels/locations?locale=en-gb&name=Dubai', {
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });
    const destData = await destResp.json();
    const dubaiDest = destData.find(d => d.dest_type === 'city') || destData[0];
    if (!dubaiDest) return null;

    // Search hotels
    const params = new URLSearchParams({
      dest_id: dubaiDest.dest_id,
      dest_type: dubaiDest.dest_type,
      checkout_date: checkOut,
      checkin_date: checkIn,
      adults_number: adults || '2',
      room_number: '1',
      units: 'metric',
      filter_by_currency: 'AED',
      order_by: sortBy || 'review_score',
      locale: 'en-gb',
      page_number: '0'
    });

    const resp = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/search?${params}`, {
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });
    const data = await resp.json();

    if (data.result) {
      const hotels = data.result.map(h => ({
        name: h.hotel_name,
        address: h.address,
        price: h.min_total_price || h.composite_price_breakdown?.gross_amount?.value,
        currency: h.currency_code || 'AED',
        rating: h.review_score ? (h.review_score / 2).toFixed(1) : null,
        reviewScore: h.review_score,
        reviewCount: h.review_nr,
        reviewWord: h.review_score_word,
        stars: h.class,
        image: h.max_photo_url || h.main_photo_url,
        lat: h.latitude,
        lng: h.longitude,
        bookingUrl: h.url,
        checkIn: checkIn,
        checkOut: checkOut
      }));
      setBookingCache(cacheKey, hotels);
      return hotels;
    }
    return [];
  } catch (e) {
    console.error('Booking API error:', e);
    return null;
  }
}

// Get hotel details
async function getBookingHotelDetails(hotelId) {
  try {
    const resp = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/data?hotel_id=${hotelId}&locale=en-gb`, {
      headers: { 'x-rapidapi-key': RAPIDAPI_KEY, 'x-rapidapi-host': RAPIDAPI_HOST }
    });
    return await resp.json();
  } catch (e) {
    console.error('Booking details error:', e);
    return null;
  }
}

// Cache helpers
function getBookingCache(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(BOOKING_CACHE_KEY) || '{}');
    const entry = cache[key];
    if (entry && (Date.now() - entry.ts < BOOKING_CACHE_TTL)) return entry.data;
  } catch(e) {}
  return null;
}

function setBookingCache(key, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(BOOKING_CACHE_KEY) || '{}');
    cache[key] = { data, ts: Date.now() };
    localStorage.setItem(BOOKING_CACHE_KEY, JSON.stringify(cache));
  } catch(e) {}
}

// Get default dates (tomorrow + 3 days)
function getDefaultDates() {
  const now = new Date();
  const checkIn = new Date(now);
  checkIn.setDate(now.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);
  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0]
  };
}

// Render booking search widget
function renderBookingWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const dates = getDefaultDates();

  container.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;margin-bottom:16px;">
      <div style="font-weight:700;color:#2C5F6E;font-size:1rem;margin-bottom:12px;">
        <i class="fas fa-bed" style="color:#E76F51;"></i> חפש מלונות בדובאי - מחירים בזמן אמת
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
        <div>
          <label style="font-size:0.75rem;color:#6B7F8D;display:block;margin-bottom:4px;">צ'ק-אין</label>
          <input type="date" id="bkCheckIn" value="${dates.checkIn}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
        </div>
        <div>
          <label style="font-size:0.75rem;color:#6B7F8D;display:block;margin-bottom:4px;">צ'ק-אאוט</label>
          <input type="date" id="bkCheckOut" value="${dates.checkOut}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
        </div>
        <div>
          <label style="font-size:0.75rem;color:#6B7F8D;display:block;margin-bottom:4px;">מבוגרים</label>
          <select id="bkAdults" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;color:#2C5F6E;">
            <option value="1">1</option>
            <option value="2" selected>2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="doBookingSearch('review_score')" style="flex:1;padding:10px;border-radius:8px;background:#E76F51;color:#fff;border:none;font-family:Heebo;font-weight:600;cursor:pointer;font-size:0.9rem;">
          <i class="fas fa-search"></i> חפש לפי דירוג
        </button>
        <button onclick="doBookingSearch('price')" style="flex:1;padding:10px;border-radius:8px;background:#2A9D8F;color:#fff;border:none;font-family:Heebo;font-weight:600;cursor:pointer;font-size:0.9rem;">
          <i class="fas fa-sort-amount-down"></i> מהזול ליקר
        </button>
      </div>
    </div>
    <div id="bookingResults"></div>
  `;
}

// Execute search
async function doBookingSearch(sortBy) {
  const results = document.getElementById('bookingResults');
  if (!results) return;

  const checkIn = document.getElementById('bkCheckIn')?.value;
  const checkOut = document.getElementById('bkCheckOut')?.value;
  const adults = document.getElementById('bkAdults')?.value;

  results.innerHTML = '<div style="text-align:center;padding:30px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:#E76F51;"></i><br>מחפש מלונות בדובאי...</div>';

  const hotels = await searchBookingHotels(checkIn, checkOut, adults, sortBy);

  if (!hotels || hotels.length === 0) {
    results.innerHTML = '<div style="text-align:center;padding:20px;color:#6B7F8D;">לא נמצאו תוצאות. ייתכן שה-API חסום ברשת הנוכחית.</div>';
    return;
  }

  results.innerHTML = `
    <div style="font-size:0.8rem;color:#6B7F8D;margin-bottom:10px;">${hotels.length} מלונות נמצאו | ${checkIn} → ${checkOut}</div>
    ${hotels.slice(0, 15).map(h => `
      <div style="display:flex;gap:12px;background:#fff;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:10px;overflow:hidden;cursor:pointer;" onclick="${h.bookingUrl ? `window.open('${h.bookingUrl}','_blank')` : ''}">
        <img src="${h.image || ''}" style="width:110px;min-height:100px;object-fit:cover;flex-shrink:0;background:#F5EFE6;" onerror="this.style.display='none'">
        <div style="padding:10px;flex:1;">
          <div style="font-weight:600;color:#2C5F6E;font-size:0.9rem;margin-bottom:2px;">${h.name}</div>
          <div style="font-size:0.75rem;color:#6B7F8D;margin-bottom:4px;">${h.address || ''}</div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            ${h.stars ? `<span style="color:#B8923A;font-size:0.75rem;">${'★'.repeat(h.stars)}</span>` : ''}
            ${h.reviewScore ? `<span style="background:#2A9D8F;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:600;">${h.reviewScore}/10</span>` : ''}
            ${h.reviewCount ? `<span style="color:#6B7F8D;font-size:0.7rem;">(${h.reviewCount} ביקורות)</span>` : ''}
          </div>
          ${h.price ? `
            <div style="margin-top:6px;display:flex;align-items:baseline;gap:4px;">
              <span style="font-size:1.1rem;font-weight:700;color:#E76F51;">${Math.round(h.price)}</span>
              <span style="font-size:0.75rem;color:#6B7F8D;">${h.currency} / ${Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)} לילות</span>
            </div>
          ` : ''}
          ${h.bookingUrl ? `<a href="${h.bookingUrl}" target="_blank" style="display:inline-block;margin-top:6px;font-size:0.75rem;color:#E76F51;font-weight:600;text-decoration:none;">הזמן ב-Booking.com →</a>` : ''}
        </div>
      </div>
    `).join('')}
  `;
}
