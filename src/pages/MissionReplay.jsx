import { useState, useEffect, useRef } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import { TELEMETRY_CHANNELS } from '../data/telemetry.js';
import { clickable } from '../utils/a11y.js';

// Full causal event chain with detailed metadata
const REPLAY_EVENTS = [
  {
    t: 200, id: 'E0', type: 'nominal',    icon: '●',
    title: 'Periapsis Maneuver Executed',
    detail: 'Thruster burn completed nominally. Δv = 4.2 m/s. Post-burn state nominal. No anomalies detected.',
    channels: [], causalChildren: ['E1'],
    rule: null,
    metrics: { burnDuration: '14.2s', deltaV: '4.2 m/s', fuelUsed: '0.82 kg', postBurnPower: '28.3V' },
  },
  {
    t: 220, id: 'E1', type: 'anomaly',    icon: '▲',
    title: 'Solar Array Current Step-Drop',
    detail: 'PWR_SOL_I fell from 4.82A to 3.96A in < 60s — an 18% step decrease. Pattern inconsistent with gradual degradation. Onset at T+220min. Cause unknown at time of detection.',
    channels: ['solarCurrent'],
    causalChildren: ['E2', 'E3'],
    rule: 'Detected by EWMA detector (3σ control limit breach). Z-score = 3.41. Ensemble score = 1.0.',
    metrics: { preDrop: '4.82A', postDrop: '3.96A', dropMagnitude: '18.0%', detectionLatency: '2.5 min' },
  },
  {
    t: 222, id: 'E2', type: 'autonomy',   icon: '⏳',
    title: 'Autonomy: Battery Trend Alarm',
    detail: 'Onboard FDIR detected that battery charge trend had turned negative at rate -0.8%/hr above baseline. Battery at 74.2% and declining. Alarm threshold: 75% with negative trend for > 10 minutes.',
    channels: ['battCharge', 'solarCurrent'],
    causalChildren: ['E4'],
    rule: 'FDIR rule EPS-PWR-002: IF battery_charge < 75% AND trend_slope < -0.5%/hr THEN trigger power_safe_assessment.',
    metrics: { battAtTrigger: '74.2%', trendSlope: '-0.83%/hr', timeToThreshold: '12.8 min' },
  },
  {
    t: 225, id: 'E3', type: 'autonomy',   icon: '⏳',
    title: 'Autonomy: SA-DIAG-01 Initiated',
    detail: 'Onboard software initiated solar array diagnostic sequence SA-DIAG-01. String sweep in progress. Result pending. Diagnostic duration: ~8 minutes.',
    channels: ['solarCurrent'],
    causalChildren: ['E5'],
    rule: 'Power Subsystem Handler rule PSH-DIAG-003: IF PWR_SOL_I drops > 15% for > 5min THEN initiate SA-DIAG-01.',
    metrics: { diagnosticStart: 'T+225m', estimatedDuration: '8 min', stringsToTest: 6 },
  },
  {
    t: 232, id: 'E4', type: 'autonomy',   icon: '⏳',
    title: 'Autonomy: Power Safe Mode Entry',
    detail: 'Battery charge reached 73.1% with declining trend. Autonomy entered Power Safe Mode. Payload power allocation reduced 35%. Non-critical heaters shed. Science data recorder rate halved.',
    channels: ['battCharge', 'solarCurrent'],
    causalChildren: ['E6', 'E7'],
    rule: 'FDIR rule EPS-PWR-003: IF battery_charge < 75% AND decline_confirmed THEN enter_power_safe_mode.',
    metrics: { payloadReduction: '35%', heatersShed: 3, scienceRateReduction: '50%', battAtEntry: '73.1%' },
  },
  {
    t: 233, id: 'E5', type: 'nominal',    icon: '●',
    title: 'SA-DIAG-01: String Sweep Completed',
    detail: 'String sweep completed. Strings 1-5: nominal. String 6: 18% below expected output. Two sub-hypotheses: (A) partial occlusion of string 6 cells, (B) string 6 cell failure. Thermal signature for string 6 unavailable — sensor in shadow.',
    channels: ['solarCurrent'],
    causalChildren: [],
    rule: null,
    metrics: { stringsNominal: 5, stringsFailed: 1, failedString: '6A', outputLoss: '18%' },
  },
  {
    t: 240, id: 'E6', type: 'consequence', icon: '◇',
    title: 'Spectrometer Observation Deferred',
    detail: 'ATM_SPEC_412 could not execute — power budget insufficient for spectrometer heater + instrument draw in power safe mode. Activity deferred to Sol 414. Science PI notified.',
    channels: [],
    causalChildren: [],
    rule: 'Science Scheduler rule SCI-SCHED-007: IF power_mode == SAFE AND activity_power_cost > available_margin THEN defer_to_next_opportunity.',
    metrics: { deferredActivity: 'ATM_SPEC_412', nextOpportunity: 'Sol 414', scienceValueLost: 9.5 },
  },
  {
    t: 260, id: 'E7', type: 'nominal',    icon: '●',
    title: 'Battery Stabilized at 68.4%',
    detail: 'Power safe mode load reduction effective. Battery discharge rate returned to nominal baseline (-0.02%/hr). Charge now stable at 68.4%. System remains in safe mode pending SA-DIAG-01 analysis.',
    channels: ['battCharge'],
    causalChildren: [],
    rule: null,
    metrics: { battAtStabilization: '68.4%', dischargRate: '-0.02%/hr', loadReduction: '142W' },
  },
];

