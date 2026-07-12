import { events } from './events.js';

const DEFAULT_ROSTER = [
  { id: 'M-01', name: 'Commander Marcus Vance', role: 'manager', status: 'available', zone: 'A', specialty: 'Crowd Control' },
  { id: 'M-02', name: 'Chief Sarah Jenkins', role: 'manager', status: 'available', zone: 'B', specialty: 'Emergency Ops' },
  { id: 'M-03', name: 'Director Elena Rostova', role: 'manager', status: 'deployed', zone: 'C', specialty: 'Crisis Comm' },
  { id: 'M-04', name: 'Marshal David Kim', role: 'manager', status: 'available', zone: 'D', specialty: 'Tactical Lead' },
  { id: 'V-01', name: 'Rapid Team Alpha', role: 'volunteer', status: 'deployed', zone: 'A', specialty: 'Crowd Guiding' },
  { id: 'V-02', name: 'Rapid Team Beta', role: 'volunteer', status: 'available', zone: 'A', specialty: 'Crowd Guiding' },
  { id: 'V-03', name: 'Support Team 3', role: 'volunteer', status: 'available', zone: 'B', specialty: 'Info Desk' },
  { id: 'V-04', name: 'Support Team 4', role: 'volunteer', status: 'available', zone: 'B', specialty: 'Info Desk' },
  { id: 'V-05', name: 'Crowd Team 5', role: 'volunteer', status: 'available', zone: 'C', specialty: 'Barrier Control' },
  { id: 'V-06', name: 'Crowd Team 6', role: 'volunteer', status: 'deployed', zone: 'C', specialty: 'Barrier Control' },
  { id: 'V-07', name: 'Medical Unit 1', role: 'volunteer', status: 'available', zone: 'A', specialty: 'First Aid' },
  { id: 'V-08', name: 'Medical Unit 2', role: 'volunteer', status: 'available', zone: 'C', specialty: 'First Aid' },
  { id: 'V-09', name: 'Assist Team 9', role: 'volunteer', status: 'available', zone: 'D', specialty: 'Logistics' },
  { id: 'V-10', name: 'Assist Team 10', role: 'volunteer', status: 'available', zone: 'D', specialty: 'Logistics' },
  { id: 'V-11', name: 'Response Team 11', role: 'volunteer', status: 'deployed', zone: 'B', specialty: 'De-escalation' },
  { id: 'V-12', name: 'Response Team 12', role: 'volunteer', status: 'available', zone: 'D', specialty: 'De-escalation' },
];

const INITIAL_INCIDENTS = [
  { id: 'INC-001', zone: 'C', name: 'Turnstile 4 Blockage', severity: 'moderate', meta: 'Detected 4m ago via Cam-C4' },
  { id: 'INC-002', zone: 'C', name: 'Density Threshold Exceeded', severity: 'critical', meta: 'Sector C-Lower • 1m ago' },
  { id: 'INC-003', zone: 'A', name: 'Gate G1 Congestion', severity: 'moderate', meta: 'Queue time > 15 mins' },
  { id: 'INC-004', zone: 'D', name: 'Medical Emergency', severity: 'critical', meta: 'Medical assistance requested at MP2' }
];

const initialState = {
  events: [],
  decisions: [
    {
      event_id: 'EVT-MOCK-3',
      recommended_action: 'ROUTINE SWEEP INITIATED',
      reasoning: 'Automated System Check • Zone A',
      risk_level: 'low',
      affected_zones: ['A'],
      timestamp: new Date(Date.now() - 17 * 60 * 1000).toISOString()
    },
    {
      event_id: 'EVT-MOCK-2',
      recommended_action: 'ZONE C DENSITY ALERT (85%)',
      reasoning: 'Auto-detected • Sector C-Lower',
      risk_level: 'high',
      affected_zones: ['C'],
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString()
    },
    {
      event_id: 'EVT-MOCK-1',
      recommended_action: 'UNIT 7 DISPATCHED TO GATE C',
      reasoning: 'Manual Override • Operator: JD-04',
      risk_level: 'critical',
      affected_zones: ['C'],
      timestamp: new Date(Date.now() - 12 * 1000).toISOString()
    }
  ],
  currentEventIndex: 0,
  triggeredEvents: new Set(),
  currentFilter: 'all',
  latestDecision: null,
  wsReconnectTimer: null,
  isProcessing: false,
  
  activeDivision: 'C',
  incidents: JSON.parse(JSON.stringify(INITIAL_INCIDENTS)),
  selectedIncidentId: 'INC-001',

  roster: JSON.parse(JSON.stringify(DEFAULT_ROSTER)),
  selectedManagerId: null,
  selectedVolunteerId: null,
  modalSearch: '',

  zoneHistory: {
    A: [20, 25, 30, 42, 50, 60, 68, 70, 75],
    B: [10, 12, 15, 20, 25, 30, 40, 45, 45],
    C: [25, 35, 40, 52, 65, 78, 85, 90, 94],
    D: [12, 15, 18, 22, 28, 35, 40, 50, 60],
  },
  
  zoneCurrent: {
    A: { capacity: 15000, current: Math.round(0.75 * 15000) },
    B: { capacity: 12000, current: Math.round(0.45 * 12000) },
    C: { capacity: 18000, current: Math.round(0.94 * 18000) },
    D: { capacity: 10000, current: Math.round(0.60 * 10000) }
  },

  activePreset: 'shelter',
  activeLang: 'en',
  scramLevel: null
};

