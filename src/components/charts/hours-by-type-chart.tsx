"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface HoursByTypeChartProps {
  data: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  course: "#10b981",
  article: "#3b82f6",
  video: "#f59e0b",
  project: "#8b5cf6",
  other: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  course: "Courses",
  article: "Articles",
  video: "Videos",
  project: "Projects",
  other: "Other",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-slate-600">
          {TYPE_LABELS[label || ""] || label}
        </p>
        <p className="text-sm font-bold text-slate-900">
          {payload[0].value}h invested
        </p>
      </div>
    );
  }
  return null;
}

export function HoursByTypeChart({ data }: HoursByTypeChartProps) {
  const chartData = Object.entries(data)
    .filter(([, hours]) => hours > 0)
    .map(([type, hours]) => ({
      type,
      hours: Math.round(hours * 10) / 10,
      color: TYPE_COLORS[type] || "#6b7280",
      label: TYPE_LABELS[type] || type,
    }))
    .sort((a, b) => b.hours - a.hours);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={150}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={true}
          vertical={false}
          stroke="#e2e8f0"
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          unit="h"
        />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="hours" radius={[0, 4, 4, 0]} animationDuration={800}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

