"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TypeDistributionChartProps {
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
  total,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<any>;
  total?: number;
}) {
  if (active && payload && payload.length && total) {
    const data = payload[0];
    const percent = Math.round((data.value / total) * 100);
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-slate-600">
          {TYPE_LABELS[data.name] || data.name}
        </p>
        <p className="text-sm font-bold text-slate-900">
          {data.value} ({percent}%)
        </p>
      </div>
    );
  }
  return null;
}

export function TypeDistributionChart({ data }: TypeDistributionChartProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
      color: TYPE_COLORS[type] || "#6b7280",
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[150px] flex items-center">
      <div className="w-1/2 h-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={150}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2 pl-2">
        <div className="space-y-1.5">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-600 capitalize flex-1 truncate">
                {TYPE_LABELS[item.name] || item.name}
              </span>
              <span className="text-xs font-medium text-slate-900">
                {item.value}
              </span>
              <span className="text-[10px] text-slate-400">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

