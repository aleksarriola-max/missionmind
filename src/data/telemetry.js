// Simulated spacecraft telemetry — MissionMind demo data
// Mission: ARES-7 Mars Orbiter  |  Sol 412

export const MISSION = {
  name: 'ARES-7',
  type: 'Mars Orbiter',
  sol: 412,
  missionPhase: 'Science Operations',
  launchDate: '2024-07-15',
  missionDuration: '412 sols',
  groundContact: 'DSN Goldstone',
  lightTimeDelay: '14m 32s',
  status: 'nominal',
};

// Generate realistic telemetry history (last 60 data points)
function genSeries(base, noise, trend = 0, anomalyAt = -1, anomalyAmp = 0) {
  return Array.from({ length: 60 }, (_, i) => {
    const t = Date.now() - (59 - i) * 60000;
    let val = base + trend * i + (Math.random() - 0.5) * noise;
    if (anomalyAt > 0 && i >= anomalyAt) val += anomalyAmp * (i - anomalyAt) * 0.3;
    return { t, v: +val.toFixed(2) };
  });
}

export const TELEMETRY_CHANNELS = {
  // Power
  busVoltage:      { id: 'PWR_BUS_V',    label: 'Bus Voltage',     unit: 'V',    nominal: [27.5, 29.5], series: genSeries(28.4, 0.3), subsystem: 'power', color: '#22d3ee' },
  solarCurrent:    { id: 'PWR_SOL_I',    label: 'Solar Current',   unit: 'A',    nominal: [3.5, 5.5],   series: genSeries(4.8, 0.4, -0.02, 40, -0.4), subsystem: 'power', color: '#34d399' },
  battCharge:      { id: 'PWR_BAT_PCT',  label: 'Battery Charge',  unit: '%',    nominal: [20, 100],    series: genSeries(82, 2, -0.15, 38, -1.2), subsystem: 'power', color: '#fbbf24' },
  // Thermal
  mainBoardTemp:   { id: 'THM_MB_T',     label: 'Main Board Temp', unit: '°C',   nominal: [-10, 45],    series: genSeries(22, 1.5), subsystem: 'thermal', color: '#f97316' },
  thrusterTemp:    { id: 'THM_THR_T',    label: 'Thruster Temp',   unit: '°C',   nominal: [10, 80],     series: genSeries(38, 3, 0.1, 42, 2.5), subsystem: 'thermal', color: '#f43f5e' },
  // Comms
  signalStrength:  { id: 'COM_RSSI',     label: 'Signal Strength', unit: 'dBm',  nominal: [-110, -60],  series: genSeries(-82, 2), subsystem: 'comms', color: '#a78bfa' },
  dataRate:        { id: 'COM_RATE',     label: 'Data Rate',       unit: 'kbps', nominal: [50, 500],    series: genSeries(320, 20), subsystem: 'comms', color: '#818cf8' },
  // Attitude
  attError:        { id: 'ATT_ERR',      label: 'Attitude Error',  unit: '°',    nominal: [0, 0.1],     series: genSeries(0.04, 0.01), subsystem: 'adcs', color: '#06b6d4' },
  reactionWheel:   { id: 'ATT_RW_RPM',   label: 'RW Speed',        unit: 'RPM',  nominal: [0, 3000],    series: genSeries(1450, 80, 0.5, 35, 12), subsystem: 'adcs', color: '#67e8f9' },
  // Payload
  scienceDataVol:  { id: 'PLD_DATA_GB',  label: 'Science Data',    unit: 'GB',   nominal: [0, 120],     series: genSeries(47, 1, 0.4), subsystem: 'payload', color: '#34d399' },
};

export function isNominal(channel, value) {
  const [lo, hi] = channel.nominal;
  return value >= lo && value <= hi;
}

export const SUBSYSTEMS = [
  { id: 'power',   label: 'Power',     status: 'warning',  channels: ['busVoltage','solarCurrent','battCharge'] },
  { id: 'thermal', label: 'Thermal',   status: 'warning',  channels: ['mainBoardTemp','thrusterTemp'] },
  { id: 'comms',   label: 'Comms',     status: 'nominal',  channels: ['signalStrength','dataRate'] },
  { id: 'adcs',    label: 'ADCS',      status: 'nominal',  channels: ['attError','reactionWheel'] },
  { id: 'payload', label: 'Payload',   status: 'nominal',  channels: ['scienceDataVol'] },
  { id: 'prop',    label: 'Propulsion',status: 'nominal',  channels: [] },
  { id: 'obdh',    label: 'OBDH',      status: 'nominal',  channels: [] },
];

export const ALARMS = [
  { id: 'ALM-001', severity: 'critical', subsystem: 'power',   title: 'Solar Array Current Anomaly', detail: 'PWR_SOL_I dropped 18% below nominal at T-22min. Battery drain rate elevated.', ts: Date.now() - 22*60000, acknowledged: false },
  { id: 'ALM-002', severity: 'warning',  subsystem: 'thermal', title: 'Thruster Temp Trending High', detail: 'THM_THR_T rising at +2.5°C/hr. Within nominal bounds but trending toward limit.', ts: Date.now() - 15*60000, acknowledged: false },
  { id: 'ALM-003', severity: 'warning',  subsystem: 'power',   title: 'Battery Charge Below 70%',    detail: 'PWR_BAT_PCT at 68.4%. Secondary to solar current drop.', ts: Date.now() - 18*60000, acknowledged: true  },
  { id: 'ALM-004', severity: 'info',     subsystem: 'adcs',    title: 'Reaction Wheel Speed Drift',  detail: 'ATT_RW_RPM trending +12 RPM/hr above baseline. Within tolerance.', ts: Date.now() - 8*60000, acknowledged: true  },
];
