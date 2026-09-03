import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { connectToDatabase, getInMemoryStore } from "@/lib/mongodb";
import GameConfig from "@/models/GameConfig";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const casesDir = path.join(process.cwd(), "data", "cases");
    await fs.mkdir(casesDir, { recursive: true });
    const files = await fs.readdir(casesDir);

    const caseFiles: any[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(casesDir, file), "utf-8");
          const json = JSON.parse(content);
          caseFiles.push({
            id: json.id || file.replace(".json", ""),
            title: json.title || file,
            subtitle: json.subtitle || "",
            difficulty: json.difficulty || "INTERMEDIATE",
            suspectsCount: json.suspects?.length || 0,
            evidenceCount: json.evidence?.length || 0,
            questionsCount: json.questions?.length || 0,
            fileName: file,
          });
        } catch (e) {
          console.warn(`Failed to parse case file ${file}:`, e);
        }
      }
    }

    // Get active case
    let activeCaseId = "ghost-in-the-model";
    const { isConnected } = await connectToDatabase();
    if (isConnected) {
      const cfg = await GameConfig.findOne({ configKey: "global" });
      if (cfg?.caseId) activeCaseId = cfg.caseId;
    } else {
      const memory = getInMemoryStore();
      activeCaseId = memory.config.caseId;
    }

    return NextResponse.json({
      success: true,
      cases: caseFiles,
      activeCaseId,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to list cases." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminAuth(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized. Invalid Admin Access Key." }, { status: 401 });
    }

    const body = await request.json();
    const { action, caseId, caseJson } = body;

    // Action 1: Set Active Case
    if (action === "set_active") {
      if (!caseId) {
        return NextResponse.json({ success: false, error: "caseId is required." }, { status: 400 });
      }

      const { isConnected } = await connectToDatabase();
      if (isConnected) {
        let cfg = await GameConfig.findOne({ configKey: "global" });
        if (!cfg) {
          cfg = new GameConfig({ configKey: "global" });
        }
        cfg.caseId = caseId;
        await cfg.save();
      } else {
        const memory = getInMemoryStore();
        memory.config.caseId = caseId;
      }

      return NextResponse.json({ success: true, message: `Active mystery case switched to '${caseId}'.` });
    }

    // Action 2: Upload / Save New JSON Case
    if (action === "upload" || action === "save") {
      if (!caseJson || typeof caseJson !== "object") {
        return NextResponse.json({ success: false, error: "Valid JSON case object is required." }, { status: 400 });
      }

      // Validate JSON Case Schema
      if (!caseJson.id || !caseJson.title || !caseJson.questions || !caseJson.answerKey) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid case format! Case JSON must include 'id', 'title', 'questions', and 'answerKey'.",
          },
          { status: 400 }
        );
      }

      const caseSlug = caseJson.id.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const casesDir = path.join(process.cwd(), "data", "cases");
      await fs.mkdir(casesDir, { recursive: true });

      const filePath = path.join(casesDir, `${caseSlug}.json`);
      await fs.writeFile(filePath, JSON.stringify(caseJson, null, 2), "utf-8");

      // Optionally set active immediately
      if (body.setActiveImmediately) {
        const { isConnected } = await connectToDatabase();
        if (isConnected) {
          let cfg = await GameConfig.findOne({ configKey: "global" });
          if (!cfg) cfg = new GameConfig({ configKey: "global" });
          cfg.caseId = caseSlug;
          await cfg.save();
        } else {
          const memory = getInMemoryStore();
          memory.config.caseId = caseSlug;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Case '${caseJson.title}' saved successfully as ${caseSlug}.json.`,
        caseId: caseSlug,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to process case management action." }, { status: 500 });
  }
}
