import { store } from '../state.js';
import { triggerScram } from '../api.js';
import { showToast } from './toast.js';
import { renderModalRoster } from './roster.js';

let previousFocusScram = null;
let previousFocusDispatch = null;

// --- SCRAM Modal ---

export function openScramModal() {
  previousFocusScram = document.activeElement;
  const modal = document.getElementById('scram-modal');
  const input = document.getElementById('scram-confirm-input');
  const btnExecute = document.getElementById('btn-execute-scram');
  
  if (!modal) return;
  
  // Reset modal state
  input.value = '';
  btnExecute.disabled = true;
  document.querySelectorAll('input[name="scram_level"]').forEach(r => r.checked = false);
  
  modal.classList.remove('opacity-0', 'pointer-events-none');
  
  // Focus first element
  setTimeout(() => {
    const firstInput = document.querySelector('input[name="scram_level"]');
    if(firstInput) firstInput.focus();
  }, 50);
  
  // Tab trap
  modal.onkeydown = (e) => {
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    if (e.key === 'Escape') {
      closeScramModal();
    }
  };
  
  input.oninput = (e) => {
    const levelSelected = document.querySelector('input[name="scram_level"]:checked');
    btnExecute.disabled = !(e.target.value === 'SCRAM' && levelSelected);
  };
  
  document.querySelectorAll('input[name="scram_level"]').forEach(r => {
    r.onchange = () => {
      btnExecute.disabled = !(input.value === 'SCRAM' && r.checked);
    };
  });
}

export function closeScramModal() {
  const modal = document.getElementById('scram-modal');
  if (!modal) return;
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.onkeydown = null;
  if (previousFocusScram) {
    previousFocusScram.focus();
  }
}

export async function executeScram() {
  const levelSelected = document.querySelector('input[name="scram_level"]:checked');
  if (!levelSelected) return;
  const levelNum = parseInt(levelSelected.value);
  
  try {
    await triggerScram(levelNum);
    // UI update handled manually for now since we don't await WS feedback immediately
    const riskLevel = levelNum >= 3 ? 'critical' : 'high';
    const manualDecision = {
      event_id: `SCRAM-${Date.now()}`,
      recommended_action: `SYSTEM SCRAM LEVEL ${levelNum} INITIATED`,
      reasoning: `Manual Override [Operator ID: CMD-Alpha] • Emergency lockdown protocols engaged. AI auto-responses suspended.`,
      mission_objective: 'Absolute Containment',
      expected_outcome: 'All operations frozen pending manual review',
      risk_level: riskLevel,
      affected_zones: ['A', 'B', 'C', 'D'],
      staff_allocation: [],
      timestamp: new Date().toISOString()
    };
    
    store.dispatch({ type: 'ADD_DECISION', payload: manualDecision });
    store.dispatch({ type: 'SET_SCRAM_LEVEL', payload: levelNum });
    
    document.body.classList.add('border-8', 'border-status-danger', 'box-border');
    const wsStatus = document.getElementById('ws-status');
    const footerStatus = document.getElementById('footer-status');
    if (wsStatus) {
      wsStatus.innerHTML = `<span class="material-symbols-outlined text-white animate-pulse">crisis_alert</span><span class="text-white text-sm font-bold tracking-wider">SCRAM ACTIVE</span>`;
      wsStatus.classList.replace('bg-status-danger/10', 'bg-status-danger');
    }
    if (footerStatus) {
      footerStatus.textContent = `SCRAM LEVEL ${levelNum}`;
      footerStatus.classList.replace('text-status-success', 'text-status-danger');
    }
    
    closeScramModal();
    showToast(`SCRAM LEVEL ${levelNum} ENGAGED`, 'warning');
  } catch (err) {
    showToast(`SCRAM Failed: ${err.message}`, 'error');
  }
}

// --- Dispatch Modal ---

