import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import { clickable } from '../utils/a11y.js';

const COMM_STATES = [
  { id: 'nominal', label: 'Nominal Contact', delay: '14m 32s', bandwidth: '320 kbps', autonomyLevel: 1 },
  { id: 'degraded', label: 'Degraded Link',  delay: '14m 32s', bandwidth: '45 kbps',  autonomyLevel: 2 },
  { id: 'blackout', label: 'Comm Blackout',  delay: '—',       bandwidth: '0 kbps',   autonomyLevel: 3 },
];

const DECISION_TREES = {
  power_anomaly: {
    root: {
      q: 'Is battery charge above 70%?',
      yes: {
        q: 'Is the power drop gradual or step-change?',
        gradual: { action: 'Monitor trend. Run diagnostic SA-DIAG-01. No immediate action required.', confidence: 0.88, urgency: 'low', procedure: 'PWR-MON-001' },
        step:    {
          q: 'Has SA-DIAG-01 completed?',
          yes: { action: 'Review string sweep results. If one string failed, replan power budget. Notify Earth when comms restored.', confidence: 0.91, urgency: 'medium', procedure: 'PWR-ANOM-003' },
          no:  { action: 'Wait for SA-DIAG-01 completion (est. 8 min). Maintain current safe mode.', confidence: 0.95, urgency: 'low', procedure: 'PWR-DIAG-001' },
        },
      },
      no: {
        q: 'Is battery above 60%?',
        yes: { action: 'Initiate full power safe mode. Shed all non-critical loads. Defer science. Alert crew.', confidence: 0.97, urgency: 'high', procedure: 'PWR-SAFE-002' },
        no:  { action: 'EMERGENCY: Battery critical. Immediately shed ALL non-essential loads. Initiate survival mode. Activate backup power.', confidence: 0.99, urgency: 'critical', procedure: 'PWR-EMER-001' },
      },
    },
  },
};

const URGENCY_COLOR = { low: '#34d399', medium: '#fbbf24', high: '#f97316', critical: '#f43f5e' };

const ONBOARD_PROCEDURES = [
  { id: 'PWR-ANOM-003', title: 'Solar Current Drop Response', steps: ['Acknowledge alarm PWR_SOL_I', 'Initiate SA-DIAG-01', 'Monitor bus voltage stability', 'If step-change: check attitude vs sun vector', 'If shadow confirmed: wait 40min for clearance', 'Escalate to ART if no recovery in 30min'] },
  { id: 'PWR-SAFE-002', title: 'Power Safe Mode Procedure', steps: ['Enter Power Safe Mode via OBDH command', 'Reduce payload duty cycle to 35%', 'Shed non-critical heaters (priority order per §7.2)', 'Set battery minimum floor to 60%', 'Reduce downlink rate to 100 kbps', 'Monitor every 5 minutes'] },
  { id: 'PWR-EMER-001', title: 'Emergency Power Recovery', steps: ['Immediately halt all science operations', 'Shed ALL non-critical loads', 'Switch to battery-only mode', 'Initiate survival mode sequence', 'Activate backup power controller', 'Transmit emergency beacon'] },
];

