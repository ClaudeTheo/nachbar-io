'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KpiMetricCardProps = {
  title: string;
  value: number | string;
  previousValue?: number;
  unit?: string;
  format?: 'number' | 'percent' | 'currency';
  description?: string;
};

function formatValue(value: number | string, format: 'number' | 'percent' | 'currency' = 'number'): string {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)} %`;
    case 'currency':
      return `€ ${value.toFixed(2)}`;
    default:
      return value.toLocaleString('de-DE');
  }
}

function getTrend(current: number | string, previous?: number): { direction: 'up' | 'down' | 'flat'; percent: number } {
  if (typeof current === 'string' || previous === undefined || previous === 0) {
    return { direction: 'flat', percent: 0 };
  }
  const diff = ((current - previous) / previous) * 100;
  if (Math.abs(diff) < 0.5) return { direction: 'flat', percent: 0 };
  return { direction: diff > 0 ? 'up' : 'down', percent: Math.abs(diff) };
}

export function KpiMetricCard({ title, value, previousValue, unit, format = 'number', description }: KpiMetricCardProps) {
  const trend = getTrend(value, previousValue);

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {formatValue(value, format)}
          </span>
          {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
          {trend.direction !== 'flat' && (
            <span
              className={cn(
                'flex items-center text-xs font-medium ml-auto',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-500'
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUp className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-0.5" />
              )}
              {trend.percent.toFixed(1)} %
            </span>
          )}
          {trend.direction === 'flat' && previousValue !== undefined && (
            <span className="flex items-center text-xs text-muted-foreground ml-auto">
              <Minus className="h-3 w-3 mr-0.5" />
              0 %
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
