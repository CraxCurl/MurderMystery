import { NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import GameConfig from "@/models/GameConfig";

export async function GET() {
  try {
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
      return NextResponse.json({
        success: true,
        config: {
          configKey: config.configKey,
          caseId: config.caseId,
          timerDurationMinutes: config.timerDurationMinutes,
          timerStartTime: config.timerStartTime,
          timerPausedTimeLeftSeconds: config.timerPausedTimeLeftSeconds,
          isTimerRunning: config.isTimerRunning,
          isGameEnded: config.isGameEnded,
          answerKeyRevealed: config.answerKeyRevealed,
          roundName: config.roundName,
          serverTime: new Date().toISOString(),
        },
      });
    }

    // Fallback to memory store
    const memory = getInMemoryStore();
    return NextResponse.json({
      success: true,
      config: {
        ...memory.config,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch game config." },
      { status: 500 }
    );
  }
}
