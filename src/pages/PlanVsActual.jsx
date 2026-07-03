import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import { PLAN_ACTIVITIES } from '../data/missions.js';

const TYPE_COLOR   = { science: '#22d3ee', comms: '#a78bfa', propulsion: '#f97316', power: '#fbbf24', housekeeping: '#475569' };
const STATUS_COLOR = { completed: '#34d399', delayed: '#fbbf24', missed: '#f43f5e', unplanned: '#a78bfa', pending: '#475569' };
const STATUS_LABEL = { completed: '✓ COMPLETED', delayed: '⏳ DELAYED', missed: '✗ MISSED', unplanned: '◆ UNPLANNED', pending: '○ PENDING' };
const SOL = 480;
const CURRENT = 320;

function pct(v) { return `${(v / SOL) * 100}%`; }
function width(s, e) { return `${((e - s) / SOL) * 100}%`; }

export default function PlanVsActual() {
  const completed = PLAN_ACTIVITIES.filter(a => a.status === 'completed').length;
  const delayed   = PLAN_ACTIVITIES.filter(a => a.status === 'delayed').length;
  const missed    = PLAN_ACTIVITIES.filter(a => a.status === 'missed').length;
  const unplanned = PLAN_ACTIVITIES.filter(a => a.status === 'unplanned').length;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Plan vs Actual Reconstruction — ARES-7 Sol 412" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: 'Activities Completed', value: completed, color: '#34d399' },
            { label: 'Activities Delayed',   value: delayed,   color: '#fbbf24' },
            { label: 'Activities Missed',    value: missed,    color: '#f43f5e' },
            { label: 'Unplanned Actions',    value: unplanned, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-[6px] p-[14px] text-center">
              <div className={`text-[28px] font-bold font-mono text-[${s.color}]`}>{s.value}</div>
              <div className="text-[11px] text-[#64748b] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <Panel title="Timeline Reconstruction — Planned (top) vs Actual (bottom)">
          <div className="relative ml-[160px] mb-2">
            <div className="flex justify-between text-[10px] text-[#475569] mb-1">
              {[0, 60, 120, 180, 240, 300, 360, 420, 480].map(m => <span key={m}>{m}m</span>)}
            </div>
            <div className="relative h-[2px] bg-[#1e2d55] rounded-[1px]">
              <div className="absolute -top-1 w-[2px] h-[10px] bg-[#22d3ee]" style={{ left: pct(CURRENT) }} />
              <div className="absolute -translate-x-1/2 text-[9px] text-[#22d3ee]" style={{ left: pct(CURRENT), top: 8 }}>NOW</div>
            </div>
          </div>

          {PLAN_ACTIVITIES.map(act => (
            <div key={act.id} className="flex items-center mb-[10px] gap-2">
              <div className="w-[155px] shrink-0 text-right pr-2">
                <div className="text-[11px] text-[#e2e8f0] font-medium mb-[2px]">{act.label}</div>
                <span className={`text-[10px] font-semibold text-[${STATUS_COLOR[act.status]}]`}>{STATUS_LABEL[act.status]}</span>
              </div>

              <div className="flex-1">
                <div className="relative h-[14px] mb-[3px]">
                  {act.planned && (
                    <div
                      className={`absolute h-full rounded-[2px] border bg-[${TYPE_COLOR[act.type]}44] border-[${TYPE_COLOR[act.type]}66]`}
                      style={{ left: pct(act.planned[0]), width: width(act.planned[0], act.planned[1]) }}
                    >
                      <div className={`text-[9px] px-1 leading-[14px] whitespace-nowrap overflow-hidden text-[${TYPE_COLOR[act.type]}]`}>PLAN</div>
                    </div>
                  )}
                  {!act.planned && (
                    <div className="absolute inset-x-0 h-full border-t border-dashed border-[#1e2d55]" />
                  )}
                </div>
                <div className="relative h-[14px]">
                  {act.actual && (
                    <div
                      className={`absolute h-full rounded-[2px] border bg-[${STATUS_COLOR[act.status]}55] border-[${STATUS_COLOR[act.status]}88]`}
                      style={{ left: pct(act.actual[0]), width: width(act.actual[0], act.actual[1]) }}
                    >
                      <div className={`text-[9px] px-1 leading-[14px] whitespace-nowrap overflow-hidden text-[${STATUS_COLOR[act.status]}]`}>ACTUAL</div>
                    </div>
                  )}
                  {!act.actual && act.status !== 'pending' && (
                    <div className="absolute text-[10px] text-[#f43f5e] top-[2px]" style={{ left: pct(act.planned?.[0] || 0) }}>✗ not executed</div>
                  )}
                </div>
                {act.note && (
                  <div className="text-[10px] text-[#fbbf24] mt-[2px]" style={{ paddingLeft: act.planned ? pct(act.planned[0]) : pct(act.actual?.[0] || 0) }}>
                    ⚠ {act.note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Causal Reconstruction — What Triggered What">
          <div className="flex overflow-auto">
            {[
              { t: 'T+200m', event: 'Periapsis Maneuver', color: '#f97316', cause: 'Planned' },
              { t: 'T+220m', event: 'Solar Array Anomaly', color: '#f43f5e', cause: 'Unknown trigger' },
              { t: 'T+222m', event: 'Autonomy: Power Safe Mode', color: '#fbbf24', cause: 'Triggered by solar anomaly' },
              { t: 'T+225m', event: 'Spectrometer Deferred', color: '#a78bfa', cause: 'Power safe mode entry' },
              { t: 'T+260m', event: 'Battery Stabilized', color: '#34d399', cause: 'Load reduction effective' },
              { t: 'T+315m', event: 'Downlink Started (delayed)', color: '#22d3ee', cause: 'Power constraint eased' },
            ].map((e, i, arr) => (
              <div key={i} className="flex flex-col items-center min-w-[130px]">
                <div className="text-[10px] text-[#475569] font-mono mb-[6px]">{e.t}</div>
                <div className={`w-[10px] h-[10px] rounded-full bg-[${e.color}] shadow-[0_0_8px_${e.color}88]`} />
                {i < arr.length - 1 && (
                  <div className={`w-full h-[2px] mt-1 mb-1 bg-[linear-gradient(to_right,${e.color}88,${arr[i+1].color}88)]`} />
                )}
                <div className="text-[11px] text-[#e2e8f0] text-center mt-[6px] font-medium">{e.event}</div>
                <div className="text-[10px] text-[#475569] text-center mt-[2px]">{e.cause}</div>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
