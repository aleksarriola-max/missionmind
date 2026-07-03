import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useTelemetryStream } from '../hooks/useTelemetryStream.js';

export default function TelemetryChart({ channel, height = 120, live = true }) {
  const { nominal, unit, color } = channel;
  const series = useTelemetryStream(channel.series, channel.id, { enabled: live });
  const [lo, hi] = nominal;
  const latest = series[series.length - 1]?.v;
  const inRange = latest >= lo && latest <= hi;

  const data = series.map(({ t, v }) => ({
    t: new Date(t).toISOString().slice(11, 16),
    v,
  }));

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] text-[#64748b] font-mono tracking-[0.5px]">{channel.id}</span>
        <span className={`text-[16px] font-bold font-mono text-[${inRange ? color : '#f43f5e'}]`}>
          {latest} <span className="text-[11px] font-normal text-[#475569]">{unit}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} interval={14} />
          <YAxis tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: '#0a1020', border: '1px solid #1e2d55', borderRadius: 4, fontSize: 11 }}
            labelStyle={{ color: '#64748b' }}
            itemStyle={{ color }}
          />
          <ReferenceLine y={lo} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={hi} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
