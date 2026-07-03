export default function AlarmBadge({ severity }) {
  const map = {
    critical: { bg: '#4c0519', color: '#f43f5e', label: 'CRITICAL' },
    warning:  { bg: '#451a03', color: '#fbbf24', label: 'WARNING'  },
    info:     { bg: '#0c1a2e', color: '#22d3ee', label: 'INFO'     },
  };
  const s = map[severity] || map.info;
  return (
    <span className={`bg-[${s.bg}] text-[${s.color}] border border-[${s.color}44] rounded-[3px] px-[6px] py-[1px] text-[10px] font-bold tracking-[1px] font-mono`}>
      {s.label}
    </span>
  );
}
