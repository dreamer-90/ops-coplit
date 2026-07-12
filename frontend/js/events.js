/**
 * Event Bus for pub/sub communication between decoupled modules.
 */
class EventBus extends EventTarget {
  publish(event, detail = {}) {
    this.dispatchEvent(new CustomEvent(event, { detail }));
  }

  subscribe(event, callback) {
    this.addEventListener(event, (e) => callback(e.detail));
  }
}

export const events = new EventBus();
