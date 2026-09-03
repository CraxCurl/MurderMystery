import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import GameConfig from "@/models/GameConfig";
import Submission from "@/models/Submission";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const body = await request.json();
    const { action, durationMinutes, roundName, teamName, adjustSeconds } = body;

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      let config = await GameConfig.findOne({ configKey: "global" });
      if (!config) {
        config = await GameConfig.create({
          configKey: "global",
          caseId: "ghost-in-the-model",
          timerDurationMinutes: 15,
          roundStatus: "waiting",
          roundStartedAt: null,
          answerKeyRevealed: false,
          roundName: "Round 1 - NeuraCore AI Cleanroom",
        });
      }

      const now = new Date();

      if (action === "start_round") {
        config.roundStatus = "active";
        config.roundStartedAt = now;
        config.answerKeyRevealed = false;
        await Submission.updateMany({ teamStatus: "waiting" }, { $set: { teamStatus: "active" } });

      } else if (action === "end_round") {
        config.roundStatus = "ended";
        config.answerKeyRevealed = true; // Auto-reveal answers on round end
        await Submission.updateMany(
          { teamStatus: { $in: ["waiting", "active"] } },
          { $set: { teamStatus: "ended" } }
        );

      } else if (action === "reset_round") {
        config.roundStatus = "waiting";
        config.roundStartedAt = null;
        config.answerKeyRevealed = false;
        await Submission.deleteMany({});

      } else if (action === "adjust_time") {
        const secs = Number(adjustSeconds) || 0;
        if (config.roundStartedAt) {
          const currentMs = new Date(config.roundStartedAt).getTime();
          config.roundStartedAt = new Date(currentMs + secs * 1000);
        }

      } else if (action === "set_duration") {
        const newMinutes = Number(durationMinutes) || 15;
        config.timerDurationMinutes = newMinutes;

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

    if (action === "start_round") {
      cfg.roundStatus = "active";
      cfg.roundStartedAt = nowISO;
      cfg.answerKeyRevealed = false;
      memory.submissions.forEach((sub: any) => {
        if (sub.teamStatus === "waiting") sub.teamStatus = "active";
      });

    } else if (action === "end_round") {
      cfg.roundStatus = "ended";
      cfg.answerKeyRevealed = true; // Auto-reveal answers on round end
      memory.submissions.forEach((sub: any) => {
        if (sub.teamStatus === "waiting" || sub.teamStatus === "active") sub.teamStatus = "ended";
      });

    } else if (action === "reset_round") {
      cfg.roundStatus = "waiting";
      cfg.roundStartedAt = null;
      cfg.answerKeyRevealed = false;
      memory.submissions.clear();

    } else if (action === "adjust_time") {
      const secs = Number(adjustSeconds) || 0;
      if (cfg.roundStartedAt) {
        const currentMs = new Date(cfg.roundStartedAt).getTime();
        cfg.roundStartedAt = new Date(currentMs + secs * 1000).toISOString();
      }

    } else if (action === "set_duration") {
      cfg.timerDurationMinutes = Number(durationMinutes) || 15;

    } else if (action === "update_round_name") {
      cfg.roundName = roundName || cfg.roundName;
    }

    return NextResponse.json({ success: true, config: cfg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update admin config." }, { status: 500 });
  }
}
