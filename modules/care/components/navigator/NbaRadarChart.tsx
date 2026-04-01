// modules/care/components/navigator/NbaRadarChart.tsx
// Radar-Chart mit 6 Achsen (eine pro NBA-Modul)
"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ModuleNumber } from "../../lib/nba-scoring";
import { getModuleShortLabel, getModuleMaxWeighted } from "../../lib/nba-scoring";

interface NbaRadarChartProps {
  weightedScores: Record<string, { weighted: number }>;
}

export function NbaRadarChart({ weightedScores }: NbaRadarChartProps) {
  const modules: ModuleNumber[] = [1, 2, 3, 4, 5, 6];

  const data = modules.map((m) => {
    const key = `m${m}`;
    const weighted = weightedScores[key]?.weighted ?? 0;
    const maxWeighted = getModuleMaxWeighted(m);
    // Normalisieren auf 0-100% fuer vergleichbare Achsen
    const percentage = maxWeighted > 0 ? (weighted / maxWeighted) * 100 : 0;
    return {
      module: getModuleShortLabel(m),
      value: Math.round(percentage),
      weighted: weighted.toFixed(1),
    };
  });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-anthrazit">Stärkenprofil</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis
              dataKey="module"
              tick={{ fontSize: 11, fill: "#6B7280" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(_value, _name, props) => {
                const entry = props?.payload as { weighted?: string } | undefined;
                return [`${entry?.weighted ?? _value} Punkte (${_value}%)`, "Einschränkung"];
              }}
            />
            <Radar
              name="Einschränkung"
              dataKey="value"
              stroke="#4CAF87"
              fill="#4CAF87"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Höhere Werte = stärkere Einschränkung in diesem Bereich
      </p>
    </div>
  );
}
