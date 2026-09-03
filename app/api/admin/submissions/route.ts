import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import Submission from "@/models/Submission";
import { verifyAdminAuth } from "@/lib/admin-auth";

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
