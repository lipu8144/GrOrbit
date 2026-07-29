import { BRAND } from "../../lib/theme";

export function Sparkline({ data, color = BRAND, w = 260, h = 60, fill = true }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / rng) * (h - 12)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const id = "sp" + color.replace("#", "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Bars({ data, color = BRAND, w = 280, h = 120, labelKey = "l", valueKey = "v" }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {data.map((d, i) => {
        const bh = (d[valueKey] / max) * (h - 22);
        return (
          <g key={i}>
            <rect x={i * bw + bw * 0.2} y={h - bh - 16} width={bw * 0.6} height={bh} rx={4} fill={color} opacity={0.85} />
            <text x={i * bw + bw / 2} y={h - 3} textAnchor="middle" fontSize="10" fill="#9CA3AF">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function GroupedBars({ data, colors = [BRAND, "#1F2937"], keys = ["a", "b"], w = 560, h = 160, labelKey = "l" }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: h }}>No data yet — your revenue &amp; orders will chart here.</div>;
  }
  const max = Math.max(...data.flatMap(d => keys.map(k => d[k])), 1);
  const gw = w / data.length;
  const bw = (gw * 0.6) / keys.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      {data.map((d, i) => (
        <g key={i}>
          {keys.map((k, j) => {
            const bh = (d[k] / max) * (h - 24);
            return <rect key={k} x={i * gw + gw * 0.2 + j * bw} y={h - bh - 18} width={bw * 0.9} height={bh} rx={3} fill={colors[j]} opacity={0.9} />;
          })}
          <text x={i * gw + gw / 2} y={h - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">{d[labelKey]}</text>
        </g>
      ))}
    </svg>
  );
}

export function Ring({ pct, color = BRAND, size = 72, track = "#F3F4F6", width = 8 }) {
  const r = (size - width) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={width} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={width}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

export function Donut({ segments, size = 140, width = 22 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - width) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={width} />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={width}
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
