import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const dynamic = "force-dynamic";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    let targetCaseId = params.caseId || "ghost-in-the-model";
    const casesDir = path.join(process.cwd(), "data", "cases");

    if (targetCaseId === "random") {
      const { searchParams } = new URL(request.url);
      const teamName = searchParams.get("teamName") || "";
      const files = await fs.readdir(casesDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      if (jsonFiles.length === 0) {
        return NextResponse.json(
          { success: false, error: "No case files found." },
          { status: 404 }
        );
      }

      const index = teamName ? hashString(teamName) % jsonFiles.length : Math.floor(Math.random() * jsonFiles.length);
      const selectedFile = jsonFiles[index];
      targetCaseId = selectedFile.replace(/\.json$/, "");
    }

    const filePath = path.join(casesDir, `${targetCaseId}.json`);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const caseData = JSON.parse(data);

      // CRITICAL SECURITY: Strip answerKey before sending to public client
      const { answerKey, ...publicCaseData } = caseData;

      return NextResponse.json({
        success: true,
        caseId: targetCaseId,
        case: publicCaseData,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: `Case file '${targetCaseId}' not found.` },
        { status: 404 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load case." },
      { status: 500 }
    );
  }
}

