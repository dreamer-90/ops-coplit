export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  // Announce critical alerts to screen readers immediately
  if (type === 'error' || type === 'warning' || message.includes('SCRAM')) {
    const srAlert = document.getElementById('sr-announcements');
    if (srAlert) {
      srAlert.textContent = '';
      setTimeout(() => srAlert.textContent = message, 50);
    }
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
