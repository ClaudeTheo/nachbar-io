"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Lock, ChevronRight } from "lucide-react";

interface WeekMaterial {
  week: number;
  title: string;
  description: string;
  topics: string[];
}

export default function MaterialienPage() {
  const [materials, setMaterials] = useState<WeekMaterial[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, []);

  async function loadMaterials() {
    try {
      // Fortschritt laden um aktuelle Woche zu bestimmen
      const progressRes = await fetch("/api/prevention/progress");
      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData.length > 0) {
          setCurrentWeek(progressData[0].currentWeek);
        }
      }

      // Alle Wochen-Materialien laden
      const weekPromises = Array.from({ length: 8 }, (_, i) =>
        fetch(`/api/prevention/materials/${i + 1}`).then((r) =>
          r.ok ? r.json() : null,
        ),
      );

      const results = await Promise.all(weekPromises);
      setMaterials(results.filter(Boolean));
    } catch (err) {
      console.error("Materialien laden fehlgeschlagen:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/praevention"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materialien</h1>
          <p className="text-sm text-gray-500">
            Handouts und Übungsanleitungen
          </p>
        </div>
      </div>

      {/* Wochen-Liste */}
      <div className="space-y-3">
        {materials.map((material) => {
          const isAccessible = material.week <= currentWeek;

          return (
            <div
              key={material.week}
              className={`rounded-2xl border p-4 transition-colors ${
                isAccessible
                  ? "border-gray-100 bg-white shadow-sm"
                  : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isAccessible
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isAccessible ? (
                    <BookOpen className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {material.title}
                  </h3>
                  <p className="mb-2 text-sm text-gray-500">
                    {material.description}
                  </p>

                  {isAccessible && (
                    <ul className="space-y-1">
                      {material.topics.map((topic, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <ChevronRight className="h-3 w-3 text-emerald-500" />
                          {topic}
                        </li>
                      ))}
                    </ul>
                  )}

                  {!isAccessible && (
                    <p className="text-xs text-gray-400">
                      Verfügbar ab Woche {material.week}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {materials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">
            Materialien werden nach der Einschreibung freigeschaltet.
          </p>
        </div>
      )}
    </div>
  );
}
