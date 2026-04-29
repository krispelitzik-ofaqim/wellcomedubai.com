// ===== WEATHER + CURRENCY + FLIGHTS via RapidAPI =====
const RAPID_KEY = '425b399aaamsh5f1513665b08931p1f07b6jsne67eed469583';

// ==============================
// 1. WEATHER - WeatherAPI.com
// ==============================
async function getDubaiWeather() {
  const cached = getServiceCache('weather');
  if (cached) return cached;

  try {
    const resp = await fetch('https://weatherapi-com.p.rapidapi.com/forecast.json?q=Dubai&days=7&lang=he', {
      headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'weatherapi-com.p.rapidapi.com' }
    });
    const data = await resp.json();
    if (data.current) {
      const result = {
        temp: Math.round(data.current.temp_c),
        feelsLike: Math.round(data.current.feelslike_c),
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        humidity: data.current.humidity,
        wind: Math.round(data.current.wind_kph),
        uv: data.current.uv,
        forecast: (data.forecast?.forecastday || []).map(d => ({
          date: d.date,
          maxTemp: Math.round(d.day.maxtemp_c),
          minTemp: Math.round(d.day.mintemp_c),
          condition: d.day.condition.text,
          icon: d.day.condition.icon
        }))
      };
      setServiceCache('weather', result, 30 * 60 * 1000); // 30 min
      return result;
    }
  } catch(e) { console.error('Weather error:', e); }
  return null;
}

function renderWeatherWidget() {
  return `<div id="weatherWidget" style="margin:12px 20px;"><div style="text-align:center;padding:12px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin"></i> טוען מזג אוויר...</div></div>`;
}

async function loadWeatherWidget() {
  const el = document.getElementById('weatherWidget');
  if (!el) return;
  const w = await getDubaiWeather();
  if (!w) { el.innerHTML = ''; return; }

  const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);border-radius:8px;padding:16px;color:#fff;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div>
          <div style="font-size:0.8rem;opacity:0.8;">מזג אוויר בדובאי</div>
          <div style="font-size:2.2rem;font-weight:700;">${w.temp}°C</div>
          <div style="font-size:0.85rem;">${w.condition}</div>
        </div>
        <img src="https:${w.icon}" style="width:64px;height:64px;">
      </div>
      <div style="display:flex;gap:16px;font-size:0.75rem;opacity:0.85;margin-bottom:10px;">
        <span><i class="fas fa-thermometer-half"></i> מרגיש ${w.feelsLike}°</span>
        <span><i class="fas fa-tint"></i> לחות ${w.humidity}%</span>
        <span><i class="fas fa-wind"></i> רוח ${w.wind} קמ"ש</span>
        <span><i class="fas fa-sun"></i> UV ${w.uv}</span>
      </div>
      ${w.forecast.length ? `
        <div style="display:flex;gap:6px;border-top:1px solid rgba(255,255,255,0.2);padding-top:10px;overflow-x:auto;">
          ${w.forecast.map(d => {
            const dayNum = new Date(d.date).getDay();
            return `
              <div style="flex:0 0 auto;text-align:center;min-width:52px;">
                <div style="font-size:0.65rem;opacity:0.8;">${dayNames[dayNum]}</div>
                <img src="https:${d.icon}" style="width:28px;height:28px;">
                <div style="font-size:0.7rem;font-weight:600;">${d.maxTemp}°/${d.minTemp}°</div>
              </div>`;
          }).join('')}
        </div>
      ` : ''}
      <div onclick="navigateTo('livecams')" style="margin-top:10px;padding:8px;background:rgba(255,255,255,0.15);border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.8rem;">
        <i class="fas fa-video" style="color:#E9C46A;"></i>
        <span>מצלמות חיות בדובאי</span>
        <span style="background:rgba(255,0,0,0.8);color:#fff;font-size:0.55rem;padding:1px 6px;border-radius:8px;font-weight:700;">LIVE</span>
      </div>
    </div>
  `;
}

// ==============================
// 2. CURRENCY - ExchangeRate
// ==============================
async function getCurrencyRates() {
  const cached = getServiceCache('currency');
  if (cached) return cached;

  try {
    const resp = await fetch('https://currency-conversion-and-exchange-rates.p.rapidapi.com/latest?base=ILS', {
      headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'currency-conversion-and-exchange-rates.p.rapidapi.com' }
    });
    const data = await resp.json();
    if (data.rates) {
      const result = {
        ilsToAed: data.rates.AED?.toFixed(4),
        ilsToUsd: data.rates.USD?.toFixed(4),
        aedToIls: (1 / data.rates.AED)?.toFixed(4),
        usdToIls: (1 / data.rates.USD)?.toFixed(4),
        timestamp: new Date().toLocaleString('he-IL')
      };
      setServiceCache('currency', result, 60 * 60 * 1000); // 1 hour
      return result;
    }
  } catch(e) { console.error('Currency error:', e); }
  return null;
}

function renderCurrencyWidget() {
  return `<div id="currencyWidget" style="margin:12px 20px;"><div style="text-align:center;padding:12px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin"></i> טוען שערי מטבע...</div></div>`;
}

async function loadCurrencyWidget() {
  const el = document.getElementById('currencyWidget');
  if (!el) return;
  const c = await getCurrencyRates();
  if (!c) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;">
      <div style="font-weight:700;color:#2C5F6E;font-size:0.9rem;margin-bottom:10px;">
        <i class="fas fa-exchange-alt" style="color:#E9C46A;"></i> המרת מטבע - זמן אמת
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div style="background:#FDF6EC;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:0.75rem;color:#6B7F8D;">1 שקל =</div>
          <div style="font-size:1.3rem;font-weight:700;color:#E76F51;">${c.ilsToAed} AED</div>
        </div>
        <div style="background:#FDF6EC;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:0.75rem;color:#6B7F8D;">1 דירהם =</div>
          <div style="font-size:1.3rem;font-weight:700;color:#2A9D8F;">${c.aedToIls} ₪</div>
        </div>
      </div>
      <!-- Calculator -->
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="number" id="currCalcInput" value="100" oninput="calcCurrency()" style="flex:1;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.9rem;text-align:center;direction:ltr;">
        <select id="currCalcDir" onchange="calcCurrency()" style="padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;">
          <option value="ilsToAed">₪ → AED</option>
          <option value="aedToIls">AED → ₪</option>
        </select>
        <div id="currCalcResult" style="flex:1;padding:8px;border-radius:6px;background:#2C5F6E;color:#fff;text-align:center;font-weight:600;font-size:0.9rem;"></div>
      </div>
      <div style="font-size:0.65rem;color:#aaa;margin-top:6px;text-align:left;direction:ltr;">Updated: ${c.timestamp}</div>
    </div>
  `;
  calcCurrency();
}

