// Space ops knowledge base — MissionMind

export const KNOWLEDGE_DOCS = [
  {
    id: 'DOC-001',
    title: 'ARES-7 Power Subsystem Handbook',
    category: 'Subsystem Manual',
    tags: ['power', 'solar', 'battery', 'EPS'],
    summary: 'Comprehensive reference for the ARES-7 Electrical Power Subsystem including solar array specs, battery management, fault modes, and recovery procedures.',
    excerpts: [
      { section: '§4.3 Solar Array Anomaly Response', text: 'If PWR_SOL_I drops more than 15% below nominal for more than 5 minutes, initiate solar array diagnostic sequence SA-DIAG-01. Check orientation telemetry and compare against predicted sun vector. If shadowing is confirmed, wait for shadow clearance before declaring fault.' },
      { section: '§5.1 Battery Management', text: 'Minimum operational battery charge is 60%. Below 65%, autonomy will trigger power safe mode. Below 55%, all non-essential loads are shed automatically.' },
    ],
  },
  {
    id: 'DOC-002',
    title: 'Anomaly Response Procedures — Vol. 2',
    category: 'Procedures',
    tags: ['anomaly', 'response', 'power', 'thermal'],
    summary: 'Step-by-step procedures for responding to spacecraft anomalies including power, thermal, and attitude control faults.',
    excerpts: [
      { section: 'PWR-ANOM-003: Solar Current Drop', text: '1. Acknowledge alarm. 2. Check PWR_SOL_I trend: if step-change, suspect shadowing or discrete failure. 3. Review attitude telemetry for unexpected orientation. 4. Run SA-DIAG-01. 5. If no recovery in 30min, escalate to Anomaly Response Team.' },
      { section: 'THM-ANOM-001: Thruster Temp Rising', text: 'Monitor trend rate. If >5°C/hr, reduce thruster operations. If >65°C, halt thruster use and notify propulsion team.' },
    ],
  },
  {
    id: 'DOC-003',
    title: 'Mission Science Plan — Sol 410-420',
    category: 'Operations Plan',
    tags: ['science', 'planning', 'observations'],
    summary: 'Approved science activities for sols 410-420 including imaging, spectrometry, and atmospheric monitoring campaigns.',
    excerpts: [
      { section: 'Priority Observations', text: 'ATM_SPEC_412: Atmospheric limb spectrometer scan targeting dust storm boundary. HIGH PRIORITY — supports ongoing storm tracking campaign. Do not defer without ART approval.' },
      { section: 'Contingency Rules', text: 'If power constraints prevent nominal science, prioritize in order: (1) Dust storm monitoring, (2) Imaging, (3) Spectrometry, (4) Gravity science.' },
    ],
  },
  {
    id: 'DOC-004',
    title: 'Historical Anomaly Report: MRO Sol 88',
    category: 'Anomaly Report',
    tags: ['historical', 'power', 'solar', 'debris'],
    summary: 'Post-incident report for Mars Reconnaissance Orbiter partial solar panel blockage event on Sol 88.',
    excerpts: [
      { section: 'Root Cause', text: 'Micrometeorite impact on Panel 3A created 4cm² debris occluder. Panel output reduced 12% permanently. No structural damage to core panel.' },
      { section: 'Resolution', text: 'Power budget replanned with 12% margin reduction. Science schedule adapted. Mission continued nominally.' },
    ],
  },
  {
    id: 'DOC-005',
    title: 'ARES-7 Autonomy Architecture Description',
    category: 'System Document',
    tags: ['autonomy', 'OBDH', 'planning', 'fault management'],
    summary: 'Description of the onboard autonomy system including fault detection, isolation, recovery logic, and science prioritization.',
    excerpts: [
      { section: '§3.2 Power Safe Mode Logic', text: 'Power safe mode is triggered when battery charge falls below 75% with a negative trend over 10 minutes. Mode reduces non-critical power loads by 35% and defers science activities. Mode exits when battery recovers above 80%.' },
      { section: '§4.1 Science Priority Rules', text: 'Science activities are ranked by a priority score combining science value, power cost, and sol urgency. Activities with priority score < 6.0 are automatically deferred in power-constrained mode.' },
    ],
  },
];

export const NOTEBOOK_ENTRIES = [
  { id: 'N1', ts: Date.now() - 25*60000, author: 'FSW-Lead', type: 'observation', text: 'PWR_SOL_I shows step change at T-20min. Not correlated with any planned maneuver or eclipse. Initiating SA-DIAG-01.' },
  { id: 'N2', ts: Date.now() - 20*60000, author: 'Power-Eng', type: 'hypothesis', text: 'H1: Partial shadow. H2: String failure. Checking attitude telemetry to rule out orientation change.' },
  { id: 'N3', ts: Date.now() - 12*60000, author: 'MissionDir', type: 'decision', text: 'Accepted autonomy power safe mode entry. Will reassess spectrometer deferral after next DSN contact.' },
  { id: 'N4', ts: Date.now() - 8*60000,  author: 'Science-PI', type: 'concern', text: 'ATM_SPEC_412 is HIGH PRIORITY for dust storm tracking. Request power team evaluate minimum power path for instrument.' },
];
