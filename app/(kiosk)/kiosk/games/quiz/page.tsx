"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";

interface Question {
  q: string;
  options: string[];
  answer: number;
}

const ALL_QUESTIONS: Question[] = [
  { q: "Wie heißt die Hauptstadt von Deutschland?", options: ["München", "Berlin", "Hamburg", "Köln"], answer: 1 },
  { q: "Welcher Fluss fließt durch Bad Säckingen?", options: ["Rhein", "Donau", "Elbe", "Hochrhein"], answer: 3 },
  { q: "Wie viele Bundesländer hat Deutschland?", options: ["14", "15", "16", "17"], answer: 2 },
  { q: "Wer komponierte die 9. Sinfonie?", options: ["Mozart", "Bach", "Beethoven", "Haydn"], answer: 2 },
  { q: "Welche Farbe hat ein Feuerwehrauto?", options: ["Blau", "Grün", "Rot", "Gelb"], answer: 2 },
  { q: "In welchem Land steht der Eiffelturm?", options: ["England", "Spanien", "Italien", "Frankreich"], answer: 3 },
  { q: "Wie viele Tage hat der Februar normalerweise?", options: ["27", "28", "29", "30"], answer: 1 },
  { q: "Welches Tier macht 'Muh'?", options: ["Schaf", "Kuh", "Schwein", "Ziege"], answer: 1 },
  { q: "Was ist die Vorwahl von Deutschland?", options: ["+43", "+41", "+49", "+44"], answer: 2 },
  { q: "Welcher Planet ist der Erde am nächsten?", options: ["Mars", "Venus", "Jupiter", "Merkur"], answer: 1 },
];

const QUESTIONS_PER_GAME = 5;
const subscribeToDayChange = () => () => {};
let cachedQuestionDay = "";
let cachedQuestions = ALL_QUESTIONS.slice(0, QUESTIONS_PER_GAME);

function getQuestionCacheKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

/** Tagesbasierte Auswahl: 5 Fragen basierend auf dem Tag des Jahres */
function getDailyQuestions(): Question[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const offset = dayOfYear % ALL_QUESTIONS.length;
  const selected: Question[] = [];
  for (let i = 0; i < QUESTIONS_PER_GAME; i++) {
    selected.push(ALL_QUESTIONS[(offset + i) % ALL_QUESTIONS.length]);
  }
  return selected;
}

function getCachedDailyQuestions(): Question[] {
  const cacheKey = getQuestionCacheKey();
  if (cacheKey !== cachedQuestionDay) {
    cachedQuestionDay = cacheKey;
    cachedQuestions = getDailyQuestions();
  }
  return cachedQuestions;
}

/** Tagesquiz: 5 Fragen pro Tag, eine nach der anderen */
export default function QuizGamePage() {
  const questions = useSyncExternalStore(
    subscribeToDayChange,
    getCachedDailyQuestions,
    getCachedDailyQuestions,
  );
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const question = questions[current] ?? questions[0];
  const isCorrect = selected === question?.answer;

  const handleAnswer = useCallback(
    (index: number) => {
      if (locked) return;
      setSelected(index);
      setLocked(true);

      const correct = index === question.answer;
      if (correct) setScore((s) => s + 1);

      const delay = correct ? 1500 : 2000;
      setTimeout(() => {
        if (current + 1 >= QUESTIONS_PER_GAME) {
          setFinished(true);
        } else {
          setCurrent((c) => c + 1);
          setSelected(null);
          setLocked(false);
        }
      }, delay);
    },
    [locked, question, current]
  );

  const resetGame = useCallback(() => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setLocked(false);
    setFinished(false);
  }, []);

  const getButtonStyle = (index: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      minHeight: 64,
      fontSize: 20,
      fontWeight: 500,
      textAlign: "left" as const,
      padding: "16px 24px",
      cursor: locked ? "default" : "pointer",
      border: "1px solid #e8ede3",
      borderRadius: 16,
      color: "#2d3142",
      background: "white",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      transition: "background 0.2s, border-color 0.2s",
    };

    if (selected === null) return base;

    if (index === question.answer) {
      return {
        ...base,
        background: "rgba(76,175,135,0.2)",
        borderColor: "#4caf87",
      };
    }
    if (index === selected && !isCorrect) {
      return {
        ...base,
        background: "rgba(239,68,68,0.2)",
        borderColor: "#ef4444",
      };
    }
    return { ...base, opacity: 0.5 };
  };

  return (
    <div style={{ padding: "20px 28px" }}>
      <Link href="/kiosk/games" className="kiosk-back">
        &larr; Zurück
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "24px 0 20px" }}>
        ❓ Tagesquiz
      </h1>

      {finished ? (
        <div
          className="kiosk-card"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            {score >= 4 ? "🎉" : score >= 2 ? "👍" : "💪"} {score} von{" "}
            {QUESTIONS_PER_GAME} richtig!
          </p>
          <p
            style={{
              fontSize: 18,
              color: "#6b7280",
              marginBottom: 24,
            }}
          >
            {score === QUESTIONS_PER_GAME
              ? "Perfekt — alle richtig!"
              : score >= 4
                ? "Sehr gut!"
                : score >= 2
                  ? "Gut gemacht!"
                  : "Morgen klappt es bestimmt besser!"}
          </p>
          <button
            onClick={resetGame}
            className="kiosk-chip"
            style={{ fontSize: 20, padding: "16px 32px", minHeight: 80 }}
          >
            Nochmal spielen
          </button>
        </div>
      ) : (
        <>
          {/* Fortschritt */}
          <p
            style={{
              fontSize: 16,
              color: "#6b7280",
              marginBottom: 16,
            }}
          >
            Frage {current + 1} von {QUESTIONS_PER_GAME}
          </p>

          {/* Frage */}
          <div className="kiosk-card" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 24, fontWeight: 600 }}>{question.q}</p>
          </div>

          {/* Antworten */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                style={getButtonStyle(i)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
