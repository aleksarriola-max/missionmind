import { useState, useMemo, useEffect } from 'react';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import Skeleton from '../components/Skeleton.jsx';
import { TELEMETRY_CHANNELS } from '../data/telemetry.js';
import { zScore, ewma, runAllDetectors, buildCorrelationMatrix, predictTimeToLimit, linearRegression } from '../data/analytics.js';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const CHANNELS = Object.values(TELEMETRY_CHANNELS);

function corrColor(r) {
  if (r >  0.7) return '#34d399';
  if (r >  0.4) return '#22d3ee';
  if (r >  0.1) return '#475569';
  if (r > -0.1) return '#1e2d55';
  if (r > -0.4) return '#f97316';
  return '#f43f5e';
}

export default function TelemetryAnalytics() {
  const [selectedCh, setSelectedCh] = useState('solarCurrent');
  const [detector, setDetector] = useState('ewma');

  const ch = TELEMETRY_CHANNELS[selectedCh];
  const series = ch.series;

  // Brief skeleton state on channel switch — the statistical computation
  // below is actually cheap, but rendering it instantly looks fake for what
  // is supposed to be a detection/regression pass over the series. The
  // "true" is set during render via the prevCh pattern (not in the effect
  // body) so the effect only ever schedules the async clear.
  const [computing, setComputing] = useState(true);
  const [prevCh, setPrevCh] = useState(selectedCh);
  if (selectedCh !== prevCh) {
    setPrevCh(selectedCh);
    setComputing(true);
  }
  useEffect(() => {
    const id = setTimeout(() => setComputing(false), 380);
    return () => clearTimeout(id);
  }, [selectedCh]);

  const detectorResults = useMemo(() => runAllDetectors(series), [series]);
  const zs = useMemo(() => zScore(series), [series]);
  const ew = useMemo(() => ewma(series), [series]);

  // Build chart data for selected detector
  const chartData = useMemo(() => {
    return series.map((p, i) => {
      const t = new Date(p.t).toISOString().slice(11, 16);
      const base = { t, v: p.v };
      if (detector === 'zscore') return { ...base, upper: zs[i].upper2, lower: zs[i].lower2, upper3: zs[i].upper3, lower3: zs[i].lower3 };
      if (detector === 'ewma')   return { ...base, ewma: ew[i].ewma, ucl: ew[i].ucl, lcl: ew[i].lcl };
      return base;
    });
  }, [series, detector, zs, ew]);

  // Anomaly flags from ensemble
  const flaggedPoints = detectorResults.detections.filter(d => d.flagged);

  // Predictive extrapolation
  const reg = useMemo(() => linearRegression(series), [series]);
  const [lo, hi] = ch.nominal;
  const limitVal = reg.slope < 0 ? lo : hi;
  const pred = useMemo(() => predictTimeToLimit(series, limitVal), [series, limitVal]);

  // Correlation matrix
  const corrMatrix = useMemo(() => buildCorrelationMatrix(), []);

  // Forecast extension (next 20 points) — uses a numeric index axis (idx) so
  // historical and forecast points never collide on the same HH:MM tick label.
  const fullChart = useMemo(() => {
    const n = series.length;
    const historical = series.map((p, i) => ({
      idx: i,
      t: new Date(p.t).toISOString().slice(11, 16),
      v: p.v,
      forecast: null,
      upper: chartData[i]?.upper ?? null,
      lower: chartData[i]?.lower ?? null,
    }));
    const forecast = Array.from({ length: 20 }, (_, i) => {
      const idx = n + i;
      const val = reg.slope * idx + reg.intercept;
      const t = new Date(series[n - 1].t + (i + 1) * 60000).toISOString().slice(11, 16);
      return {
        idx, t, v: null,
        forecast: +val.toFixed(2),
        upper: +(val + 1.96 * reg.rse).toFixed(2),
        lower: +(val - 1.96 * reg.rse).toFixed(2),
      };
    });
    return [...historical, ...forecast];
  }, [series, chartData, reg]);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Telemetry Analytics — Statistical Detection & Prediction" />

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">

        <div className="flex gap-[6px] flex-wrap">
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setSelectedCh(Object.keys(TELEMETRY_CHANNELS).find(k => TELEMETRY_CHANNELS[k] === c))}
              className={`px-3 py-[5px] rounded-[5px] cursor-pointer text-[11px] font-medium border ${ch.id === c.id ? `bg-[#162040] border-[${c.color}66] text-[${c.color}]` : 'bg-[#0a1020] border-[#1e2d55] text-[#64748b]'}`}
            >{c.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">

          {/* Detection chart */}
          <Panel title={`${ch.label} — Anomaly Detection`}
            headerRight={
              <div className="flex gap-1">
                {['zscore','ewma','ensemble'].map(d => (
                  <button key={d} onClick={() => setDetector(d)}
                    className={`px-2 py-[2px] rounded-[3px] cursor-pointer text-[10px] border ${detector === d ? 'bg-[#162040] border-[#22d3ee44] text-[#22d3ee]' : 'bg-[#0a1020] border-[#1e2d55] text-[#475569]'}`}
                  >{d.toUpperCase()}</button>
                ))}
              </div>
            }
          >
            {computing ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-[13px] w-2/3" />
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
            <>
            <div className="text-[11px] text-[#475569] mb-2">
              {detector === 'zscore' && 'Z-Score: flags points beyond ±2σ (yellow) and ±3σ (red) from rolling mean'}
              {detector === 'ewma'   && 'EWMA (α=0.15): exponentially weighted control limits (UCL/LCL = μ ± 3σ_ew)'}
              {detector === 'ensemble' && `Ensemble: union of Z-Score + EWMA + IQR — ${flaggedPoints.length} anomalous points detected`}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={detector === 'ensemble' ? detectorResults.detections.map((d) => ({ t: new Date(d.t).toISOString().slice(11,16), v: d.v, score: d.ensembleScore, flagged: d.flagged })) : chartData}>
                <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} interval={14} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} width={38} />
                <Tooltip contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', fontSize: 11 }} />
                {detector === 'zscore' && <>
                  <Line type="monotone" dataKey="upper3" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                  <Line type="monotone" dataKey="lower3" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 2" dot={false} />
                  <Line type="monotone" dataKey="upper"  stroke="#fbbf24" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                  <Line type="monotone" dataKey="lower"  stroke="#fbbf24" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                </>}
                {detector === 'ewma' && <>
                  <Line type="monotone" dataKey="ucl"  stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 2" dot={false} />
                  <Line type="monotone" dataKey="lcl"  stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 2" dot={false} />
                  <Line type="monotone" dataKey="ewma" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </>}
                <Line
                  type="monotone"
                  dataKey={detector === 'ensemble' ? 'score' : 'v'}
                  stroke={ch.color} strokeWidth={1.5}
                  dot={detector === 'ensemble' ? (props) => {
                    const { cx, cy, payload, index } = props;
                    if (!payload.flagged) return null;
                    return <circle key={`flag-${index}`} cx={cx} cy={cy} r={3.5} fill="#f43f5e" stroke="#0a1020" strokeWidth={1} />;
                  } : false}
                />
              </LineChart>
            </ResponsiveContainer>
            {detector === 'ensemble' && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {detectorResults.detections.filter(d => d.flagged).slice(0, 3).map((d, i) => (
                  <div key={i} className="bg-[#0d1525] border border-[#f43f5e33] rounded-[4px] px-2 py-1 text-[10px] text-[#f43f5e]">
                    ● T={new Date(d.t).toISOString().slice(11, 16)} v={d.v} (score: {(d.ensembleScore * 100).toFixed(0)}%)
                  </div>
                ))}
              </div>
            )}
            </>
            )}
          </Panel>

          {/* Predictive extrapolation */}
          <Panel title={`${ch.label} — Trend Extrapolation & Time-to-Limit`}>
            {computing ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-[10px]">
                  <Skeleton className="h-[64px] w-full" />
                  <Skeleton className="h-[64px] w-full" />
                </div>
                <Skeleton className="h-[160px] w-full" />
              </div>
            ) : (
            <>
            <div className="grid grid-cols-2 gap-[10px] mb-3">
              <div className="bg-[#0f1a30] border border-[#1e2d55] rounded-[5px] p-[10px]">
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">TREND SLOPE</div>
                <div className={`text-[18px] font-bold font-mono ${reg.slope < 0 ? 'text-[#f43f5e]' : 'text-[#34d399]'}`}>
                  {reg.slope > 0 ? '+' : ''}{reg.slope.toFixed(4)} {ch.unit}/min
                </div>
                <div className="text-[10px] text-[#475569] mt-[2px]">R² = {reg.r2.toFixed(3)}</div>
              </div>
              <div className={`bg-[#0f1a30] rounded-[5px] p-[10px] border ${pred && !pred.already ? 'border-[#fbbf2444]' : 'border-[#1e2d55]'}`}>
                <div className="text-[10px] text-[#475569] tracking-[1px] mb-1">TIME TO LIMIT ({limitVal} {ch.unit})</div>
                {pred === null && <div className="text-[14px] text-[#34d399] font-bold">Flat trend — no limit risk</div>}
                {pred?.already && <div className="text-[14px] text-[#f43f5e] font-bold">ALREADY AT LIMIT</div>}
                {pred && !pred.already && (
                  <>
                    <div className={`text-[18px] font-bold font-mono ${pred.minutes < 60 ? 'text-[#f43f5e]' : pred.minutes < 120 ? 'text-[#fbbf24]' : 'text-[#34d399]'}`}>
                      {pred.minutes} min
                    </div>
                    <div className="text-[10px] text-[#475569]">±{pred.uncertaintyMins} min (95% CI)</div>
                  </>
                )}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={fullChart}>
                <XAxis
                  dataKey="idx" type="number" domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false}
                  tickFormatter={(idx) => fullChart[Math.round(idx)]?.t ?? ''}
                  tickCount={7}
                />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} width={38} />
                <Tooltip contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', fontSize: 11 }} labelFormatter={(idx) => fullChart[idx]?.t ?? ''} />
                <ReferenceLine y={lo} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'MIN', fontSize: 9, fill: '#f43f5e' }} />
                <ReferenceLine y={hi} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'MAX', fontSize: 9, fill: '#f43f5e' }} />
                <Line type="monotone" dataKey="v"        stroke={ch.color} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke={ch.color} strokeWidth={1.5} strokeDasharray="5 3" dot={false} strokeOpacity={0.7} />
                <Line type="monotone" dataKey="upper"    stroke={ch.color} strokeWidth={0.8} strokeDasharray="2 3" dot={false} strokeOpacity={0.35} />
                <Line type="monotone" dataKey="lower"    stroke={ch.color} strokeWidth={0.8} strokeDasharray="2 3" dot={false} strokeOpacity={0.35} />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-[10px] text-[#475569] mt-1">
              Dashed line: linear extrapolation · Faint band: 95% prediction interval (RSE={reg.rse.toFixed(3)})
            </div>
            </>
            )}
          </Panel>

        </div>

        {/* Correlation matrix */}
        <Panel title="Signal Cross-Correlation Matrix — Pearson r (all channels)">
          <div className="text-[11px] text-[#475569] mb-[10px]">
            Pearson r measures linear correlation between telemetry channels. Strong positive (green) = co-move. Strong negative (red) = inverse. Used to trace anomaly propagation paths.
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px] font-mono">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-[#475569] text-left min-w-[120px]">Channel</th>
                  {corrMatrix.map(c => (
                    <th key={c.id} className="px-[6px] py-1 text-[#475569] [writing-mode:vertical-rl] rotate-180 h-[80px] text-left text-[9px]">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrMatrix.map(row => (
                  <tr key={row.id}>
                    <td className="px-2 py-1 text-[#94a3b8] font-medium whitespace-nowrap">{row.label}</td>
                    {row.correlations.map(cell => (
                      <td key={cell.id}
                        className={`px-[6px] py-1 text-center font-semibold border border-[#0f1a30] text-[${corrColor(cell.r)}] ${row.id === cell.id ? 'bg-[#162040]' : `bg-[${corrColor(cell.r)}22]`}`}
                      >
                        {row.id === cell.id ? '—' : cell.r.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-[10px] text-[10px] text-[#475569]">
            {[['#34d399', 'r > 0.7 strong positive'], ['#22d3ee', '0.4–0.7 moderate'], ['#f97316', '-0.4 to -0.7 moderate neg.'], ['#f43f5e', 'r < -0.7 strong negative']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1"><div className={`w-[10px] h-[10px] rounded-[2px] bg-[${c}]`} />{l}</div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}
