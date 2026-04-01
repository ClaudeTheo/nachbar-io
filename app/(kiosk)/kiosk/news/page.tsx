'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface NewsItem {
  title: string;
  description: string;
  pubDate: string;
  link: string;
  source: string;
}

/** Relative Zeitangabe auf Deutsch */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  return `vor ${diffD} Tag${diffD > 1 ? 'en' : ''}`;
}

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 Minuten

export default function KioskNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch('/api/quartier-info/news');
      if (!res.ok) throw new Error('Fetch fehlgeschlagen');
      const data = await res.json();
      // API gibt Array zurück
      setNews(Array.isArray(data) ? data : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div style={{ padding: '20px 28px' }}>
      <Link href="/kiosk" className="kiosk-back" style={{ marginBottom: '20px' }}>
        ← Zurück
      </Link>

      <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '20px 0 24px' }}>
        📰 Nachrichten
      </h1>

      {loading && (
        <div className="kiosk-card" style={{ textAlign: 'center', padding: '40px 24px', fontSize: '20px' }}>
          Lade Nachrichten...
        </div>
      )}

      {error && !loading && (
        <div className="kiosk-card" style={{ textAlign: 'center', padding: '40px 24px', fontSize: '20px' }}>
          Nachrichten konnten nicht geladen werden.
        </div>
      )}

      {!loading && !error && (
        <div
          className="kiosk-scroll"
          style={{
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 160px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingBottom: '80px',
          }}
        >
          {news.length === 0 && (
            <div className="kiosk-card" style={{ textAlign: 'center', padding: '40px 24px', fontSize: '20px' }}>
              Keine Nachrichten verfügbar.
            </div>
          )}

          {news.map((item, i) => (
            <div key={`${item.link}-${i}`} className="kiosk-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>
                {item.title}
              </div>
              {item.description && (
                <div style={{ fontSize: '18px', color: '#4b5563', marginBottom: '10px', lineHeight: 1.5 }}>
                  {item.description}
                </div>
              )}
              <div style={{ fontSize: '16px', color: '#6b7280' }}>
                {item.source} · {relativeTime(item.pubDate)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
