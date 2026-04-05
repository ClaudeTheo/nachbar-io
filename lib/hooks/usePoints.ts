"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

interface PointsInfo {
  totalPoints: number;
  level: number;
  title: string;
  icon: string;
  nextLevel: {
    level: number;
    title: string;
    pointsNeeded: number;
    progress: number;
  } | null;
}

export function usePoints() {
  const { user } = useAuth();
  const [data, setData] = useState<PointsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/points")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return { data, loading };
}
