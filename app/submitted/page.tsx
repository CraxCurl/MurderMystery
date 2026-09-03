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
  Trophy,
} from "lucide-react";
import SquadIconDisplay from "@/components/SquadIconDisplay";
import { clearLocalSquadSession } from "@/lib/client-session";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubmittedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamNameFromQuery = searchParams.get("teamName") || "";
  const [teamName, setTeamName] = useState(teamNameFromQuery || (typeof window !== "undefined" ? localStorage.getItem("aimurdle_team_name") : "") || "Special Sleuths");
  const [teamToken, setTeamToken] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Prevent Browser Back Button from leaving the submitted page
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const name = teamNameFromQuery || localStorage.getItem("aimurdle_team_name") || "";
    const token = localStorage.getItem(`aimurdle_team_token_${name}`) || localStorage.getItem("aimurdle_current_token") || "";
    setTeamName(name);
    setTeamToken(token);
  }, [teamNameFromQuery]);

  const fetcherWithAuth = (url: string, token: string) =>
    fetch(url, {
      headers: { "x-team-token": token },
    }).then((res) => {
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED_SQUAD_ACCESS");
      }
      return res.json();
    });

  const { data: subRes } = useSWR(
    teamToken ? ["/api/submissions", teamToken] : null,
    ([url, token]: [string, string]) => fetcherWithAuth(url, token),
    { refreshInterval: 3000 }
  );

  const { data: configRes } = useSWR("/api/config", fetcher, {
    refreshInterval: 3000,
  });

  const submission = subRes?.submission;
  const caseId = submission?.caseId || (typeof window !== "undefined" ? localStorage.getItem("aimurdle_case_id") : "") || "ghost-in-the-model";
  const { data: caseRes } = useSWR(`/api/cases/${caseId}`, fetcher);

  const config = configRes?.config;
  const caseData = caseRes?.case;

  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  useEffect(() => {
    if (subRes?.isRemoved) {
      clearLocalSquadSession();
      router.replace("/");
    }
  }, [subRes?.isRemoved, router]);

  // Trigger confetti when host reveals answer key
  useEffect(() => {
    if (config?.answerKeyRevealed && !hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#A30B37", "#000000", "#fff5e2", "#fbfbf9"],
      });
    }
  }, [config?.answerKeyRevealed, hasTriggeredConfetti]);

  const handleRegisterNewSquad = () => {
    clearLocalSquadSession();
    router.push("/");
  };

  const isRemovedOrMissing = !submission || subRes?.isRemoved;
  const leaderboardList: any[] = subRes?.leaderboard || [];
  const squadRankIndex = leaderboardList.findIndex(
    (item: any) => item.teamName?.toLowerCase().trim() === submission?.teamName?.toLowerCase().trim()
  );
  const squadRank = squadRankIndex === -1 ? null : squadRankIndex + 1;
  const totalSquads = leaderboardList.length;
  // ── ENDING / THANKS FOR PLAYING SCREEN (When squad is removed or lobby reset) ──
  if (isRemovedOrMissing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:py-8 max-w-[680px] w-[94%] mx-auto font-mono text-black">
        <div className="w-full bg-white border-[3px] border-black p-5 md:p-8 shadow-[6px_6px_0px_#000000] text-center space-y-6">
          {/* Header Banner */}
          <div className="border-b-2 border-black pb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#A30B37] block mb-1">
              [ CASE DOSSIER ARCHIVED // INVESTIGATION CONCLUDED ]
            </span>
            <h1 className="text-2xl md:text-3xl font-black uppercase text-black">
              THANKS FOR PLAYING AIMURDLE!
            </h1>
            <p className="text-xs text-[#6b7280] uppercase mt-1 leading-relaxed">
              The host has reset the lobby. Please register again when the next round is announced.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRegisterNewSquad}
              className="w-full py-3.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-[3px] border-black text-xs md:text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] transition"
            >
              [ START NEW INVESTIGATION / LOBBY ]
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRevealed = Boolean(config?.answerKeyRevealed || subRes?.roundStatus === "ended");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:py-8 max-w-[640px] w-[94%] mx-auto font-mono text-black">
      {/* Newspaper Card Container */}
      <div className="w-full bg-white border-[3px] border-black p-5 md:p-8 shadow-[6px_6px_0px_#000000] relative text-center">
        {/* Lock Screen Mode (Before Host Reveal) */}
        {!isRevealed ? (
          <div className="space-y-5">
            <div className="border-b-2 border-black pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A30B37] block mb-1">
                [ CASE #{caseId.toUpperCase()} // OFFICIAL ARCHIVE ]
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase text-black">
                ACCUSATION SEALED & FILED
              </h1>
            </div>

            {/* Squad Identity Box */}
            <div className="p-4 border-2 border-black bg-[#fff5e2] shadow-[4px_4px_0px_#000000] flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 border-2 border-black bg-white flex items-center justify-center text-black">
                  <SquadIconDisplay iconId={submission.squadBadge} className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-[#6b7280] uppercase block">
                    INVESTIGATOR SQUAD:
                  </span>
                  <span className="text-sm md:text-base font-black uppercase text-black">
                    {submission.teamName}
                  </span>
                </div>
              </div>

            </div>

            <p className="text-xs leading-relaxed text-black max-w-md mx-auto">
              Your sworn deductions have been officially timestamped and locked in the crime docket.
              Awaiting the Chief Inspector to unlock the solution key.
            </p>

            {/* Waiting for Host Status Indicator */}
            <div className="p-4 border-2 border-black bg-[#f5f5f5] space-y-2">
              <div className="flex items-center justify-center space-x-2 text-xs font-bold text-black uppercase">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A30B37]" />
                <span>AWAITING OFFICIAL VERDICT UNLOCK...</span>
              </div>
              <p className="text-[11px] text-[#6b7280]">
                Scores and deduction matrix will appear automatically once revealed.
              </p>
            </div>

          </div>
        ) : (
          /* Revealed Results Mode */
          <div className="space-y-6 text-left">
            <div className="border-b-2 border-black pb-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A30B37] block mb-1">
                [ CASE #{caseId.toUpperCase()} // OFFICIAL VERDICT ]
              </span>
              <h1 className="text-xl md:text-2xl font-black uppercase text-black">
                OFFICIAL SOLUTION REVEALED
              </h1>
            </div>

            {/* Scorecard */}
            <div className="p-5 border-2 border-black bg-[#fff5e2] shadow-[4px_4px_0px_#000000] text-center space-y-2">
              {squadRank && (
                <div className="inline-block px-3 py-1 bg-[#A30B37] text-white border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] mb-1">
                  RANK #{squadRank} OF {totalSquads} SQUADS
                </div>
              )}
              <div className="flex items-center justify-center space-x-2">
                <div className="w-7 h-7 border border-black bg-white flex items-center justify-center">
                  <SquadIconDisplay iconId={submission.squadBadge} className="w-4 h-4 text-black" />
                </div>
                <span className="text-sm font-black uppercase text-black">
                  {submission.teamName}
                </span>
              </div>

              <div className="text-3xl md:text-4xl font-black text-black tracking-tight">
                {submission.score || 0} <span className="text-base font-bold text-[#6b7280]">PTS</span>
              </div>

              <div className="flex justify-center space-x-4 text-xs font-bold border-t border-black pt-2 text-[#6b7280]">
                <span>
                  CORRECT: <strong className="text-[#A30B37]">{submission.breakdown?.correctCount || 0} / {caseData?.questions?.length || 3}</strong>
                </span>
                <span>•</span>
                <span>
                  TIME: <strong className="text-black">{submission.timeTakenSeconds || 0}s</strong>
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-full py-3 bg-[#fff5e2] hover:bg-black hover:text-white border-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition"
            >
              <Trophy className="w-4 h-4 text-[#A30B37]" />
              <span>[ VIEW FINAL LEADERBOARD ]</span>
            </button>

            {/* Deduction Verification Logic Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                [ DEDUCTION VERIFICATION MATRIX ]
              </h3>

              <div className="border-2 border-black overflow-x-auto bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#f5f5f5] text-black">
                      <th className="p-2.5 font-bold uppercase w-1/4">Question</th>
                      <th className="p-2.5 font-bold uppercase w-1/3">Your Deduction</th>
                      <th className="p-2.5 font-bold uppercase w-1/3">Official Solution</th>
                      <th className="p-2.5 font-bold uppercase text-center w-20">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {caseData?.questions?.map((q: any) => {
                      const userChoice = submission.answers?.[q.id];
                      // answerKey is returned by /api/submissions only when host has revealed answers
                      const answerKey = subRes?.answerKey;
                      const masterAns = answerKey?.[q.id];

                      const clean = (s?: string) => s?.trim().toLowerCase().replace(/[\s\-_:'"]/g, "") || "";
                      const isCorrect = userChoice && masterAns ? clean(userChoice) === clean(masterAns) : false;

                      return (
                        <tr key={q.id} className="hover:bg-[#fff5e2]">
                          <td className="p-2.5 font-bold uppercase text-black">{q.label}</td>
                          <td className="p-2.5 text-black">{userChoice || "—"}</td>
                          <td className="p-2.5 text-[#6b7280]">{masterAns || "—"}</td>
                          <td className="p-2.5 text-center">
                            {masterAns ? (
                              isCorrect ? (
                                <span className="inline-block whitespace-nowrap px-2 py-1 border-2 border-black bg-[#A30B37] text-white text-[10px] font-black uppercase tracking-wide">
                                  CORRECT
                                </span>
                              ) : (
                                <span className="inline-block whitespace-nowrap px-2 py-1 border-2 border-black bg-[#f5f5f5] text-[#6b7280] text-[10px] font-black uppercase tracking-wide">
                                  WRONG
                                </span>
                              )
                            ) : (
                              <span className="inline-block whitespace-nowrap px-2 py-1 border-2 border-black bg-[#f5f5f5] text-[#6b7280] text-[10px] font-black uppercase">
                                —
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

          </div>
        )}
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white border-[3px] border-black p-5 shadow-[6px_6px_0px_#000] font-mono text-black">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#A30B37]" />
                Final Squad Leaderboard
              </h3>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-black hover:text-white font-bold text-xs shadow-[2px_2px_0px_#000]"
                title="Close leaderboard"
              >
                ✕
              </button>
            </div>
            <div className="border-2 border-black overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f5f5f5] font-bold uppercase">
                    <th className="p-2.5">Rank</th>
                    <th className="p-2.5">Squad</th>
                    <th className="p-2.5 text-center">Correct</th>
                    <th className="p-2.5 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {leaderboardList.map((item: any, index: number) => (
                    <tr key={item.teamName} className={item.teamName?.toLowerCase().trim() === submission.teamName?.toLowerCase().trim() ? "bg-[#fff5e2] font-black" : ""}>
                      <td className="p-2.5">#{index + 1}</td>
                      <td className="p-2.5 uppercase">{item.teamName}</td>
                      <td className="p-2.5 text-center text-[#A30B37]">{item.breakdown?.correctCount || 0}</td>
                      <td className="p-2.5 text-right">{item.score || 0} PTS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-8 bg-[#fbfbf9] text-black font-mono">
          <div className="border-2 border-black p-4 bg-[#fff5e2] shadow-[4px_4px_0px_#000000]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">
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