function calcCurrency() {
  const input = parseFloat(document.getElementById('currCalcInput')?.value || 0);
  const dir = document.getElementById('currCalcDir')?.value;
  const result = document.getElementById('currCalcResult');
  if (!result) return;

  getServiceCache('currency') || getCurrencyRates().then(() => {});
  const c = getServiceCache('currency');
  if (!c) return;

  if (dir === 'ilsToAed') {
    result.textContent = (input * parseFloat(c.ilsToAed)).toFixed(2) + ' AED';
  } else {
    result.textContent = (input * parseFloat(c.aedToIls)).toFixed(2) + ' ₪';
  }
}

// ==============================
// 3. FLIGHTS - Skyscanner
// ==============================
async function searchFlights(departDate, returnDate) {
  const cached = getServiceCache(`flights_${departDate}_${returnDate}`);
  if (cached) return cached;

  try {
    // Search TLV -> DXB
    const resp = await fetch(`https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights?originSkyId=TLV&destinationSkyId=DXB&originEntityId=27544008&destinationEntityId=27537542&date=${departDate}${returnDate ? '&returnDate=' + returnDate : ''}&cabinClass=economy&adults=1&currency=ILS&market=IL&countryCode=IL`, {
      headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com' }
    });
    const data = await resp.json();

    if (data.data?.itineraries) {
      const flights = data.data.itineraries.slice(0, 10).map(f => ({
        price: f.price?.formatted || f.price?.raw,
        priceRaw: f.price?.raw,
        legs: (f.legs || []).map(leg => ({
          departure: leg.departure,
          arrival: leg.arrival,
          duration: leg.durationInMinutes,
          carrier: leg.carriers?.marketing?.[0]?.name || '',
          carrierLogo: leg.carriers?.marketing?.[0]?.logoUrl || '',
          origin: leg.origin?.displayCode,
          destination: leg.destination?.displayCode,
          stops: leg.stopCount || 0
        })),
        deepLink: f.deepLink || ''
      }));
      setServiceCache(`flights_${departDate}_${returnDate}`, flights, 30 * 60 * 1000);
      return flights;
    }
  } catch(e) { console.error('Flights error:', e); }
  return null;
}

