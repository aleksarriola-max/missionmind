import { useState, Fragment } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import { ASSETS, CONFLICT_MATRIX, findConflict } from '../data/multiagent.js';
import { clickable } from '../utils/a11y.js';

const STATUS_COLOR = { nominal: '#34d399', warning: '#fbbf24', critical: '#f43f5e' };
const SEVERITY_COLOR = { none: '#1e2d55', low: '#34d399', medium: '#fbbf24', high: '#f43f5e' };
const KIND_ICON = { orbiter: '◈', rover: '▣', drone: '✦' };

export default function MultiAgentCoordination() {
  const [selectedConflict, setSelectedConflict] = useState(null);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Multi-Agent Surface Coordination — Orbiter · Rover · Drone" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ASSETS.map(asset => (
            <Panel key={asset.id} title={asset.label}
              badge={<span className={`text-[10px] font-bold rounded-[3px] px-[6px] py-[1px] border text-[${STATUS_COLOR[asset.status]}] bg-[${STATUS_COLOR[asset.status]}22] border-[${STATUS_COLOR[asset.status]}44]`}>{asset.status.toUpperCase()}</span>}
            >
              <div className="flex items-center gap-2 mb-[10px]">
                <div className={`w-8 h-8 rounded-[6px] bg-[#0f1a30] border flex items-center justify-center text-[16px] text-[${STATUS_COLOR[asset.status]}] border-[${STATUS_COLOR[asset.status]}44]`}>
                  {KIND_ICON[asset.kind]}
                </div>
                <div>
                  <div className="text-[10px] text-[#475569]">Comm priority</div>
                  <div className="text-[13px] font-bold text-[#e2e8f0]">#{asset.commPriority}</div>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-[11px] mb-[3px]">
                  <span className="text-[#64748b]">Power draw</span>
                  <span className={`font-mono ${asset.powerW > asset.powerBudgetW ? 'text-[#f43f5e]' : 'text-[#94a3b8]'}`}>{asset.powerW}/{asset.powerBudgetW}W</span>
                </div>
                <div className="bg-[#0f1a30] rounded-full h-[5px]">
                  <div className={`h-full rounded-full ${asset.powerW > asset.powerBudgetW ? 'bg-[#f43f5e]' : 'bg-[#34d399]'}`} style={{ width: `${Math.min(asset.powerW / asset.powerBudgetW, 1) * 100}%` }} />
                </div>
              </div>

              <div className="text-[10px] text-[#475569] tracking-[0.5px] mb-1">CURRENT TASK</div>
              <div className="text-[12px] text-[#e2e8f0] bg-[#0f1a30] rounded-[5px] px-2 py-[6px] mb-2 leading-[1.4]">{asset.currentTask}</div>

              <div className="text-[10px] text-[#475569] tracking-[0.5px] mb-1">QUEUE</div>
              <div className="flex flex-col gap-[3px]">
                {asset.queue.map((q, i) => (
                  <div key={i} className="text-[11px] text-[#64748b] pl-2">{i + 1}. {q}</div>
                ))}
              </div>
            </Panel>
          ))}
        </div>

        <Panel title="Resource-Sharing Conflict Matrix">
          <div className="text-[11px] text-[#475569] mb-[10px]">
            Shows where two assets compete for the same constrained resource (comms window or shared power bus). Click a cell for the scheduler's resolution rule.
          </div>
          <div className="grid grid-cols-[120px_repeat(3,1fr)] gap-1 max-w-[560px]">
            <div />
            {ASSETS.map(a => <div key={a.id} className="text-[10px] text-[#94a3b8] text-center font-semibold">{a.label.split(' ')[0]}</div>)}
            {ASSETS.map(rowAsset => (
              <Fragment key={rowAsset.id}>
                <div className="text-[10px] text-[#94a3b8] font-semibold flex items-center">{rowAsset.label.split(' ')[0]}</div>
                {ASSETS.map(colAsset => {
                  if (rowAsset.id === colAsset.id) {
                    return <div key={colAsset.id} className="bg-[#162040] rounded-[4px] p-[10px] text-center text-[#475569] text-[11px]">—</div>;
                  }
                  const conflict = findConflict(rowAsset.id, colAsset.id);
                  const sev = conflict?.severity ?? 'none';
                  const interactive = conflict && sev !== 'none';
                  return (
                    <div key={colAsset.id}
                      {...(interactive ? clickable(() => setSelectedConflict(conflict)) : {})}
                      className={`rounded-[4px] p-[10px] text-center border bg-[${SEVERITY_COLOR[sev]}22] border-[${SEVERITY_COLOR[sev]}66] ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`text-[10px] font-bold text-[${SEVERITY_COLOR[sev]}]`}>{conflict?.type.toUpperCase() ?? 'NONE'}</div>
                      <div className="text-[9px] text-[#475569] mt-[2px]">{sev}</div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>

          {selectedConflict && (
            <div className={`mt-3 bg-[#0d1525] rounded-[5px] p-3 border border-[${SEVERITY_COLOR[selectedConflict.severity]}44]`}>
              <div className="flex justify-between mb-[6px]">
                <span className="text-[11px] font-bold text-[#e2e8f0]">
                  {ASSETS.find(a => a.id === selectedConflict.a)?.label} ↔ {ASSETS.find(a => a.id === selectedConflict.b)?.label}
                </span>
                <span className={`text-[10px] font-bold tracking-[0.5px] text-[${SEVERITY_COLOR[selectedConflict.severity]}]`}>{selectedConflict.severity.toUpperCase()} · {selectedConflict.type.toUpperCase()}</span>
              </div>
              <div className="text-[12px] text-[#94a3b8] leading-[1.6]">{selectedConflict.detail}</div>
            </div>
          )}
          {!selectedConflict && (
            <div className="mt-[10px] text-[11px] text-[#475569]">
              {CONFLICT_MATRIX.filter(c => c.severity !== 'none').length} active resource conflicts detected across {ASSETS.length} assets.
            </div>
          )}
        </Panel>

      </div>
    </div>
  );
}
