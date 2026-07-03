import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import { MISSION_ACTIVITIES, WHATIF_SCENARIOS } from '../data/missions.js';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { clickable } from '../utils/a11y.js';

const PRIORITY_COLOR = { critical: '#f43f5e', high: '#fbbf24', medium: '#22d3ee', low: '#475569' };
const URGENCY_BY_PRIORITY = { critical: 1, high: 0.75, medium: 0.5, low: 0.25 };
const DEFAULT_WEIGHTS = { science: 0.4, power: 0.3, risk: 0.2, urgency: 0.1 };

// Multi-criteria decision analysis: each activity is scored on four
// normalized (0-1) criteria, combined via user-adjustable weights so
// operators can see how re-prioritizing (e.g. favoring urgency over
// power cost) reorders the science triage list in real time.
function mcdaScore(act, weights) {
  const scienceNorm = act.scienceValue / 10;
  const powerNorm   = Math.max(0, 1 - act.powerW / 300);
  const riskNorm    = 1 - act.riskScore;
  const urgencyNorm = URGENCY_BY_PRIORITY[act.priority] ?? 0.5;
  const weightSum = weights.science + weights.power + weights.risk + weights.urgency || 1;
  return (
    scienceNorm * weights.science +
    powerNorm   * weights.power +
    riskNorm    * weights.risk +
    urgencyNorm * weights.urgency
  ) / weightSum;
}

