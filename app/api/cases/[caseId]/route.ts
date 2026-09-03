import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const caseId = params.caseId || "ghost-in-the-model";
    const filePath = path.join(process.cwd(), "data", "cases", `${caseId}.json`);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const caseData = JSON.parse(data);

      // CRITICAL SECURITY: Strip answerKey before sending to public client
      const { answerKey, ...publicCaseData } = caseData;

      return NextResponse.json({
        success: true,
        case: publicCaseData,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: `Case file '${caseId}' not found.` },
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
