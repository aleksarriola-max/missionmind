import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import AlarmBadge from '../components/AlarmBadge.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import PowerSankey from '../components/PowerSankey.jsx';
import { ACTIVE_ANOMALY, ROOT_CAUSE_HYPOTHESES, SIMILAR_INCIDENTS, DEPENDENCY_GRAPH } from '../data/anomalies.js';
import { POWER_FLOW } from '../data/powerflow.js';
import { clickable } from '../utils/a11y.js';

const NODE_STATUS_COLOR = { nominal: '#34d399', warning: '#fbbf24', critical: '#f43f5e' };
const EDGE_COLOR = { power: '#fbbf24', control: '#22d3ee' };

export default function AnomalyInvestigation() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedHyp, setSelectedHyp] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const AI_RESPONSES = {
    'what caused': 'Based on telemetry analysis, the most likely cause is partial solar panel shadowing (72% confidence). The step-change pattern in PWR_SOL_I at T-20min, combined with no thermal anomaly, is consistent with an external obstruction rather than cell degradation. I recommend cross-referencing with attitude data and running SA-DIAG-01.',
    'what should': 'Recommended actions in priority order: (1) Run SA-DIAG-01 diagnostic sequence immediately. (2) Compare current attitude telemetry with sun vector prediction. (3) If no shadow confirmed within 15 minutes, escalate to string-failure investigation. (4) Evaluate power budget replan to restore spectrometer operations.',
    'how long': 'If this is a shadowing event, recovery should occur within 10-40 minutes based on orbital geometry. If it is a string failure, the degradation will be permanent but stable. Recommend setting a decision point at T+30min: if power has not recovered, proceed with permanent power budget replan.',
    'default': 'Based on current telemetry and historical precedents, the solar current anomaly shows characteristics consistent with a discrete event at T-20min. The most important next step is running SA-DIAG-01 and comparing attitude telemetry with solar vector data. Battery charge trajectory gives approximately 2.5 hours before hitting the 60% minimum operational threshold.',
  };

  function simulateAI() {
    setLoading(true);
    setAiResponse('');
    setTimeout(() => {
      const q = aiQuery.toLowerCase();
      let r = AI_RESPONSES.default;
      if (q.includes('caus')) r = AI_RESPONSES['what caused'];
      else if (q.includes('should') || q.includes('do')) r = AI_RESPONSES['what should'];
      else if (q.includes('long') || q.includes('when')) r = AI_RESPONSES['how long'];
      setAiResponse(r);
      setLoading(false);
    }, 1200);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Anomaly Investigation — ANO-2024-412-001" />

      <div className="flex-1 overflow-auto flex flex-col gap-2 p-2">
      <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[680px] shrink-0">

        {/* Top-left: Anomaly summary + AI copilot */}
        <Panel title="Anomaly Explainer Copilot" className="flex flex-col">
          <div className="bg-[#0d1525] border border-[#f43f5e33] rounded-[5px] p-3 mb-3">
            <div className="flex items-center gap-2 mb-[6px]">
              <AlarmBadge severity="critical" />
              <span className="text-[13px] font-bold text-[#e2e8f0]">{ACTIVE_ANOMALY.title}</span>
            </div>
            <p className="text-[12px] text-[#94a3b8] leading-[1.6]">{ACTIVE_ANOMALY.summary}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {ACTIVE_ANOMALY.affectedSubsystems.map(s => (
                <span key={s} className="bg-[#162040] border border-[#1e2d55] rounded-[3px] px-2 py-[1px] text-[10px] text-[#94a3b8]">{s.toUpperCase()}</span>
              ))}
            </div>
          </div>

          <div className="mb-[10px]">
            <div className="flex gap-2">
              <input
                name="anomaly-ai-query"
                aria-label="Ask the anomaly AI copilot"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && simulateAI()}
                placeholder='Ask the AI copilot... e.g. "What caused this?" or "What should I do?"'
                className="flex-1 bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] px-3 py-2 text-[12px] text-[#e2e8f0] outline-none"
              />
              <button
                onClick={simulateAI}
                className="bg-[#162040] border border-[#22d3ee44] rounded-[5px] px-[14px] py-2 text-[12px] text-[#22d3ee] cursor-pointer"
              >
                Ask
              </button>
            </div>
          </div>

          {loading && (
            <div className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-3 text-[12px] text-[#22d3ee]">
              ⏳ Analyzing telemetry patterns and knowledge base…
            </div>
          )}

          {aiResponse && !loading && (
            <div className="bg-[#071220] border border-[#22d3ee33] rounded-[5px] p-3 text-[12px] text-[#94a3b8] leading-[1.6]">
              <div className="text-[10px] text-[#22d3ee] tracking-[1px] mb-[6px]">AI COPILOT RESPONSE</div>
              <p>{aiResponse}</p>
              <div className="mt-2">
                <ConfidenceMeter value={0.72} label="Response Confidence" />
              </div>
            </div>
          )}

          {!aiResponse && !loading && (
            <div className="text-[12px] text-[#475569] leading-[1.6] py-1">
              Quick prompts: &nbsp;
              {['What caused this?', 'What should I do?', 'How long will recovery take?'].map(p => (
                <button key={p} onClick={() => { setAiQuery(p); }} className="bg-[#0f1a30] border border-[#1e2d55] rounded-[3px] px-2 py-[2px] text-[11px] text-[#64748b] cursor-pointer mr-[6px] mt-1">
                  {p}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* Top-right: Root cause hypotheses */}
        <Panel title="Root-Cause Hint Engine">
          <div className="flex flex-col gap-[6px]">
            {ROOT_CAUSE_HYPOTHESES.map((h, i) => (
              <div
                key={h.id}
                {...clickable(() => setSelectedHyp(i))}
                className={`rounded-[5px] p-[10px] cursor-pointer transition-all duration-150 border ${selectedHyp === i ? 'bg-[#0d1525] border-[#22d3ee44]' : 'bg-[#0a1020] border-[#1e2d55]'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex gap-[6px] items-center">
                    <span className="text-[10px] text-[#475569] font-mono">#{h.rank}</span>
                    <span className="text-[12px] font-semibold text-[#e2e8f0]">{h.label}</span>
                  </div>
                  <ConfidenceMeter value={h.confidence} showBar={false} />
                </div>
                <ConfidenceMeter value={h.confidence} label="" showBar={true} />
                {selectedHyp === i && (
                  <div className="mt-[10px]">
                    <div className="text-[11px] text-[#34d399] mb-1">▲ Supporting Evidence</div>
                    {h.evidence.map((e, j) => <div key={j} className="text-[11px] text-[#64748b] pl-2 mb-[2px]">· {e}</div>)}
                    <div className="text-[11px] text-[#f43f5e] mt-[6px] mb-1">▼ Counter Evidence</div>
                    {h.counterEvidence.map((e, j) => <div key={j} className="text-[11px] text-[#64748b] pl-2 mb-[2px]">· {e}</div>)}
                    <div className="text-[11px] text-[#fbbf24] mt-[6px] mb-1">→ Recommendation</div>
                    <div className="text-[11px] text-[#94a3b8] pl-2">{h.recommendation}</div>
                    <div className="text-[10px] text-[#475569] mt-[6px]">Sources: {h.sources.join(' · ')}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Bottom-left: Dependency graph */}
        <Panel title="Telemetry Dependency Graph" headerRight={<span className="text-[10px] text-[#475569]">Click node · scroll to pan</span>}>
          <div className="overflow-x-auto overflow-y-hidden">
            <svg width={900} height={400} viewBox="0 0 900 400" className="block min-w-[900px]">
              <defs>
                <marker id="arrow-power" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#fbbf2488" />
                </marker>
                <marker id="arrow-control" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#22d3ee88" />
                </marker>
              </defs>

              {DEPENDENCY_GRAPH.edges.map((edge, i) => {
                const from = DEPENDENCY_GRAPH.nodes.find(n => n.id === edge.from);
                const to   = DEPENDENCY_GRAPH.nodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                const color = EDGE_COLOR[edge.type] || '#1e2d55';
                return (
                  <line key={i}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
                    markerEnd={`url(#arrow-${edge.type})`}
                  />
                );
              })}

              {DEPENDENCY_GRAPH.nodes.map(node => {
                const color = NODE_STATUS_COLOR[node.status];
                const isSelected = selectedNode === node.id;
                return (
                  <g key={node.id} className="dep-node cursor-pointer" onClick={() => setSelectedNode(isSelected ? null : node.id)}>
                    <circle cx={node.x} cy={node.y} r={isSelected ? 28 : 24}
                      fill={isSelected ? '#162040' : '#0a1020'}
                      stroke={color} strokeWidth={isSelected ? 2.5 : 1.5}
                      style={{ filter: node.status !== 'nominal' ? `drop-shadow(0 0 6px ${color}88)` : 'none' }}
                    />
                    <text x={node.x} y={node.y - 2} textAnchor="middle" fontSize={9} fill={color} fontWeight="600">
                      {node.label.split(' ').slice(0, 2).join(' ')}
                    </text>
                    <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize={8} fill="#475569">
                      {node.status.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {selectedNode && (() => {
            const n = DEPENDENCY_GRAPH.nodes.find(x => x.id === selectedNode);
            return (
              <div className="bg-[#0d1525] border border-[#22d3ee33] rounded-[5px] p-[10px] mt-2 text-[12px]">
                <div className="font-bold text-[#e2e8f0] mb-1">{n.label}</div>
                <div className="text-[#64748b]">Subsystem: <span className="text-[#94a3b8]">{n.subsystem}</span></div>
                <div className="text-[#64748b]">Status: <span className={`text-[${NODE_STATUS_COLOR[n.status]}]`}>{n.status.toUpperCase()}</span></div>
                <div className="text-[#64748b] mt-1">Downstream nodes depend on this component for {n.subsystem === 'power' ? 'electrical power' : 'control signals'}.</div>
              </div>
            );
          })()}
        </Panel>

        {/* Bottom-right: Similar incidents */}
        <Panel title="Similar Incident Finder">
          <div className="flex flex-col gap-2">
            {SIMILAR_INCIDENTS.map(inc => (
              <div key={inc.id} className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-[10px]">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="text-[12px] font-semibold text-[#e2e8f0]">{inc.title}</div>
                    <div className="text-[11px] text-[#475569]">{inc.mission} · Sol {inc.sol}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[#475569]">Similarity</div>
                    <div className={`text-[14px] font-bold font-mono ${inc.similarity > 0.7 ? 'text-[#34d399]' : 'text-[#fbbf24]'}`}>
                      {Math.round(inc.similarity * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#94a3b8] leading-[1.5] mb-1">{inc.outcome}</div>
                <div className="text-[11px] text-[#22d3ee]">→ {inc.resolution}</div>
              </div>
            ))}
          </div>
        </Panel>

      </div>

      <Panel title="Power Flow — Solar Array → Bus → Subsystems" className="h-[380px] shrink-0"
        headerRight={<span className="text-[10px] text-[#475569]">Ribbon width ∝ watts · gap at bus = regulation loss</span>}
      >
        <PowerSankey data={POWER_FLOW} height={300} />
      </Panel>

      </div>
    </div>
  );
}
