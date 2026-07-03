import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import TelemetryChart from '../components/TelemetryChart.jsx';
import AlarmBadge from '../components/AlarmBadge.jsx';
import TopBar from '../components/TopBar.jsx';
import { TELEMETRY_CHANNELS, SUBSYSTEMS, ALARMS } from '../data/telemetry.js';
import { clickable } from '../utils/a11y.js';

const STATUS_COLOR = { nominal: '#34d399', warning: '#fbbf24', critical: '#f43f5e', offline: '#475569' };
const STATUS_BG    = { nominal: '#065f46', warning: '#451a03', critical: '#4c0519', offline: '#1e293b' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [selectedSub, setSelectedSub] = useState('power');

  // Simulate live updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const channels = Object.values(TELEMETRY_CHANNELS);
  const subChannels = channels.filter(c => c.subsystem === selectedSub);

  // Always show exactly 3 panels: fill gaps with channels borrowed from other
  // subsystems (in declaration order) so the 3-column grid never has holes.
  const usedKeys = new Set(Object.keys(TELEMETRY_CHANNELS).filter(k => TELEMETRY_CHANNELS[k].subsystem === selectedSub));
  const fillerEntries = Object.entries(TELEMETRY_CHANNELS).filter(([k]) => !usedKeys.has(k));
  const displayChannels = [...subChannels];
  let fillerIdx = 0;
  while (displayChannels.length < 3 && fillerIdx < fillerEntries.length) {
    displayChannels.push(fillerEntries[fillerIdx][1]);
    fillerIdx++;
  }

  const timelineItems = [
    { label: 'Science Imaging Block',  start: 0,   end: 120, type: 'science',     done: true  },
    { label: 'Comm Pass — Goldstone',  start: 130, end: 162, type: 'comms',       done: true  },
    { label: 'Periapsis Maneuver',     start: 200, end: 217, type: 'propulsion',  done: true  },
    { label: 'Power Reduction (AUTO)', start: 220, end: 260, type: 'autonomy',    done: true  },
    { label: 'Data Downlink Block',    start: 310, end: 375, type: 'comms',       done: false },
    { label: 'Atmospheric Scan',       start: 400, end: 450, type: 'science',     done: false },
    { label: 'End-of-Sol Maintenance', start: 460, end: 480, type: 'housekeeping',done: false },
  ];
  const TYPE_COLOR = { science: '#22d3ee', comms: '#a78bfa', propulsion: '#f97316', autonomy: '#fbbf24', housekeeping: '#475569' };
  const SOL_DURATION = 480;
  const currentMin = 320; // simulated current sol minute

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mission Dashboard — ARES-7 Sol 412" />

      <div className="flex-1 overflow-hidden grid grid-rows-[auto_auto_1fr] grid-cols-3 gap-2 p-2">

        {/* Row 1: Subsystem health grid */}
        <Panel title="Subsystem Health" className="col-span-3 h-[90px]">
          <div className="flex gap-2">
            {SUBSYSTEMS.map(sub => {
              const active = selectedSub === sub.id;
              const bg = active ? STATUS_BG[sub.status] : '#0f1a30';
              const border = active ? `${STATUS_COLOR[sub.status]}66` : '#1e2d55';
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSub(sub.id)}
                  className={`flex-1 px-[10px] py-2 rounded-[5px] cursor-pointer text-center transition-all duration-150 border bg-[${bg}] border-[${border}]`}
                >
                  <div className="text-[11px] text-[#94a3b8] mb-1">{sub.label}</div>
                  <div className={`text-[11px] font-bold tracking-[1px] text-[${STATUS_COLOR[sub.status]}] ${sub.status !== 'nominal' ? 'alarm-pulse' : ''}`}>
                    {sub.status.toUpperCase()}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Row 2: Telemetry charts (always 3 panels — gaps filled from other subsystems) */}
        {displayChannels.map(ch => (
          <Panel key={ch.id} title={ch.label} className="h-[200px]">
            <TelemetryChart channel={ch} height={140} />
          </Panel>
        ))}

        {/* Row 3: Alarms + Sol Timeline */}
        <Panel
          title="Active Alarms"
          badge={<span className="bg-[#4c0519] text-[#f43f5e] border border-[#f43f5e44] rounded-[3px] px-[6px] py-[1px] text-[10px] font-bold">
            {ALARMS.filter(a => !a.acknowledged).length} OPEN
          </span>}
          className="col-span-2 h-full min-h-0"
        >
          <div className="flex flex-col gap-[6px]">
            {ALARMS.map(alarm => {
              const bg = alarm.acknowledged ? '#0a1020' : '#0d1525';
              const border = alarm.severity === 'critical' ? '#f43f5e33' : alarm.severity === 'warning' ? '#fbbf2433' : '#1e2d55';
              return (
                <div
                  key={alarm.id}
                  {...clickable(() => navigate('/anomaly'))}
                  className={`rounded-[5px] px-3 py-2 cursor-pointer transition-colors duration-150 border bg-[${bg}] border-[${border}] ${alarm.acknowledged ? 'opacity-60' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-2 mb-[2px]">
                    <AlarmBadge severity={alarm.severity} />
                    <span className="text-[12px] font-semibold text-[#e2e8f0]">{alarm.title}</span>
                    {alarm.acknowledged && <span className="text-[10px] text-[#475569] ml-auto">ACK</span>}
                  </div>
                  <div className="text-[11px] text-[#64748b] leading-[1.4]">{alarm.detail.slice(0, 90)}…</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Sol timeline */}
        <Panel title="Sol 412 Timeline" className="h-full min-h-0">
          <div className="relative">
            <div className="flex justify-between text-[10px] text-[#475569] mb-2">
              <span>Sol Start</span>
              <span className="text-[#22d3ee]">NOW T+{currentMin}m</span>
              <span>Sol End</span>
            </div>
            <div className="relative h-1 bg-[#0f1a30] rounded-[2px] mb-3">
              <div className="absolute -top-1 w-[2px] h-3 bg-[#22d3ee] rounded-[1px]" style={{ left: `${(currentMin / SOL_DURATION) * 100}%` }} />
            </div>
            <div className="flex flex-col gap-1">
              {timelineItems.map((item, i) => {
                const left = `${(item.start / SOL_DURATION) * 100}%`;
                const width = `${((item.end - item.start) / SOL_DURATION) * 100}%`;
                const isPast = item.end < currentMin;
                const barBg = isPast ? TYPE_COLOR[item.type] + 'aa' : TYPE_COLOR[item.type] + '44';
                return (
                  <div key={i} className="relative h-5">
                    <div className="text-[9px] text-[#475569] mb-[1px]" style={{ paddingLeft: left }}>{item.label}</div>
                    <div className={`absolute h-[14px] rounded-[2px] border bg-[${barBg}] border-[${TYPE_COLOR[item.type]}66]`} style={{ left, width }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-[10px] flex-wrap">
              {Object.entries(TYPE_COLOR).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-[10px] text-[#64748b]">
                  <div className={`w-2 h-2 rounded-[2px] bg-[${v}]`} />
                  {k}
                </div>
              ))}
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
