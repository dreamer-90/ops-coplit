import { store } from '../state.js';
import { openDispatchModal } from './modals.js';
import { updateMapAesthetics } from '../map.js';

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function addDecisionToFeed(decision) {
  const feed = document.getElementById('action-feed');
  if (!feed) return;
  
  const item = document.createElement('div');
  const isDispatch = decision.staff_allocation && decision.staff_allocation.length > 0;
  item.className = 'glass-panel p-3 animate-slide-in decision-card-container';
  item.dataset.risk = isDispatch ? 'staff' : decision.risk_level;
  
  const isHighRisk = decision.risk_level === 'critical' || decision.risk_level === 'high';
  const headerColor = decision.risk_level === 'critical' ? 'text-status-danger' : 
                      (decision.risk_level === 'high' ? 'text-status-warning' : 'text-primary');

  const zoneBadge = decision.affected_zones && decision.affected_zones.length > 0 
    ? `<span class="px-1.5 py-0.5 rounded-sm bg-white/10 text-[10px] font-mono ml-2">ZONE ${decision.affected_zones.join(',')}</span>` 
    : '';

  item.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <div class="text-[10px] font-mono text-muted">${formatTime(decision.timestamp)}</div>
      <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${headerColor}">
        ${decision.confidence_score ? `<span class="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-white opacity-80 border border-white/10" title="AI Confidence Score">CONF: ${decision.confidence_score}%</span>` : ''}
        ${decision.risk_level} RISK
      </div>
    </div>
    <div class="text-sm font-bold text-white mb-1 leading-tight">${escapeHtml(decision.recommended_action)}</div>
    <div class="text-xs text-muted leading-relaxed mb-2">${escapeHtml(decision.reasoning)}</div>
    ${decision.predicted_effects || decision.predicted_queue_reduction ? `
      <div class="mt-2 mb-2 p-2 bg-primary/10 rounded border border-primary/20">
        <p class="text-[10px] text-primary uppercase tracking-wider mb-1 font-bold">Predicted Impact:</p>
        <ul class="text-[11px] text-primary/80 list-disc list-inside space-y-1 font-mono">
          ${decision.predicted_queue_reduction ? `<li>Queue Reduction: <span class="text-white">${escapeHtml(decision.predicted_queue_reduction)}</span></li>` : ''}
          ${decision.predicted_effects ? Object.entries(decision.predicted_effects).map(([k, v]) => `<li>${escapeHtml(k)}: <span class="text-white">${escapeHtml(v)}</span></li>`).join('') : ''}
        </ul>
      </div>
    ` : ''}
    ${decision.alternatives && decision.alternatives.length > 0 ? `
      <div class="mt-2 mb-2 p-2 bg-black/20 rounded border border-white/5">
        <p class="text-[10px] text-muted uppercase tracking-wider mb-1">Rejected Alternatives:</p>
        <ul class="text-[11px] text-white/70 list-disc list-inside space-y-1">
          ${decision.alternatives.map(alt => `<li>${escapeHtml(alt)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
      <div class="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center">
        ID: ${decision.event_id.split('-').pop()} ${zoneBadge}
      </div>
      ${isHighRisk ? `
        <button class="btn-primary text-[10px] py-1 px-3" onclick="window.handleFeedDispatch('${decision.event_id}')">
          OVERRIDE
        </button>
      ` : ''}
    </div>
  `;
  
  if (decision.affected_zones && decision.affected_zones.length > 0) {
    item.classList.add('cursor-pointer', 'hover:border-white/20', 'transition-colors');
    item.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      import('../map.js').then(m => m.setActiveDivision(decision.affected_zones[0]));
    });
  }

  feed.prepend(item);
}

export function updateActiveZoneDetails() {
  const s = store.getState();
  const zid = s.activeDivision;
  
  const title = document.getElementById('active-zone-title');
  const badge = document.getElementById('active-zone-badge');
  const pop = document.getElementById('active-population');
  const cap = document.getElementById('active-capacity');
  const densityFill = document.getElementById('active-density-fill');
  const densityPct = document.getElementById('active-density-pct');

  if (!title) return;

  title.textContent = `ZONE ${zid}`;
  
  const hist = s.zoneHistory[zid] || [0];
  const curPct = hist[hist.length - 1];
  const capacity = s.zoneCurrent[zid] ? s.zoneCurrent[zid].capacity : 10000;
  const currentCount = s.zoneCurrent[zid] ? s.zoneCurrent[zid].current : Math.floor((curPct/100) * capacity);
  
  if (pop) pop.textContent = currentCount.toLocaleString();
  if (cap) cap.textContent = `/ ${capacity.toLocaleString()}`;
  if (densityPct) densityPct.textContent = `${curPct}%`;
  if (densityFill) densityFill.style.width = `${curPct}%`;

  let statusColor = 'text-status-success';
  let bgColor = 'bg-status-success';
  let badgeHtml = '<span class="material-symbols-outlined text-sm">check_circle</span> NOMINAL';
  let borderColor = 'border-status-success/30';
  
  if (curPct >= 90) { 
    statusColor = 'text-status-danger'; 
    bgColor = 'bg-status-danger';
    borderColor = 'border-status-danger/30';
    badgeHtml = '<span class="material-symbols-outlined text-sm">error</span> CRITICAL'; 
  } else if (curPct >= 75) { 
    statusColor = 'text-status-warning'; 
    bgColor = 'bg-status-warning';
    borderColor = 'border-status-warning/30';
    badgeHtml = '<span class="material-symbols-outlined text-sm">warning</span> ELEVATED'; 
  }

  if (badge) {
    badge.className = `px-3 py-1 ${bgColor}/20 ${statusColor} text-xs font-bold rounded border ${borderColor} flex items-center gap-1`;
    badge.innerHTML = badgeHtml;
  }
  if (densityFill) densityFill.className = `h-full ${bgColor} transition-all duration-1000`;
  if (densityPct) densityPct.className = statusColor;

  updateSparklineGraph(hist, bgColor);
  renderActiveIncidentsList(zid);
}

function updateSparklineGraph(history, bgColor) {
  let hex = '#10B981'; // success
  if (bgColor.includes('danger')) hex = '#EF4444';
  if (bgColor.includes('warning')) hex = '#F59E0B';
  if (bgColor.includes('primary')) hex = '#06B6D4';
  
  const sparklineArea = document.querySelector('#active-zone-sparkline .sparkline-area');
  const sparklineLine = document.querySelector('#active-zone-sparkline .sparkline-line');
  const gradientStops = document.querySelectorAll('#trend-grad stop');
  
  if (!sparklineArea || !sparklineLine) return;
  
  if (gradientStops.length > 1) {
    gradientStops[0].setAttribute('stop-color', hex);
    gradientStops[1].setAttribute('stop-color', hex);
  }
  sparklineLine.setAttribute('stroke', hex);
  
  if (history.length < 2) return;
  const max = 100;
  const w = 100;
  const h = 100;
  const step = w / (history.length - 1);
  
  let d = `M0,${h - (history[0]/max)*h}`;
  for (let i = 1; i < history.length; i++) {
    const x = i * step;
    const y = h - ((history[i]/max)*h);
    d += ` L${x},${y}`;
  }
  
  sparklineLine.setAttribute('d', d);
  sparklineArea.setAttribute('d', `${d} L${w},${h} L0,${h} Z`);
}

function renderActiveIncidentsList(zoneId) {
  const s = store.getState();
  const container = document.getElementById('active-incidents-list');
  if (!container) return;

  const incidents = s.incidents.filter(i => i.zone === zoneId);
  if (incidents.length === 0) {
    container.innerHTML = `<div class="text-xs text-muted italic p-2 text-center">No active incidents in Sector ${zoneId}</div>`;
    return;
  }

  container.innerHTML = incidents.map(inc => {
    const isCritical = inc.severity === 'critical';
    const icon = isCritical ? 'warning' : 'info';
    const colorClass = isCritical ? 'text-status-danger' : 'text-status-warning';
    const bgClass = isCritical ? 'bg-status-danger/10 border-status-danger/20' : 'bg-status-warning/10 border-status-warning/20';

    return `
      <div class="border border-white/5 p-2 mb-2 rounded bg-black/20 hover:bg-white/5 transition-colors cursor-pointer group" onclick="window.handleIncidentClick('${inc.id}')">
        <div class="flex gap-2 items-start">
          <span class="material-symbols-outlined text-[16px] ${colorClass} mt-0.5">${icon}</span>
          <div class="flex-1">
            <div class="text-xs font-bold text-white group-hover:text-primary transition-colors">${inc.name}</div>
            <div class="text-[10px] text-muted">${inc.meta}</div>
          </div>
          <button class="btn-primary py-0.5 px-2 text-[9px]">DISPATCH</button>
        </div>
      </div>
    `;
  }).join('');
}

export function updateFooter() {
  const s = store.getState();
  const aiStatus = document.getElementById('ai-status');
  const footerStatus = document.getElementById('footer-status');
  if (!aiStatus || !footerStatus) return;

  const totalEvents = s.decisions.length;
  aiStatus.textContent = `Processed ${totalEvents} Events`;

  if (s.scramLevel) {
    footerStatus.textContent = `SCRAM LEVEL ${s.scramLevel}`;
    footerStatus.className = 'text-status-danger font-bold text-xs tracking-widest uppercase';
  } else if (s.latestDecision) {
    if (s.latestDecision.risk_level === 'critical') {
      footerStatus.textContent = 'CRITICAL ALERT ACTIVE';
      footerStatus.className = 'text-status-danger font-bold text-xs tracking-widest uppercase';
    } else if (s.latestDecision.risk_level === 'high') {
      footerStatus.textContent = 'ELEVATED RISK DETECTED';
      footerStatus.className = 'text-status-warning font-bold text-xs tracking-widest uppercase';
    } else {
      footerStatus.textContent = 'SYSTEM NOMINAL';
      footerStatus.className = 'text-status-success font-bold text-xs tracking-widest uppercase';
    }
  }
}

// Ensure these are globally accessible for inline onclick handlers from rendered HTML
window.handleFeedDispatch = function(eventId) {
  import('./modals.js').then(m => m.openDispatchModal(eventId));
};

export function renderScriptedEvents() {
  const s = store.getState();
  const list = document.getElementById('scripted-events-list');
  const footerEventCount = document.getElementById('footer-event-count');
  
  if (footerEventCount) {
    footerEventCount.textContent = `Events: ${s.triggeredEvents.size}/${s.events.length} triggered`;
  }
  
  if (!list) return;

  list.innerHTML = '';
  s.events.forEach((evt, i) => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center justify-between group scripted-event-btn";
    
    // Custom data attr for CSS styling
    btn.dataset.triggered = s.triggeredEvents.has(i) ? 'true' : 'false';
    
    btn.innerHTML = `
      <div class="flex flex-col gap-1">
        <span class="text-xs font-bold text-white group-data-[triggered=true]:text-status-success transition-colors">
          ${i + 1}. ${evt.title}
        </span>
        <span class="text-[10px] text-muted">Zone ${evt.zone}</span>
      </div>
      <span class="material-symbols-outlined text-sm text-muted group-data-[triggered=true]:text-status-success">
        ${s.triggeredEvents.has(i) ? 'check_circle' : 'play_circle'}
      </span>
    `;
    
    btn.addEventListener('click', async () => {
      try {
        const { fetchApi } = await import('../api.js');
        const data = await fetchApi(`/api/events/${i}/trigger`, { method: 'POST', headers: { 'x-api-key': 'OPS-COPILOT-2026' } });
        store.dispatch({ type: 'EVENT_TRIGGERED', payload: { index: i, decision: data.decision, event: data.event } });
      } catch (err) {
        console.error(err);
      }
    });

    list.appendChild(btn);
  });
}

export function updateEventPreview() {
  const s = store.getState();
  const eventPreview = document.getElementById('event-preview');
  if (!eventPreview) return;
  if (s.currentEventIndex < s.events.length) {
    const evt = s.events[s.currentEventIndex];
    eventPreview.textContent = `Next Event: ${evt.title} (Zone ${evt.zone})`;
  } else {
    eventPreview.textContent = 'All events completed.';
  }
}

