import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import { DETECTION_METRICS, ROC_DATA } from '../data/analytics.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, ReferenceLine } from 'recharts';

const METHOD_COLORS = { 'Z-Score (σ=2.5)': '#fbbf24', 'EWMA (α=0.15)': '#22d3ee', 'IQR (1.5×)': '#a78bfa', 'Ensemble (≥2/3)': '#34d399' };

function MetricBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-[3px]">
        <span className="text-[#64748b]">{label}</span>
        <span className={`font-mono font-bold text-[${color}]`}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="bg-[#0f1a30] rounded-full h-[5px]">
        <div className={`h-full rounded-full bg-[${color}]`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export default function BenchmarkMode() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Historical Benchmark Mode — Anomaly Detection Evaluation" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        <Panel title="Detection Method Comparison — ARES-7 Telemetry Anomaly Dataset">
          <div className="text-[11px] text-[#475569] mb-3">
            Benchmarked on 412 sols of ARES-7 telemetry. Ground truth: 23 confirmed anomaly events manually labeled by mission operations team.
            Metrics computed using 5-fold cross-validation on held-out sols.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#1e2d55]">
                  {['Method', 'Precision', 'Recall', 'F1 Score', 'AUC-ROC', 'Avg Latency'].map(h => (
                    <th key={h} className={`px-3 py-2 text-[#475569] text-[10px] tracking-[0.5px] ${h === 'Method' ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DETECTION_METRICS.map((m, i) => {
                  const isTop = m.method.includes('Ensemble');
                  return (
                    <tr key={i} className={`border-b border-[#0f1a30] ${isTop ? 'bg-[#071220]' : 'bg-transparent'}`}>
                      <td className={`px-3 py-[10px] flex items-center gap-2 ${isTop ? 'font-bold' : 'font-normal'} text-[${METHOD_COLORS[m.method] || '#94a3b8'}]`}>
                        {isTop && <span className="text-[10px] bg-[#34d39933] border border-[#34d39944] rounded-[3px] px-[5px] text-[#34d399]">BEST</span>}
                        {m.method}
                      </td>
                      {[m.precision, m.recall, m.f1, m.auc].map((v, j) => (
                        <td key={j} className={`px-3 py-[10px] text-center font-mono font-semibold text-[${v >= 0.9 ? '#34d399' : v >= 0.8 ? '#fbbf24' : '#f43f5e'}]`}>
                          {(v * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td className="px-3 py-[10px] text-center font-mono text-[#94a3b8]">
                        {m.latencyMin} min
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

          <Panel title="ROC Curve — True Positive Rate vs False Positive Rate">
            <div className="text-[11px] text-[#475569] mb-2">
              Area Under Curve (AUC) measures overall detector quality. AUC=1.0 is perfect. AUC=0.5 is random chance.
              Ensemble detector (green) dominates across all operating points.
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ROC_DATA} margin={{ top: 4, right: 4, bottom: 20, left: -10 }}>
                <CartesianGrid stroke="#0f1a30" strokeDasharray="3 3" />
                <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -12, fontSize: 10, fill: '#475569' }} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#475569' }} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', fontSize: 11 }} formatter={v => `${(v*100).toFixed(1)}%`} />
                <ReferenceLine segment={[{x:0,y:0},{x:1,y:1}]} stroke="#1e2d55" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="tprZ"   stroke="#fbbf24" strokeWidth={1.5} dot={false} name="Z-Score" />
                <Line type="monotone" dataKey="tprEW"  stroke="#22d3ee" strokeWidth={1.5} dot={false} name="EWMA" />
                <Line type="monotone" dataKey="tprEns" stroke="#34d399" strokeWidth={2.5} dot={false} name="Ensemble" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-3 text-[10px] flex-wrap">
              {[['#fbbf24','Z-Score AUC=0.89'],['#22d3ee','EWMA AUC=0.94'],['#34d399','Ensemble AUC=0.97']].map(([c,l])=>(
                <div key={l} className="flex items-center gap-1 text-[#475569]"><div className={`w-4 h-[2px] bg-[${c}]`}/>{l}</div>
              ))}
            </div>
          </Panel>

          <Panel title="Multi-Dimensional Method Comparison">
            <div className="text-[11px] text-[#475569] mb-2">
              Radar chart compares all methods across 5 dimensions. Ensemble dominates — at the cost of higher detection latency.
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={[
                { metric: 'Precision', Z: 71, EW: 84, Ens: 89 },
                { metric: 'Recall',    Z: 83, EW: 91, Ens: 94 },
                { metric: 'F1',        Z: 77, EW: 87, Ens: 91 },
                { metric: 'AUC',       Z: 89, EW: 94, Ens: 97 },
                { metric: 'Speed',     Z: 80, EW: 40, Ens: 40 },
              ]}>
                <PolarGrid stroke="#0f1a30" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar dataKey="Z"   stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.1} strokeWidth={1.5} name="Z-Score" />
                <Radar dataKey="EW"  stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.1} strokeWidth={1.5} name="EWMA" />
                <Radar dataKey="Ens" stroke="#34d399" fill="#34d399" fillOpacity={0.15} strokeWidth={2}   name="Ensemble" />
              </RadarChart>
            </ResponsiveContainer>
          </Panel>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Panel title="F1 Score by Method">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={DETECTION_METRICS} margin={{ top: 4, right: 4, bottom: 20, left: -10 }}>
                <XAxis dataKey="method" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={m => m.split(' ')[0]} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                <Tooltip contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', fontSize: 11 }} formatter={v => `${(v*100).toFixed(1)}%`} />
                <Bar dataKey="f1" name="F1 Score" radius={[3, 3, 0, 0]}>
                  {DETECTION_METRICS.map((m, i) => <Cell key={i} fill={METHOD_COLORS[m.method] || '#475569'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Ensemble Detector — Confusion Matrix (23 events)">
            <div className="text-[11px] text-[#475569] mb-[10px]">Based on ARES-7 Sol 1-412 labeled dataset.</div>
            <div className="grid grid-cols-3 gap-1 text-[12px]">
              <div></div>
              <div className="text-center text-[#475569] text-[10px] font-semibold">Predicted +</div>
              <div className="text-center text-[#475569] text-[10px] font-semibold">Predicted −</div>
              <div className="text-[#475569] text-[10px] font-semibold flex items-center">Actual +</div>
              <div className="bg-[#065f46] border border-[#34d39944] rounded-[5px] p-3 text-center">
                <div className="text-[22px] font-extrabold text-[#34d399] font-mono">22</div>
                <div className="text-[10px] text-[#34d399]">True Positive</div>
              </div>
              <div className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-3 text-center">
                <div className="text-[22px] font-extrabold text-[#f43f5e] font-mono">1</div>
                <div className="text-[10px] text-[#f43f5e]">False Negative</div>
              </div>
              <div className="text-[#475569] text-[10px] font-semibold flex items-center">Actual −</div>
              <div className="bg-[#0a1020] border border-[#1e2d55] rounded-[5px] p-3 text-center">
                <div className="text-[22px] font-extrabold text-[#fbbf24] font-mono">3</div>
                <div className="text-[10px] text-[#fbbf24]">False Positive</div>
              </div>
              <div className="bg-[#065f46] border border-[#34d39944] rounded-[5px] p-3 text-center">
                <div className="text-[22px] font-extrabold text-[#34d399] font-mono">389</div>
                <div className="text-[10px] text-[#34d399]">True Negative</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-[10px]">
              <MetricBar label="Precision" value={0.89} color="#34d399" />
              <MetricBar label="Recall"    value={0.96} color="#22d3ee" />
              <MetricBar label="F1 Score"  value={0.92} color="#fbbf24" />
            </div>
          </Panel>
        </div>

      </div>
    </div>
  );
}