export function openDispatchModal(incidentId) {
  previousFocusDispatch = document.activeElement;
  const s = store.getState();
  const incident = s.incidents.find(i => i.id === incidentId);
  const dispatchModal = document.getElementById('dispatch-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalSearchInput = document.getElementById('modal-search-input');
  
  if (!dispatchModal) return;

  let title = 'Manual Incident';
  let subtitle = `Dispatch override for Division ${s.activeDivision}`;
  let zone = s.activeDivision;

  if (incident) {
    title = incident.name;
    subtitle = incident.meta;
    zone = incident.zone;
  } else {
    const dec = s.decisions.find(d => d.event_id === incidentId);
    if (dec) {
      title = dec.recommended_action;
      subtitle = dec.reasoning;
      zone = dec.affected_zones[0] || s.activeDivision;
    }
  }

  store.dispatch({ type: 'SELECT_INCIDENT', payload: incidentId });
  // clear previous selections
  store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'manager', id: null } });
  store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'volunteer', id: null } });

  modalTitle.textContent = `Dispatch response to ${title}`;
  modalSubtitle.textContent = `${subtitle} (Target: Zone ${zone})`;
  if (modalSearchInput) modalSearchInput.value = '';

  renderModalRoster();
  generateSmartSuggestions(title, zone);

  dispatchModal.setAttribute('aria-hidden', 'false');
  dispatchModal.classList.add('active');
  updateConfirmBtnState();
  
  // Focus search input automatically
  setTimeout(() => {
    if (modalSearchInput) modalSearchInput.focus();
  }, 50);

  // Tab trap
  dispatchModal.onkeydown = (e) => {
    if (e.key === 'Tab') {
      const focusable = dispatchModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    if (e.key === 'Escape') {
      closeDispatchModal();
    }
  };
}

export function closeDispatchModal() {
  const dispatchModal = document.getElementById('dispatch-modal');
  if (!dispatchModal) return;
  
  dispatchModal.setAttribute('aria-hidden', 'true');
  dispatchModal.classList.remove('active');
  dispatchModal.onkeydown = null;
  
  store.dispatch({ type: 'SELECT_INCIDENT', payload: null });
  
  if (previousFocusDispatch) {
    previousFocusDispatch.focus();
  }
}

export function confirmDispatch() {
  const s = store.getState();
  if (!s.selectedManagerId && !s.selectedVolunteerId) return;

  const btn = document.getElementById('btn-confirm-dispatch');
  btn.textContent = 'DISPATCHING...';
  btn.classList.add('animate-pulse');

  setTimeout(() => {
    // Determine target zone
    let targetZone = s.activeDivision;
    const inc = s.incidents.find(i => i.id === s.selectedIncidentId);
    if (inc) targetZone = inc.zone;

    const allocations = [];
    if (s.selectedManagerId) {
      const mgr = s.roster.find(r => r.id === s.selectedManagerId);
      if (mgr) allocations.push({ role: 'security', from_zone: mgr.zone, to_zone: targetZone });
    }
    if (s.selectedVolunteerId) {
      const vol = s.roster.find(r => r.id === s.selectedVolunteerId);
      if (vol) allocations.push({ role: 'volunteer', from_zone: vol.zone, to_zone: targetZone });
    }

    const manualDecision = {
      event_id: `MANUAL-${Date.now()}`,
      recommended_action: `MANUAL DISPATCH TO ZONE ${targetZone}`,
      reasoning: `Operator Override • Response units reassigned`,
      risk_level: 'moderate',
      affected_zones: [targetZone],
      staff_allocation: allocations,
      timestamp: new Date().toISOString()
    };
    
    store.dispatch({ type: 'ADD_DECISION', payload: manualDecision });
    store.dispatch({ type: 'ALLOCATE_STAFF', payload: allocations });

    btn.classList.remove('animate-pulse');
    btn.textContent = 'CONFIRM DISPATCH';
    closeDispatchModal();
    showToast(`Resources dispatched to Zone ${targetZone}`, 'success');
  }, 600);
}

