"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface BoardPost {
  id: string;
  title: string;
  content: string;
  author?: string;
  created_at?: string;
}

/** Schwarzes Brett: Beiträge aus /api/board laden und anzeigen */
export default function BoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/board")
      .then((res) => {
        if (!res.ok) throw new Error("Fehler beim Laden");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        } else {
          setPosts([]);
        }
      })
      .catch(() => {
        setError(true);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Datum in deutschem Format anzeigen */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  /** Text auf 200 Zeichen kürzen */
  const truncate = (text: string, max = 200) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + "...";
  };

  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk" className="kiosk-back">
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 20px" }}>
        📋 Schwarzes Brett
      </h1>

      {loading ? (
        <div
          className="kiosk-card"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <p style={{ fontSize: 20, color: "#6b7280" }}>
            Wird geladen...
          </p>
        </div>
      ) : error || posts.length === 0 ? (
        <div
          className="kiosk-card"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <p style={{ fontSize: 20, color: "#6b7280" }}>
            Keine Einträge vorhanden
          </p>
        </div>
      ) : (
        <div
          className="kiosk-scroll"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {posts.map((post) => (
            <div key={post.id} className="kiosk-card">
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {post.title}
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: "#4b5563",
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                {truncate(post.content)}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                {post.author && <span>✍️ {post.author}</span>}
                {post.created_at && <span>{formatDate(post.created_at)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
