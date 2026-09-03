import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import Submission from "@/models/Submission";
import { verifyAdminAuth } from "@/lib/admin-auth";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

async function loadCase(caseId: string) {
  const filePath = path.join(process.cwd(), "data", "cases", `${caseId}.json`);
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

function normalizeAnswer(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[\s\-_:'"]/g, "");
}


export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const { isConnected } = await connectToDatabase();

    if (isConnected) {
      const submissions = await Submission.find({}).sort({ score: -1, timeTakenSeconds: 1, submittedAt: 1 });
      return NextResponse.json({ success: true, submissions });
    }

    // Fallback in-memory
    const memory = getInMemoryStore();
    const list = Array.from(memory.submissions.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeTakenSeconds !== b.timeTakenSeconds) return a.timeTakenSeconds - b.timeTakenSeconds;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    return NextResponse.json({ success: true, submissions: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch submissions." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const body = await request.json();
    const { action, teamName } = body;

    const { isConnected } = await connectToDatabase();

    if (action === "wipe_all") {
      if (isConnected) {
        await Submission.deleteMany({});
      } else {
        const memory = getInMemoryStore();
        memory.submissions.clear();
      }
      return NextResponse.json({ success: true, message: "All team submissions wiped for fresh round." });
    }

    if (action === "delete_team") {
      if (!teamName) {
        return NextResponse.json({ success: false, error: "Missing teamName." }, { status: 400 });
      }
      if (isConnected) {
        await Submission.deleteOne({ teamName: teamName.trim() });
      } else {
        const memory = getInMemoryStore();
        memory.submissions.delete(teamName.trim().toLowerCase());
      }
      return NextResponse.json({ success: true, message: `Team '${teamName}' deleted successfully.` });
    }

    if (action === "force_submit") {
      if (!teamName) {
        return NextResponse.json({ success: false, error: "Missing teamName." }, { status: 400 });
      }
      if (isConnected) {
        const sub = await Submission.findOne({ teamName: teamName.trim() });
        if (sub) {
          sub.isSubmitted = true;
          sub.submittedAt = new Date();
          await sub.save();
        }
      } else {
        const memory = getInMemoryStore();
        const sub = memory.submissions.get(teamName.trim().toLowerCase());
        if (sub) {
          sub.isSubmitted = true;
          sub.submittedAt = new Date().toISOString();
        }
      }
      return NextResponse.json({ success: true, message: `Team '${teamName}' round ended by host.` });
    }

    return NextResponse.json({ success: false, error: "Invalid delete action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to modify submissions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const { action, teamName, caseId } = await request.json();
    if (!teamName) {
      return NextResponse.json({ success: false, error: "teamName is required." }, { status: 400 });
    }

    const { isConnected } = await connectToDatabase();
    const key = teamName.trim().toLowerCase();
    const submission: any = isConnected
      ? await Submission.findOne({ teamName: new RegExp(`^${teamName.trim()}$`, "i") })
      : getInMemoryStore().submissions.get(key);

    if (!submission) {
      return NextResponse.json({ success: false, error: "Squad not found." }, { status: 404 });
    }

    if (action === "assign_case") {
      if (!caseId || typeof caseId !== "string") {
        return NextResponse.json({ success: false, error: "A valid caseId is required." }, { status: 400 });
      }
      if (submission.teamStatus !== "waiting" || submission.isSubmitted) {
        return NextResponse.json({ success: false, error: "A case can only be changed while the squad is waiting for the round to start." }, { status: 409 });
      }
      try {
        await loadCase(caseId);
      } catch {
        return NextResponse.json({ success: false, error: "Selected case file does not exist." }, { status: 404 });
      }
      submission.caseId = caseId;
      if (isConnected) await submission.save();
      else getInMemoryStore().submissions.set(key, submission);
      return NextResponse.json({ success: true, message: "Assigned case updated." });
    }

    if (action === "answer_review") {
      const caseData = await loadCase(submission.caseId || "ghost-in-the-model");
      const answers = submission.answers instanceof Map
        ? Object.fromEntries(submission.answers)
        : submission.answers || {};
      const questions = (caseData.questions || []).map((question: any) => {
        const submittedAnswer = answers[question.id] || "—";
        const correctAnswer = caseData.answerKey?.[question.id] || "—";
        return {
          id: question.id,
          label: question.label,
          question: question.question,
          submittedAnswer,
          correctAnswer,
          isCorrect: submittedAnswer !== "—" && normalizeAnswer(submittedAnswer) === normalizeAnswer(correctAnswer),
        };
      });
      return NextResponse.json({
        success: true,
        review: {
          teamName: submission.teamName,
          caseTitle: caseData.title || submission.caseId,
          isSubmitted: submission.isSubmitted,
          questions,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update squad." }, { status: 500 });
  }
}