export default function EarthIndependentOps() {
  const [commState, setCommState]     = useState('blackout');
  const [treeAnswers, setTreeAnswers] = useState({});
  const [selectedProc, setSelectedProc] = useState('PWR-ANOM-003');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const state = COMM_STATES.find(s => s.id === commState);

  function walkTree() {
    let node = DECISION_TREES.power_anomaly.root;
    const path = [];
    const answers = treeAnswers;
    let depth = 0;
    while (node && !node.action && depth < 10) {
      path.push({ q: node.q, answered: !!answers[depth] });
      if (!answers[depth]) break;
      node = answers[depth] === 'yes' ? node.yes : (answers[depth] === 'gradual' ? node.gradual : node.step || node.no);
      depth++;
    }
    return { path, current: node, depth };
  }

  const { path, current, depth } = walkTree();

  function answer(val) {
    setTreeAnswers(prev => ({ ...prev, [depth]: val }));
  }

  const proc = ONBOARD_PROCEDURES.find(p => p.id === selectedProc);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Earth-Independent Operations — Autonomous Decision Support" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COMM_STATES.map(s => {
            const stateColor = s.id === 'blackout' ? '#f43f5e' : s.id === 'degraded' ? '#fbbf24' : '#34d399';
            const stateBg = s.id === 'blackout' ? '#4c0519' : s.id === 'degraded' ? '#451a03' : '#065f46';
            return (
              <button key={s.id} onClick={() => setCommState(s.id)}
                className={`p-[14px] rounded-[6px] cursor-pointer text-left border ${commState === s.id ? `bg-[#0d1525] border-[${stateColor}66]` : 'bg-[#0a1020] border-[#1e2d55]'}`}
              >
                <div className="flex justify-between mb-1">
                  <span className="text-[13px] font-bold text-[#e2e8f0]">{s.label}</span>
                  <span className={`text-[10px] rounded-[3px] px-[6px] py-[1px] border border-current opacity-80 text-[${stateColor}] bg-[${stateBg}]`}>
                    AUTONOMY L{s.autonomyLevel}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748b]">Delay: <span className="text-[#94a3b8]">{s.delay}</span></div>
                <div className="text-[11px] text-[#64748b]">Bandwidth: <span className="text-[#94a3b8]">{s.bandwidth}</span></div>
                {s.id === 'blackout' && (
                  <div className="text-[10px] text-[#f43f5e] mt-[6px] alarm-pulse">● EARTH CONTACT UNAVAILABLE — ONBOARD AI ONLY</div>
                )}
              </button>
            );
          })}
        </div>

        <Panel title="Current Autonomy Level" badge={
          <span className={`text-[11px] font-bold tracking-[0.5px] text-[${commState === 'blackout' ? '#f43f5e' : commState === 'degraded' ? '#fbbf24' : '#34d399'}]`}>
            LEVEL {state.autonomyLevel}
          </span>
        }>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
            {[
              { level: 1, label: 'Human-in-Loop', desc: 'All decisions sent to Earth for approval. Light-time delay: 14-40 minutes round trip. Suitable for non-time-critical operations.', color: '#34d399' },
              { level: 2, label: 'Supervised Autonomy', desc: 'Onboard AI executes pre-approved response envelopes without Earth confirmation. Operators notified after. Used during degraded comms.', color: '#fbbf24' },
              { level: 3, label: 'Full Autonomy', desc: 'All decisions made onboard. Earth contact unavailable. AI must detect, diagnose, and respond independently. Highest-risk operational mode.', color: '#f43f5e' },
            ].map(l => (
              <div key={l.level} className={`rounded-[5px] p-3 border ${state.autonomyLevel === l.level ? `bg-[#0d1525] border-[${l.color}55]` : 'bg-[#0a1020] border-[#1e2d55]'}`}>
                <div className="flex gap-2 items-center mb-[6px]">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold text-[${l.color}] border-[${l.color}] bg-[${l.color}22]`}>L{l.level}</div>
                  <span className={`text-[12px] font-semibold ${state.autonomyLevel === l.level ? 'text-[#e2e8f0]' : 'text-[#64748b]'}`}>{l.label}</span>
                </div>
                <div className="text-[11px] text-[#64748b] leading-[1.5]">{l.desc}</div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

          <Panel title="Onboard Decision Support — Power Anomaly">
            <div className="text-[11px] text-[#475569] mb-[10px]">
              {commState === 'blackout' ? '● Earth unreachable. Walking onboard decision tree for autonomous response.' : 'AI decision support active. Human approval required before action.'}
            </div>

            {path.map((step, i) => (
              <div key={i} className="bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] p-[10px] mb-[6px]">
                <div className="text-[10px] text-[#475569] tracking-[0.5px] mb-1">STEP {i + 1}</div>
                <div className={`text-[12px] text-[#e2e8f0] ${step.answered ? 'mb-[6px]' : ''}`}>{step.q}</div>
                {step.answered && treeAnswers[i] && (
                  <div className="text-[11px] text-[#22d3ee]">→ Answer: <strong>{treeAnswers[i]}</strong></div>
                )}
              </div>
            ))}

            {current && !current.action && (
              <div className="bg-[#0d1525] border border-[#22d3ee44] rounded-[5px] p-3 mb-[6px]">
                <div className="text-[11px] font-semibold text-[#22d3ee] mb-[10px]">{current.q}</div>
                <div className="flex gap-[6px] flex-wrap">
                  {['yes','no','gradual','step'].filter(opt => {
                    if (current.q.includes('gradual')) return opt === 'gradual' || opt === 'step';
                    return opt === 'yes' || opt === 'no';
                  }).map(opt => (
                    <button key={opt} onClick={() => answer(opt)} className="flex-1 p-2 rounded-[5px] cursor-pointer text-[12px] font-semibold bg-[#162040] border border-[#22d3ee44] text-[#22d3ee]">{opt.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            )}

            {current?.action && (
              <div className={`bg-[#0d1525] rounded-[5px] p-3 border border-[${URGENCY_COLOR[current.urgency]}44]`}>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-[#475569] tracking-[1px]">RECOMMENDED ACTION</span>
                  <span className={`text-[10px] font-bold tracking-[1px] text-[${URGENCY_COLOR[current.urgency]}]`}>{current.urgency.toUpperCase()}</span>
                </div>
                <div className="text-[12px] text-[#e2e8f0] leading-[1.6] mb-[10px]">{current.action}</div>
                <ConfidenceMeter value={current.confidence} label="Decision Confidence" />
                <div className="mt-2 text-[11px] text-[#22d3ee] cursor-pointer" {...clickable(() => setSelectedProc(current.procedure))}>
                  → See procedure {current.procedure}
                </div>
                {commState !== 'blackout' && (
                  <div className="mt-2 text-[11px] text-[#fbbf24]">⚠ Earth contact available — awaiting ground approval before execution.</div>
                )}
                <button onClick={() => setTreeAnswers({})} className="mt-[10px] w-full bg-[#0f1a30] border border-[#1e2d55] rounded-[4px] py-[6px] text-[11px] text-[#475569] cursor-pointer">
                  Reset decision tree
                </button>
              </div>
            )}
          </Panel>

          <Panel title="Onboard Procedure Checklist"
            headerRight={
              <select value={selectedProc} onChange={e => { setSelectedProc(e.target.value); setCompletedSteps(new Set()); }}
                className="bg-[#0f1a30] border border-[#1e2d55] rounded-[4px] px-2 py-[2px] text-[11px] text-[#94a3b8] cursor-pointer">
                {ONBOARD_PROCEDURES.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
              </select>
            }
          >
            {proc && (
              <>
                <div className="text-[13px] font-bold text-[#e2e8f0] mb-3">{proc.title}</div>
                <div className="flex flex-col gap-[6px]">
                  {proc.steps.map((step, i) => {
                    const done = completedSteps.has(i);
                    return (
                      <div key={i} {...clickable(() => setCompletedSteps(prev => { const n = new Set(prev); done ? n.delete(i) : n.add(i); return n; }))}
                        className={`flex gap-[10px] items-start cursor-pointer px-2 py-[6px] rounded-[4px] transition-all duration-150 border ${done ? 'bg-[#065f4622] border-[#34d39944]' : 'bg-[#0a1020] border-[#1e2d55]'}`}>
                        <div className={`w-[18px] h-[18px] rounded-[3px] border-2 shrink-0 flex items-center justify-center text-[10px] text-[#34d399] mt-[1px] ${done ? 'border-[#34d399] bg-[#34d39933]' : 'border-[#1e2d55] bg-transparent'}`}>
                          {done ? '✓' : ''}
                        </div>
                        <div className={`text-[12px] leading-[1.4] ${done ? 'text-[#34d399] line-through' : 'text-[#94a3b8]'}`}>
                          <span className="text-[#475569] mr-[6px]">{i + 1}.</span>{step}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-[10px] flex justify-between text-[11px] text-[#475569]">
                  <span>{completedSteps.size}/{proc.steps.length} steps completed</span>
                  <span className={completedSteps.size === proc.steps.length ? 'text-[#34d399]' : 'text-[#475569]'}>
                    {completedSteps.size === proc.steps.length ? '✓ PROCEDURE COMPLETE' : ''}
                  </span>
                </div>
              </>
            )}
          </Panel>

        </div>
      </div>
    </div>
  );
}
