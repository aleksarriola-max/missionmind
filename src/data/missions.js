// Mission planning and autonomy data — MissionMind

// Planned vs Actual timeline
export const PLAN_ACTIVITIES = [
  { id: 'A1', label: 'Science Imaging Block',      planned: [0,   120], actual: [0,   118], status: 'completed', type: 'science' },
  { id: 'A2', label: 'Comm Pass — Goldstone',       planned: [130, 160], actual: [130, 162], status: 'completed', type: 'comms' },
  { id: 'A3', label: 'Periapsis Maneuver',          planned: [200, 215], actual: [200, 217], status: 'completed', type: 'propulsion' },
  { id: 'A4', label: 'Power Reduction Mode',        planned: null,       actual: [220, 260], status: 'unplanned', type: 'power', note: 'Autonomy triggered due to solar array anomaly' },
  { id: 'A5', label: 'Spectrometer Observation',    planned: [240, 300], actual: null,       status: 'missed',   type: 'science', note: 'Missed: power constraints prevented execution' },
  { id: 'A6', label: 'Data Downlink Block',         planned: [310, 370], actual: [315, 375], status: 'delayed',  type: 'comms' },
  { id: 'A7', label: 'Atmospheric Limb Scan',       planned: [400, 450], actual: null,       status: 'pending',  type: 'science' },
  { id: 'A8', label: 'End-of-Sol Maintenance',      planned: [460, 480], actual: null,       status: 'pending',  type: 'housekeeping' },
];

// Autonomy decisions log
export const AUTONOMY_DECISIONS = [
  {
    id: 'AUT-001',
    ts: Date.now() - 40 * 60000,
    title: 'Power Safe Mode Entry',
    decision: 'Reduced payload power allocation by 35% and deferred spectrometer observation.',
    trigger: 'PWR_BAT_PCT fell below 75% threshold with declining charge rate trend.',
    intent: 'Preserve battery margin above 60% minimum operational threshold.',
    outcome: 'Battery stabilized at 68.4%. Downlink schedule preserved.',
    aligned: true,
    confidence: 0.91,
    operatorIntent: 'Maintain science operations at maximum throughput for remainder of sol.',
    alignmentNote: 'Decision aligns with power safety constraint but conflicts with science throughput intent. Trade-off accepted by onboard prioritization rules.',
  },
  {
    id: 'AUT-002',
    ts: Date.now() - 18 * 60000,
    title: 'Data Rate Reduction',
    decision: 'Reduced downlink rate from 320 kbps to 220 kbps.',
    trigger: 'Power budget constraint following Mode Entry. Comms power allocation reduced.',
    intent: 'Maintain contact with DSN while operating under reduced power budget.',
    outcome: 'Contact maintained. Downlink volume reduced ~31% for this pass.',
    aligned: true,
    confidence: 0.97,
    operatorIntent: 'Maximize science data return per pass.',
    alignmentNote: 'Trade-off between data volume and spacecraft safety. Autonomy chose safety per mission rules.',
  },
  {
    id: 'AUT-003',
    ts: Date.now() - 5 * 60000,
    title: 'Spectrometer Observation Deferred',
    decision: 'Deferred ATM_SPEC_OBS_412 to next sol opportunity.',
    trigger: 'Power allocation insufficient for spectrometer heater + instrument draw simultaneously.',
    intent: 'Do not risk instrument health by operating below minimum power margin.',
    outcome: 'Observation window missed. Target available again Sol 414.',
    aligned: false,
    confidence: 0.88,
    operatorIntent: 'Capture atmospheric spectrometer data for ongoing dust storm tracking.',
    alignmentNote: 'INTENT DRIFT DETECTED: Science objective not achieved. Operators should evaluate whether to override power rules for this high-priority observation.',
  },
];

// Mission planning scenarios
export const MISSION_ACTIVITIES = [
  { id: 'P1', label: 'HiRISE Imaging — Jezero Rim',       priority: 'high',   powerW: 45,  durationMin: 90,  scienceValue: 9.2, riskScore: 0.1 },
  { id: 'P2', label: 'CRISM Mineral Mapping',              priority: 'high',   powerW: 62,  durationMin: 120, scienceValue: 8.8, riskScore: 0.15 },
  { id: 'P3', label: 'Atmospheric Spectrometer — Limb',    priority: 'high',   powerW: 55,  durationMin: 60,  scienceValue: 9.5, riskScore: 0.12 },
  { id: 'P4', label: 'Gravity Mapping Pass',               priority: 'medium', powerW: 20,  durationMin: 45,  scienceValue: 7.1, riskScore: 0.05 },
  { id: 'P5', label: 'Radio Occultation Experiment',       priority: 'medium', powerW: 18,  durationMin: 30,  scienceValue: 6.8, riskScore: 0.05 },
  { id: 'P6', label: 'Dust Storm Monitoring — MEDA',       priority: 'high',   powerW: 35,  durationMin: 180, scienceValue: 9.1, riskScore: 0.08 },
  { id: 'P7', label: 'Periapsis Burn — Orbit Maintenance', priority: 'critical',powerW: 280, durationMin: 15,  scienceValue: 0,   riskScore: 0.25 },
  { id: 'P8', label: 'Software Patch Upload',              priority: 'medium', powerW: 22,  durationMin: 40,  scienceValue: 0,   riskScore: 0.3  },
];

export const WHATIF_SCENARIOS = [
  { id: 'S1', label: 'Delay periapsis burn by 2 hours',     impact: { power: +5, science: -2, risk: +0.08, time: '+2h' }, feasible: true  },
  { id: 'S2', label: 'Skip dust storm monitoring today',    impact: { power: +12, science: -9.1, risk: -0.05, time: '0'  }, feasible: true  },
  { id: 'S3', label: 'Run spectrometer at reduced power',   impact: { power: -15, science: +7.2, risk: +0.12, time: '0'  }, feasible: false },
  { id: 'S4', label: 'Extend comms pass by 20 minutes',    impact: { power: -8,  science: +1.5, risk: +0.04, time: '+20m'}, feasible: true  },
];
