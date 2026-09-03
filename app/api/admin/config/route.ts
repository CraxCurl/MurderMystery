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
    const { action, durationMinutes, roundName, teamName } = body;

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
        // Start the round: set all waiting teams to active
        config.roundStatus = "active";
        config.roundStartedAt = now;
        await Submission.updateMany({ teamStatus: "waiting" }, { $set: { teamStatus: "active" } });

      } else if (action === "end_round") {
        // End all active teams
        config.roundStatus = "ended";
        await Submission.updateMany(
          { teamStatus: { $in: ["waiting", "active"] } },
          { $set: { teamStatus: "ended" } }
        );

      } else if (action === "reset_round") {
        // Wipe all submissions and reset to waiting
        config.roundStatus = "waiting";
        config.roundStartedAt = null;
        config.answerKeyRevealed = false;
        await Submission.deleteMany({});

      } else if (action === "end_team") {
        // End a specific team early
        if (!teamName) return NextResponse.json({ success: false, error: "teamName required for end_team" }, { status: 400 });
        await Submission.findOneAndUpdate(
          { teamName: new RegExp(`^${teamName.trim()}$`, "i") },
          { $set: { teamStatus: "ended" } }
        );

      } else if (action === "set_duration") {
        const newMinutes = Number(durationMinutes) || 15;
        config.timerDurationMinutes = newMinutes;

      } else if (action === "toggle_reveal") {
        config.answerKeyRevealed = !config.answerKeyRevealed;

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
      // Mark all waiting in-memory submissions as active
      memory.submissions.forEach((sub: any) => {
        if (sub.teamStatus === "waiting") sub.teamStatus = "active";
      });

    } else if (action === "end_round") {
      cfg.roundStatus = "ended";
      memory.submissions.forEach((sub: any) => {
        if (sub.teamStatus === "waiting" || sub.teamStatus === "active") sub.teamStatus = "ended";
      });

    } else if (action === "reset_round") {
      cfg.roundStatus = "waiting";
      cfg.roundStartedAt = null;
      cfg.answerKeyRevealed = false;
      memory.submissions.clear();

    } else if (action === "end_team") {
      if (!teamName) return NextResponse.json({ success: false, error: "teamName required" }, { status: 400 });
      const key = teamName.trim().toLowerCase();
      const sub = memory.submissions.get(key);
      if (sub) sub.teamStatus = "ended";

    } else if (action === "set_duration") {
      cfg.timerDurationMinutes = Number(durationMinutes) || 15;

    } else if (action === "toggle_reveal") {
      cfg.answerKeyRevealed = !cfg.answerKeyRevealed;

    } else if (action === "update_round_name") {
      cfg.roundName = roundName || cfg.roundName;
    }

    return NextResponse.json({ success: true, config: cfg });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update admin config." }, { status: 500 });
  }
}
