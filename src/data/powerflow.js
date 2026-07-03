// Power flow snapshot for the Sankey diagram — approximate wattages during
// the current power-safe-mode event (Sol 412, T+260m). Values are for
// visualization only; bus regulation loss accounts for the small gap
// between total source input and total subsystem draw.

export const POWER_FLOW = {
  sources: [
    { id: 'solar',   label: 'Solar Array', value: 140, color: '#34d399' },
    { id: 'battery', label: 'Battery (backup)', value: 40, color: '#fbbf24' },
  ],
  hub: { id: 'bus', label: 'Power Bus' },
  sinks: [
    { id: 'obdh',     label: 'OBDH',       value: 20, color: '#22d3ee' },
    { id: 'comms',    label: 'Comms',      value: 45, color: '#a78bfa' },
    { id: 'payload',  label: 'Payload',    value: 55, color: '#34d399' },
    { id: 'adcs',     label: 'ADCS',       value: 18, color: '#67e8f9' },
    { id: 'thruster', label: 'Thruster (heaters only)', value: 8, color: '#f97316' },
  ],
};
