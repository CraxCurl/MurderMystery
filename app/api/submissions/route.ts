import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import Submission from "@/models/Submission";
import GameConfig from "@/models/GameConfig";
import { clearSquadSessionCookie, getSquadSessionFromReq, setSquadSessionCookie } from "@/lib/session";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Helper to normalize strings for robust answer comparison
function normalizeString(str?: string): string {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/[\s\-_:'"]/g, "");
}

// Helper to list all available case IDs in data/cases/
async function getAvailableCaseIds(): Promise<string[]> {
  const casesDir = path.join(process.cwd(), "data", "cases");
  try {
    const files = await fs.readdir(casesDir);
    const caseIds = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
    return caseIds.length > 0 ? caseIds : ["ghost-in-the-model", "poisoned-weights", "rogue-agent", "silicon-sabotage", "quantum-deadlock"];
  } catch {
    return ["ghost-in-the-model", "poisoned-weights", "rogue-agent", "silicon-sabotage", "quantum-deadlock"];
  }
}

// Helper to load specific case file
async function loadCase(caseId: string = "ghost-in-the-model") {
  const filePath = path.join(process.cwd(), "data", "cases", `${caseId}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    const defaultPath = path.join(process.cwd(), "data", "cases", "ghost-in-the-model.json");
    const content = await fs.readFile(defaultPath, "utf-8");
    return JSON.parse(content);
  }
}

function withoutAnswerKey(caseData: Record<string, unknown>) {
  const { answerKey: _answerKey, ...publicCaseData } = caseData;
  return publicCaseData;
}

// Get or create global game config
async function getConfig() {
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
  return config;
}

// Scoring constants — max possible = 1000
const BASE_PER_QUESTION = 250; // 3 questions × 250 = 750 max base
const MAX_TIME_BONUS = 250;    // 250 time bonus → total cap 1000

// Helper to fetch sorted leaderboard
async function getLeaderboardList() {
  const { isConnected } = await connectToDatabase();
  if (isConnected) {
    const list = await Submission.find({})
      .select("teamName caseId squadBadge score breakdown timeTakenSeconds isSubmitted teamStatus joinedAt submittedAt")
      .sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .lean();
    return list;
  }
  const memory = getInMemoryStore();
  return Array.from(memory.submissions.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.timeTakenSeconds !== b.timeTakenSeconds) return a.timeTakenSeconds - b.timeTakenSeconds;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = getSquadSessionFromReq(request);
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get("teamName") || session?.teamName;
    const teamToken = searchParams.get("teamToken") || request.headers.get("x-team-token") || session?.teamToken;
    const isPublicLeaderboardRequest = searchParams.get("leaderboard") === "true";

    const leaderboard = await getLeaderboardList();

    if (isPublicLeaderboardRequest) {
      const { isConnected } = await connectToDatabase();
      const config = isConnected ? await getConfig() : getInMemoryStore().config;
      if (config.roundStatus !== "ended") {
        return NextResponse.json(
          { success: false, error: "Leaderboard is available after the host ends the round." },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: true, leaderboard });
    }

    if (!teamName) {
      return NextResponse.json({
        success: false,
        isRemoved: true,
        leaderboard,
        error: "No active squad session found.",
      }, { status: 200 });
    }

    const trimmedTeam = teamName.trim();
    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const submission = await Submission.findOne({ teamName: new RegExp(`^${trimmedTeam}$`, "i") });
      if (!submission) {
        const response = NextResponse.json({
          success: false,
          isRemoved: true,
          leaderboard,
          error: "Squad docket not found or reset by host.",
        }, { status: 200 });
        clearSquadSessionCookie(response);
        return response;
      }

      if (teamToken && submission.teamToken !== teamToken) {
        return NextResponse.json({ success: false, error: "Unauthorized: Invalid team token." }, { status: 401 });
      }

      const config = await getConfig();
      const caseData = await loadCase(submission.caseId || "ghost-in-the-model");
      const answerKey = config.answerKeyRevealed ? (caseData.answerKey || {}) : undefined;

      return NextResponse.json({
        success: true,
        submission,
        roundStatus: config.roundStatus,
        roundStartedAt: config.roundStartedAt,
        timerDurationMinutes: config.timerDurationMinutes,
        caseData: withoutAnswerKey(caseData),
        answerKey,
        leaderboard,
        serverTime: new Date().toISOString(),
      });
    }

    // Fallback in-memory
    const memory = getInMemoryStore();
    const submission = memory.submissions.get(trimmedTeam.toLowerCase());
    if (!submission) {
      const response = NextResponse.json({
        success: false,
        isRemoved: true,
        leaderboard,
        error: "Squad docket not found or reset by host.",
      }, { status: 200 });
      clearSquadSessionCookie(response);
      return response;
    }
    if (teamToken && submission.teamToken !== teamToken) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid team token." }, { status: 401 });
    }

    const cfg = memory.config;
    const caseData = await loadCase(submission.caseId || "ghost-in-the-model");
    const answerKey = cfg.answerKeyRevealed ? (caseData.answerKey || {}) : undefined;

    return NextResponse.json({
      success: true,
      submission,
      roundStatus: cfg.roundStatus || "waiting",
      roundStartedAt: cfg.roundStartedAt || null,
      timerDurationMinutes: cfg.timerDurationMinutes || 15,
      caseData: withoutAnswerKey(caseData),
      answerKey,
      leaderboard,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = getSquadSessionFromReq(request);

    const { action, squadBadge, answers, timeTakenSeconds = 0 } = body;
    let teamName = body.teamName || session?.teamName;
    let teamToken = body.teamToken || request.headers.get("x-team-token") || session?.teamToken;

    if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
      return NextResponse.json({ success: false, error: "Team name is required." }, { status: 400 });
    }

    const trimmedTeam = teamName.trim();
    const { isConnected } = await connectToDatabase();

    // ── JOIN ──────────────────────────────────────────────────────────────
    if (action === "join") {
      const availableCaseIds = await getAvailableCaseIds();

      if (isConnected) {
        const existing = await Submission.findOne({ teamName: new RegExp(`^${trimmedTeam}$`, "i") });

        if (existing) {
          if (teamToken && existing.teamToken === teamToken) {
            const config = await getConfig();
            const response = NextResponse.json({
              success: true,
              message: "Session resumed.",
              teamToken: existing.teamToken,
              submission: existing,
              roundStatus: config.roundStatus,
              isResume: true,
            });
            setSquadSessionCookie(response, {
              teamName: existing.teamName,
              teamToken: existing.teamToken,
              squadBadge: existing.squadBadge || "search",
              caseId: existing.caseId,
            });
            return response;
          }
          return NextResponse.json(
            { success: false, error: `Team name '${trimmedTeam}' is already taken! Please choose a unique team name.` },
            { status: 409 }
          );
        }

        const config = await getConfig();
        const teamCount = await Submission.countDocuments({});
        const assignedCaseId = availableCaseIds[teamCount % availableCaseIds.length];

        const newTeamToken = crypto.randomBytes(16).toString("hex");
        const now = new Date();

        const newSubmission = await Submission.create({
          teamName: trimmedTeam,
          caseId: assignedCaseId,
          squadBadge: squadBadge || "search",
          teamToken: newTeamToken,
          assignedQuestionIndex: teamCount,
          teamStatus: "waiting",
          isSubmitted: false,
          joinedAt: now,
          startTime: now,
        });

        const response = NextResponse.json({
          success: true,
          teamToken: newTeamToken,
          submission: newSubmission,
          roundStatus: config.roundStatus,
          message: `Squad registered. Assigned case: ${assignedCaseId}`,
        });

        setSquadSessionCookie(response, {
          teamName: newSubmission.teamName,
          teamToken: newTeamToken,
          squadBadge: newSubmission.squadBadge || "search",
          caseId: newSubmission.caseId,
        });

        return response;
      } else {
        const memory = getInMemoryStore();
        const key = trimmedTeam.toLowerCase();
        const existing = memory.submissions.get(key);

        if (existing) {
          if (teamToken && existing.teamToken === teamToken) {
            const response = NextResponse.json({
              success: true,
              message: "Session resumed in memory.",
              teamToken: existing.teamToken,
              submission: existing,
              roundStatus: memory.config.roundStatus || "waiting",
              isResume: true,
            });
            setSquadSessionCookie(response, {
              teamName: existing.teamName,
              teamToken: existing.teamToken,
              squadBadge: existing.squadBadge || "search",
              caseId: existing.caseId,
            });
            return response;
          }
          return NextResponse.json(
            { success: false, error: `Team name '${trimmedTeam}' is already taken!` },
            { status: 409 }
          );
        }

        const cfg = memory.config;
        const teamCount = memory.submissions.size;
        const assignedCaseId = availableCaseIds[teamCount % availableCaseIds.length];

        const newTeamToken = crypto.randomBytes(16).toString("hex");
        const nowISO = new Date().toISOString();

        const newSubmission = {
          teamName: trimmedTeam,
          caseId: assignedCaseId,
          squadBadge: squadBadge || "search",
          teamToken: newTeamToken,
          assignedQuestionIndex: teamCount,
          teamStatus: "waiting" as const,
          answers: {},
          score: 0,
          breakdown: { correctCount: 0, totalQuestions: 3, basePoints: 0, timeBonus: 0 },
          timeTakenSeconds: 0,
          isSubmitted: false,
          joinedAt: nowISO,
          startTime: nowISO,
        };

        memory.submissions.set(key, newSubmission);

        const response = NextResponse.json({
          success: true,
          teamToken: newTeamToken,
          submission: newSubmission,
          roundStatus: cfg.roundStatus || "waiting",
          message: `Squad registered in memory. Assigned case: ${assignedCaseId}`,
        });

        setSquadSessionCookie(response, {
          teamName: newSubmission.teamName,
          teamToken: newTeamToken,
          squadBadge: newSubmission.squadBadge,
          caseId: newSubmission.caseId,
        });

        return response;
      }
    }

    // ── SUBMIT ────────────────────────────────────────────────────────────
    if (action === "submit") {
      if (!answers || typeof answers !== "object") {
        return NextResponse.json({ success: false, error: "Answers payload is required." }, { status: 400 });
      }
      if (!teamToken) {
        return NextResponse.json({ success: false, error: "Unauthorized: Missing team security token." }, { status: 401 });
      }

      if (isConnected) {
        const submission = await Submission.findOne({ teamName: new RegExp(`^${trimmedTeam}$`, "i") });
        if (!submission) return NextResponse.json({ success: false, error: "Squad not found." }, { status: 404 });
        if (submission.teamToken !== teamToken) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

        const config = await getConfig();
        if (config.roundStatus !== "active" || submission.teamStatus !== "active") {
          return NextResponse.json(
            { success: false, error: "The host has not started this round, or it has already ended." },
            { status: 409 }
          );
        }
        const caseData = await loadCase(submission.caseId || "ghost-in-the-model");
        const questions: Array<{ id: string }> = caseData.questions || [];
        const answerKey: Record<string, string> = caseData.answerKey || {};

        let correctCount = 0;
        questions.forEach((q) => {
          const teamAns = normalizeString(answers[q.id]);
          const correctAns = normalizeString(answerKey[q.id]);
          if (teamAns && correctAns && teamAns === correctAns) {
            correctCount++;
          }
        });

        const basePoints = correctCount * BASE_PER_QUESTION;
        const totalRoundSeconds = config.timerDurationMinutes * 60;
        const timeBonus = correctCount > 0
          ? Math.floor((Math.max(0, totalRoundSeconds - timeTakenSeconds) / totalRoundSeconds) * MAX_TIME_BONUS)
          : 0;
        const totalScore = Math.min(1000, basePoints + timeBonus);

        submission.answers = answers;
        submission.score = totalScore;
        submission.breakdown = { correctCount, totalQuestions: questions.length || 3, basePoints, timeBonus };
        submission.timeTakenSeconds = timeTakenSeconds;
        submission.isSubmitted = true;
        submission.teamStatus = "submitted";
        submission.submittedAt = new Date();
        await submission.save();

        return NextResponse.json({ success: true, message: "Answers recorded.", submission });
      } else {
        const memory = getInMemoryStore();
        const key = trimmedTeam.toLowerCase();
        const submission = memory.submissions.get(key);
        if (!submission) return NextResponse.json({ success: false, error: "Squad not found." }, { status: 404 });
        if (submission.teamToken !== teamToken) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

        const cfg = memory.config;
        if (cfg.roundStatus !== "active" || submission.teamStatus !== "active") {
          return NextResponse.json(
            { success: false, error: "The host has not started this round, or it has already ended." },
            { status: 409 }
          );
        }
        const caseData = await loadCase(submission.caseId || "ghost-in-the-model");
        const questions: Array<{ id: string }> = caseData.questions || [];
        const answerKey: Record<string, string> = caseData.answerKey || {};

        let correctCount = 0;
        questions.forEach((q) => {
          const teamAns = normalizeString(answers[q.id]);
          const correctAns = normalizeString(answerKey[q.id]);
          if (teamAns && correctAns && teamAns === correctAns) {
            correctCount++;
          }
        });

        const basePoints = correctCount * BASE_PER_QUESTION;
        const totalRoundSeconds = (cfg.timerDurationMinutes || 15) * 60;
        const timeBonus = correctCount > 0
          ? Math.floor((Math.max(0, totalRoundSeconds - timeTakenSeconds) / totalRoundSeconds) * MAX_TIME_BONUS)
          : 0;

        submission.answers = answers;
        submission.score = Math.min(1000, basePoints + timeBonus);
        submission.breakdown = { correctCount, totalQuestions: questions.length || 3, basePoints, timeBonus };
        submission.timeTakenSeconds = timeTakenSeconds;
        submission.isSubmitted = true;
        submission.teamStatus = "submitted";
        submission.submittedAt = new Date().toISOString();
        memory.submissions.set(key, submission);

        return NextResponse.json({ success: true, message: "Answers recorded.", submission });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to process submission." }, { status: 500 });
  }
}
