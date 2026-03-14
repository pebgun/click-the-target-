import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const SCOREBOARD_KEY = "click_target_scores";
const TOP_N = 10;

function getRedis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN");
  return new Redis({ url, token });
}

export type ScoreEntry = {
  name: string;
  score: number;
  id?: number;
};

export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.zrange(SCOREBOARD_KEY, 0, TOP_N - 1, {
      rev: true,
    });
    const entries = (raw || [])
      .map((member): ScoreEntry | null => {
        try {
          const parsed = typeof member === "string" ? JSON.parse(member) : member;
          if (parsed && typeof parsed.score === "number" && typeof parsed.name === "string")
            return { name: parsed.name, score: parsed.score };
          return null;
        } catch {
          return null;
        }
      })
      .filter((e): e is ScoreEntry => e !== null)
      .slice(0, TOP_N);
    return NextResponse.json(entries);
  } catch (err) {
    console.error("Scoreboard GET error:", err);
    return NextResponse.json([] as ScoreEntry[]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.playerName === "string" ? body.playerName.trim().slice(0, 30) : "Player";
    const score = typeof body?.score === "number" && body.score >= 0 ? Math.floor(body.score) : 0;
    if (score === 0) return NextResponse.json({ ok: true });

    const member = JSON.stringify({
      name: name || "Player",
      score,
      id: Date.now() + Math.random(),
    } satisfies ScoreEntry & { id: number });

    const redis = getRedis();
    await redis.zadd(SCOREBOARD_KEY, { score, member });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Scoreboard POST error:", err);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 503 });
  }
}
