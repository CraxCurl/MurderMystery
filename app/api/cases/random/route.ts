import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";


// Simple string hash function for deterministic case allotment per team name
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamName = searchParams.get("teamName") || "";
    const casesDir = path.join(process.cwd(), "data", "cases");

    const files = await fs.readdir(casesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No case files found." },
        { status: 404 }
      );
    }

    // Pick case file deterministically by team name hash, or randomly if no team name
    const index = teamName ? hashString(teamName) % jsonFiles.length : Math.floor(Math.random() * jsonFiles.length);
    const selectedFile = jsonFiles[index];
    const caseId = selectedFile.replace(/\.json$/, "");

    const filePath = path.join(casesDir, selectedFile);
    const data = await fs.readFile(filePath, "utf-8");
    const caseData = JSON.parse(data);

    // Security: Strip answerKey before sending to client
    const { answerKey, ...publicCaseData } = caseData;

    return NextResponse.json({
      success: true,
      caseId,
      case: publicCaseData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to allot case." },
      { status: 500 }
    );
  }
}
