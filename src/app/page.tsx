"use client";

import { useState, useEffect, useCallback } from "react";

const GAME_DURATION_SEC = 30;

export default function Game() {
  const [score, setScore] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  // Target size: shrink as score increases (min 20px, start 40px)
  const targetSize = Math.max(20, 40 - Math.floor(score / 3) * 4);

  const moveTarget = useCallback(() => {
    const x = Math.random() * 80;
    const y = Math.random() * 80;
    setPosition({ x, y });
  }, []);

  function handleClick() {
    if (gameOver) return;
    if (!gameStarted) setGameStarted(true);
    setScore((s) => s + 1);
    moveTarget();
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

  function restart() {
    setScore(0);
    setTimeLeft(GAME_DURATION_SEC);
    setGameOver(false);
    setGameStarted(false);
    moveTarget();
  }

  return (
    <main style={{ textAlign: "center", marginTop: "40px" }}>
      <h1>🎯 Click the Target Game</h1>
      <h2>Score: {score}</h2>
      {!gameOver && (
        <h3 style={{ color: gameStarted ? "#333" : "#888" }}>
          Time: {timeLeft}s
        </h3>
      )}
      {gameOver && (
        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "1.25rem", marginBottom: "8px" }}>
            Game over! Final score: <strong>{score}</strong>
          </p>
          <button
            type="button"
            onClick={restart}
            style={{
              padding: "10px 20px",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "#333",
              color: "white",
              border: "none",
              borderRadius: "8px",
            }}
          >
            Play again
          </button>
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: "500px",
          height: "400px",
          border: "2px solid black",
          margin: "auto",
          pointerEvents: gameOver ? "none" : "auto",
          opacity: gameOver ? 0.7 : 1,
        }}
      >
        {!gameOver && (
          <div
            onClick={handleClick}
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
          : "Click the red square as fast as you can!"}
      </p>
    </main>
  );
}
