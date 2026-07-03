// Anomaly investigation data — MissionMind

export const ACTIVE_ANOMALY = {
  id: 'ANO-2024-412-001',
  title: 'Solar Array Power Degradation',
  detected: Date.now() - 22 * 60000,
  severity: 'critical',
  affectedSubsystems: ['power', 'thermal', 'payload'],
  triggerChannel: 'PWR_SOL_I',
  summary: 'Solar array current output has dropped 18% over 22 minutes. The degradation pattern is non-linear with a step change at T-20min, suggesting a discrete event rather than gradual degradation. Battery charge is now at 68.4% and declining at ~0.8%/hr above nominal discharge rate.',
};

export const ROOT_CAUSE_HYPOTHESES = [
  {
    id: 'H1', rank: 1, confidence: 0.72, label: 'Partial Solar Panel Shadowing',
    evidence: ['Step-change pattern in PWR_SOL_I', 'No thermal signature change at T-20min', 'Current drop limited to ~18%'],
    counterEvidence: ['Eclipse schedule shows no predicted shadow at this time'],
    recommendation: 'Cross-reference attitude telemetry with solar panel orientation. Check for debris or unexpected maneuver.',
    sources: ['ARES-7 Power Subsystem Handbook §4.3', 'Historical Event: MRO Sol 88 Panel Partial Block'],
  },
  {
    id: 'H2', rank: 2, confidence: 0.51, label: 'Solar Cell String Failure',
    evidence: ['Step-change consistent with discrete failure', 'Power drop matches 1/6 string geometry'],
    counterEvidence: ['No temperature anomaly expected with string failure', 'Thruster temp rising — unexplained by this hypothesis'],
    recommendation: 'Compare voltage-current curve to known string-failure signatures. Initiate array diagnostic sweep.',
    sources: ['Power Subsystem Anomaly Log 2023', 'ESA Solar Array Failure Modes Database'],
  },
  {
    id: 'H3', rank: 3, confidence: 0.28, label: 'MPPT Controller Fault',
    evidence: ['PWR_SOL_I drop could indicate tracking loss', 'Current value is stable after drop (not oscillating)'],
    counterEvidence: ['Bus voltage remains stable — MPPT typically shows voltage instability on failure'],
    recommendation: 'Monitor bus voltage variance over next 15 minutes. Consider MPPT reset if variance increases.',
    sources: ['ARES-7 EPS Interface Control Document §7.1.2'],
  },
];

export const SIMILAR_INCIDENTS = [
  {
    id: 'SIM-001', mission: 'MRO', sol: 88,
    title: 'Solar Array Partial Block — Attitude Error',
    similarity: 0.84,
    outcome: 'Identified micro-debris impact on one panel. 12% permanent degradation. Operations nominal after power budget rebalance.',
    resolution: 'Reduced science payload duty cycle by 8%. No further anomalies.',
  },
  {
    id: 'SIM-002', mission: 'ARES-7', sol: 201,
    title: 'PWR_SOL_I Drop During Periapsis',
    similarity: 0.61,
    outcome: 'Transient shadow from Mars limb geometry. Resolved naturally within 40 minutes.',
    resolution: 'No action required. Updated eclipse prediction model.',
  },
  {
    id: 'SIM-003', mission: 'ExoMars TGO', sol: 312,
    title: 'String Failure — Panel 3A',
    similarity: 0.55,
    outcome: 'Permanent 16% power reduction. Mission adapted with revised science schedule.',
    resolution: 'Power budget replanned. Priority science maintained. Housekeeping load shed.',
  },
];

export const DEPENDENCY_GRAPH = {
  nodes: [
    { id: 'sol',   label: 'Solar Array',    subsystem: 'power',   status: 'critical', x: 120, y: 200 },
    { id: 'bat',   label: 'Battery',        subsystem: 'power',   status: 'warning',  x: 280, y: 200 },
    { id: 'bus',   label: 'Power Bus',      subsystem: 'power',   status: 'warning',  x: 440, y: 200 },
    { id: 'eps',   label: 'EPS Controller', subsystem: 'power',   status: 'nominal',  x: 440, y: 320 },
    { id: 'obdh',  label: 'OBDH',           subsystem: 'obdh',    status: 'nominal',  x: 600, y: 200 },
    { id: 'com',   label: 'Comms',          subsystem: 'comms',   status: 'nominal',  x: 600, y: 80  },
    { id: 'pld',   label: 'Payload',        subsystem: 'payload', status: 'warning',  x: 600, y: 320 },
    { id: 'adcs',  label: 'ADCS',           subsystem: 'adcs',    status: 'nominal',  x: 760, y: 200 },
    { id: 'thr',   label: 'Thruster',       subsystem: 'prop',    status: 'warning',  x: 760, y: 320 },
  ],
  edges: [
    { from: 'sol',  to: 'bat',  type: 'power',  label: 'charges' },
    { from: 'sol',  to: 'bus',  type: 'power',  label: 'feeds' },
    { from: 'bat',  to: 'bus',  type: 'power',  label: 'backup' },
    { from: 'bus',  to: 'obdh', type: 'power',  label: 'powers' },
    { from: 'bus',  to: 'com',  type: 'power',  label: 'powers' },
    { from: 'bus',  to: 'pld',  type: 'power',  label: 'powers' },
    { from: 'bus',  to: 'adcs', type: 'power',  label: 'powers' },
    { from: 'bus',  to: 'thr',  type: 'power',  label: 'powers' },
    { from: 'eps',  to: 'bus',  type: 'control',label: 'regulates' },
    { from: 'obdh', to: 'eps',  type: 'control',label: 'commands' },
  ],
};