export default function MissionPlanner() {
  const [selected, setSelected] = useState(new Set(['P1','P3','P6','P7']));
  const [activeScenario, setActiveScenario] = useState(null);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function setWeight(key, value) {
    setWeights(prev => ({ ...prev, [key]: value }));
  }

  const chosen = MISSION_ACTIVITIES.filter(a => selected.has(a.id));
  const totalPower = chosen.reduce((s, a) => s + a.powerW, 0);
  const totalTime  = chosen.reduce((s, a) => s + a.durationMin, 0);
  const totalScience = chosen.reduce((s, a) => s + a.scienceValue, 0);
  const maxRisk    = Math.max(...chosen.map(a => a.riskScore), 0);
  const powerBudget = 350;
  const timeBudget  = 480;

  const radarData = [
    { label: 'Science Value', val: Math.min(totalScience / 40, 1) * 100 },
    { label: 'Power Safety',  val: Math.max(0, (1 - totalPower / powerBudget)) * 100 },
    { label: 'Time Margin',   val: Math.max(0, (1 - totalTime / timeBudget)) * 100 },
    { label: 'Low Risk',      val: (1 - maxRisk) * 100 },
    { label: 'Feasibility',   val: totalPower <= powerBudget && totalTime <= timeBudget ? 85 : 30 },
  ];

  const scenario = WHATIF_SCENARIOS.find(s => s.id === activeScenario);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mission Planner & What-If Simulator — Sol 413" />

      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_280px] gap-2 p-2">

        <div className="flex flex-col gap-2 overflow-auto">

          <Panel title="Science Priority Triage Engine — Select Activities for Sol 413">
            <div className="grid grid-cols-4 gap-3 mb-3 bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px]">
              {Object.entries(weights).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between text-[10px] text-[#64748b] mb-1">
                    <span className="tracking-[0.5px]">{key.toUpperCase()} WEIGHT</span>
                    <span className="text-[#22d3ee] font-mono">{val.toFixed(2)}</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05} value={val}
                    onChange={e => setWeight(key, +e.target.value)}
                    className="w-full accent-[#22d3ee] cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-[5px]">
              {[...MISSION_ACTIVITIES].sort((a, b) => mcdaScore(b, weights) - mcdaScore(a, weights)).map(act => {
                const on = selected.has(act.id);
                const score = mcdaScore(act, weights);
                const scoreColor = score > 0.7 ? '#34d399' : score > 0.5 ? '#fbbf24' : '#f43f5e';
                return (
                  <div
                    key={act.id}
                    {...clickable(() => toggle(act.id))}
                    className={`flex items-center gap-[10px] rounded-[5px] px-3 py-2 cursor-pointer transition-all duration-150 border ${on ? 'bg-[#0d1525] border-[#22d3ee44]' : 'bg-[#0a1020] border-[#1e2d55]'}`}
                  >
                    <div className={`w-[14px] h-[14px] rounded-[3px] border-2 shrink-0 ${on ? 'border-[#22d3ee] bg-[#22d3ee33]' : 'border-[#1e2d55] bg-transparent'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#e2e8f0]">{act.label}</span>
                        <span className={`text-[10px] rounded-[3px] px-[6px] border text-[${PRIORITY_COLOR[act.priority]}] bg-[${PRIORITY_COLOR[act.priority]}22] border-[${PRIORITY_COLOR[act.priority]}44]`}>{act.priority.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-4 text-[11px] text-[#475569] mt-[2px]">
                        <span>⚡ {act.powerW}W</span>
                        <span>⏱ {act.durationMin}min</span>
                        <span>🔬 Science: {act.scienceValue}/10</span>
                        <span>⚠ Risk: {Math.round(act.riskScore * 100)}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#475569]">MCDA Score</div>
                      <div className={`text-[16px] font-bold font-mono text-[${scoreColor}]`}>
                        {(score * 10).toFixed(1)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="What-If Scenario Simulator">
            <div className="flex gap-2 mb-3">
              {WHATIF_SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveScenario(activeScenario === s.id ? null : s.id)}
                  className={`flex-1 px-[10px] py-2 rounded-[5px] cursor-pointer text-[11px] text-left border ${activeScenario === s.id ? 'bg-[#162040] border-[#22d3ee66] text-[#22d3ee]' : 'bg-[#0a1020] border-[#1e2d55] text-[#94a3b8]'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {scenario && (
              <div className="bg-[#0d1525] border border-[#22d3ee22] rounded-[5px] p-3">
                <div className="text-[12px] font-semibold text-[#e2e8f0] mb-2">Impact Analysis: "{scenario.label}"</div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Power Budget', val: scenario.impact.power, unit: 'W', pos: scenario.impact.power > 0 },
                    { label: 'Science Value', val: scenario.impact.science, unit: 'pts', pos: scenario.impact.science > 0 },
                    { label: 'Risk Change',  val: Math.round(scenario.impact.risk * 100), unit: '%', pos: scenario.impact.risk < 0 },
                    { label: 'Time Shift',   val: scenario.impact.time, unit: '', pos: scenario.impact.time === '0' },
                  ].map(metric => (
                    <div key={metric.label} className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px] text-center">
                      <div className="text-[10px] text-[#475569] mb-1">{metric.label}</div>
                      <div className={`text-[18px] font-bold font-mono ${metric.pos ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
                        {typeof metric.val === 'number' && metric.val > 0 ? '+' : ''}{metric.val}{metric.unit}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`mt-[10px] text-[12px] ${scenario.feasible ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
                  {scenario.feasible ? '✓ Scenario is feasible within current resource constraints.' : '✗ Scenario exceeds power budget — not feasible at current battery state.'}
                </div>
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-2 overflow-auto">
          <Panel title="Resource Budget">
            <div className="flex flex-col gap-[10px]">
              {[
                { label: 'Power', used: totalPower, budget: powerBudget, unit: 'W',   color: totalPower > powerBudget ? '#f43f5e' : '#34d399' },
                { label: 'Time',  used: totalTime,  budget: timeBudget,  unit: 'min', color: totalTime  > timeBudget  ? '#f43f5e' : '#34d399' },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#94a3b8]">{r.label}</span>
                    <span className={`font-mono font-bold text-[${r.color}]`}>{r.used}/{r.budget} {r.unit}</span>
                  </div>
                  <div className="bg-[#0f1a30] rounded-full h-[6px]">
                    <div className={`h-full rounded-full transition-[width] duration-300 bg-[${r.color}]`} style={{ width: `${Math.min(r.used / r.budget, 1) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[#1e2d55]">
                <div className="text-[12px] text-[#94a3b8] mb-1">Total Science Value</div>
                <div className="text-[24px] font-bold font-mono text-[#22d3ee]">{totalScience.toFixed(1)}</div>
                <div className="text-[11px] text-[#475569]">pts across {chosen.length} activities</div>
              </div>
            </div>
          </Panel>

          <Panel title="Mission Score Radar">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e2d55" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar dataKey="val" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Feasibility">
            <div className={`text-[12px] font-semibold mb-[6px] ${totalPower <= powerBudget && totalTime <= timeBudget ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
              {totalPower <= powerBudget && totalTime <= timeBudget ? '✓ Plan is feasible' : '✗ Over budget — remove activities'}
            </div>
            <ConfidenceMeter value={totalPower <= powerBudget ? 0.88 : 0.2} label="Feasibility Score" />
            <button className="mt-3 w-full bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-2 py-2 text-[12px] text-[#22d3ee] cursor-pointer">
              Submit Plan to Mission Control
            </button>
          </Panel>
        </div>

      </div>
    </div>
  );
}