const EVENT_COLOR = { nominal: '#34d399', anomaly: '#f43f5e', autonomy: '#fbbf24', consequence: '#a78bfa' };
const EVENT_BG    = { nominal: '#065f46', anomaly: '#4c0519',  autonomy: '#451a03',  consequence: '#2e1065' };

export default function MissionReplay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying]         = useState(false);
  const [speed, setSpeed]             = useState(1);
  const [visitedIds, setVisitedIds]   = useState(new Set(['E0']));
  const intervalRef = useRef(null);

  const maxStep = REPLAY_EVENTS.length - 1;
  const ev = REPLAY_EVENTS[currentStep];

  function goTo(step) {
    const s = Math.max(0, Math.min(maxStep, step));
    setCurrentStep(s);
    setVisitedIds(prev => {
      const next = new Set(prev);
      REPLAY_EVENTS.slice(0, s + 1).forEach(e => next.add(e.id));
      return next;
    });
  }

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(s => {
          if (s >= maxStep) { setPlaying(false); return s; }
          const next = s + 1;
          setVisitedIds(prev => { const n = new Set(prev); n.add(REPLAY_EVENTS[next].id); return n; });
          return next;
        });
      }, 2000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, maxStep]);

  // Telemetry for active channels at current time — filter out any channel
  // key that doesn't exist in TELEMETRY_CHANNELS before slicing, so a stale
  // or renamed key can never silently shrink the displayed snapshot grid.
  const activeChannels = [...new Set(REPLAY_EVENTS.slice(0, currentStep + 1).flatMap(e => e.channels))]
    .filter(key => Boolean(TELEMETRY_CHANNELS[key]));

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mission Replay & Causal Reconstruction — Sol 412 Solar Anomaly" />

      <div className="flex-1 overflow-hidden grid grid-cols-[320px_1fr] gap-2 p-2">

        {/* Left: Event timeline */}
        <Panel title="Causal Event Chain" headerRight={
          <div className="flex gap-1 items-center">
            <button onClick={() => goTo(currentStep - 1)} className="bg-[#0f1a30] border border-[#1e2d55] rounded-[3px] px-2 py-[2px] text-[11px] text-[#64748b] cursor-pointer">◀</button>
            <button onClick={() => setPlaying(!playing)} className={`rounded-[3px] px-2 py-[2px] text-[11px] cursor-pointer border ${playing ? 'bg-[#451a03] border-[#fbbf2444] text-[#fbbf24]' : 'bg-[#0f1a30] border-[#1e2d55] text-[#64748b]'}`}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button onClick={() => { goTo(0); setPlaying(false); }} className="bg-[#0f1a30] border border-[#1e2d55] rounded-[3px] px-2 py-[2px] text-[11px] text-[#64748b] cursor-pointer">↺</button>
            <select value={speed} onChange={e => setSpeed(+e.target.value)} className="bg-[#0f1a30] border border-[#1e2d55] rounded-[3px] px-1 py-[2px] text-[10px] text-[#64748b] cursor-pointer">
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
            </select>
          </div>
        }>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-[#1e2d55]" />

            {REPLAY_EVENTS.map((event, i) => {
              const visited = visitedIds.has(event.id);
              const active  = currentStep === i;
              const color   = EVENT_COLOR[event.type];
              return (
                <div
                  key={event.id}
                  {...clickable(() => goTo(i))}
                  className={`flex gap-[10px] mb-3 cursor-pointer transition-opacity duration-300 ${visited ? 'opacity-100' : 'opacity-35'}`}
                >
                  <div className="relative shrink-0 w-[40px]">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ml-[9px] transition-all duration-200 text-[${color}] border-[${color}] ${active ? `bg-[${EVENT_BG[event.type]}]` : 'bg-[#0a1020]'}`}
                      style={{ boxShadow: active ? `0 0 10px ${color}88` : 'none' }}
                    >
                      {event.icon}
                    </div>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex justify-between mb-[2px]">
                      <span className="text-[10px] font-mono text-[#475569]">T+{event.t}m</span>
                      <span className={`text-[9px] rounded-[2px] px-[5px] tracking-[0.5px] border text-[${color}] bg-[${EVENT_BG[event.type]}] border-[${color}44]`}>{event.type.toUpperCase()}</span>
                    </div>
                    <div className={`text-[11px] ${active ? 'font-bold text-[#e2e8f0]' : 'font-medium text-[#94a3b8]'}`}>{event.title}</div>
                    {event.causalChildren.length > 0 && (
                      <div className="text-[10px] text-[#475569] mt-[2px]">→ triggers: {event.causalChildren.join(', ')}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-[#475569] mb-1">
              <span>T+200m</span><span>T+{ev.t}m</span><span>T+260m</span>
            </div>
            <input type="range" min={0} max={maxStep} value={currentStep} onChange={e => goTo(+e.target.value)}
              className="w-full accent-[#22d3ee]" />
          </div>
        </Panel>

        {/* Right: Event detail */}
        <div className="flex flex-col gap-2 overflow-auto">

          <Panel title={`Event Detail — ${ev.id}`}
            badge={<span className={`text-[10px] font-bold rounded-[3px] px-2 py-[2px] tracking-[0.5px] border text-[${EVENT_COLOR[ev.type]}] bg-[${EVENT_BG[ev.type]}] border-[${EVENT_COLOR[ev.type]}44]`}>{ev.type.toUpperCase()}</span>}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">T+ MISSION TIME</div>
                <div className="text-[18px] font-bold font-mono text-[#22d3ee]">T+{ev.t} min</div>
                <div className="text-[10px] text-[#475569] mt-2 tracking-[1px]">EVENT</div>
                <div className="text-[14px] font-bold text-[#e2e8f0] mt-[2px]">{ev.title}</div>
                <div className="text-[12px] text-[#94a3b8] leading-[1.6] mt-2">{ev.detail}</div>
              </div>
              <div>
                {ev.rule && (
                  <div className="mb-[10px]">
                    <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">TRIGGERING RULE / DETECTION</div>
                    <div className="bg-[#071220] border border-[#22d3ee22] rounded-[5px] p-[10px] text-[11px] text-[#22d3ee] font-mono leading-[1.6]">{ev.rule}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-[#475569] tracking-[1px] mb-[6px]">KEY METRICS AT EVENT TIME</div>
                  {Object.entries(ev.metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#64748b]">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-[#e2e8f0] font-mono font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Causal Chain — Impact Propagation">
            <div className="flex items-center overflow-x-auto py-2">
              {REPLAY_EVENTS.slice(0, currentStep + 1).map((e, i, arr) => {
                const color = EVENT_COLOR[e.type];
                const isCurrent = e.id === ev.id;
                return (
                  <div key={e.id} className="flex items-center">
                    <div
                      {...clickable(() => goTo(i))}
                      className={`rounded-[6px] px-[10px] py-2 cursor-pointer min-w-[100px] text-center transition-all duration-200 border-2 text-[${color}] ${isCurrent ? `bg-[${EVENT_BG[e.type]}] border-[${color}]` : `bg-[#0a1020] border-[${color}66]`}`}
                      style={{ boxShadow: isCurrent ? `0 0 10px ${color}66` : 'none' }}
                    >
                      <div className="text-[9px] text-[#475569] font-mono">T+{e.t}m</div>
                      <div className="text-[10px] font-bold mt-[2px]">{e.icon} {e.id}</div>
                      <div className="text-[9px] text-[#94a3b8] mt-[2px] leading-[1.3]">{e.title.split(' ').slice(0, 3).join(' ')}</div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex flex-col items-center min-w-[40px]">
                        <div className="text-[14px] text-[#1e2d55]">→</div>
                        <div className="text-[9px] text-[#475569] text-center leading-[1.2]">
                          {arr[i + 1].t - e.t}m later
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {activeChannels.length > 0 && (
            <Panel title={`Telemetry Snapshot — T+${ev.t}min`}>
              <div className="grid grid-cols-3 gap-2">
                {activeChannels.slice(0, 3).map(chKey => {
                  const ch = TELEMETRY_CHANNELS[chKey];
                  const replayIdx = Math.min(Math.floor((ev.t / 480) * ch.series.length), ch.series.length - 1);
                  const val = ch.series[replayIdx]?.v;
                  const [lo, hi] = ch.nominal;
                  const inRange = val >= lo && val <= hi;
                  return (
                    <div key={chKey} className={`bg-[#0f1a30] rounded-[5px] p-[10px] border ${inRange ? 'border-[#1e2d55]' : 'border-[#f43f5e44]'}`}>
                      <div className="text-[10px] text-[#475569] font-mono mb-1">{ch.id}</div>
                      <div className={`text-[20px] font-bold font-mono text-[${inRange ? ch.color : '#f43f5e'}]`}>
                        {val} <span className="text-[11px] text-[#475569]">{ch.unit}</span>
                      </div>
                      <div className="text-[10px] text-[#475569] mt-[2px]">Nominal: [{lo}, {hi}]</div>
                      {!inRange && <div className="text-[10px] text-[#f43f5e] mt-[2px]">⚠ OUT OF RANGE</div>}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}
