// ===== DXB AIRPORT LIVE FLIGHT BOARD =====
const AERO_HOST = 'aerodatabox.p.rapidapi.com';

async function getAirportFlights(direction) {
  const cached = getServiceCache(`dxb3_${direction}`);
  if (cached) return cached;

  try {
    const now = new Date();
    const from = now.toISOString().split('.')[0];
    const later = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const to = later.toISOString().split('.')[0];

    const resp = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/airports/icao/OMDB/${from}/${to}?direction=${direction}&withCancelled=false&withCodeshared=false&withLocation=false`,
      { headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': AERO_HOST } }
    );
    const data = await resp.json();

    const flights = (direction === 'Departure' ? data.departures : data.arrivals) || [];
    const isDepart = direction === 'Departure';
    const result = flights.slice(0, 100).map(f => {
      const m = f.movement || {};
      const otherAirport = m.airport || {};
      return {
        flight: f.number,
        airline: f.airline?.name || '',
        airlineLogo: f.airline?.name ? `https://logo.clearbit.com/${(f.airline.name).toLowerCase().replace(/\s/g,'')}.com` : '',
        origin: isDepart ? 'DXB' : (otherAirport.name || otherAirport.icao || ''),
        originCode: isDepart ? 'DXB' : (otherAirport.iata || ''),
        destination: isDepart ? (otherAirport.name || otherAirport.icao || '') : 'DXB',
        destinationCode: isDepart ? (otherAirport.iata || '') : 'DXB',
        scheduled: m.scheduledTime?.local || m.scheduledTimeLocal || '',
        actual: m.actualTime?.local || m.revisedTime?.local || m.predictedTime?.local || '',
        terminal: m.terminal || '',
        status: f.status || '',
        isTLV: (() => {
          const codes = [otherAirport.iata, otherAirport.icao].filter(Boolean).map(c => String(c).toUpperCase());
          const name = String(otherAirport.name || '').toLowerCase();
          const airline = (f.airline?.name || '').toLowerCase();
          if (codes.includes('TLV') || codes.includes('LLBG')) return true;
          if (name.includes('tel aviv') || name.includes('ben gurion')) return true;
          if (airline.includes('el al') || airline.includes('israir') || airline.includes('arkia')) return true;
          return false;
        })()
      };
    });

    setServiceCache(`dxb3_${direction}`, result, 10 * 60 * 1000); // 10 min cache
    return result;
  } catch(e) {
    console.error('Airport flights error:', e);
    return null;
  }
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const parts = isoStr.split('T');
    if (parts[1]) return parts[1].substring(0, 5);
  } catch(e) {}
  return '';
}

function statusBg(status) {
  if (!status) return '#F0F0F0';
  const s = status.toLowerCase();
  if (s.includes('landed') || s.includes('arrived')) return '#E6F7F5';
  if (s.includes('departed') || s.includes('en route')) return '#E6F7F5';
  if (s.includes('cancelled')) return '#FEE2E2';
  if (s.includes('delayed')) return '#FFF3E0';
  if (s.includes('scheduled') || s.includes('expected')) return '#EEF2F7';
  if (s.includes('boarding') || s.includes('gate')) return '#E8F5E9';
  return '#F0F0F0';
}

function statusColor(status) {
  if (!status) return '#6B7F8D';
  const s = status.toLowerCase();
  if (s.includes('landed') || s.includes('arrived')) return '#0D9488';
  if (s.includes('departed') || s.includes('en route')) return '#0D9488';
  if (s.includes('cancelled')) return '#DC2626';
  if (s.includes('delayed')) return '#D97706';
  if (s.includes('scheduled') || s.includes('expected')) return '#2C5F6E';
  return '#6B7F8D';
}

function statusHebrew(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  if (s.includes('landed')) return 'נחת';
  if (s.includes('arrived')) return 'הגיע';
  if (s.includes('departed')) return 'המריא';
  if (s.includes('en route')) return 'בדרך';
  if (s.includes('cancelled')) return 'בוטל';
  if (s.includes('delayed')) return 'מאחר';
  if (s.includes('scheduled')) return 'מתוכנן';
  if (s.includes('expected')) return 'צפוי';
  if (s.includes('boarding')) return 'עולים למטוס';
  if (s.includes('gate')) return 'שער פתוח';
  return status;
}