function generateSmartSuggestions(title, zone) {
  const s = store.getState();
  const container = document.getElementById('modal-suggestions');
  if (!container) return;
  container.innerHTML = '';
  const descLower = title.toLowerCase();

  const getTradeoff = (person) => {
    if (person.zone === zone) return `<span class="text-muted text-[10px]">No zone impact (already on-site)</span>`;
    if (person.zone === 'A' || person.zone === 'D') return `<span class="text-status-warning text-[10px]">Warning: Reduces North/West perimeter strength</span>`;
    if (person.zone === 'C') return `<span class="text-status-danger text-[10px] animate-pulse">Critical: Leaves Zone C vulnerable</span>`;
    return `<span class="text-muted text-[10px]">No significant zone impact</span>`;
  };

  const getEta = (person) => person.zone === zone ? 1 : 4;

  let suggestedManager = s.roster.find(p => p.role === 'manager' && p.status === 'available' && p.zone === zone);
  if (!suggestedManager) {
    if (descLower.includes('medical')) {
      suggestedManager = s.roster.find(p => p.role === 'manager' && p.status === 'available' && p.specialty.includes('Emergency'));
    } else {
      suggestedManager = s.roster.find(p => p.role === 'manager' && p.status === 'available');
    }
  }

  let suggestedVolunteer = s.roster.find(p => p.role === 'volunteer' && p.status === 'available' && p.zone === zone);
  if (!suggestedVolunteer) {
    if (descLower.includes('medical')) {
      suggestedVolunteer = s.roster.find(p => p.role === 'volunteer' && p.status === 'available' && p.specialty.includes('First Aid'));
    } else if (descLower.includes('crowd') || descLower.includes('density') || descLower.includes('congestion')) {
      suggestedVolunteer = s.roster.find(p => p.role === 'volunteer' && p.status === 'available' && p.specialty.includes('Crowd'));
    } else {
      suggestedVolunteer = s.roster.find(p => p.role === 'volunteer' && p.status === 'available');
    }
  }

  const suggGrid = document.createElement('div');
  suggGrid.className = 'grid grid-cols-2 gap-4';

  if (suggestedManager) {
    const card = document.createElement('div');
    const isSelected = s.selectedManagerId === suggestedManager.id;
    card.className = `suggested-card group ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary text-xl">smart_toy</span>
        <div>
          <div class="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">AI Suggests: Commander</div>
          <div class="text-sm font-bold text-white">${suggestedManager.name}</div>
          <div class="text-[11px] text-muted mb-1">${suggestedManager.specialty} • Current: Zone ${suggestedManager.zone}</div>
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-primary text-[10px]">✓ ETA: ${getEta(suggestedManager)} mins</span>
            ${getTradeoff(suggestedManager)}
          </div>
        </div>
      </div>
      <span class="material-symbols-outlined ${isSelected ? 'text-status-success' : 'text-white/20 group-hover:text-primary'} transition-colors">${isSelected ? 'check_circle' : 'add_circle'}</span>
    `;
    card.onclick = () => {
      store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'manager', id: isSelected ? null : suggestedManager.id } });
      renderModalRoster();
      generateSmartSuggestions(title, zone); // Re-render to update selected state visually
    };
    suggGrid.appendChild(card);
  }

  if (suggestedVolunteer) {
    const card = document.createElement('div');
    const isSelected = s.selectedVolunteerId === suggestedVolunteer.id;
    card.className = `suggested-card group ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary text-xl">smart_toy</span>
        <div>
          <div class="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">AI Suggests: Team</div>
          <div class="text-sm font-bold text-white">${suggestedVolunteer.name}</div>
          <div class="text-[11px] text-muted mb-1">${suggestedVolunteer.specialty} • Current: Zone ${suggestedVolunteer.zone}</div>
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-primary text-[10px]">✓ ETA: ${getEta(suggestedVolunteer)} mins</span>
            ${getTradeoff(suggestedVolunteer)}
          </div>
        </div>
      </div>
      <span class="material-symbols-outlined ${isSelected ? 'text-status-success' : 'text-white/20 group-hover:text-primary'} transition-colors">${isSelected ? 'check_circle' : 'add_circle'}</span>
    `;
    card.onclick = () => {
      store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'volunteer', id: isSelected ? null : suggestedVolunteer.id } });
      renderModalRoster();
      generateSmartSuggestions(title, zone);
    };
    suggGrid.appendChild(card);
  }

  container.appendChild(suggGrid);
}

export function updateConfirmBtnState() {
  const s = store.getState();
  const btn = document.getElementById('btn-confirm-dispatch');
  if (btn) {
    btn.disabled = (!s.selectedManagerId && !s.selectedVolunteerId);
  }
}
