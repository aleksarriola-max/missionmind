// Lightweight hand-rolled Sankey: sources -> hub -> sinks, with ribbon
// widths proportional to wattage. Built for this one power-flow shape
// rather than as a generic multi-stage Sankey library.

const AREA_TOP = 16;
const AREA_HEIGHT = 268;
const GAP = 4;
const SRC_X = 30, SRC_W = 100;
const HUB_X = 300, HUB_W = 90;
const SINK_X = 560, SINK_W = 110;

function stack(nodes, scale) {
  let y = AREA_TOP;
  return nodes.map(n => {
    const h = Math.max(n.value * scale, 2);
    const band = { ...n, yTop: y, yBot: y + h };
    y += h + GAP;
    return band;
  });
}

function ribbon(x1, y1top, y1bot, x2, y2top, y2bot) {
  const midX = (x1 + x2) / 2;
  return `M ${x1},${y1top} C ${midX},${y1top} ${midX},${y2top} ${x2},${y2top} L ${x2},${y2bot} C ${midX},${y2bot} ${midX},${y1bot} ${x1},${y1bot} Z`;
}

export default function PowerSankey({ data, height = 300 }) {
  const totalSources = data.sources.reduce((s, n) => s + n.value, 0);
  const totalSinks = data.sinks.reduce((s, n) => s + n.value, 0);
  const usableHeight = AREA_HEIGHT - GAP * (data.sources.length - 1);
  const scale = usableHeight / totalSources;

  const sourceBands = stack(data.sources, scale);
  const sinkBands = stack(data.sinks, scale);
  const hubBottom = AREA_TOP + totalSinks * scale + GAP * (data.sinks.length - 1);

  return (
    <svg width="100%" height={height} viewBox={`0 0 700 ${AREA_TOP * 2 + AREA_HEIGHT}`} className="block">
      {/* hub trapezoid (left = full source height, right = total sink height, tapering = bus regulation loss) */}
      <path
        d={`M ${HUB_X},${AREA_TOP} L ${HUB_X},${AREA_TOP + AREA_HEIGHT} L ${HUB_X + HUB_W},${hubBottom} L ${HUB_X + HUB_W},${AREA_TOP} Z`}
        fill="#1e2d55" fillOpacity={0.5} stroke="#22d3ee" strokeOpacity={0.3}
      />
      <text x={HUB_X + HUB_W / 2} y={AREA_TOP - 4} textAnchor="middle" fontSize={10} fill="#94a3b8" fontWeight="600">{data.hub.label}</text>

      {/* source -> hub ribbons */}
      {sourceBands.map(b => (
        <g key={b.id}>
          <path d={ribbon(SRC_X + SRC_W, b.yTop, b.yBot, HUB_X, b.yTop, b.yBot)} fill={b.color} fillOpacity={0.35} />
          <rect x={SRC_X} y={b.yTop} width={SRC_W} height={b.yBot - b.yTop} rx={3} fill={b.color} fillOpacity={0.25} stroke={b.color} strokeOpacity={0.7} />
          <text x={SRC_X + SRC_W / 2} y={(b.yTop + b.yBot) / 2 - 3} textAnchor="middle" fontSize={10} fill="#e2e8f0" fontWeight="600">{b.label}</text>
          <text x={SRC_X + SRC_W / 2} y={(b.yTop + b.yBot) / 2 + 10} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={b.color}>{b.value}W</text>
        </g>
      ))}

      {/* hub -> sink ribbons */}
      {sinkBands.map(b => (
        <g key={b.id}>
          <path d={ribbon(HUB_X + HUB_W, b.yTop, b.yBot, SINK_X, b.yTop, b.yBot)} fill={b.color} fillOpacity={0.35} />
          <rect x={SINK_X} y={b.yTop} width={SINK_W} height={b.yBot - b.yTop} rx={3} fill={b.color} fillOpacity={0.25} stroke={b.color} strokeOpacity={0.7} />
          <text x={SINK_X + SINK_W / 2} y={(b.yTop + b.yBot) / 2 - 3} textAnchor="middle" fontSize={10} fill="#e2e8f0" fontWeight="600">{b.label.length > 14 ? b.label.slice(0, 13) + '…' : b.label}</text>
          <text x={SINK_X + SINK_W / 2} y={(b.yTop + b.yBot) / 2 + 10} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={b.color}>{b.value}W</text>
        </g>
      ))}
    </svg>
  );
}