function renderFlightsWidget() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const weekLater = new Date(tomorrow);
  weekLater.setDate(weekLater.getDate() + 7);

  return `
    <div id="flightsWidget" style="margin:12px 20px;">
      <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;">
        <div style="font-weight:700;color:#2C5F6E;font-size:0.9rem;margin-bottom:10px;">
          <i class="fas fa-plane" style="color:#E76F51;"></i> טיסות תל אביב ↔ דובאי
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
          <div>
            <label style="font-size:0.75rem;color:#6B7F8D;">הלוך</label>
            <input type="date" id="flightDepart" value="${tomorrow.toISOString().split('T')[0]}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;">
          </div>
          <div>
            <label style="font-size:0.75rem;color:#6B7F8D;">חזור</label>
            <input type="date" id="flightReturn" value="${weekLater.toISOString().split('T')[0]}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;">
          </div>
        </div>
        <button onclick="doFlightSearch()" style="width:100%;padding:10px;border-radius:8px;background:#E76F51;color:#fff;border:none;font-family:Heebo;font-weight:600;cursor:pointer;">
          <i class="fas fa-search"></i> חפש טיסות
        </button>
        <div id="flightResults" style="margin-top:12px;"></div>
      </div>
    </div>
  `;
}

async function doFlightSearch() {
  const results = document.getElementById('flightResults');
  if (!results) return;
  const depart = document.getElementById('flightDepart')?.value;
  const ret = document.getElementById('flightReturn')?.value;

  results.innerHTML = '<div style="text-align:center;padding:20px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="color:#E76F51;"></i><br>מחפש טיסות TLV → DXB...</div>';

  const flights = await searchFlights(depart, ret);

  if (!flights || flights.length === 0) {
    results.innerHTML = '<div style="text-align:center;padding:16px;color:#6B7F8D;font-size:0.85rem;">לא נמצאו טיסות. נסה תאריכים אחרים או בדוק מרשת ללא חסימה.</div>';
    return;
  }

  results.innerHTML = flights.map(f => {
    const outbound = f.legs[0];
    const inbound = f.legs[1];
    return `
      <div style="background:#FDF6EC;border-radius:6px;padding:12px;margin-bottom:8px;border:1px solid #F5EFE6;${f.deepLink ? 'cursor:pointer;' : ''}" ${f.deepLink ? `onclick="window.open('${f.deepLink}','_blank')"` : ''}>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:1.1rem;font-weight:700;color:#E76F51;">${f.price || f.priceRaw + ' ₪'}</span>
          ${outbound?.stops === 0 ? '<span style="background:#2A9D8F;color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;">ישיר</span>' : `<span style="color:#6B7F8D;font-size:0.7rem;">${outbound?.stops} עצירות</span>`}
        </div>
        ${outbound ? `
          <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;margin-bottom:4px;">
            ${outbound.carrierLogo ? `<img src="${outbound.carrierLogo}" style="height:18px;">` : ''}
            <span style="color:#2C5F6E;font-weight:600;">${outbound.origin} → ${outbound.destination}</span>
            <span style="color:#6B7F8D;">${outbound.carrier}</span>
            <span style="color:#6B7F8D;">${Math.floor(outbound.duration/60)}ש ${outbound.duration%60}ד</span>
          </div>
        ` : ''}
        ${inbound ? `
          <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;">
            ${inbound.carrierLogo ? `<img src="${inbound.carrierLogo}" style="height:18px;">` : ''}
            <span style="color:#2C5F6E;font-weight:600;">${inbound.origin} → ${inbound.destination}</span>
            <span style="color:#6B7F8D;">${inbound.carrier}</span>
            <span style="color:#6B7F8D;">${Math.floor(inbound.duration/60)}ש ${inbound.duration%60}ד</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

// ==============================
// CACHE HELPER
// ==============================
const SERVICE_CACHE_KEY = 'dubai_services_cache';

function getServiceCache(key) {
  try {
    const cache = JSON.parse(localStorage.getItem(SERVICE_CACHE_KEY) || '{}');
    const entry = cache[key];
    if (entry && (Date.now() - entry.ts < entry.ttl)) return entry.data;
  } catch(e) {}
  return null;
}

function setServiceCache(key, data, ttl) {
  try {
    const cache = JSON.parse(localStorage.getItem(SERVICE_CACHE_KEY) || '{}');
    cache[key] = { data, ts: Date.now(), ttl };
    localStorage.setItem(SERVICE_CACHE_KEY, JSON.stringify(cache));
  } catch(e) {}
}
