"use client";
import { Card, CardContent } from "@/components/ui/card";
import { usePoints } from "@/lib/hooks/usePoints";

export function PointsWidget() {
  const { data, loading } = usePoints();

  if (loading || !data) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{data.icon}</span>
            <div>
              <p className="text-sm font-semibold text-anthrazit">
                {data.title}
              </p>
              <p className="text-xs text-muted-foreground">
                Level {data.level}
              </p>
            </div>
          </div>
          <span className="text-lg font-bold text-quartier-green">
            {data.totalPoints}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Nachbarschaftspunkte
        </p>
        {data.nextLevel && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Nächstes Level: {data.nextLevel.title}</span>
              <span>{data.nextLevel.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-quartier-green rounded-full transition-all"
                style={{ width: `${data.nextLevel.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