class Store {
  constructor() {
    this.state = { ...initialState };
  }

  getState() {
    return this.state;
  }

  dispatch(action) {
    switch(action.type) {
      case 'SET_ACTIVE_DIVISION':
        this.state.activeDivision = action.payload;
        events.publish('STATE_CHANGED:ACTIVE_DIVISION', this.state.activeDivision);
        break;
      
      case 'ADD_DECISION':
        if (!this.state.decisions.find(d => d.event_id === action.payload.event_id)) {
          this.state.decisions.push(action.payload);
          this.state.latestDecision = action.payload;
          events.publish('STATE_CHANGED:DECISION_ADDED', action.payload);
        }
        break;
        
      case 'CLEAR_FEED':
        this.state.decisions = [];
        events.publish('STATE_CHANGED:FEED_CLEARED');
        break;
        
      case 'SET_FILTER':
        this.state.currentFilter = action.payload;
        events.publish('STATE_CHANGED:FILTER', this.state.currentFilter);
        break;

      case 'UPDATE_DENSITY':
        const { zoneId, densityPercent } = action.payload;
        const zid = zoneId.toUpperCase();
        if (this.state.zoneHistory[zid]) {
          const val = Math.round(densityPercent);
          this.state.zoneHistory[zid].push(val);
          if (this.state.zoneHistory[zid].length > 15) {
            this.state.zoneHistory[zid].shift();
          }
          this.state.zoneCurrent[zid].current = Math.round((val / 100) * this.state.zoneCurrent[zid].capacity);
          
          if (val >= 85) {
            const exists = this.state.incidents.find(i => i.zone === zid && i.name.includes('Threshold'));
            if (!exists) {
              this.state.incidents.push({
                id: `INC-${Date.now()}`,
                zone: zid,
                name: 'Density Threshold Exceeded',
                severity: val >= 90 ? 'critical' : 'moderate',
                meta: `Sector ${zid}-Lower • 1m ago`
              });
            }
          }
          events.publish('STATE_CHANGED:DENSITY', { zoneId: zid, densityPercent: val });
        }
        break;

      case 'ALLOCATE_STAFF':
        action.payload.forEach(alloc => {
          const role = alloc.role === 'security' ? 'manager' : 'volunteer';
          let member = this.state.roster.find(p => p.role === role && p.zone === alloc.from_zone && p.status === 'available');
          if (!member) {
            member = this.state.roster.find(p => p.role === role && p.status === 'available');
          }
          if (member) {
            member.zone = alloc.to_zone;
            member.status = 'deployed';
          }
        });
        events.publish('STATE_CHANGED:ROSTER');
        break;
        
      case 'UPDATE_ROSTER_SELECTION':
        if (action.payload.role === 'manager') {
          this.state.selectedManagerId = action.payload.id;
        } else {
          this.state.selectedVolunteerId = action.payload.id;
        }
        events.publish('STATE_CHANGED:ROSTER_SELECTION');
        break;

      case 'SET_SCRAM_LEVEL':
        this.state.scramLevel = action.payload;
        events.publish('STATE_CHANGED:SCRAM', action.payload);
        break;
        
      case 'SELECT_INCIDENT':
        this.state.selectedIncidentId = action.payload;
        events.publish('STATE_CHANGED:INCIDENT_SELECTION', action.payload);
        break;
        
      case 'SET_LANGUAGE':
        this.state.activeLang = action.payload;
        events.publish('STATE_CHANGED:LANGUAGE', action.payload);
        break;
        
      case 'SET_PRESET':
        this.state.activePreset = action.payload;
        events.publish('STATE_CHANGED:PRESET', action.payload);
        break;
        
      case 'SET_EVENTS':
        this.state.events = action.payload;
        events.publish('STATE_CHANGED:EVENTS', action.payload);
        break;
        
      case 'EVENT_TRIGGERED':
        const idx = action.payload.index;
        this.state.triggeredEvents.add(idx);
        while (this.state.currentEventIndex < this.state.events.length &&
               this.state.triggeredEvents.has(this.state.currentEventIndex)) {
          this.state.currentEventIndex++;
        }
        const dec = action.payload.decision;
        if (dec) {
          if (!this.state.decisions.find(d => d.event_id === dec.event_id)) {
            this.state.decisions.push(dec);
            this.state.latestDecision = dec;
            events.publish('STATE_CHANGED:DECISION_ADDED', dec);
          }
        }
        const evtObj = action.payload.event;
        if (evtObj) {
          let metaStr = evtObj.details || 'Detected just now';
          if (evtObj.predicted_density_percent) {
            metaStr = `Predicted: ${evtObj.predicted_density_percent}% | Critical in: ${evtObj.time_to_critical_minutes || '?'}m | Growth: ${evtObj.queue_growth_rate || 'N/A'}`;
          }
          this.state.incidents.push({
            id: evtObj.event_id,
            zone: evtObj.zone_id,
            name: evtObj.event_type.replace('_', ' ').toUpperCase(),
            severity: evtObj.severity,
            meta: metaStr
          });
        }
        events.publish('STATE_CHANGED:EVENTS');
        break;
    }
  }
}

export const store = new Store();
