import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import GameConfig from "@/models/GameConfig";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const body = await request.json();
    const { action, durationMinutes, adjustSeconds, roundName } = body;

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      let config = await GameConfig.findOne({ configKey: "global" });
      if (!config) {
        config = await GameConfig.create({
          configKey: "global",
          caseId: "ghost-in-the-model",
          timerDurationMinutes: 15,
          timerStartTime: new Date(),
          isTimerRunning: true,
          isGameEnded: false,
          answerKeyRevealed: false,
          roundName: "Round 1 - NeuraCore AI Cleanroom",
        });
      }

      const now = new Date();

      if (action === "start") {
        if (!config.isTimerRunning) {
          if (config.timerPausedTimeLeftSeconds !== null) {
            // Resume from paused time left
            const elapsedAllowed = (config.timerDurationMinutes * 60) - config.timerPausedTimeLeftSeconds;
            config.timerStartTime = new Date(now.getTime() - elapsedAllowed * 1000);
            config.timerPausedTimeLeftSeconds = null;
          } else {
            config.timerStartTime = now;
          }
          config.isTimerRunning = true;
        }
      } else if (action === "pause") {
        if (config.isTimerRunning && config.timerStartTime) {
          const elapsedSeconds = Math.floor((now.getTime() - new Date(config.timerStartTime).getTime()) / 1000);
          const totalSeconds = config.timerDurationMinutes * 60;
          config.timerPausedTimeLeftSeconds = Math.max(0, totalSeconds - elapsedSeconds);
          config.isTimerRunning = false;
        }
      } else if (action === "reset") {
        config.timerStartTime = now;
        config.timerPausedTimeLeftSeconds = null;
        config.isTimerRunning = true;
        config.isGameEnded = false;
        config.answerKeyRevealed = false;
      } else if (action === "adjust_time") {
        // Adjust start time backwards (add time) or forwards (reduce time)
        const secondsToAdd = Number(adjustSeconds) || 0;
        if (config.timerStartTime) {
          config.timerStartTime = new Date(new Date(config.timerStartTime).getTime() + secondsToAdd * 1000);
        }
      } else if (action === "set_duration") {
        const newMinutes = Number(durationMinutes) || 15;
        config.timerDurationMinutes = newMinutes;
        config.timerStartTime = now;
        config.timerPausedTimeLeftSeconds = null;
      } else if (action === "toggle_reveal") {
        config.answerKeyRevealed = !config.answerKeyRevealed;
      } else if (action === "toggle_game_end") {
        config.isGameEnded = !config.isGameEnded;
        config.isTimerRunning = !config.isGameEnded;
      } else if (action === "update_round_name") {
        config.roundName = roundName || config.roundName;
      }

      await config.save();

      return NextResponse.json({ success: true, config });
    }

    // Fallback in-memory
    const memory = getInMemoryStore();
    const cfg = memory.config;
    const nowISO = new Date().toISOString();
    const nowMs = Date.now();

    if (action === "start") {
      if (!cfg.isTimerRunning) {
        if (cfg.timerPausedTimeLeftSeconds !== null) {
          const elapsedAllowed = (cfg.timerDurationMinutes * 60) - cfg.timerPausedTimeLeftSeconds;
          cfg.timerStartTime = new Date(nowMs - elapsedAllowed * 1000).toISOString();
          cfg.timerPausedTimeLeftSeconds = null;
        } else {
          cfg.timerStartTime = nowISO;
        }
        cfg.isTimerRunning = true;
      }
    } else if (action === "pause") {
      if (cfg.isTimerRunning && cfg.timerStartTime) {
        const startMs = new Date(cfg.timerStartTime).getTime();
        const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
        const totalSeconds = cfg.timerDurationMinutes * 60;
        cfg.timerPausedTimeLeftSeconds = Math.max(0, totalSeconds - elapsedSeconds);
        cfg.isTimerRunning = false;
      }
    } else if (action === "reset") {
      cfg.timerStartTime = nowISO;
      cfg.timerPausedTimeLeftSeconds = null;
      cfg.isTimerRunning = true;
      cfg.isGameEnded = false;
      cfg.answerKeyRevealed = false;
    } else if (action === "adjust_time") {
      const secondsToAdd = Number(adjustSeconds) || 0;
      if (cfg.timerStartTime) {
        const startMs = new Date(cfg.timerStartTime).getTime();
        cfg.timerStartTime = new Date(startMs + secondsToAdd * 1000).toISOString();
      }
    } else if (action === "set_duration") {
      const newMinutes = Number(durationMinutes) || 15;
      cfg.timerDurationMinutes = newMinutes;
      cfg.timerStartTime = nowISO;
      cfg.timerPausedTimeLeftSeconds = null;
    } else if (action === "toggle_reveal") {
      cfg.answerKeyRevealed = !cfg.answerKeyRevealed;
    } else if (action === "toggle_game_end") {
      cfg.isGameEnded = !cfg.isGameEnded;
      cfg.isTimerRunning = !cfg.isGameEnded;
    } else if (action === "update_round_name") {
      cfg.roundName = roundName || cfg.roundName;
    }

    return NextResponse.json({ success: true, config: cfg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update admin config." }, { status: 500 });
  }
}
