"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const GAME_DURATION_SEC = 30;
const MISS_PENALTY = 1;
const SENSITIVITY_KEY = "click-target-sensitivity";
const MIN_SENSITIVITY = 0.5;
const MAX_SENSITIVITY = 2;
const DEFAULT_SENSITIVITY = 1;
const MIN_TARGET_RANGE = 55;
const MAX_TARGET_RANGE = 95;

function getSensitivity(): number {
  if (typeof window === "undefined") return DEFAULT_SENSITIVITY;
  const s = localStorage.getItem(SENSITIVITY_KEY);
  const n = parseFloat(s ?? String(DEFAULT_SENSITIVITY));
  return Number.isFinite(n) && n >= MIN_SENSITIVITY && n <= MAX_SENSITIVITY
    ? n
    : DEFAULT_SENSITIVITY;
}

function getMoveRange(sensitivity: number): number {
  const t = (sensitivity - MIN_SENSITIVITY) / (MAX_SENSITIVITY - MIN_SENSITIVITY);
  const clamped = Math.min(1, Math.max(0, t));
  const eased = Math.sqrt(clamped);
  return MIN_TARGET_RANGE + eased * (MAX_TARGET_RANGE - MIN_TARGET_RANGE);
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

const GAME_AREA_WIDTH = 1200;
const GAME_AREA_HEIGHT = 960;

type TargetType = { size: number; color: string; points: number; label: string; respawnMs: number };

const TARGET_TYPES: TargetType[] = [
  { size: 44, color: "#22c55e", points: 1, label: "Large", respawnMs: 600 },
  { size: 32, color: "#eab308", points: 2, label: "Medium", respawnMs: 1200 },
  { size: 24, color: "#f97316", points: 3, label: "Small", respawnMs: 2000 },
  { size: 18, color: "#ef4444", points: 4, label: "Tiny", respawnMs: 2800 },
];

type ActiveTarget = { id: string; x: number; y: number; type: TargetType };

const POSITION_RANGE = 82;
const OVERLAP_MAX_ATTEMPTS = 80;

function rectOverlaps(
  x1: number,
  y1: number,
  size1: number,
  x2: number,
  y2: number,
  size2: number
): boolean {
  const left1 = (x1 / 100) * GAME_AREA_WIDTH;
  const top1 = (y1 / 100) * GAME_AREA_HEIGHT;
  const right1 = left1 + size1;
  const bottom1 = top1 + size1;
  const left2 = (x2 / 100) * GAME_AREA_WIDTH;
  const top2 = (y2 / 100) * GAME_AREA_HEIGHT;
  const right2 = left2 + size2;
  const bottom2 = top2 + size2;
  return left1 < right2 && right1 > left2 && top1 < bottom2 && bottom1 > top2;
}

function getRandomNonOverlappingPosition(
  existing: { x: number; y: number; type: TargetType }[],
  size: number
): { x: number; y: number } {
  for (let attempt = 0; attempt < OVERLAP_MAX_ATTEMPTS; attempt++) {
    const x = Math.random() * POSITION_RANGE;
    const y = Math.random() * POSITION_RANGE;
    const overlaps = existing.some((t) => rectOverlaps(x, y, size, t.x, t.y, t.type.size));
    if (!overlaps) return { x, y };
  }
  return { x: Math.random() * POSITION_RANGE, y: Math.random() * POSITION_RANGE };
}

const INITIAL_TARGETS_PER_TYPE = 2;

export default function Game() {
  const [score, setScore] = useState(0);
  const [activeTargets, setActiveTargets] = useState<ActiveTarget[]>([]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [lockedCrosshairPos, setLockedCrosshairPos] = useState({ x: GAME_AREA_WIDTH / 2, y: GAME_AREA_HEIGHT / 2 });
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const respawnTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const sens = getSensitivity();
  const centerX = GAME_AREA_WIDTH / 2;
  const centerY = GAME_AREA_HEIGHT / 2;

  const crosshairPos =
    gameStarted && !gameOver
      ? isPointerLocked
        ? lockedCrosshairPos
        : mousePos
          ? {
              x: Math.max(0, Math.min(GAME_AREA_WIDTH, centerX + (mousePos.x - centerX) * sens)),
              y: Math.max(0, Math.min(GAME_AREA_HEIGHT, centerY + (mousePos.y - centerY) * sens)),
            }
          : null
      : null;

  const spawnTarget = useCallback((type: TargetType) => {
    setActiveTargets((prev) => {
      const { x, y } = getRandomNonOverlappingPosition(prev, type.size);
      idRef.current += 1;
      return [...prev, { id: String(idRef.current), x, y, type }];
    });
  }, []);

  const spawnInitialTargets = useCallback(() => {
    const initial: ActiveTarget[] = [];
    TARGET_TYPES.forEach((type) => {
      for (let i = 0; i < INITIAL_TARGETS_PER_TYPE; i++) {
        const { x, y } = getRandomNonOverlappingPosition(initial, type.size);
        idRef.current += 1;
        initial.push({ id: String(idRef.current), x, y, type });
      }
    });
    setActiveTargets(initial);
  }, []);

  function doHit(target: ActiveTarget) {
    if (gameOver) return;
    playClickSound();
    setScore((s) => s + target.type.points);
    setActiveTargets((prev) => prev.filter((t) => t.id !== target.id));
    const t = setTimeout(() => spawnTarget(target.type), target.type.respawnMs);
    respawnTimeoutsRef.current.push(t);
  }

  function handleHit(e: React.MouseEvent, target: ActiveTarget) {
    e.stopPropagation();
    if (gameOver) return;
    if (!gameStarted) {
      setGameStarted(true);
      gameAreaRef.current?.requestPointerLock();
    }
    doHit(target);
  }

  function handleMiss() {
    if (gameOver || !gameStarted) return;
    setScore((s) => Math.max(0, s - MISS_PENALTY));
  }

  function findTargetAtCrosshair(): ActiveTarget | null {
    for (let i = activeTargets.length - 1; i >= 0; i--) {
      const t = activeTargets[i];
      const left = (t.x / 100) * GAME_AREA_WIDTH;
      const top = (t.y / 100) * GAME_AREA_HEIGHT;
      const size = t.type.size;
      if (
        lockedCrosshairPos.x >= left &&
        lockedCrosshairPos.x <= left + size &&
        lockedCrosshairPos.y >= top &&
        lockedCrosshairPos.y <= top + size
      )
        return t;
    }
    return null;
  }

  function handleGameAreaClick(e: React.MouseEvent<HTMLDivElement>) {
    if (gameOver || !gameStarted) return;
    if (isPointerLocked) {
      const hit = findTargetAtCrosshair();
      if (hit) doHit(hit);
      else handleMiss();
      return;
    }
    handleMiss();
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (document.pointerLockElement === e.currentTarget) {
      setLockedCrosshairPos((prev) => ({
        x: Math.max(0, Math.min(GAME_AREA_WIDTH, prev.x + e.movementX * sens)),
        y: Math.max(0, Math.min(GAME_AREA_HEIGHT, prev.y + e.movementY * sens)),
      }));
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }

  function handleMouseLeave() {
    if (!document.pointerLockElement) setMousePos(null);
  }

  // Listen for pointer lock change
  useEffect(() => {
    function onPointerLockChange() {
      const locked = document.pointerLockElement === gameAreaRef.current;
      setIsPointerLocked(locked);
      if (locked) {
        setLockedCrosshairPos({ x: centerX, y: centerY });
      }
    }
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [centerX, centerY]);

  // Exit pointer lock when game ends
  useEffect(() => {
    if (gameOver && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [gameOver]);

  // Initial targets on mount
  useEffect(() => {
    spawnInitialTargets();
  }, [spawnInitialTargets]);

  // Clear respawn timeouts on unmount or game over
  useEffect(() => {
    return () => {
      respawnTimeoutsRef.current.forEach(clearTimeout);
      respawnTimeoutsRef.current = [];
    };
  }, [gameOver]);

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
    if (document.pointerLockElement) document.exitPointerLock();
    respawnTimeoutsRef.current.forEach(clearTimeout);
    respawnTimeoutsRef.current = [];
    setScore(0);
    setTimeLeft(GAME_DURATION_SEC);
    setGameOver(false);
    setGameStarted(false);
    setSubmitted(false);
    setSubmitError(null);
    spawnInitialTargets();
  }

  const cardStyle: React.CSSProperties = {
    padding: "24px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-card)",
    textAlign: "left",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#fff",
    background: "var(--accent)",
    border: "none",
    borderRadius: "var(--radius-md)",
  };

  return (
    <main style={{ minHeight: "100vh", padding: "24px 16px", color: "var(--text)" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          maxWidth: "1400px",
          margin: "0 auto 24px",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            🎯 Aim Game 
          </h1>
          <Link
            href="/settings"
            style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}
          >
            Settings
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              padding: "8px 16px",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            {score} pts
          </div>
          {!gameOver && (
            <div
              style={{
                padding: "8px 16px",
                background: gameStarted ? "var(--bg-elevated)" : "var(--bg-game)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: gameStarted ? "var(--text)" : "var(--text-muted)",
              }}
            >
              ⏱ {timeLeft}s
            </div>
          )}
        </div>
      </header>

      {gameOver && (
        <div
          style={{
            maxWidth: "400px",
            margin: "0 auto 24px",
            ...cardStyle,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--text-muted)" }}>
            Game over
          </p>
          <p style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "20px" }}>
            {score} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>points</span>
          </p>
          {!submitted ? (
            <>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={30}
                  style={{
                    padding: "10px 14px",
                    fontSize: "1rem",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    width: "160px",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
                <button type="button" onClick={handleSubmitScore} disabled={submitting} style={btnPrimary}>
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
              {submitError && (
                <p style={{ color: "var(--error)", fontSize: "0.9rem", marginBottom: "12px" }}>{submitError}</p>
              )}
            </>
          ) : (
            <p style={{ color: "var(--success)", fontWeight: 600, marginBottom: "16px" }}>✓ Score submitted!</p>
          )}
          <button type="button" onClick={restart} style={btnPrimary}>
            Play again
          </button>
        </div>
      )}

      <div style={{ display: "flex", width: "100%", alignItems: "flex-start", gap: "24px" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "24px",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <section style={{ minWidth: "200px", maxWidth: "220px", ...cardStyle }}>
            <h2 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Leaderboard
            </h2>
            {leaderboardLoading ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading…</p>
            ) : leaderboard.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No scores yet.</p>
            ) : (
              <ol style={{ paddingLeft: "20px", margin: 0, fontSize: "0.95rem" }}>
                {leaderboard.map((entry, i) => (
                  <li key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontWeight: 500 }}>{entry.name}</span>
                    <span style={{ fontWeight: 600, color: "var(--accent)" }}>{entry.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "24px", flex: "0 0 auto" }}>
            <div
              ref={gameAreaRef}
              onClick={handleGameAreaClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                position: "relative",
                width: `${GAME_AREA_WIDTH}px`,
                height: `${GAME_AREA_HEIGHT}px`,
                background: "var(--bg-game)",
                border: "2px solid var(--game-border)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-game)",
                pointerEvents: gameOver ? "none" : "auto",
                opacity: gameOver ? 0.6 : 1,
                cursor: gameStarted && !gameOver ? "none" : "default",
              }}
            >
            {crosshairPos && (
              <div
                style={{
                  position: "absolute",
                  left: crosshairPos.x - 12,
                  top: crosshairPos.y - 12,
                  width: "24px",
                  height: "24px",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: "24px",
                    height: "3px",
                    marginLeft: "-12px",
                    marginTop: "-1.5px",
                    background: "var(--text)",
                    boxShadow: "0 0 0 1px var(--bg-elevated)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: "3px",
                    height: "24px",
                    marginLeft: "-1.5px",
                    marginTop: "-12px",
                    background: "var(--text)",
                    boxShadow: "0 0 0 1px var(--bg-elevated)",
                  }}
                />
              </div>
            )}
              {!gameOver &&
                activeTargets.map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => handleHit(e, t)}
                    style={{
                      position: "absolute",
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      width: `${t.type.size}px`,
                      height: `${t.type.size}px`,
                      backgroundColor: t.type.color,
                      cursor: "pointer",
                      borderRadius: "var(--radius-sm)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                    }}
                  />
                ))}
            </div>

            <aside style={{ flexShrink: 0, width: "200px", ...cardStyle }}>
              <h2 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Targets
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {TARGET_TYPES.map((t) => (
                  <li
                    key={t.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "14px",
                      fontSize: "0.9rem",
                      color: "var(--text)",
                    }}
                  >
                    <span
                      style={{
                        width: `${Math.min(t.size, 26)}px`,
                        height: `${Math.min(t.size, 26)}px`,
                        minWidth: "20px",
                        minHeight: "20px",
                        backgroundColor: t.color,
                        borderRadius: "var(--radius-sm)",
                        flexShrink: 0,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                    <span>
                      <strong>{t.label}</strong> — {t.points} pt{t.points !== 1 ? "s" : ""}
                      <span style={{ fontSize: "0.8em", color: "var(--text-muted)", display: "block" }}>
                        respawns {t.respawnMs / 1000}s
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>

      <p style={{ marginTop: "24px", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "560px", marginLeft: "auto", marginRight: "auto" }}>
        {gameOver
          ? "Click Play again to start a new round."
          : "Click any target to start. Smaller targets = more points. Misses cost 1 point. Press Esc to unlock cursor."}
      </p>
    </main>
  );
}
