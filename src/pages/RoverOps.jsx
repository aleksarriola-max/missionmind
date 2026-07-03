import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import { ROVER_STATE, ROUTE_WAYPOINTS, HAZARD_ZONES } from '../data/rover.js';
import { clickable } from '../utils/a11y.js';

const SEVERITY_COLOR = { low: '#34d399', medium: '#fbbf24', high: '#f43f5e' };
const WP_STATUS_COLOR = { visited: '#34d399', current: '#22d3ee', planned: '#475569' };

function hazardColor(score) {
  if (score >= 0.5) return '#f43f5e';
  if (score >= 0.25) return '#fbbf24';
  return '#34d399';
}

export default function RoverOps() {
  const [selectedWp, setSelectedWp] = useState(ROUTE_WAYPOINTS.find(w => w.status === 'current')?.id ?? null);

  const wp = ROUTE_WAYPOINTS.find(w => w.id === selectedWp);
  const routePath = ROUTE_WAYPOINTS.map(w => `${w.x},${w.y}`).join(' ');
  const visitedCount = ROUTE_WAYPOINTS.filter(w => w.status === 'visited').length;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Surface Operations — PROBE-2 Rover Route Planner" />

      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_320px] gap-2 p-2">

        {/* Terrain map */}
        <Panel title="Terrain Hazard Map — Jezero Rim Approach" headerRight={<span className="text-[10px] text-[#475569]">Click a waypoint for route reasoning</span>}>
          <svg width="100%" height="100%" viewBox="0 0 800 500" className="block">
            <defs>
              <pattern id="terrainGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0f1a30" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="800" height="500" fill="#070b14" />
            <rect width="800" height="500" fill="url(#terrainGrid)" />

            {/* Hazard zones */}
            {HAZARD_ZONES.map(hz => (
              <g key={hz.id}>
                <circle cx={hz.x} cy={hz.y} r={hz.radius} fill={SEVERITY_COLOR[hz.severity]} fillOpacity={0.15} stroke={SEVERITY_COLOR[hz.severity]} strokeOpacity={0.5} strokeDasharray="4 3" />
                <text x={hz.x} y={hz.y + hz.radius + 12} textAnchor="middle" fontSize={9} fill={SEVERITY_COLOR[hz.severity]} fillOpacity={0.8}>{hz.label}</text>
              </g>
            ))}

            {/* Planned route */}
            <polyline points={routePath} fill="none" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 5" strokeOpacity={0.7} />

            {/* Waypoints */}
            {ROUTE_WAYPOINTS.map(w => {
              const isSelected = selectedWp === w.id;
              return (
                <g key={w.id} onClick={() => setSelectedWp(w.id)} className="cursor-pointer">
                  <circle cx={w.x} cy={w.y} r={isSelected ? 13 : 9}
                    fill={isSelected ? '#162040' : '#0a1020'}
                    stroke={WP_STATUS_COLOR[w.status]} strokeWidth={isSelected ? 3 : 2}
                    style={{ filter: w.status === 'current' ? `drop-shadow(0 0 8px ${WP_STATUS_COLOR[w.status]}aa)` : 'none' }}
                  />
                  <text x={w.x} y={w.y - 16} textAnchor="middle" fontSize={9} fontWeight="600" fill={WP_STATUS_COLOR[w.status]}>{w.id}</text>
                  <circle cx={w.x} cy={w.y} r={3} fill={hazardColor(w.hazardScore)} />
                </g>
              );
            })}

            {/* Rover marker */}
            <g transform={`translate(${ROVER_STATE.position.x}, ${ROVER_STATE.position.y}) rotate(${ROVER_STATE.heading})`}>
              <rect x={-8} y={-6} width={16} height={12} rx={2} fill="#fbbf24" stroke="#0a1020" strokeWidth={1.5} />
              <circle r={20} fill="none" stroke="#fbbf24" strokeOpacity={0.4} strokeWidth={1}>
                <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        </Panel>

        {/* Right: rover status + waypoint detail */}
        <div className="flex flex-col gap-2 overflow-auto">

          <Panel title="Rover Status">
            <div className="text-[14px] font-bold text-[#fbbf24] mb-2">{ROVER_STATE.label} · {ROVER_STATE.id}</div>
            <div className="flex flex-col gap-[6px] text-[12px]">
              <div className="flex justify-between"><span className="text-[#64748b]">Status</span><span className="text-[#22d3ee] font-semibold">{ROVER_STATE.status.toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Battery</span><span className="text-[#e2e8f0] font-mono">{ROVER_STATE.battery}%</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Solar Input</span><span className="text-[#e2e8f0] font-mono">{ROVER_STATE.solarInputW}W</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Speed</span><span className="text-[#e2e8f0] font-mono">{ROVER_STATE.speedMps} m/s</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Distance traveled</span><span className="text-[#e2e8f0] font-mono">{ROVER_STATE.distanceTraveledM}m</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Distance remaining</span><span className="text-[#e2e8f0] font-mono">{ROVER_STATE.distanceRemainingM}m</span></div>
              <div className="h-px bg-[#1e2d55] my-1" />
              <div className="text-[11px] text-[#475569]">{ROVER_STATE.commWindow}</div>
            </div>
            <div className="mt-[10px]">
              <ConfidenceMeter value={visitedCount / ROUTE_WAYPOINTS.length} label="Route Progress" />
            </div>
          </Panel>

          <Panel title="Route Waypoints">
            <div className="flex flex-col gap-[6px]">
              {ROUTE_WAYPOINTS.map(w => (
                <div key={w.id} {...clickable(() => setSelectedWp(w.id))}
                  className={`rounded-[5px] px-[10px] py-[7px] cursor-pointer border ${selectedWp === w.id ? `bg-[#0d1525] border-[${WP_STATUS_COLOR[w.status]}66]` : 'bg-[#0a1020] border-[#1e2d55]'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-[#e2e8f0]">{w.id} · {w.label}</span>
                    <span className={`text-[10px] font-bold text-[${WP_STATUS_COLOR[w.status]}]`}>{w.status.toUpperCase()}</span>
                  </div>
                  <div className={`text-[10px] mt-[2px] text-[${hazardColor(w.hazardScore)}]`}>Hazard: {Math.round(w.hazardScore * 100)}%</div>
                </div>
              ))}
            </div>
          </Panel>

          {wp && (
            <Panel title={`Route Reasoning — ${wp.id}`}>
              <div className="text-[13px] font-bold text-[#e2e8f0] mb-[6px]">{wp.label}</div>
              <div className="mb-2">
                <ConfidenceMeter value={wp.hazardScore} label="Hazard Score" />
              </div>
              <div className="text-[12px] text-[#94a3b8] leading-[1.6]">{wp.reasoning}</div>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}
