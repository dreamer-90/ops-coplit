import { store } from './state.js';
import { updateActiveZoneDetails } from './ui/render.js';

const RISK_ICONS = {
  low: '<span class="material-symbols-outlined text-[10px]">check_circle</span>',
  moderate: '<span class="material-symbols-outlined text-[10px]">info</span>',
  high: '<span class="material-symbols-outlined text-[10px]">warning</span>',
  critical: '<span class="material-symbols-outlined text-[10px] animate-pulse">crisis_alert</span>'
};

function densityToRisk(pct) {
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'high';
  if (pct >= 50) return 'moderate';
  return 'low';
}

export function updateMapAesthetics(decision, event) {
  if (!decision) return;
  decision.affected_zones.forEach(z => {
    const path = document.getElementById(`map-zone-${z}`);
    if (path) {
      path.className.baseVal = `zone-arc arc-${decision.risk_level}`;
    }
  });

  // Check for gate specifics
  const combinedText = ((event && event.description) || '') + ' ' + (decision.recommended_action || '') + ' ' + (decision.reasoning || '');
  const gateMatch = combinedText.match(/\b(G[1-4]|Turnstile [1-4])\b/i);
  
  if (gateMatch) {
    let gateId = gateMatch[1].toUpperCase();
    if (gateId.startsWith('TURNSTILE')) {
      gateId = 'G' + gateId.replace('TURNSTILE ', '');
    }
    
    const gateEl = document.getElementById(`gate-${gateId}`);
    if (gateEl) {
      gateEl.classList.add('animate-ping', 'stroke-status-danger');
      gateEl.setAttribute('r', '12');
      gateEl.style.transformOrigin = 'center';
    }
  }
}

export function resetMapAesthetic() {
  ['A', 'B', 'C', 'D'].forEach(z => {
    const path = document.getElementById(`map-zone-${z}`);
    if (path) {
      path.className.baseVal = `zone-arc arc-nominal`;
    }
  });
  
  ['G1', 'G2', 'G3', 'G4'].forEach(g => {
    const gateEl = document.getElementById(`gate-${g}`);
    if (gateEl) {
      gateEl.classList.remove('animate-ping', 'stroke-status-danger');
      gateEl.setAttribute('r', '6');
    }
  });
}

export function setActiveDivision(zoneId) {
  store.dispatch({ type: 'SET_ACTIVE_DIVISION', payload: zoneId });

  // Reset path outlines
  ['A', 'B', 'C', 'D'].forEach(z => {
    const path = document.getElementById(`map-zone-${z}`);
    if (path) path.classList.remove('active-division');
  });

  const activePath = document.getElementById(`map-zone-${zoneId}`);
  if (activePath) activePath.classList.add('active-division');

  const s = store.getState();

  // Update floating badge coordinates and content over the active path
  const mapZoneBadgeOverlay = document.getElementById('map-zone-badge-overlay');
  const mapZoneBadgeText = document.getElementById('map-zone-badge-text');

  const history = s.zoneHistory[zoneId] || [0];
  const currentDensity = history[history.length - 1] || 0;
  const riskLvl = densityToRisk(currentDensity);

  if (riskLvl !== 'low' && mapZoneBadgeOverlay) {
    mapZoneBadgeOverlay.style.display = '';
    mapZoneBadgeOverlay.className = `map-overlay-badge risk-badge--${riskLvl}`;
    
    // Position badge close to the active SVG path
    if (zoneId === 'A') { mapZoneBadgeOverlay.style.top = '15%'; mapZoneBadgeOverlay.style.left = '50%'; }
    else if (zoneId === 'B') { mapZoneBadgeOverlay.style.top = '50%'; mapZoneBadgeOverlay.style.left = '75%'; }
    else if (zoneId === 'C') { mapZoneBadgeOverlay.style.top = '80%'; mapZoneBadgeOverlay.style.left = '50%'; }
    else if (zoneId === 'D') { mapZoneBadgeOverlay.style.top = '50%'; mapZoneBadgeOverlay.style.left = '25%'; }

    if (mapZoneBadgeText) {
      mapZoneBadgeText.innerHTML = `${RISK_ICONS[riskLvl]} ${riskLvl.toUpperCase()}`;
    }
  } else if (mapZoneBadgeOverlay) {
    mapZoneBadgeOverlay.style.display = 'none';
  }

  updateActiveZoneDetails();
}

export function setupMapClickHandlers() {
  ['A', 'B', 'C', 'D'].forEach(z => {
    const path = document.getElementById(`map-zone-${z}`);
    if (path) {
      path.addEventListener('click', () => setActiveDivision(z));
      path.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveDivision(z);
        }
      });
    }
  });
}
