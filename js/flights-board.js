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

function statusColor(status) {
  if (!status) return '#6B7F8D';
  const s = status.toLowerCase();
  if (s.includes('landed') || s.includes('arrived')) return '#2A9D8F';
  if (s.includes('departed') || s.includes('en route')) return '#2A9D8F';
  if (s.includes('cancelled')) return '#E76F51';
  if (s.includes('delayed')) return '#F4A261';
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
      <div style="background:linear-gradient(135deg,#2C5F6E,#1a4a5a);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i class="fas fa-plane" style="color:#E9C46A;font-size:1.1rem;"></i>
          <span style="color:#fff;font-weight:700;font-size:0.95rem;">נמל התעופה דובאי (DXB) - טיסות חי</span>
        </div>
        <div style="display:flex;gap:4px;" id="boardTabs">
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
    <div style="display:grid;grid-template-columns:70px 1fr 60px 50px 55px 65px;gap:4px;padding:8px 6px;font-size:0.7rem;color:#6B7F8D;font-weight:600;border-bottom:1px solid #F5EFE6;">
      <span>טיסה</span>
      <span>${isDepart ? 'יעד' : 'מוצא'}</span>
      <span>שעה</span>
      <span>טרמ׳</span>
      <span>סטטוס</span>
      <span></span>
    </div>
    ${flights.map(f => `
      <div style="display:grid;grid-template-columns:70px 1fr 60px 50px 55px 65px;gap:4px;padding:8px 6px;font-size:0.8rem;align-items:center;border-bottom:1px solid #faf5ed;${f.isTLV ? 'background:#FFF8E7;' : ''}">
        <span style="font-weight:600;color:#2C5F6E;font-size:0.75rem;">${f.flight}</span>
        <span style="display:flex;align-items:center;gap:4px;">
          ${f.isTLV ? '<span style="font-size:0.65rem;">🇮🇱</span>' : ''}
          <span style="color:#2C5F6E;font-size:0.78rem;">${isDepart ? f.destination : f.origin}</span>
          <span style="color:#6B7F8D;font-size:0.65rem;">${isDepart ? f.destinationCode : f.originCode}</span>
        </span>
        <span style="font-weight:600;color:#2C5F6E;direction:ltr;text-align:center;">${formatTime(f.scheduled)}</span>
        <span style="color:#6B7F8D;text-align:center;font-size:0.75rem;">${f.terminal || '-'}</span>
        <span style="color:${statusColor(f.status)};font-size:0.7rem;font-weight:600;">${statusHebrew(f.status)}</span>
        <span style="font-size:0.65rem;color:#6B7F8D;">${f.airline}</span>
      </div>
    `).join('')}
    <div style="text-align:center;padding:8px;font-size:0.7rem;color:#aaa;">
      עודכן: ${new Date().toLocaleTimeString('he-IL')} | נמל התעופה הבינלאומי דובאי (DXB)
    </div>
  `;
}
