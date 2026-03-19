'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export type TrendDataPoint = {
  date: string;
  value: number;
  label?: string;
};

export type KpiTrendChartProps = {
  title: string;
  data: TrendDataPoint[];
  color?: string;
  unit?: string;
  height?: number;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function KpiTrendChart({
  title,
  data,
  color = '#4CAF87',
  unit = '',
  height = 200,
}: KpiTrendChartProps) {
  const formatted = data.map(d => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {formatted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Noch keine Daten vorhanden
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v: unknown) => [`${v}${unit ? ` ${unit}` : ''}`, title]}
                labelFormatter={(label: unknown) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
