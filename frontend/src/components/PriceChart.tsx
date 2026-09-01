import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Candle } from "../api/types";
import { formatPrice } from "../lib/format";

interface Props {
  candles: Candle[];
  height?: number;
  positive?: boolean;
}

export function PriceChart({ candles, height = 220, positive = true }: Props) {
  const color = positive ? "#2fce8f" : "#ff6b6b";
  const data = candles.map((c) => ({ t: c.t, price: c.price }));
  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.1 || max * 0.05;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* Bind the x-axis to the timestamp so the tooltip label resolves to
            the actual date. Without a dataKey the tooltip label falls back to
            the row index, which parses as epoch 0 (12/31/1969). */}
        <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} hide />
        <YAxis domain={[min - pad, max + pad]} hide />
        <Tooltip
          contentStyle={{
            background: "#161b22",
            border: "1px solid #263041",
            borderRadius: 10,
            color: "#e6edf3",
          }}
          labelFormatter={(t) => new Date(Number(t)).toLocaleDateString()}
          formatter={(v: number) => [formatPrice(v), "Price"]}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill="url(#fill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
