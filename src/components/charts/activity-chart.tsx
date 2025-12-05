"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ActivityDataPoint {
  date: string;
  count: number;
  hours: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
  dataKey?: "count" | "hours";
  color?: string;
  title?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-slate-600">
          {label ? formatDate(label) : ""}
        </p>
        <p className="text-sm font-bold text-slate-900">
          {data.dataKey === "hours"
            ? `${data.value}h`
            : `${data.value} learning${data.value !== 1 ? "s" : ""}`}
        </p>
      </div>
    );
  }
  return null;
}

export function ActivityChart({
  data,
  dataKey = "count",
  color = "#10b981",
  title,
}: ActivityChartProps) {
  // Show only every 5th label on x-axis for cleaner view
  const tickFormatter = (value: string, index: number) => {
    if (index % 5 === 0) {
      return formatDate(value);
    }
    return "";
  };

  return (
    <div className="w-full h-full min-h-[150px]">
      {title && (
        <p className="text-xs font-medium text-slate-500 mb-2">{title}</p>
      )}
      <ResponsiveContainer width="100%" height="100%" minHeight={150}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

