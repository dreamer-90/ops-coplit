import { store } from '../state.js';
import { showToast } from './toast.js';
import { executeQuickAction } from '../api.js';

export function setupQuickActions() {
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const s = store.getState();
      const zone = s.activeDivision;
      
      if (action === 'lock-gate') {
        btn.disabled = true;
        executeMultiStageLock(zone, btn);
        return;
      }

      try {
        btn.disabled = true;
        await executeQuickAction(action, zone);
        
        btn.classList.add('ring-2', 'ring-primary/50');
        setTimeout(() => btn.classList.remove('ring-2', 'ring-primary/50'), 1500);
        showToast(`${action.replace('-', ' ').toUpperCase()} INITIATED`, 'success');
      } catch (err) {
        showToast('Action failed', 'error');
        console.error(err);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function executeMultiStageLock(zone, btn) {
  const sequence = [
    { delay: 0, action: `RESTRICTED ENTRY — ZONE ${zone}`, reason: `Stage 1/4: Admissions slowed.` },
    { delay: 1500, action: `EXIT ONLY — ZONE ${zone}`, reason: `Stage 2/4: Turnstiles reversed.` },
    { delay: 3000, action: `REROUTE SIGNAGE — ZONE ${zone}`, reason: `Stage 3/4: Digital signage hijacked to cut off exterior flow.` },
    { delay: 4500, action: `SECTOR GATE LOCKED — ZONE ${zone}`, reason: `Stage 4/4: Physical gate hard-locked.` }
  ];

  sequence.forEach(stage => {
    setTimeout(() => {
      const quickDecision = {
        event_id: `STAGE-${Date.now()}`,
        recommended_action: stage.action,
        reasoning: `Manual Override [Operator ID: CMD-Alpha] • ${stage.reason}`,
        risk_level: stage.delay === 4500 ? 'critical' : 'moderate',
        affected_zones: [zone],
        timestamp: new Date().toISOString()
      };
      store.dispatch({ type: 'ADD_DECISION', payload: quickDecision });
      if (stage.delay === 4500) {
        showToast(`Sector Gate ${zone} Locked`, 'warning');
        setTimeout(() => { btn.disabled = false; }, 5000);
      }
    }, stage.delay);
  });
}

export function setupFeedFilters() {
  const filterBtns = document.querySelectorAll('.feed-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.setAttribute('aria-pressed', 'false');
        b.className = 'feed-filter-btn flex-1 py-2 text-xs font-bold text-muted hover:text-white transition-colors rounded';
      });
      btn.setAttribute('aria-pressed', 'true');
      btn.className = 'feed-filter-btn flex-1 py-2 text-xs font-bold bg-white/10 text-white rounded shadow-inner shadow-black/20';
      
      const filter = btn.dataset.filter;
      store.dispatch({ type: 'SET_FILTER', payload: filter });
      applyFeedFilter();
    });
  });

  const clearBtn = document.getElementById('btn-clear-feed');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      store.dispatch({ type: 'CLEAR_FEED' });
      const feed = document.getElementById('action-feed');
      if (feed) {
        feed.innerHTML = '<div id="feed-empty" style="display:none;" class="text-center text-muted p-4">No recent actions</div>';
        applyFeedFilter();
        showToast('Action feed cleared', 'info');
      }
    });
  }
}

export function applyFeedFilter() {
  const s = store.getState();
  const filter = s.currentFilter;
  const feed = document.getElementById('action-feed');
  if (!feed) return;
  const cards = feed.querySelectorAll('.decision-card-container');
  let visibleCount = 0;

  cards.forEach(card => {
    const risk = card.dataset.risk;
    if (filter === 'all' || filter === 'audit' || risk === filter) {
      card.style.display = '';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const emptyState = document.getElementById('feed-empty');
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? '' : 'none';
  }
}
