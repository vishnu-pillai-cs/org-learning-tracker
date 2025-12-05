"use client";

import { useMemo } from "react";

interface StreakCalendarProps {
  data: Array<{ date: string; count: number; hours?: number }>;
  weeks?: number;
}

function getIntensityStyle(count: number, isFuture: boolean): React.CSSProperties {
  if (isFuture) return { backgroundColor: "transparent" };
  if (count === 0) return { backgroundColor: "#ebedf0" };
  if (count === 1) return { backgroundColor: "#9be9a8" };
  if (count === 2) return { backgroundColor: "#40c463" };
  if (count >= 3) return { backgroundColor: "#30a14e" };
  return { backgroundColor: "#ebedf0" };
}

function formatDateTooltip(date: Date, count: number): string {
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (count === 0) return `No learnings on ${dateStr}`;
  return `${count} learning${count !== 1 ? "s" : ""} on ${dateStr}`;
}

export function StreakCalendar({ data, weeks = 52 }: StreakCalendarProps) {
  const { grid, monthPositions } = useMemo(() => {
    // Create a map for quick lookup
    const dataMap = new Map(
      data.map((d) => [d.date.split("T")[0], d.count])
    );

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // End on today, start from (weeks) weeks ago
    const endDate = new Date(today);
    
    // Find the Saturday of current week (end of week)
    const currentDay = endDate.getDay();
    const daysUntilSaturday = 6 - currentDay;
    endDate.setDate(endDate.getDate() + daysUntilSaturday);
    
    // Start date is (weeks) weeks before end
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
    
    // Adjust to Sunday
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay);

    const grid: Array<Array<{ date: Date; count: number }>> = [];
    const monthPositions: Array<{ month: string; col: number }> = [];
    
    const currentDate = new Date(startDate);
    let lastMonth = -1;
    let weekIndex = 0;

    while (currentDate <= endDate) {
      const weekData: Array<{ date: Date; count: number }> = [];
      
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const count = dataMap.get(dateStr) || 0;
        
        // Track month changes (on first day of week)
        if (day === 0) {
          const month = currentDate.getMonth();
          if (month !== lastMonth) {
            monthPositions.push({
              month: currentDate.toLocaleDateString("en-US", { month: "short" }),
              col: weekIndex,
            });
            lastMonth = month;
          }
        }
        
        weekData.push({ date: new Date(currentDate), count });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      grid.push(weekData);
      weekIndex++;
    }

    return { grid, monthPositions };
  }, [data, weeks]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cellSize = 10;
  const cellGap = 2;
  const weekWidth = cellSize + cellGap;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="overflow-x-auto pb-2 max-w-full">
        <div 
          className="inline-block"
          style={{ minWidth: grid.length * weekWidth + 30 }}
        >
          {/* Month labels */}
          <div 
            className="flex text-xs text-slate-500 mb-1"
            style={{ marginLeft: 30 }}
          >
            {monthPositions.map((pos, idx) => {
              const nextPos = monthPositions[idx + 1];
              const width = nextPos 
                ? (nextPos.col - pos.col) * weekWidth
                : (grid.length - pos.col) * weekWidth;
              
              return (
                <div 
                  key={idx} 
                  style={{ width, minWidth: width }}
                  className="text-left"
                >
                  {pos.month}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Day labels */}
            <div 
              className="flex flex-col text-[9px] text-slate-400 pr-1"
              style={{ gap: cellGap, width: 28 }}
            >
              {dayLabels.map((label, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-end"
                  style={{ height: cellSize }}
                >
                  {idx % 2 === 1 ? label : ""}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="flex" style={{ gap: cellGap }}>
              {grid.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col" style={{ gap: cellGap }}>
                  {week.map((day, dayIdx) => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const dayDate = new Date(day.date);
                    dayDate.setHours(0, 0, 0, 0);
                    const isToday = dayDate.getTime() === now.getTime();
                    const isFuture = dayDate > now;
                    
                    if (isFuture) {
                      return (
                        <div
                          key={dayIdx}
                          style={{ width: cellSize, height: cellSize }}
                        />
                      );
                    }
                    
                    return (
                      <div
                        key={dayIdx}
                        className={`rounded-sm cursor-default ${
                          isToday ? "ring-1 ring-slate-600" : ""
                        }`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          ...getIntensityStyle(day.count, isFuture),
                        }}
                        title={formatDateTooltip(day.date, day.count)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend - centered */}
      <div className="flex items-center justify-center gap-1 mt-1">
        <span className="text-[10px] text-slate-400 mr-1">Less</span>
        {["#ebedf0", "#9be9a8", "#40c463", "#30a14e"].map((color, idx) => (
          <div
            key={idx}
            className="rounded-sm"
            style={{ width: 10, height: 10, backgroundColor: color }}
          />
        ))}
        <span className="text-[10px] text-slate-400 ml-1">More</span>
      </div>
    </div>
  );
}

