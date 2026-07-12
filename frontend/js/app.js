import { store } from './state.js';
import { events } from './events.js';
import { fetchApi, connectWebSocket, triggerSimulationEvent, triggerScram } from './api.js';
import { showToast } from './ui/toast.js';
import { addDecisionToFeed, updateActiveZoneDetails, updateFooter } from './ui/render.js';
import { openScramModal, closeScramModal, executeScram, closeDispatchModal, confirmDispatch } from './ui/modals.js';
import { setActiveDivision, setupMapClickHandlers } from './map.js';
import { updatePersonnelSummary } from './ui/roster.js';
import { setupSliderBroadcast, setupBroadcastButtons } from './ui/broadcast.js';
import { renderScriptedEvents, updateEventPreview } from './ui/render.js';
import { setupQuickActions, setupFeedFilters, applyFeedFilter } from './ui/actions.js';

window.openScramModal = openScramModal;
window.closeScramModal = closeScramModal;
window.executeScram = executeScram;

window.handleIncidentClick = (incId) => {
  store.dispatch({ type: 'SELECT_INCIDENT', payload: incId });
  const inc = store.getState().incidents.find(i => i.id === incId);
  if (inc) {
    setActiveDivision(inc.zone);
  }
  import('./ui/modals.js').then(m => m.openDispatchModal(incId));
};

async function initStore() {
  // Load initial data if necessary, or just rely on state.js defaults
}

async function initApi() {
  try {
    const data = await fetchApi('/api/events');
    if (data && data.events) {
      store.dispatch({ type: 'SET_EVENTS', payload: data.events });
    }
  } catch (err) {
    console.error('Failed to init events', err);
  }
}

function initUI() {
  // Initial render calls based on default state
  const s = store.getState();
  setActiveDivision(s.activeDivision);
  s.decisions.forEach(d => addDecisionToFeed(d));
  updatePersonnelSummary();
  updateFooter();
  renderScriptedEvents();
  updateEventPreview();
}

function bindEvents() {
  // Subscriptions to state changes
  events.subscribe('STATE_CHANGED:DECISION_ADDED', (decision) => {
    addDecisionToFeed(decision);
    updateFooter();
  });
  
  events.subscribe('STATE_CHANGED:ROSTER', () => {
    updatePersonnelSummary();
  });

  events.subscribe('STATE_CHANGED:ACTIVE_DIVISION', () => {
    // setActiveDivision handles its own DOM updates, but we can hook in here if needed
  });

  events.subscribe('STATE_CHANGED:EVENTS', () => {
    renderScriptedEvents();
    updateEventPreview();
  });

  events.subscribe('STATE_CHANGED:FILTER', () => {
    applyFeedFilter();
  });

  events.subscribe('STATE_CHANGED:DENSITY', () => {
    updateActiveZoneDetails();
  });

  setupMapClickHandlers();
  setupSliderBroadcast();
  setupBroadcastButtons();
  setupQuickActions();
  setupFeedFilters();

  // Global UI Events
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) btnReset.addEventListener('click', async () => {
    try {
      await fetchApi('/api/events/reset', { method: 'DELETE' });
      store.dispatch({ type: 'CLEAR_FEED' });
      const feed = document.getElementById('action-feed');
      if (feed) feed.innerHTML = '';
      showToast('Simulation reset complete', 'info');
    } catch (err) {
      showToast('Reset failed', 'error');
    }
  });

  const btnNext = document.getElementById('btn-next');
  if (btnNext) btnNext.addEventListener('click', async () => {
    const s = store.getState();
    if (s.currentEventIndex < s.events.length) {
      try {
        const data = await fetchApi(`/api/events/${s.currentEventIndex}/trigger`, { method: 'POST', headers: { 'x-api-key': 'OPS-COPILOT-2026' } });
        store.dispatch({ type: 'EVENT_TRIGGERED', payload: { index: s.currentEventIndex, decision: data.decision, event: data.event } });
      } catch (err) {
        showToast('Event trigger failed', 'error');
      }
    } else {
      showToast('All simulation events exhausted. Reset to restart.', 'info');
    }
  });

  // Modals are triggered via inline HTML onclicks that rely on these global assignments:
  // window.openScramModal, window.closeScramModal, window.executeScram
  // window.handleIncidentClick
  
  const btnCloseModal = document.getElementById('btn-close-modal');
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeDispatchModal);
  
  const btnCancelDispatch = document.getElementById('btn-cancel-dispatch');
  if (btnCancelDispatch) btnCancelDispatch.addEventListener('click', closeDispatchModal);
  
  const btnConfirmDispatch = document.getElementById('btn-confirm-dispatch');
  if (btnConfirmDispatch) btnConfirmDispatch.addEventListener('click', confirmDispatch);
}

async function start() {
  console.log('Bootstrapping Ops Copilot...');
  await initStore();
  await initApi();
  
  bindEvents();
  initUI();
  
  connectWebSocket();
  
  showToast('Ops Copilot initialized.', 'info');
  
  // Periodic updates
  setInterval(() => {
    const clock = document.getElementById('global-clock');
    if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour12: false });
  }, 1000);
}

document.addEventListener('DOMContentLoaded', start);