function renderFlightBoard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#1a4a5a);padding:12px 16px;">
        <div style="margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fas fa-plane" style="color:#E9C46A;font-size:1rem;"></i>
            <span style="color:#fff;font-weight:700;font-size:0.95rem;">נמל התעופה דובאי (DXB)</span>
          </div>
          <div style="color:rgba(255,255,255,0.75);font-size:0.78rem;margin-top:3px;padding-right:24px;">${new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <div style="display:flex;gap:4px;align-items:center;" id="boardTabs">
          <button onclick="loadFlightBoard('Departure')" id="tabDep" style="padding:6px 14px;border-radius:6px;border:none;font-family:Heebo;font-size:0.8rem;font-weight:600;cursor:pointer;background:#E9C46A;color:#2C5F6E;">
            <i class="fas fa-plane-departure"></i> המראות
          </button>
          <button onclick="loadFlightBoard('Arrival')" id="tabArr" style="padding:6px 14px;border-radius:6px;border:none;font-family:Heebo;font-size:0.8rem;font-weight:600;cursor:pointer;background:rgba(255,255,255,0.15);color:#fff;">
            <i class="fas fa-plane-arrival"></i> נחיתות
          </button>
          <span id="dubaiClock" style="color:#E9C46A;font-weight:700;direction:ltr;font-size:0.85rem;margin-right:auto;">${new Date().toLocaleTimeString('he-IL',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit'})} 🇦🇪</span>
          <span style="background:rgba(255,0,0,0.85);color:#fff;font-size:0.55rem;padding:3px 7px;border-radius:8px;font-weight:700;animation:pulse 1.5s infinite;">● LIVE</span>
        </div>
      </div>
      <div id="flightBoardContent" style="padding:8px;">
        <div style="text-align:center;padding:30px;color:#6B7F8D;">
          <i class="fas fa-spinner fa-spin" style="font-size:1.3rem;color:#E76F51;"></i><br>
          <span style="font-size:0.85rem;">טוען לוח טיסות...</span>
        </div>
      </div>
    </div>
  `;

  loadFlightBoard('Departure');

  if (window._dubaiClockInterval) clearInterval(window._dubaiClockInterval);
  window._dubaiClockInterval = setInterval(() => {
    const el = document.getElementById('dubaiClock');
    if (el) el.innerHTML = new Date().toLocaleTimeString('he-IL',{timeZone:'Asia/Dubai',hour:'2-digit',minute:'2-digit'}) + ' 🇦🇪';
    else clearInterval(window._dubaiClockInterval);
  }, 30000);
}

async function loadFlightBoard(direction) {
  // Update tabs
  const tabDep = document.getElementById('tabDep');
  const tabArr = document.getElementById('tabArr');
  if (tabDep && tabArr) {
    if (direction === 'Departure') {
      tabDep.style.background = '#E9C46A'; tabDep.style.color = '#2C5F6E';
      tabArr.style.background = 'rgba(255,255,255,0.15)'; tabArr.style.color = '#fff';
    } else {
      tabArr.style.background = '#E9C46A'; tabArr.style.color = '#2C5F6E';
      tabDep.style.background = 'rgba(255,255,255,0.15)'; tabDep.style.color = '#fff';
    }
  }

  const content = document.getElementById('flightBoardContent');
  if (!content) return;

  content.innerHTML = '<div style="text-align:center;padding:30px;color:#6B7F8D;"><i class="fas fa-spinner fa-spin" style="color:#E76F51;"></i> טוען...</div>';

  const allFlights = await getAirportFlights(direction);
  const tlvFlights = (allFlights || []).filter(f => f.isTLV);
  const flights = tlvFlights.length > 0 ? tlvFlights : (allFlights || []);
  const noTLV = tlvFlights.length === 0;

  if (!flights || flights.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:#6B7F8D;font-size:0.85rem;">לא ניתן לטעון נתוני טיסות כרגע. נסה שוב מאוחר יותר.</div>';
    return;
  }

  const isDepart = direction === 'Departure';

  content.innerHTML = `
    ${noTLV ? '<div style="background:#FFF3CD;color:#856404;padding:8px;font-size:0.7rem;text-align:center;border-radius:4px;margin-bottom:6px;">⚠️ לא נמצאו טיסות מזוהות לישראל ב-12 ש׳ הקרובות. מציג את כל הטיסות.</div>' : ''}
    <!-- Table header -->
    <div style="display:grid;grid-template-columns:60px 50px 1fr 60px;gap:4px;padding:8px 4px;font-size:0.72rem;color:#6B7F8D;font-weight:600;border-bottom:1px solid #F5EFE6;">
      <span>טיסה</span>
      <span>${isDepart ? 'יעד' : 'מוצא'}</span>
      <span>חברה</span>
      <span>סטטוס</span>
    </div>
    ${flights.map(f => `
      <div style="display:grid;grid-template-columns:60px 50px 1fr 60px;gap:4px;padding:8px 4px;font-size:0.85rem;align-items:center;border-bottom:1px solid #faf5ed;cursor:pointer;${f.isTLV ? 'background:#FFF8E7;' : ''}" onclick="openFlightDetail('${f.flight}','${f.airline}','${isDepart ? f.destination : f.origin}','${isDepart ? f.destinationCode : f.originCode}','${formatTime(f.scheduled)}','${formatTime(f.actual)}','${f.terminal}','${f.status}','${isDepart ? 'departure' : 'arrival'}','${f.isTLV}')">
        <span style="font-weight:700;color:#E76F51;font-size:0.8rem;">${f.flight}</span>
        <span style="font-weight:800;color:#2A9D8F;font-size:0.8rem;direction:ltr;text-align:center;">${(isDepart ? f.destinationCode : f.originCode) || '—'}</span>
        <span style="color:#2C5F6E;font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.airline}</span>
        <span style="background:${statusBg(f.status)};color:${statusColor(f.status)};font-size:0.65rem;font-weight:700;padding:3px 6px;border-radius:4px;text-align:center;">${statusHebrew(f.status)}</span>
      </div>
    `).join('')}
    <div style="text-align:center;padding:8px;font-size:0.7rem;color:#aaa;">
      עודכן: ${new Date().toLocaleTimeString('he-IL')} | נמל התעופה הבינלאומי דובאי (DXB)
    </div>
  `;
}

// Flight detail popup
function openFlightDetail(flight, airline, city, cityCode, scheduled, actual, terminal, status, direction, isTLV) {
  const isDepart = direction === 'departure';
  const flightClean = flight.replace(/\s/g, '');

  const modal = document.getElementById('detailModal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-sheet" style="max-width:440px;height:auto;max-height:100vh;border-radius:8px;margin:auto;align-self:center;position:relative;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);padding:20px;color:#fff;">
        <button onclick="document.getElementById('detailModal').classList.remove('active')" style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,0.25);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.1rem;font-weight:700;z-index:10;display:flex;align-items:center;justify-content:center;">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <i class="fas fa-${isDepart ? 'plane-departure' : 'plane-arrival'}" style="font-size:1.8rem;color:#E9C46A;"></i>
          <div>
            <div style="font-size:1.4rem;font-weight:800;">${flight}</div>
            <div style="opacity:0.8;font-size:0.85rem;">${airline}</div>
          </div>
        </div>
        <div style="display:flex;gap:20px;align-items:center;justify-content:center;margin-top:8px;">
          <div style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;">${isDepart ? 'DXB' : (cityCode || '?')}</div>
            <div style="font-size:0.7rem;opacity:0.7;">${isDepart ? 'דובאי' : city}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;">
            <i class="fas fa-long-arrow-alt-left" style="font-size:1.2rem;color:#E9C46A;"></i>
            <div style="font-size:0.65rem;opacity:0.6;">${isDepart ? 'המראה' : 'נחיתה'}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;">${isDepart ? (cityCode || '?') : 'DXB'}</div>
            <div style="font-size:0.7rem;opacity:0.7;">${isDepart ? city : 'דובאי'}</div>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#FDF6EC;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:0.7rem;color:#6B7F8D;">שעה מתוכננת</div>
            <div style="font-size:1.3rem;font-weight:700;color:#2C5F6E;direction:ltr;">${scheduled || '-'}</div>
          </div>
          <div style="background:#FDF6EC;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:0.7rem;color:#6B7F8D;">שעה בפועל</div>
            <div style="font-size:1.3rem;font-weight:700;color:${actual && actual !== scheduled ? '#E76F51' : '#2A9D8F'};direction:ltr;">${actual || scheduled || '-'}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:#FDF6EC;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:0.7rem;color:#6B7F8D;">טרמינל</div>
            <div style="font-size:1.1rem;font-weight:700;color:#2C5F6E;">${terminal || '-'}</div>
          </div>
          <div style="background:#FDF6EC;border-radius:8px;padding:12px;text-align:center;">
            <div style="font-size:0.7rem;color:#6B7F8D;">סטטוס</div>
            <div style="font-size:0.9rem;font-weight:700;color:${statusColor(status)};">${statusHebrew(status)}</div>
          </div>
        </div>

        ${isTLV === 'true' ? '<div style="background:#FFF8E7;border-radius:8px;padding:10px;text-align:center;margin-bottom:16px;font-size:0.85rem;color:#2C5F6E;"><span style="font-size:1rem;">🇮🇱</span> טיסה ישירה לישראל / מישראל</div>' : ''}

        <!-- Action buttons -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="https://www.flightradar24.com/data/flights/${flightClean.toLowerCase()}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:8px;background:#E76F51;color:#fff;text-decoration:none;font-weight:600;">
            <i class="fas fa-satellite-dish"></i> מעקב חי - Flightradar24
          </a>
          <a href="https://www.flightaware.com/live/flight/${flightClean}" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:8px;background:#2C5F6E;color:#fff;text-decoration:none;font-weight:600;">
            <i class="fas fa-radar"></i> מעקב - FlightAware
          </a>
          <a href="https://www.google.com/search?q=${flightClean}+flight+status" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:8px;background:#E9C46A;color:#2C5F6E;text-decoration:none;font-weight:600;">
            <i class="fab fa-google"></i> חפש בגוגל
          </a>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}
