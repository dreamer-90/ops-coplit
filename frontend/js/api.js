import { store } from './state.js';
import { getMockData, generateMockEvent } from './services/mockApi.js';
import { showToast } from './ui/toast.js';

const API_BASE = window.location.origin;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

let ws = null;
let wsReconnectTimer = null;
let isOffline = !API_BASE || API_BASE.includes('null');

export async function fetchApi(path, options = {}) {
  if (isOffline) {
    const mock = getMockData(path);
    if (mock) return mock;
    throw new Error('Endpoint not mocked in static mode');
  }

  try {
    const resp = await fetch(`${API_BASE}${path}`, options);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.warn('API call failed, falling back to static mode', err);
    isOffline = true;
    showToast(`Backend Offline - Using Static Mock Data`, 'error');
    const mock = getMockData(path);
    if (mock) return mock;
    throw err;
  }
}

export async function triggerScram(level) {
  if (isOffline) {
    // Handled purely by local state injection in the UI layer now
    return true; 
  }
  
  const resp = await fetch(`${API_BASE}/api/emergency/scram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'OPS-COPILOT-2026'
    },
    body: JSON.stringify({ level, operator_id: 'CMD-Alpha' })
  });
  
  if (!resp.ok) {
    throw new Error('Server rejected SCRAM');
  }
  return true;
}

export async function triggerSimulationEvent(eventType, zoneId) {
  if (isOffline) {
    return generateMockEvent('warning');
  }
  
  const payload = {
    event_type: eventType,
    zone_id: zoneId,
    severity: 'high',
    context: { reporter: 'auto', source: 'simulation' }
  };

  const resp = await fetch(`${API_BASE}/api/events/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'OPS-COPILOT-2026'
    },
    body: JSON.stringify(payload)
  });
  
  if (!resp.ok) {
    throw new Error('Simulation API failed');
  }
  return await resp.json();
}

export function connectWebSocket() {
  if (isOffline) return;

  if (ws && ws.readyState !== WebSocket.CLOSED) {
    ws.close();
  }

  try {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      clearTimeout(wsReconnectTimer);
      store.dispatch({ type: 'WS_STATUS', payload: 'LIVE' });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'decision' && data.decision) {
          store.dispatch({ type: 'ADD_DECISION', payload: data.decision });
          // If the server passes density along with the decision:
          if (data.event && data.event.density_percent) {
            store.dispatch({ 
              type: 'UPDATE_DENSITY', 
              payload: { 
                zoneId: data.event.zone_id, 
                densityPercent: data.event.density_percent 
              } 
            });
          }
          if (data.decision.staff_allocation) {
            store.dispatch({ type: 'ALLOCATE_STAFF', payload: data.decision.staff_allocation });
          }
        }
      } catch(err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      store.dispatch({ type: 'WS_STATUS', payload: 'OFFLINE' });
      wsReconnectTimer = setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket encountered error: ", err.message);
      ws.close();
    };
  } catch (err) {
    console.error("Failed to connect WS", err);
    isOffline = true;
    showToast('Backend offline — UI in static mode', 'error');
  }
}

export async function executeQuickAction(actionType, zoneId) {
  if (isOffline) {
    showToast('Action logged locally (Static Mode)', 'info');
    return { status: 'mock' };
  }
  
  const resp = await fetch(`${API_BASE}/api/operations/action`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'OPS-COPILOT-2026'
    },
    body: JSON.stringify({ action_type: actionType, zone_id: zoneId, operator_id: 'OP-01' })
  });
  
  if (!resp.ok) throw new Error('Failed to execute action');
  return await resp.json();
}

export async function executeBroadcast(message, zones) {
  if (isOffline) {
    showToast('Broadcast logged locally (Static Mode)', 'info');
    return { status: 'mock' };
  }
  
  const resp = await fetch(`${API_BASE}/api/operations/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'OPS-COPILOT-2026'
    },
    body: JSON.stringify({ message, zones, operator_id: 'OP-01' })
  });
  
  if (!resp.ok) throw new Error('Failed to execute broadcast');
  return await resp.json();
}
