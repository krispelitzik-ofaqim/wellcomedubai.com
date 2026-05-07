// ===== WEATHER + CURRENCY + FLIGHTS via RapidAPI =====
const RAPID_KEY = '425b399aaamsh5f1513665b08931p1f07b6jsne67eed469583';

// ==============================
// 1. WEATHER - WeatherAPI.com
// ==============================
function wmoCondition(code) {
  const map = {
    0:'בהיר',1:'כמעט בהיר',2:'מעונן חלקית',3:'מעונן',
    45:'ערפל',48:'ערפל מקפיא',
    51:'טפטוף קל',53:'טפטוף',55:'טפטוף חזק',
    61:'גשם קל',63:'גשם',65:'גשם חזק',
    71:'שלג קל',73:'שלג',75:'שלג חזק',
    80:'ממטרים',81:'ממטרים',82:'ממטרים חזקים',
    95:'סופת רעמים',96:'סופת ברד',99:'סופת ברד חזקה'
  };
  return map[code] || 'לא ידוע';
}
function wmoEmoji(code) {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 75) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

async function getDubaiWeather() {
  const cached = getServiceCache('weather3');
  if (cached) return cached;

  const url = 'https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7';
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    const resp = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (!data.current) throw new Error('No current data');
    const code = data.current.weather_code;
    const result = {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      condition: wmoCondition(code),
      icon: wmoEmoji(code),
      humidity: Math.round(data.current.relative_humidity_2m),
      wind: Math.round(data.current.wind_speed_10m),
      uv: Math.round((data.current.uv_index || 0) * 10) / 10,
      forecast: (data.daily?.time || []).map((dt, i) => ({
        date: dt,
        maxTemp: Math.round(data.daily.temperature_2m_max[i]),
        minTemp: Math.round(data.daily.temperature_2m_min[i]),
        condition: wmoCondition(data.daily.weather_code[i]),
        icon: wmoEmoji(data.daily.weather_code[i])
      }))
    };
    setServiceCache('weather3', result, 30 * 60 * 1000);
    return result;
  } catch(e) {
    console.error('Weather error:', e);
    return null;
  }
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
        <div style="font-size:3.5rem;line-height:1;">${w.icon}</div>
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
                <div style="font-size:1.5rem;line-height:1;">${d.icon}</div>
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
  const cached = getServiceCache('currency2');
  if (cached) return cached;

  try {
    const resp = await fetch('https://open.er-api.com/v6/latest/ILS');
    const data = await resp.json();
    console.log('Currency API response:', data);
    const rates = data.rates || {};
    const aed = rates.AED;
    const usd = rates.USD;
    const eur = rates.EUR;
    if (aed && usd && eur) {
      const result = {
        rates: { ILS: 1, AED: aed, USD: usd, EUR: eur },
        ilsToAed: aed.toFixed(4),
        aedToIls: (1 / aed).toFixed(4),
        timestamp: new Date().toLocaleString('he-IL')
      };
      setServiceCache('currency2', result, 60 * 60 * 1000); // 1 hour
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

  const r = c.rates || {};
  el.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #E5E7EB;">
      <div style="font-weight:700;color:#2C5F6E;font-size:0.9rem;margin-bottom:10px;">
        <i class="fas fa-exchange-alt" style="color:#E9C46A;"></i> מחשבון המרת מטבע
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:0.75rem;">
        <div style="background:#F5E6CB;border-radius:6px;padding:8px;text-align:center;"><b style="color:#E76F51;">1 ₪</b> = ${r.AED?.toFixed(3)} AED</div>
        <div style="background:#F5E6CB;border-radius:6px;padding:8px;text-align:center;"><b style="color:#2A9D8F;">1 AED</b> = ${(1/r.AED).toFixed(3)} ₪</div>
        <div style="background:#F5E6CB;border-radius:6px;padding:8px;text-align:center;"><b style="color:#5B9DC7;">1 $</b> = ${(r.AED/r.USD).toFixed(3)} AED</div>
        <div style="background:#F5E6CB;border-radius:6px;padding:8px;text-align:center;"><b style="color:#B85C8E;">1 €</b> = ${(r.AED/r.EUR).toFixed(3)} AED</div>
      </div>
      <!-- Calculator -->
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <input type="number" id="currCalcInput" value="100" oninput="calcCurrency()" style="flex:1;min-width:70px;padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.95rem;text-align:center;direction:ltr;font-weight:700;">
        <select id="currFrom" onchange="calcCurrency()" style="padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;font-weight:600;">
          <option value="ILS">₪ שקל</option>
          <option value="AED">AED דירהם</option>
          <option value="USD">$ דולר</option>
          <option value="EUR">€ יורו</option>
        </select>
        <span style="color:#6B7F8D;font-weight:700;">←</span>
        <select id="currTo" onchange="calcCurrency()" style="padding:8px;border-radius:6px;border:1px solid #E5E7EB;font-family:Heebo;font-size:0.85rem;font-weight:600;">
          <option value="AED">AED דירהם</option>
          <option value="ILS">₪ שקל</option>
          <option value="USD">$ דולר</option>
          <option value="EUR">€ יורו</option>
        </select>
        <div id="currCalcResult" style="flex:1;min-width:90px;padding:8px;border-radius:6px;background:#2C5F6E;color:#fff;text-align:center;font-weight:700;font-size:0.95rem;"></div>
      </div>
      <div style="font-size:0.65rem;color:#aaa;margin-top:6px;text-align:left;direction:ltr;">Updated: ${c.timestamp}</div>
    </div>
  `;
  calcCurrency();
}

function calcCurrency() {
  const input = parseFloat(document.getElementById('currCalcInput')?.value || 0);
  const from = document.getElementById('currFrom')?.value || 'ILS';
  const to = document.getElementById('currTo')?.value || 'AED';
  const result = document.getElementById('currCalcResult');
  if (!result) return;
  const c = getServiceCache('currency2');
  if (!c || !c.rates) return;
  const r = c.rates;
  if (!r[from] || !r[to]) return;
  const symbols = { ILS: '₪', AED: 'AED', USD: '$', EUR: '€' };
  const output = input * r[to] / r[from];
  result.textContent = output.toFixed(2) + ' ' + symbols[to];
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
      <div style="background:#F5E6CB;border-radius:6px;padding:12px;margin-bottom:8px;border:1px solid #F5EFE6;${f.deepLink ? 'cursor:pointer;' : ''}" ${f.deepLink ? `onclick="window.open('${f.deepLink}','_blank')"` : ''}>
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
