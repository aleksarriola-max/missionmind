export default function ConfidenceMeter({ value, label, showBar = true }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? '#34d399' : pct >= 45 ? '#fbbf24' : '#f43f5e';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-[#64748b]">
        {label && <span>{label}</span>}
        <span className={`text-[${color}] font-semibold font-mono`}>{pct}%</span>
      </div>
      {showBar && (
        <div className="bg-[#0f1a30] rounded-full overflow-hidden h-[5px]">
          <div className={`h-full bg-[${color}] rounded-full transition-[width] duration-[400ms]`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
