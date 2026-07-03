// Multi-agent surface/orbit coordination — three independently autonomous
// assets sharing a constrained power and comms budget.

export const ASSETS = [
  {
    id: 'orbiter', label: 'ARES-7 Orbiter', kind: 'orbiter', status: 'warning',
    powerW: 142, powerBudgetW: 350, commPriority: 1,
    currentTask: 'Power safe mode — payload reduced',
    queue: ['Data Downlink Block', 'Atmospheric Limb Scan', 'End-of-Sol Maintenance'],
  },
  {
    id: 'rover', label: 'PROBE-2 Rover', kind: 'rover', status: 'nominal',
    powerW: 38, powerBudgetW: 60, commPriority: 3,
    currentTask: 'Traverse to Jezero Rim Overlook (WP4 → WP5)',
    queue: ['CRISM Mapping at WP5', 'Sample Cache Approach', 'Evening Comm Relay'],
  },
  {
    id: 'drone', label: 'AERO-1 Scout Drone', kind: 'drone', status: 'nominal',
    powerW: 22, powerBudgetW: 40, commPriority: 2,
    currentTask: 'Aerial survey — Boulder Field Gap clearance check',
    queue: ['Return to rover for recharge', 'Standby — next flight window'],
  },
];

// Resource-sharing conflicts between asset pairs: shared DSN comm windows,
// relay bandwidth, or power-bus dependency (drone recharges from rover).
export const CONFLICT_MATRIX = [
  { a: 'orbiter', b: 'rover',  type: 'comms',  severity: 'medium', detail: 'Rover relay uplink shares the same DSN pass window as orbiter downlink. Orbiter has comm priority 1 — rover relay deferred until next pass if contention occurs.' },
  { a: 'orbiter', b: 'drone',  type: 'none',   severity: 'none',   detail: 'No shared resources — drone comms relay exclusively through the rover, not the orbiter.' },
  { a: 'rover',   b: 'drone',  type: 'power',  severity: 'high',   detail: 'Drone recharges from rover battery between flights. Concurrent rover traverse + drone recharge can exceed rover\'s 60W budget — scheduler serializes the two tasks.' },
];

export function findConflict(a, b) {
  return CONFLICT_MATRIX.find(c => (c.a === a && c.b === b) || (c.a === b && c.b === a));
}
