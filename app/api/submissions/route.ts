import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import Submission from "@/models/Submission";
import path from "path";
import fs from "fs/promises";

// Helper to load master case file
async function loadMasterCase(caseId: string = "ghost-in-the-model") {
  const filePath = path.join(process.cwd(), "data", "cases", `${caseId}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get("teamName");

    if (!teamName) {
      return NextResponse.json({ success: false, error: "Missing teamName query parameter" }, { status: 400 });
    }

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const submission = await Submission.findOne({ teamName: teamName.trim() });
      if (!submission) {
        return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, submission });
    }

    // Fallback in-memory
    const memory = getInMemoryStore();
    const submission = memory.submissions.get(teamName.trim().toLowerCase());
    if (!submission) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, teamName, squadBadge, answers, caseId = "ghost-in-the-model", timeTakenSeconds = 0 } = body;

    if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
      return NextResponse.json({ success: false, error: "Team name is required." }, { status: 400 });
    }

    const trimmedTeam = teamName.trim();
    const { isConnected } = await connectToDatabase();

    // Action 1: Team Join Registration
    if (action === "join") {
      if (isConnected) {
        let existing = await Submission.findOne({ teamName: trimmedTeam });
        if (!existing) {
          existing = await Submission.create({
            teamName: trimmedTeam,
            caseId,
            squadBadge: squadBadge || "search",
            isSubmitted: false,
            joinedAt: new Date(),
          });
        }
        return NextResponse.json({ success: true, submission: existing, message: "Team registered successfully." });
      } else {
        const memory = getInMemoryStore();
        const key = trimmedTeam.toLowerCase();
        let existing = memory.submissions.get(key);
        if (!existing) {
          existing = {
            teamName: trimmedTeam,
            caseId,
            squadBadge: squadBadge || "search",
            answers: {},
            score: 0,
            breakdown: { correctCount: 0, totalQuestions: 4, basePoints: 0, timeBonus: 0 },
            timeTakenSeconds: 0,
            isSubmitted: false,
            joinedAt: new Date().toISOString(),
          };
          memory.submissions.set(key, existing);
        }
        return NextResponse.json({ success: true, submission: existing, message: "Team registered in memory." });
      }
    }

    // Action 2: Team Answers Submission
    if (action === "submit") {
      if (!answers || typeof answers !== "object") {
        return NextResponse.json({ success: false, error: "Answers payload is required." }, { status: 400 });
      }

      // Load master case with answer key
      const masterCase = await loadMasterCase(caseId);
      const answerKey: Record<string, string> = masterCase.answerKey || {};
      const questions: Array<{ id: string; points: number }> = masterCase.questions || [];

      let correctCount = 0;
      let basePoints = 0;
      const totalQuestions = questions.length;

      questions.forEach((q) => {
        const teamAnswer = answers[q.id];
        const correctAnswer = answerKey[q.id];
        if (teamAnswer && correctAnswer && teamAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
          correctCount++;
          basePoints += q.points || 250;
        }
      });

      // Calculate time bonus (max 250 bonus for finishing fast under 15m)
      const totalRoundSeconds = (masterCase.timeLimitMinutes || 15) * 60;
      const remainingSeconds = Math.max(0, totalRoundSeconds - (timeTakenSeconds || 0));
      const timeBonus = correctCount > 0 ? Math.floor((remainingSeconds / totalRoundSeconds) * 250) : 0;
      const totalScore = basePoints + timeBonus;

      const breakdown = {
        correctCount,
        totalQuestions,
        basePoints,
        timeBonus,
      };

      if (isConnected) {
        let submission = await Submission.findOne({ teamName: trimmedTeam });
        if (!submission) {
          submission = new Submission({
            teamName: trimmedTeam,
            caseId,
            squadBadge: squadBadge || "search",
            joinedAt: new Date(),
          });
        }
        submission.answers = answers;
        submission.score = totalScore;
        submission.breakdown = breakdown;
        submission.timeTakenSeconds = timeTakenSeconds;
        submission.isSubmitted = true;
        submission.submittedAt = new Date();
        await submission.save();

        return NextResponse.json({
          success: true,
          message: "Deductions recorded successfully.",
          submission,
        });
      } else {
        const memory = getInMemoryStore();
        const key = trimmedTeam.toLowerCase();
        let submission = memory.submissions.get(key);
        if (!submission) {
          submission = {
            teamName: trimmedTeam,
            caseId,
            squadBadge: squadBadge || "🔍",
            answers: {},
            score: 0,
            breakdown: { correctCount: 0, totalQuestions: 4, basePoints: 0, timeBonus: 0 },
            timeTakenSeconds: 0,
            isSubmitted: false,
            joinedAt: new Date().toISOString(),
          };
        }
        submission.answers = answers;
        submission.score = totalScore;
        submission.breakdown = breakdown;
        submission.timeTakenSeconds = timeTakenSeconds;
        submission.isSubmitted = true;
        submission.submittedAt = new Date().toISOString();

        memory.submissions.set(key, submission);

        return NextResponse.json({
          success: true,
          message: "Deductions recorded in memory successfully.",
          submission,
        });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to process submission." }, { status: 500 });
  }
}
