"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const GAME_DURATION_SEC = 30;
const MISS_PENALTY = 1;
const SENSITIVITY_KEY = "click-target-sensitivity";

function getSensitivity(): number {
  if (typeof window === "undefined") return 1;
  const s = localStorage.getItem(SENSITIVITY_KEY);
  const n = parseFloat(s ?? "1");
  return Number.isFinite(n) && n >= 0.5 && n <= 2 ? n : 1;
}

type ScoreEntry = { name: string; score: number };

async function fetchScores(): Promise<ScoreEntry[]> {
  const res = await fetch("/api/scores");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function submitScore(
  playerName: string,
  score: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, score }),
    });
    const data = res.ok ? null : await res.json().catch(() => ({}));
    return res.ok
      ? { ok: true }
      : { ok: false, error: (data as { error?: string })?.error || res.statusText || "Failed to save score" };
  } catch (e) {
    return { ok: false, error: "Network error" };
  }
}

function playClickSound() {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.08);
  } catch {
    // ignore if audio not supported or blocked
  }
}

export default function Game() {
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Target size: shrink as score increases (min 20px, start 40px)
  const targetSize = Math.max(20, 40 - Math.floor(score / 3) * 4);

  const moveTarget = useCallback(() => {
    const sens = getSensitivity();
    const range = Math.min(80, 80 * sens);
    const x = Math.random() * range;
    const y = Math.random() * range;
    setPosition({ x, y });
  }, []);

  function handleHit(e: React.MouseEvent) {
    e.stopPropagation();
    if (gameOver) return;
    if (!gameStarted) setGameStarted(true);
    playClickSound();
    setScore((s) => s + 1);
    moveTarget();
  }

  function handleMiss() {
    if (gameOver || !gameStarted) return;
    setScore((s) => Math.max(0, s - MISS_PENALTY));
  }

  // Initial random position
  useEffect(() => {
    moveTarget();
  }, [moveTarget]);

  // Timer: count down when game has started
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    if (timeLeft <= 0) {
      setGameOver(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [gameStarted, gameOver, timeLeft]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const entries = await fetchScores();
    setLeaderboard(entries);
    setLeaderboardLoading(false);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  async function handleSubmitScore() {
    const name = playerName.trim() || "Player";
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitScore(name, score);
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
      loadLeaderboard();
    } else {
      setSubmitError(result.error || "Failed to save score");
    }
  }

  function restart() {
    setScore(0);
    setTimeLeft(GAME_DURATION_SEC);
    setGameOver(false);
    setGameStarted(false);
    setSubmitted(false);
    setSubmitError(null);
    moveTarget();
  }

  return (
    <main style={{ textAlign: "center", marginTop: "40px", color: "var(--text)" }}>
      <div style={{ marginBottom: "12px" }}>
        <Link
          href="/settings"
          style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}
        >
          Settings
        </Link>
      </div>
      <h1>🎯 Click the Target Game</h1>
      <h2>Score: {score}</h2>
      {!gameOver && (
        <h3 style={{ color: gameStarted ? "var(--text)" : "var(--text-muted)" }}>
          Time: {timeLeft}s
        </h3>
      )}
      {gameOver && (
        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
            Game over! Final score: <strong>{score}</strong>
          </p>
          {!submitted ? (
            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={30}
                style={{
                  padding: "8px 12px",
                  fontSize: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  width: "160px",
                  background: "var(--bg-elevated)",
                  color: "var(--text)",
                }}
              />
              <button
                type="button"
                onClick={handleSubmitScore}
                disabled={submitting}
                style={{
                  padding: "8px 16px",
                  fontSize: "1rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  backgroundColor: "var(--accent)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: "6px",
                }}
              >
                {submitting ? "Submitting…" : "Submit to scoreboard"}
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--success)", marginBottom: "8px" }}>Score submitted!</p>
          )}
          {submitError && (
            <p style={{ color: "var(--error)", marginBottom: "8px" }}>{submitError}</p>
          )}
          <button
            type="button"
            onClick={restart}
            style={{
              padding: "10px 20px",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: "8px",
            }}
          >
            Play again
          </button>
        </div>
      )}

      <div
        onClick={handleMiss}
        style={{
          position: "relative",
          width: "1000px",
          height: "800px",
          border: "2px solid var(--game-border)",
          margin: "auto",
          pointerEvents: gameOver ? "none" : "auto",
          opacity: gameOver ? 0.7 : 1,
          cursor: gameStarted && !gameOver ? "crosshair" : "default",
        }}
      >
        {!gameOver && (
          <div
            onClick={handleHit}
            style={{
              position: "absolute",
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${targetSize}px`,
              height: `${targetSize}px`,
              backgroundColor: "red",
              cursor: "pointer",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          />
        )}
      </div>

      <p style={{ marginTop: "16px" }}>
        {gameOver
          ? "Click « Play again » to restart."
          : "Click the red square! Misses cost 1 point."}
      </p>

      <section style={{ marginTop: "32px", maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
        <h3 style={{ marginBottom: "8px" }}>🏆 Global scoreboard</h3>
        {leaderboardLoading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : leaderboard.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No scores yet. Be the first!</p>
        ) : (
          <ol style={{ textAlign: "left", paddingLeft: "24px" }}>
            {leaderboard.map((entry, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                <strong>{entry.name}</strong> — {entry.score}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
