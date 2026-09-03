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
  Users,
} from "lucide-react";
import SquadIconDisplay from "@/components/SquadIconDisplay";

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

  const fetcherWithAuth = (url: string) =>
    fetch(url, {
      headers: teamToken ? { "x-team-token": teamToken } : {},
    }).then((res) => {
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED_SQUAD_ACCESS");
      }
      return res.json();
    });

  const { data: subRes } = useSWR(
    "/api/submissions",
    fetcherWithAuth,
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
    if (typeof window !== "undefined") {
      localStorage.removeItem("aimurdle_team_name");
      localStorage.removeItem("aimurdle_current_token");
      localStorage.removeItem("aimurdle_squad_badge");
      localStorage.removeItem("aimurdle_case_id");
    }
    router.push("/");
  };

  const isRemovedOrMissing = !submission || subRes?.isRemoved;
  const leaderboardList: any[] = subRes?.leaderboard || [];

  // Calculate current squad rank
  const squadRankIndex = leaderboardList.findIndex(
    (item: any) => item.teamName?.toLowerCase().trim() === submission?.teamName?.toLowerCase().trim()
  );
  const squadRank = squadRankIndex !== -1 ? squadRankIndex + 1 : null;
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
              The investigation round has concluded. Official final scores are tallied below.
            </p>
          </div>

          {/* Final Leaderboard Table */}
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
              <h3 className="text-xs font-black uppercase text-black flex items-center space-x-1.5">
                <Trophy className="w-4 h-4 text-[#A30B37]" />
                <span>FINAL SQUAD LEADERBOARD</span>
              </h3>
              <span className="text-[10px] font-bold text-[#6b7280]">
                {leaderboardList.length} SQUADS TOTAL
              </span>
            </div>

            {leaderboardList.length === 0 ? (
              <div className="p-6 bg-[#fff5e2] border-2 border-black text-center text-xs font-bold uppercase text-[#6b7280]">
                Lobby reset by Chief Inspector. Ready for a new investigation round!
              </div>
            ) : (
              <div className="border-2 border-black overflow-x-auto bg-white shadow-[2px_2px_0px_#000]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#f5f5f5] text-black font-bold uppercase">
                      <th className="p-2.5">Rank</th>
                      <th className="p-2.5">Squad Name</th>
                      <th className="p-2.5 text-center">Correct</th>
                      <th className="p-2.5 text-center">Time</th>
                      <th className="p-2.5 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {leaderboardList.map((item: any, idx: number) => (
                      <tr key={item.teamName} className={idx === 0 ? "bg-[#fff5e2] font-black" : "hover:bg-[#fbfbf9]"}>
                        <td className="p-2.5 font-bold">
                          #{idx + 1}
                        </td>
                        <td className="p-2.5 font-bold uppercase text-black">
                          {item.teamName}
                        </td>
                        <td className="p-2.5 text-center font-bold text-[#A30B37]">
                          {item.breakdown?.correctCount || 0} / 3
                        </td>
                        <td className="p-2.5 text-center text-[#6b7280]">
                          {item.timeTakenSeconds || 0}s
                        </td>
                        <td className="p-2.5 text-right font-black text-black">
                          {item.score || 0} PTS
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

              {squadRank && (
                <div className="inline-block px-3 py-1 bg-[#A30B37] text-white border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
                  RANK #{squadRank} OF {totalSquads} SQUADS
                </div>
              )}
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

            {/* Leaderboard Popup Trigger Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full py-3 bg-[#fff5e2] hover:bg-black hover:text-white border-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                <Trophy className="w-4 h-4 text-[#A30B37]" />
                <span>[ VIEW LIVE LEADERBOARD ]</span>
              </button>
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

            {/* Scorecard Box with Squad Rank */}
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

            {/* Leaderboard Popup Trigger Button */}
            <div className="pt-2">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full py-3 bg-[#fff5e2] hover:bg-black hover:text-white border-2 border-black font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                <Trophy className="w-4 h-4 text-[#A30B37]" />
                <span>[ VIEW LIVE LEADERBOARD ]</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🏆 POPUP LEADERBOARD MODAL ────────────────────────────────────────── */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border-[3px] border-black p-5 md:p-6 shadow-[6px_6px_0px_#000000] relative max-h-[85vh] flex flex-col font-mono text-black">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-black mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#A30B37] tracking-widest block">
                  [ OFFICIAL INCIDENT ARCHIVE ]
                </span>
                <h3 className="text-base font-black uppercase text-black flex items-center space-x-1.5">
                  <Trophy className="w-4 h-4 text-[#A30B37]" />
                  <span>LIVE SQUAD LEADERBOARD</span>
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-black hover:text-white font-bold text-xs flex items-center justify-center transition shadow-[2px_2px_0px_#000]"
                title="Close Leaderboard"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable Table */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="border-2 border-black overflow-x-auto bg-white shadow-[2px_2px_0px_#000]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-[#f5f5f5] text-black font-bold uppercase">
                      <th className="p-2.5">Rank</th>
                      <th className="p-2.5">Squad Name</th>
                      <th className="p-2.5 text-center">Correct</th>
                      <th className="p-2.5 text-center">Time</th>
                      <th className="p-2.5 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {leaderboardList.map((item: any, idx: number) => {
                      const isCurrentSquad = item.teamName?.toLowerCase().trim() === submission?.teamName?.toLowerCase().trim();
                      return (
                        <tr
                          key={item.teamName}
                          className={
                            isCurrentSquad
                              ? "bg-[#fff5e2] font-black border-l-4 border-l-[#A30B37]"
                              : "hover:bg-[#fbfbf9]"
                          }
                        >
                          <td className="p-2.5 font-bold">#{idx + 1}</td>
                          <td className="p-2.5 font-bold uppercase text-black flex items-center space-x-1.5">
                            <span className="truncate max-w-[120px]">{item.teamName}</span>
                            {isCurrentSquad && (
                              <span className="px-1.5 py-0.5 border border-black bg-[#A30B37] text-white text-[9px] font-bold uppercase">
                                YOU
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold text-[#A30B37]">
                            {item.breakdown?.correctCount || 0} / 3
                          </td>
                          <td className="p-2.5 text-center text-[#6b7280]">
                            {item.timeTakenSeconds || 0}s
                          </td>
                          <td className="p-2.5 text-right font-black text-black">
                            {item.score || 0} PTS
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t-2 border-black mt-4">
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full py-2.5 bg-white hover:bg-[#fff5e2] text-black border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition"
              >
                [ CLOSE LEADERBOARD ✕ ]
              </button>
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
