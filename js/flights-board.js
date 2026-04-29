// ===== DXB AIRPORT LIVE FLIGHT BOARD =====
const AERO_HOST = 'aerodatabox.p.rapidapi.com';

async function getAirportFlights(direction) {
  const cached = getServiceCache(`dxb_${direction}`);
  if (cached) return cached;

  try {
    const now = new Date();
    const from = now.toISOString().split('.')[0];
    const later = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const to = later.toISOString().split('.')[0];

    const resp = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/airports/icao/OMDB/${from}/${to}?direction=${direction}&withCancelled=false&withCodeshared=false&withLocation=false`,
      { headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': AERO_HOST } }
    );
    const data = await resp.json();

    const flights = (direction === 'Departure' ? data.departures : data.arrivals) || [];
    const result = flights.slice(0, 30).map(f => ({
      flight: f.number,
      airline: f.airline?.name || '',
      airlineLogo: f.airline?.name ? `https://logo.clearbit.com/${(f.airline.name).toLowerCase().replace(/\s/g,'')}.com` : '',
      origin: direction === 'Arrival' ? (f.departure?.airport?.name || f.departure?.airport?.icao || '') : 'DXB',
      originCode: direction === 'Arrival' ? (f.departure?.airport?.iata || '') : 'DXB',
      destination: direction === 'Departure' ? (f.arrival?.airport?.name || f.arrival?.airport?.icao || '') : 'DXB',
      destinationCode: direction === 'Departure' ? (f.arrival?.airport?.iata || '') : 'DXB',
      scheduled: f.departure?.scheduledTime?.local || f.arrival?.scheduledTime?.local || '',
      actual: f.departure?.actualTime?.local || f.arrival?.actualTime?.local || '',
      terminal: f.departure?.terminal || f.arrival?.terminal || '',
      status: f.status || '',
      isTLV: (f.departure?.airport?.iata === 'TLV' || f.arrival?.airport?.iata === 'TLV')
    }));

    setServiceCache(`dxb_${direction}`, result, 10 * 60 * 1000); // 10 min cache
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="fas fa-plane" style="color:#E9C46A;font-size:1rem;"></i>
            <span style="color:#fff;font-weight:700;font-size:0.9rem;">נמל התעופה דובאי (DXB)</span>
          </div>
          <span style="color:rgba(255,255,255,0.7);font-size:0.7rem;">${new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;" id="boardTabs">
          <span style="background:rgba(255,0,0,0.85);color:#fff;font-size:0.5rem;padding:2px 6px;border-radius:8px;font-weight:700;animation:pulse 1.5s infinite;">● LIVE</span>
          <button onclick="loadFlightBoard('Departure')" id="tabDep" style="padding:6px 14px;border-radius:6px;border:none;font-family:Heebo;font-size:0.8rem;font-weight:600;cursor:pointer;background:#E9C46A;color:#2C5F6E;">
            <i class="fas fa-plane-departure"></i> המראות
          </button>
          <button onclick="loadFlightBoard('Arrival')" id="tabArr" style="padding:6px 14px;border-radius:6px;border:none;font-family:Heebo;font-size:0.8rem;font-weight:600;cursor:pointer;background:rgba(255,255,255,0.15);color:#fff;">
            <i class="fas fa-plane-arrival"></i> נחיתות
          </button>
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

  const flights = await getAirportFlights(direction);

  if (!flights || flights.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:20px;color:#6B7F8D;font-size:0.85rem;">לא ניתן לטעון נתוני טיסות כרגע. נסה שוב מאוחר יותר.</div>';
    return;
  }

  const isDepart = direction === 'Departure';

  content.innerHTML = `
    <!-- Table header -->
    <div style="display:grid;grid-template-columns:55px 1fr 50px;gap:3px;padding:6px 4px;font-size:0.6rem;color:#6B7F8D;font-weight:600;border-bottom:1px solid #F5EFE6;">
      <span>טיסה</span>
      <span>חברה</span>
      <span>סטטוס</span>
    </div>
    ${flights.map(f => `
      <div style="display:grid;grid-template-columns:55px 1fr 50px;gap:3px;padding:5px 4px;font-size:0.7rem;align-items:center;border-bottom:1px solid #faf5ed;cursor:pointer;${f.isTLV ? 'background:#FFF8E7;' : ''}" onclick="openFlightDetail('${f.flight}','${f.airline}','${isDepart ? f.destination : f.origin}','${isDepart ? f.destinationCode : f.originCode}','${formatTime(f.scheduled)}','${formatTime(f.actual)}','${f.terminal}','${f.status}','${isDepart ? 'departure' : 'arrival'}','${f.isTLV}')">
        <span style="font-weight:600;color:#E76F51;font-size:0.65rem;">${f.flight}</span>
        <span style="color:#2C5F6E;font-size:0.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.airline}</span>
        <span style="background:${statusBg(f.status)};color:${statusColor(f.status)};font-size:0.55rem;font-weight:700;padding:2px 5px;border-radius:4px;text-align:center;">${statusHebrew(f.status)}</span>
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
    <div class="modal-sheet" style="max-width:440px;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2C5F6E,#2A9D8F);padding:20px;color:#fff;">
        <button onclick="document.getElementById('detailModal').classList.remove('active')" style="position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;">✕</button>
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
