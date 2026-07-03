import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import { AUTONOMY_DECISIONS } from '../data/missions.js';

const INTENT_COLOR = { true: '#34d399', false: '#f43f5e' };

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  return mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ${mins%60}m ago`;
}

export default function AutonomyExplainer() {
  const [selected, setSelected] = useState(0);
  const dec = AUTONOMY_DECISIONS[selected];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Autonomy Explainer — ARES-7 Onboard AI Decisions" />

      <div className="flex-1 overflow-hidden grid grid-cols-[280px_1fr] gap-2 p-2">

        <Panel title="Autonomy Decision Log">
          <div className="flex flex-col gap-[6px]">
            {AUTONOMY_DECISIONS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setSelected(i)}
                className={`rounded-[5px] p-[10px] text-left cursor-pointer w-full transition-all duration-150 border ${selected === i ? 'bg-[#0d1525] border-[#22d3ee44]' : 'bg-[#0a1020] border-[#1e2d55]'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-[#475569] font-mono">{d.id}</span>
                  <span className={`text-[10px] font-bold rounded-[3px] px-[6px] py-[1px] tracking-[0.5px] border text-[${INTENT_COLOR[d.aligned]}] bg-[${d.aligned ? '#065f4622' : '#4c051922'}] border-[${INTENT_COLOR[d.aligned]}44]`}>
                    {d.aligned ? 'ALIGNED' : 'DRIFTED'}
                  </span>
                </div>
                <div className="text-[12px] font-semibold text-[#e2e8f0] mb-[2px]">{d.title}</div>
                <div className="text-[11px] text-[#475569]">{timeAgo(d.ts)}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px]">
            <div className="text-[11px] text-[#64748b] tracking-[1px] mb-2">INTENT ALIGNMENT MONITOR</div>
            <div className="flex flex-col gap-[6px]">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#94a3b8]">Aligned decisions</span>
                <span className="text-[#34d399] font-bold">
                  {AUTONOMY_DECISIONS.filter(d => d.aligned).length} / {AUTONOMY_DECISIONS.length}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#94a3b8]">Intent drift detected</span>
                <span className="text-[#f43f5e] font-bold alarm-pulse">
                  {AUTONOMY_DECISIONS.filter(d => !d.aligned).length} ACTIVE
                </span>
              </div>
              <div className="h-px bg-[#1e2d55] my-1" />
              <div className="text-[11px] text-[#fbbf24]">
                ⚠ Science objective ATM_SPEC_412 not being pursued. Operator review recommended.
              </div>
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-2 overflow-auto">

          <Panel title="Decision Detail">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">DECISION ID</div>
                <div className="text-[13px] font-mono text-[#22d3ee]">{dec.id}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">TIMESTAMP</div>
                <div className="text-[13px] font-mono text-[#94a3b8]">{timeAgo(dec.ts)}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">WHAT THE AUTONOMY DECIDED</div>
                <div className="text-[13px] text-[#e2e8f0] leading-[1.5] bg-[#0f1a30] rounded-[5px] p-[10px]">{dec.decision}</div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-2">
            <Panel title="Why the Autonomy Acted">
              <div className="text-[12px] text-[#94a3b8] leading-[1.6] mb-[10px]">
                <span className="text-[#fbbf24] font-semibold">Trigger: </span>{dec.trigger}
              </div>
              <div className="text-[12px] text-[#94a3b8] leading-[1.6]">
                <span className="text-[#22d3ee] font-semibold">Intent: </span>{dec.intent}
              </div>
            </Panel>
            <Panel title="Outcome + Confidence">
              <div className="text-[12px] text-[#94a3b8] leading-[1.6] mb-3">{dec.outcome}</div>
              <ConfidenceMeter value={dec.confidence} label="Decision Confidence" />
            </Panel>
          </div>

          <Panel title="Intent Alignment Analysis"
            badge={
              <span className={`text-[11px] font-bold rounded-[3px] px-2 py-[2px] tracking-[0.5px] border text-[${INTENT_COLOR[dec.aligned]}] bg-[${dec.aligned ? '#065f4622' : '#4c051922'}] border-[${INTENT_COLOR[dec.aligned]}44]`}>
                {dec.aligned ? '✓ INTENT ALIGNED' : '⚠ INTENT DRIFT DETECTED'}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-[6px]">OPERATOR INTENT</div>
                <div className="text-[12px] text-[#94a3b8] bg-[#0f1a30] rounded-[5px] p-[10px] leading-[1.5]">{dec.operatorIntent}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-[6px]">ALIGNMENT ANALYSIS</div>
                <div className={`text-[12px] rounded-[5px] p-[10px] leading-[1.5] border ${dec.aligned ? 'text-[#94a3b8] bg-[#0f1a30] border-[#1e2d55]' : 'text-[#fbbf24] bg-[#451a0322] border-[#fbbf2433]'}`}>{dec.alignmentNote}</div>
              </div>
            </div>

            {!dec.aligned && (
              <div className="mt-3 bg-[#0d1525] border border-[#f43f5e33] rounded-[5px] p-3">
                <div className="text-[11px] text-[#f43f5e] font-semibold mb-[6px]">⚠ OPERATOR ACTION RECOMMENDED</div>
                <div className="text-[12px] text-[#94a3b8] leading-[1.6]">
                  The onboard autonomy has prioritized spacecraft safety over science objectives. To restore science operations:
                  <br />1. Evaluate minimum-power path for ATM_SPEC_412 instrument.
                  <br />2. If battery charge stabilizes above 70%, consider overriding power-safe mode for this priority observation.
                  <br />3. Consult Mission Science Plan §Priority Observations before deciding.
                </div>
                <div className="flex gap-2 mt-[10px]">
                  <button className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-[14px] py-[6px] text-[11px] text-[#22d3ee] cursor-pointer">
                    Override & Resume Science
                  </button>
                  <button className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] px-[14px] py-[6px] text-[11px] text-[#64748b] cursor-pointer">
                    Accept Autonomy Decision
                  </button>
                </div>
              </div>
            )}
          </Panel>

        </div>
      </div>
    </div>
  );
}
