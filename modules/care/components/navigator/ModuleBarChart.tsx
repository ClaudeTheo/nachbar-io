// modules/care/components/navigator/ModuleBarChart.tsx
// Horizontale Balken pro Modul mit Ampelfarben und MAX-Regel-Hinweis
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
  LabelList,
} from "recharts";
import type { ModuleNumber } from "../../lib/nba-scoring";
import { getModuleShortLabel, getModuleMaxWeighted } from "../../lib/nba-scoring";

interface ModuleBarChartProps {
  weightedScores: Record<string, { weighted: number; countsInTotal?: boolean }>;
}

// Ampelfarbe bestimmen: gruen (<33%), amber (33-66%), rot (>66%)
function getAmpelColor(weighted: number, maxWeighted: number): string {
  const ratio = weighted / maxWeighted;
  if (ratio < 0.33) return "#4CAF87"; // Gruen — wenig Einschraenkung
  if (ratio < 0.66) return "#F59E0B"; // Amber — mittlere Einschraenkung
  return "#EF4444"; // Rot — starke Einschraenkung
}

export function ModuleBarChart({ weightedScores }: ModuleBarChartProps) {
  // Daten aufbereiten und absteigend nach gewichtetem Wert sortieren
  const modules: ModuleNumber[] = [1, 2, 3, 4, 5, 6];
  const data = modules
    .map((m) => {
      const key = `m${m}`;
      const entry = weightedScores[key];
      const weighted = entry?.weighted ?? 0;
      const maxWeighted = getModuleMaxWeighted(m);
      const countsInTotal = entry?.countsInTotal !== false; // Default: zaehlt
      return {
        name: getModuleShortLabel(m),
        weighted,
        maxWeighted,
        countsInTotal,
        color: getAmpelColor(weighted, maxWeighted),
        label: countsInTotal
          ? `${weighted.toFixed(1)}/${maxWeighted}`
          : `${weighted.toFixed(1)}/${maxWeighted} (zählt nicht)`,
      };
    })
    .sort((a, b) => b.weighted - a.weighted);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-anthrazit">Module im Vergleich</h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80, right: 60, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 40]} tickFormatter={(v) => `${v}`} />
            <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(_value, _name, props) => {
                const entry = props?.payload as { label?: string } | undefined;
                return [entry?.label ?? String(_value), "Punkte"];
              }}
            />
            <Bar dataKey="weighted" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.color}
                  opacity={entry.countsInTotal ? 1 : 0.4}
                  strokeDasharray={entry.countsInTotal ? undefined : "4 4"}
                  stroke={entry.countsInTotal ? undefined : entry.color}
                />
              ))}
              <LabelList
                dataKey="label"
                position="right"
                style={{ fontSize: 11, fill: "#6B7280" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* MAX-Regel Hinweis */}
      <p className="text-xs text-muted-foreground">
        Module 2 (Kognitiv) und 3 (Verhalten) teilen sich einen 15%-Anteil.
        Nur der höhere Wert zählt. Das schwächere Modul ist ausgegraut und mit &quot;zählt nicht&quot; markiert.
      </p>
    </div>
  );
}
