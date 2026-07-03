import { useState, useMemo, useEffect } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { BAYESIAN_HYPOTHESES, bayesianScore } from '../data/analytics.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { clickable } from '../utils/a11y.js';

export default function BayesianDiagnosis() {
  // One-time skeleton on initial mount only — evidence toggles and prior
  // sliders below recompute live and should stay instant, not re-trigger this.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(id);
  }, []);

  const [evidenceStates, setEvidenceStates] = useState(() => {
    const s = {};
    BAYESIAN_HYPOTHESES.forEach(h => {
      h.evidence.forEach((_, i) => { s[`${h.id}_${i}`] = true; });
    });
    return s;
  });
  const [expandedHyp, setExpandedHyp] = useState('H1');
  const [priors, setPriors] = useState(() => {
    const p = {};
    BAYESIAN_HYPOTHESES.forEach(h => { p[h.id] = h.prior; });
    return p;
  });

  const scores = useMemo(() => {
    return BAYESIAN_HYPOTHESES.map(h => {
      const activeEvidence = h.evidence.filter((_, i) => evidenceStates[`${h.id}_${i}`]);
      const result = bayesianScore(priors[h.id], activeEvidence);
      return { ...h, ...result, prior: priors[h.id], activeCount: activeEvidence.length };
    }).sort((a, b) => b.posterior - a.posterior);
  }, [evidenceStates, priors]);

  function toggleEvidence(hid, idx) {
    const key = `${hid}_${idx}`;
    setEvidenceStates(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function setPrior(hid, value) {
    setPriors(prev => ({ ...prev, [hid]: value }));
  }

  const hyp = scores.find(s => s.id === expandedHyp) || scores[0];
  const stepResult = hyp ? bayesianScore(hyp.prior, hyp.evidence.filter((_, i) => evidenceStates[`${hyp.id}_${i}`])) : null;

  const barData = scores.map(s => ({ label: s.label.split(' ').slice(0, 3).join(' '), prior: s.prior, posterior: s.posterior }));

  const POSTERIOR_COLOR = p => p >= 0.6 ? '#f43f5e' : p >= 0.4 ? '#fbbf24' : '#34d399';

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Bayesian Root-Cause Diagnosis — ARES-7 Solar Anomaly" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[220px] w-full" />
            <div className="flex gap-[6px]">
              <Skeleton className="h-[110px] flex-1" />
              <Skeleton className="h-[110px] flex-1" />
              <Skeleton className="h-[110px] flex-1" />
            </div>
            <Skeleton className="h-[320px] w-full" />
          </div>
        ) : (
        <>
        <Panel title="Bayesian Inference Framework">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-[#64748b] leading-[1.7]">
                Posterior probability is computed iteratively as each piece of evidence is evaluated.
                Each evidence item updates the odds via its likelihood ratio.
              </div>
              <div className="mt-3 bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] p-3 font-mono text-[12px]">
                <div className="text-[#22d3ee] mb-[6px]">// Bayes' Theorem</div>
                <div className="text-[#e2e8f0]">P(H|E) = P(E|H) · P(H) / P(E)</div>
                <div className="text-[#475569] mt-2 text-[10px]">
                  <div>P(H)   = prior probability of hypothesis</div>
                  <div>P(E|H) = likelihood of evidence given H is true</div>
                  <div>P(E|¬H)= likelihood of evidence given H is false</div>
                  <div>LR     = P(E|H) / P(E|¬H)</div>
                </div>
                <div className="text-[#e2e8f0] mt-2">log-odds(H|E) = log-odds(H) + Σ log(LR_i)</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#475569] mb-2 tracking-[1px]">POSTERIOR PROBABILITIES</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} width={110} />
                  <Tooltip formatter={v => `${(v*100).toFixed(1)}%`} contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', fontSize: 11 }} />
                  <Bar dataKey="prior" fill="#1e2d55" name="Prior" />
                  <Bar dataKey="posterior" name="Posterior">
                    {barData.map((d, i) => <Cell key={i} fill={POSTERIOR_COLOR(d.posterior)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 text-[10px] text-[#475569] mt-1">
                <div className="flex gap-1 items-center"><div className="w-[10px] h-[10px] bg-[#1e2d55]" />Prior P(H)</div>
                <div className="flex gap-1 items-center"><div className="w-[10px] h-[10px] bg-[#34d399]" />Posterior P(H|E)</div>
              </div>
            </div>
          </div>
        </Panel>

        <div className="flex gap-[6px]">
          {scores.map((s, i) => (
            <div key={s.id} {...clickable(() => setExpandedHyp(s.id))}
              className={`flex-1 rounded-[5px] px-3 py-[10px] cursor-pointer text-left border ${expandedHyp === s.id ? `bg-[#0d1525] border-[${POSTERIOR_COLOR(s.posterior)}66]` : 'bg-[#0a1020] border-[#1e2d55]'}`}
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-[#475569]">#{i + 1} {s.id}</span>
                <span className={`text-[13px] font-bold font-mono text-[${POSTERIOR_COLOR(s.posterior)}]`}>
                  {(s.posterior * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-[11px] font-semibold text-[#e2e8f0] mb-1">{s.label}</div>
              <div className="bg-[#0a1020] rounded-full h-1 overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-[400ms] bg-[${POSTERIOR_COLOR(s.posterior)}]`} style={{ width: `${s.posterior * 100}%` }} />
              </div>
              <div className="text-[10px] text-[#475569] mt-[3px]">
                Prior: {(s.prior * 100).toFixed(0)}% → Posterior: {(s.posterior * 100).toFixed(1)}%
                ({s.posterior > s.prior ? '▲' : '▼'} {Math.abs(((s.posterior - s.prior) * 100)).toFixed(1)}pp update)
              </div>
              <div onClick={e => e.stopPropagation()} className="mt-2 flex items-center gap-[6px]">
                <span className="text-[9px] text-[#475569] whitespace-nowrap">ADJUST PRIOR</span>
                <input
                  type="range" min={0.02} max={0.95} step={0.01} value={s.prior}
                  onChange={e => setPrior(s.id, +e.target.value)}
                  className="w-full accent-[#22d3ee] cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>

        {hyp && stepResult && (
          <Panel title={`Bayesian Update Trace — ${hyp.label}`}>
            <div className="text-[11px] text-[#475569] mb-3">
              Toggle evidence items to see how each piece of information updates the posterior probability in real time.
              Active evidence: {hyp.activeCount} / {hyp.evidence.length}
            </div>

            <div className="flex flex-col gap-[6px]">
              <div className="flex items-center gap-[10px] bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] px-3 py-2">
                <div className="w-[80px] text-[10px] text-[#475569] font-mono">PRIOR</div>
                <div className="flex-1">
                  <div className="text-[12px] text-[#94a3b8]">Initial belief before observing evidence</div>
                </div>
                <div className="font-mono text-[14px] font-bold text-[#64748b] w-[60px] text-right">
                  {(hyp.prior * 100).toFixed(0)}%
                </div>
              </div>

              {hyp.evidence.map((ev, i) => {
                const key = `${hyp.id}_${i}`;
                const active = evidenceStates[key] !== false;
                const lr = ev.pIfTrue / ev.pIfFalse;
                const evSoFar = hyp.evidence.slice(0, i + 1).filter((_, j) => evidenceStates[`${hyp.id}_${j}`] !== false);
                const runResult = bayesianScore(hyp.prior, evSoFar);
                const prevResult = bayesianScore(hyp.prior, hyp.evidence.slice(0, i).filter((_, j) => evidenceStates[`${hyp.id}_${j}`] !== false));

                return (
                  <div key={i}
                    className={`flex items-center gap-[10px] rounded-[5px] px-3 py-2 border ${active ? `bg-[#0d1525] border-[${lr > 1 ? '#34d39944' : '#f43f5e44'}]` : 'bg-[#07100e] border-[#1e2d55] opacity-50'}`}
                  >
                    <button onClick={() => toggleEvidence(hyp.id, i)}
                      className={`w-[18px] h-[18px] rounded-[3px] border-2 shrink-0 cursor-pointer ${active ? 'border-[#22d3ee] bg-[#22d3ee22]' : 'border-[#1e2d55] bg-transparent'}`}
                    />
                    <div className="flex-1">
                      <div className={`text-[12px] mb-[2px] ${active ? 'text-[#e2e8f0]' : 'text-[#475569]'}`}>{ev.label}</div>
                      <div className="text-[10px] text-[#475569] font-mono">
                        P(e|H)={ev.pIfTrue} · P(e|¬H)={ev.pIfFalse} → LR={lr.toFixed(2)}
                        {lr > 1 ? <span className="text-[#34d399]"> → supports H</span> : <span className="text-[#f43f5e]"> → weakens H</span>}
                      </div>
                    </div>
                    {active && (
                      <div className="text-right min-w-[100px]">
                        <div className="text-[10px] text-[#475569]">
                          {(prevResult.posterior * 100).toFixed(1)}% →
                        </div>
                        <div className={`text-[14px] font-bold font-mono text-[${POSTERIOR_COLOR(runResult.posterior)}]`}>
                          {(runResult.posterior * 100).toFixed(1)}%
                        </div>
                        <div className={`text-[10px] ${runResult.posterior > prevResult.posterior ? 'text-[#34d399]' : 'text-[#f43f5e]'}`}>
                          {runResult.posterior > prevResult.posterior ? '+' : ''}{((runResult.posterior - prevResult.posterior) * 100).toFixed(1)}pp
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className={`flex items-center gap-[10px] bg-[#0d1525] rounded-[5px] px-3 py-[10px] border border-[${POSTERIOR_COLOR(stepResult.posterior)}44]`}>
                <div className="w-[80px] text-[10px] text-[#475569] font-mono">FINAL P(H|E)</div>
                <div className="flex-1">
                  <div className="bg-[#0a1020] rounded-full h-[6px] overflow-hidden">
                    <div className={`h-full rounded-full transition-[width] duration-[400ms] bg-[${POSTERIOR_COLOR(stepResult.posterior)}]`} style={{ width: `${stepResult.posterior * 100}%` }} />
                  </div>
                </div>
                <div className={`font-mono text-[20px] font-extrabold min-w-[70px] text-right text-[${POSTERIOR_COLOR(stepResult.posterior)}]`}>
                  {(stepResult.posterior * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </Panel>
        )}
        </>
        )}

      </div>
    </div>
  );
}
