"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FolderLock,
  FileCheck,
  Check,
} from "lucide-react";
import SquadIconDisplay from "@/components/SquadIconDisplay";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubmittedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamName = searchParams.get("teamName") || localStorage.getItem("aimurdle_team_name") || "Special Sleuths";

  const { data: subRes } = useSWR(`/api/submissions?teamName=${encodeURIComponent(teamName)}`, fetcher, {
    refreshInterval: 3000,
  });

  const { data: configRes } = useSWR("/api/config", fetcher, {
    refreshInterval: 3000,
  });

  const submission = subRes?.submission;
  const caseId = submission?.caseId || (typeof window !== "undefined" ? localStorage.getItem("aimurdle_case_id") : "") || "ghost-in-the-model";
  const { data: caseRes } = useSWR(`/api/cases/${caseId}`, fetcher);

  const config = configRes?.config;
  const caseData = caseRes?.case;

  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  // Trigger confetti when host reveals answer key
  useEffect(() => {
    if (config?.answerKeyRevealed && !hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#d90429", "#ff4d6d", "#f0eee6", "#121316"],
      });
    }
  }, [config?.answerKeyRevealed, hasTriggeredConfetti]);

  if (!submission) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#121316] text-[#f5f4ef] font-mono">
        <div className="border-2 border-[#f0eee6] p-4 bg-[#1b1d22] shadow-[4px_4px_0px_#000000] text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9b9ba3] animate-pulse">
            [ RETRIEVING SQUAD DOCKET... ]
          </p>
        </div>
      </div>
    );
  }

  const isRevealed = Boolean(config?.answerKeyRevealed);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:py-8 max-w-[640px] w-[94%] mx-auto font-mono text-[#f5f4ef]">
      {/* Newspaper Card Container */}
      <div className="w-full bg-[#1b1d22] border-[3px] border-[#f0eee6] p-5 md:p-8 shadow-[6px_6px_0px_#000000] relative text-center">
        {/* Lock Screen Mode (Before Host Reveal) */}
        {!isRevealed ? (
          <div className="space-y-5">
            <div className="border-b-2 border-[#f0eee6] pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4d6d] block mb-1">
                [ CASE #{caseId.toUpperCase()} // OFFICIAL ARCHIVE ]
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase text-[#f5f4ef]">
                ACCUSATION SEALED & FILED
              </h1>
            </div>

            {/* Squad Identity Box */}
            <div className="p-4 border-2 border-[#f0eee6] bg-[#24211a] shadow-[4px_4px_0px_#000000] flex items-center justify-center space-x-3">
              <div className="w-10 h-10 border-2 border-[#f0eee6] bg-[#0d0e11] flex items-center justify-center text-white">
                <SquadIconDisplay iconId={submission.squadBadge} className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-[#9b9ba3] uppercase block">
                  INVESTIGATOR SQUAD:
                </span>
                <span className="text-sm md:text-base font-black uppercase text-[#f5f4ef]">
                  {submission.teamName}
                </span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#f5f4ef] max-w-md mx-auto">
              Your sworn deductions have been officially timestamped and locked in the crime docket.
              Awaiting the Chief Inspector to unlock the solution key.
            </p>

            {/* Waiting for Host Status Indicator */}
            <div className="p-4 border-2 border-[#f0eee6] bg-[#0d0e11] space-y-2">
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-[#f5f4ef] uppercase">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff4d6d]" />
                <span>AWAITING OFFICIAL VERDICT UNLOCK...</span>
              </div>
              <p className="text-[11px] text-[#9b9ba3]">
                Scores and deduction matrix will appear automatically once revealed.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => router.push(`/game?teamName=${encodeURIComponent(submission.teamName)}`)}
                className="px-4 py-2 border-2 border-[#f0eee6] bg-[#1b1d22] hover:bg-[#f0eee6] hover:text-[#121316] text-[#f0eee6] text-xs font-bold uppercase shadow-[4px_4px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                REVIEW CASE DOSSIER & EVIDENCE
              </button>
            </div>
          </div>
        ) : (
          /* Revealed Results Mode */
          <div className="space-y-6 text-left">
            <div className="border-b-2 border-[#f0eee6] pb-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff4d6d] block mb-1">
                [ CASE #{caseId.toUpperCase()} // OFFICIAL VERDICT ]
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase text-[#f5f4ef]">
                OFFICIAL SOLUTION REVEALED
              </h1>
            </div>

            {/* Scorecard Box */}
            <div className="p-5 border-2 border-[#f0eee6] bg-[#24211a] shadow-[4px_4px_0px_#000000] text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-7 h-7 border border-[#f0eee6] bg-[#0d0e11] flex items-center justify-center">
                  <SquadIconDisplay iconId={submission.squadBadge} className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-black uppercase text-[#f5f4ef]">
                  {submission.teamName}
                </span>
              </div>

              <div className="text-3xl md:text-4xl font-black text-[#f5f4ef] tracking-tight">
                {submission.score || 0} <span className="text-base font-bold text-[#9b9ba3]">PTS</span>
              </div>

              <div className="flex justify-center space-x-4 text-xs font-bold border-t border-[#f0eee6] pt-2 text-[#9b9ba3]">
                <span>
                  CORRECT: <strong className="text-[#ff4d6d]">{submission.breakdown?.correctCount || 0} / 4</strong>
                </span>
                <span>•</span>
                <span>
                  TIME: <strong className="text-[#f5f4ef]">{submission.timeTakenSeconds || 0}s</strong>
                </span>
              </div>
            </div>

            {/* Deduction Verification Logic Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#f5f4ef]">
                [ DEDUCTION VERIFICATION MATRIX ]
              </h3>

              <div className="border-2 border-[#f0eee6] overflow-x-auto bg-[#0d0e11]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#f0eee6] bg-[#1b1d22] text-[#9b9ba3]">
                      <th className="p-2.5 font-bold uppercase">Question</th>
                      <th className="p-2.5 font-bold uppercase">Your Deduction</th>
                      <th className="p-2.5 font-bold uppercase">Official Solution</th>
                      <th className="p-2.5 font-bold uppercase text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3d414d]">
                    {caseData?.questions?.map((q: any) => {
                      const userChoice = submission.answers?.[q.id];
                      const answerKey = subRes?.answerKey;
                      const masterAns = answerKey?.[q.id] || q.correctOption;

                      const clean = (s?: string) => s?.trim().toLowerCase().replace(/[\s\-_:'"]/g, "") || "";
                      const isCorrect = userChoice && masterAns ? clean(userChoice) === clean(masterAns) : false;

                      return (
                        <tr key={q.id} className="hover:bg-[#1b1d22]">
                          <td className="p-2.5 font-bold uppercase text-[#f5f4ef]">{q.label}</td>
                          <td className="p-2.5 text-[#f5f4ef]">{userChoice || "—"}</td>
                          <td className="p-2.5 text-[#9b9ba3]">{masterAns || "—"}</td>
                          <td className="p-2.5 text-right font-bold uppercase">
                            {isCorrect ? (
                              <span className="px-1.5 py-0.5 border border-[#ffffff] bg-[#d90429] text-white">
                                ✓ CORRECT
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 border border-[#f0eee6] bg-[#1b1d22] text-[#9b9ba3]">
                                ✗ WRONG
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t-2 border-[#f0eee6] flex justify-between items-center">
              <button
                onClick={() => router.push(`/game?teamName=${encodeURIComponent(submission.teamName)}`)}
                className="px-3.5 py-2 border-2 border-[#f0eee6] bg-[#1b1d22] hover:bg-[#f0eee6] hover:text-[#121316] text-xs font-bold uppercase text-[#f5f4ef] shadow-[4px_4px_0px_#000000] transition"
              >
                RETURN TO DOSSIER
              </button>

              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-[#d90429] hover:bg-[#ba0323] text-white border-[3px] border-[#ffffff] text-xs font-bold uppercase shadow-[4px_4px_0px_#000000] transition"
              >
                CASE CLOSED / LOBBY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 bg-[#121316] text-[#f5f4ef] font-mono">
          <div className="border-2 border-[#f0eee6] p-4 bg-[#1b1d22] shadow-[4px_4px_0px_#000000]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9b9ba3]">
              LOADING DOCKET ARCHIVE...
            </span>
          </div>
        </div>
      }
    >
      <SubmittedContent />
    </Suspense>
  );
}
