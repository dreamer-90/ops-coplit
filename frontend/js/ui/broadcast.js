import { store } from '../state.js';
import { PRESET_ALERTS } from '../services/mockApi.js';
import { showToast } from './toast.js';
import { executeBroadcast } from '../api.js';

let broadcastTimer = null;
let broadcastCountdown = 3;

export function selectPresetAlert(presetName) {
  store.dispatch({ type: 'SET_PRESET', payload: presetName });

  const presetGrid = document.getElementById('alert-preset-grid');
  if (presetGrid) {
    presetGrid.querySelectorAll('button').forEach(btn => {
      if (btn.dataset.preset === presetName) {
         btn.className = "glass-panel p-3 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-colors border-primary/30 bg-primary/10 text-left uppercase";
      } else {
         btn.className = "glass-panel p-3 rounded-lg text-xs font-bold text-muted hover:bg-white/10 transition-colors text-left uppercase";
      }
    });
  }

  renderAlertPreview();
}

export function selectLanguageTab(lang) {
  store.dispatch({ type: 'SET_LANGUAGE', payload: lang });

  const langContainer = document.getElementById('lang-tabs');
  if (langContainer) {
    langContainer.querySelectorAll('button').forEach(tab => {
      if (tab.dataset.lang === lang) {
        tab.className = "px-4 py-1.5 bg-primary text-background-dark rounded-full text-xs font-bold";
      } else {
        tab.className = "px-4 py-1.5 bg-white/5 hover:bg-white/10 text-muted rounded-full text-xs font-bold border border-white/10 transition-colors";
      }
    });
  }

  renderAlertPreview();
}

function renderAlertPreview() {
  const s = store.getState();
  const alert = PRESET_ALERTS[s.activePreset];
  const alertPreviewText = document.getElementById('alert-preview-text');
  if (alert && alertPreviewText) {
    alertPreviewText.textContent = `"${alert[s.activeLang] || alert['en']}"`;
  }
}

export function resetBroadcastSlider() {
  const nativeSlider = document.getElementById('broadcastSlider');
  if (!nativeSlider) return;
  nativeSlider.value = 0;
  
  const broadcastAbortOverlay = document.getElementById('broadcast-abort-overlay');
  const broadcastSliderContainer = document.getElementById('broadcast-slider-container');
  const broadcastSliderText = document.getElementById('broadcast-slider-text');

  if (broadcastAbortOverlay) {
    broadcastAbortOverlay.style.opacity = '0';
    broadcastAbortOverlay.style.pointerEvents = 'none';
  }
  
  if (broadcastSliderContainer) {
    broadcastSliderContainer.classList.remove('bg-status-success/20', 'border-status-success');
  }
  
  if (broadcastSliderText) {
    broadcastSliderText.innerHTML = 'DRAG TO BROADCAST <span class="material-symbols-outlined text-lg ml-2 animate-pulse">double_arrow</span>';
    broadcastSliderText.classList.add('text-status-danger', 'opacity-60');
    broadcastSliderText.classList.remove('text-status-success', 'opacity-100');
  }

  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
}

export function setupSliderBroadcast() {
  const nativeSlider = document.getElementById('broadcastSlider');
  const broadcastAbortOverlay = document.getElementById('broadcast-abort-overlay');
  const broadcastCountdownText = document.getElementById('broadcast-countdown-text');
  const broadcastSliderText = document.getElementById('broadcast-slider-text');
  const broadcastSliderContainer = document.getElementById('broadcast-slider-container');
  const btnAbortBroadcast = document.getElementById('btn-abort-broadcast');

  if (nativeSlider) {
    const onRelease = () => {
      if (nativeSlider.value >= 85) {
        nativeSlider.value = 100;
        
        if (broadcastTimer) return;
        
        if (broadcastAbortOverlay) {
          broadcastAbortOverlay.style.opacity = '1';
          broadcastAbortOverlay.style.pointerEvents = 'auto';
        }
        
        broadcastCountdown = 3;
        if (broadcastCountdownText) broadcastCountdownText.textContent = broadcastCountdown;
        
        broadcastTimer = setInterval(() => {
          broadcastCountdown--;
          if (broadcastCountdownText) broadcastCountdownText.textContent = broadcastCountdown;
          
          if (broadcastCountdown <= 0) {
            clearInterval(broadcastTimer);
            broadcastTimer = null;
            
            if (broadcastAbortOverlay) {
              broadcastAbortOverlay.style.opacity = '0';
              broadcastAbortOverlay.style.pointerEvents = 'none';
            }
            
            if (broadcastSliderText) {
              broadcastSliderText.innerHTML = 'BROADCAST ACTIVE';
              broadcastSliderText.classList.remove('text-status-danger', 'opacity-60');
              broadcastSliderText.classList.add('text-status-success', 'opacity-100');
            }
            if (broadcastSliderContainer) {
              broadcastSliderContainer.classList.add('bg-status-success/20', 'border-status-success');
            }
            
            triggerBroadcastAlert();
            
            setTimeout(resetBroadcastSlider, 3000);
          }
        }, 1000);
      } else {
        nativeSlider.value = 0;
      }
    };
    
    nativeSlider.addEventListener('mouseup', onRelease);
    nativeSlider.addEventListener('touchend', onRelease);
    
    if (btnAbortBroadcast) {
      btnAbortBroadcast.addEventListener('click', () => {
        if (broadcastTimer) {
          const s = store.getState();
          store.dispatch({
            type: 'ADD_DECISION',
            payload: {
              event_id: `ABT-${Date.now()}`,
              recommended_action: `BROADCAST ABORTED`,
              reasoning: `Manual Override [Operator ID: CMD-Alpha] • Operator cancelled broadcast transmission prior to execution.`,
              risk_level: 'moderate',
              affected_zones: [s.activeDivision],
              staff_allocation: [],
              timestamp: new Date().toISOString()
            }
          });
          showToast('Broadcast aborted', 'info');
          resetBroadcastSlider();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && broadcastTimer) {
        if (btnAbortBroadcast) btnAbortBroadcast.click();
      }
    });
  }
}

export function setupBroadcastButtons() {
  const presets = ['shelter', 'evacuate', 'delay', 'all-clear'];
  const presetGrid = document.getElementById('alert-preset-grid');
  if (presetGrid) {
    presetGrid.querySelectorAll('button').forEach((btn, i) => {
      btn.dataset.preset = presets[i];
      btn.addEventListener('click', () => selectPresetAlert(btn.dataset.preset));
    });
  }

  const langContainer = document.getElementById('lang-tabs');
  if (langContainer) {
    langContainer.querySelectorAll('button').forEach(tab => {
      tab.dataset.lang = tab.textContent.trim().toLowerCase();
      tab.addEventListener('click', () => selectLanguageTab(tab.dataset.lang));
    });
  }
}

async function triggerBroadcastAlert() {
  const s = store.getState();
  const alert = PRESET_ALERTS[s.activePreset];
  if (!alert) return;

  const msg = alert[s.activeLang] || alert['en'];
  
  try {
    await executeBroadcast(msg, [s.activeDivision]);
    showToast('Alert broadcast transmission complete', 'success');
  } catch (err) {
    showToast('Broadcast failed', 'error');
    console.error(err);
  }
}

// Make globally accessible for onclicks
window.selectPresetAlert = selectPresetAlert;
window.selectLanguageTab = selectLanguageTab;
