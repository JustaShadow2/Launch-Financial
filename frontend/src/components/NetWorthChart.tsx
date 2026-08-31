import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { formatMoney } from "../lib/format";

export interface NetWorthPoint {
  t: number; // epoch ms
  value: number;
}

interface Props {
  points: NetWorthPoint[];
  height?: number;
  positive?: boolean;
  range?: string;
}

export function NetWorthChart({ points, height = 220, positive = true, range = "1M" }: Props) {
  const color = positive ? "#2fce8f" : "#ff6b6b";
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || Math.max(max * 0.05, 1);

  // Shorter, range-appropriate date formatting for the tooltip.
  const fmtDate = (t: number) => {
    const d = new Date(Number(t));
    if (range === "1Y" || range === "ALL") {
      return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[min - pad, max + pad]} hide />
        <Tooltip
          contentStyle={{
            background: "#161b22",
            border: "1px solid #263041",
            borderRadius: 12,
            color: "#e6edf3",
          }}
          labelFormatter={(t) => fmtDate(Number(t))}
          formatter={(v: number) => [formatMoney(v), "Net worth"]}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#nwFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
