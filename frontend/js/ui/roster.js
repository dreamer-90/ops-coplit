import { store } from '../state.js';
import { openDispatchModal } from './modals.js';

export function renderModalRoster() {
  const s = store.getState();
  const managerList = document.getElementById('manager-list');
  const volunteerList = document.getElementById('volunteer-list');
  if (!managerList || !volunteerList) return;

  const searchTerm = s.modalSearch.toLowerCase();
  
  const managers = s.roster.filter(r => r.role === 'manager' && (r.name.toLowerCase().includes(searchTerm) || r.specialty.toLowerCase().includes(searchTerm)));
  const volunteers = s.roster.filter(r => r.role === 'volunteer' && (r.name.toLowerCase().includes(searchTerm) || r.specialty.toLowerCase().includes(searchTerm)));

  managerList.innerHTML = managers.map(m => `
    <div class="roster-item ${s.selectedManagerId === m.id ? 'selected' : ''} ${m.status !== 'available' ? 'opacity-50' : ''}" 
         data-id="${m.id}" data-role="manager" ${m.status === 'available' ? 'onclick="window.selectManager(\'' + m.id + '\')"' : ''}>
      <div class="flex items-center justify-between">
        <div>
          <div class="font-bold text-sm flex items-center gap-2">
            ${m.name}
            ${m.status === 'deployed' ? '<span class="px-1.5 py-0.5 rounded-sm bg-status-danger/20 text-status-danger text-[9px] uppercase">Deployed</span>' : ''}
          </div>
          <div class="text-[11px] text-muted">${m.specialty} • Zone ${m.zone}</div>
        </div>
        ${s.selectedManagerId === m.id ? '<span class="material-symbols-outlined text-status-success">check_circle</span>' : ''}
      </div>
    </div>
  `).join('');

  volunteerList.innerHTML = volunteers.map(v => `
    <div class="roster-item ${s.selectedVolunteerId === v.id ? 'selected' : ''} ${v.status !== 'available' ? 'opacity-50' : ''}" 
         data-id="${v.id}" data-role="volunteer" ${v.status === 'available' ? 'onclick="window.selectVolunteer(\'' + v.id + '\')"' : ''}>
      <div class="flex items-center justify-between">
        <div>
          <div class="font-bold text-sm flex items-center gap-2">
            ${v.name}
            ${v.status === 'deployed' ? '<span class="px-1.5 py-0.5 rounded-sm bg-status-danger/20 text-status-danger text-[9px] uppercase">Deployed</span>' : ''}
          </div>
          <div class="text-[11px] text-muted">${v.specialty} • Zone ${v.zone}</div>
        </div>
        ${s.selectedVolunteerId === v.id ? '<span class="material-symbols-outlined text-status-success">check_circle</span>' : ''}
      </div>
    </div>
  `).join('');
}

export function updatePersonnelSummary() {
  const s = store.getState();
  const summary = document.getElementById('personnel-summary');
  if (!summary) return;

  const total = s.roster.length;
  const deployed = s.roster.filter(r => r.status === 'deployed').length;
  const available = total - deployed;

  summary.innerHTML = `
    <div class="flex justify-between items-center text-xs mb-1">
      <span class="text-muted">Total Active Personnel</span>
      <span class="font-mono text-white">${total}</span>
    </div>
    <div class="flex justify-between items-center text-xs mb-1">
      <span class="text-status-success">Available</span>
      <span class="font-mono text-white">${available}</span>
    </div>
    <div class="flex justify-between items-center text-xs">
      <span class="text-status-warning">Deployed</span>
      <span class="font-mono text-white">${deployed}</span>
    </div>
  `;
}

// Ensure these are globally accessible for inline onclick handlers from renderModalRoster
window.selectManager = function(id) {
  const s = store.getState();
  if (s.selectedManagerId === id) {
    store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'manager', id: null } });
  } else {
    store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'manager', id } });
  }
};

window.selectVolunteer = function(id) {
  const s = store.getState();
  if (s.selectedVolunteerId === id) {
    store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'volunteer', id: null } });
  } else {
    store.dispatch({ type: 'UPDATE_ROSTER_SELECTION', payload: { role: 'volunteer', id } });
  }
};
