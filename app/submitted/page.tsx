"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import confetti from "canvas-confetti";
import { ShieldCheck, Clock, Award, CheckCircle2, XCircle, Sparkles, RefreshCw, Cpu } from "lucide-react";
import SquadIconDisplay from "@/components/SquadIconDisplay";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubmittedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamName = searchParams.get("teamName") || localStorage.getItem("aimurdle_team_name") || "Cyber Sleuths";

  const { data: subRes } = useSWR(`/api/submissions?teamName=${encodeURIComponent(teamName)}`, fetcher, {
    refreshInterval: 3000,
  });

  const { data: configRes } = useSWR("/api/config", fetcher, {
    refreshInterval: 3000,
  });

  const { data: caseRes } = useSWR("/api/cases/ghost-in-the-model", fetcher);

  const submission = subRes?.submission;
  const config = configRes?.config;
  const caseData = caseRes?.case;

  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);

  // Trigger confetti when host reveals answer key
  useEffect(() => {
    if (config?.answerKeyRevealed && !hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#00f0ff", "#00ff66", "#ff007f", "#ffb703"],
      });
    }
  }, [config?.answerKeyRevealed, hasTriggeredConfetti]);

  if (!submission) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-cyber-cyan">
        <Cpu className="w-10 h-10 animate-spin mb-4" />
        <p className="text-sm font-mono tracking-widest animate-pulse">FETCHING SQUAD DEDUCTION LOGS...</p>
      </div>
    );
  }

  const isRevealed = Boolean(config?.answerKeyRevealed);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 cyber-bg-grid">
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-center">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-green" />

        {/* Lock Screen Mode vs Revealed Results Mode */}
        {!isRevealed ? (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-cyber-cyan/10 border border-cyber-cyan/40 flex items-center justify-center mx-auto text-cyber-cyan shadow-cyan-glow">
              <ShieldCheck className="w-10 h-10 animate-pulse" />
            </div>

            <div>
              <span className="text-xs uppercase px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold tracking-widest">
                DEDUCTIONS LOCKED IN
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white mt-3 flex items-center justify-center space-x-3">
                <span className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan inline-flex">
                  <SquadIconDisplay iconId={submission.squadBadge} className="w-8 h-8 md:w-10 md:h-10" />
                </span>
                <span>{submission.teamName}</span>
              </h1>
              <p className="text-slate-400 text-xs md:text-sm mt-2">
                Your squad case findings have been sealed and logged in the host command mainframe.
              </p>
            </div>

            {/* Waiting for Host Status Indicator */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-center space-x-2 text-cyber-amber text-sm font-bold animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AWAITING HOST MASTER REVEAL...</span>
              </div>
              <p className="text-xs text-slate-400">
                Keep this screen open. When the host finishes the round and reveals the solution key, your detailed breakdown & score will unlock automatically!
              </p>
            </div>

            {/* Submitted Answers Summary */}
            <div className="text-left bg-slate-950/50 rounded-2xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Submitted Deductions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {submission.answers &&
                  Object.entries(submission.answers).map(([qId, val]) => (
                    <div key={qId} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 uppercase text-[10px] font-bold">Question {qId}</div>
                      <div className="text-slate-200 font-semibold mt-1">{String(val)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* REVEALED RESULTS & SCORE BREAKDOWN MODE */
          <div className="space-y-8 animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-cyber-green/10 border border-cyber-green/40 flex items-center justify-center mx-auto text-cyber-green shadow-green-glow">
              <Award className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-xs uppercase px-3 py-1 rounded-full bg-cyber-green/10 border border-cyber-green/30 text-cyber-green font-bold tracking-widest">
                OFFICIAL CASE RESULTS REVEALED
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white mt-2 flex items-center justify-center space-x-3">
                <span className="p-2 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-cyber-green inline-flex">
                  <SquadIconDisplay iconId={submission.squadBadge} className="w-8 h-8 md:w-10 md:h-10" />
                </span>
                <span>{submission.teamName}</span>
              </h1>
            </div>

            {/* Total Points Highlight */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cyber-cyan/15 via-cyber-green/15 to-cyber-magenta/15 border border-cyber-cyan/40 shadow-cyan-glow max-w-md mx-auto">
              <div className="text-xs uppercase text-slate-400 tracking-widest font-semibold mb-1">TOTAL SCORE</div>
              <div className="text-5xl font-black text-cyber-cyan glow-cyan">{submission.score || 0} PTS</div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                <div>
                  <div className="text-slate-500 font-semibold">CORRECT</div>
                  <div className="text-cyber-green font-bold text-base">{submission.breakdown?.correctCount || 0} / 4</div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold font-mono">BASE PTS</div>
                  <div className="text-slate-200 font-bold text-base">{submission.breakdown?.basePoints || 0}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-semibold font-mono">SPEED BONUS</div>
                  <div className="text-cyber-amber font-bold text-base">+{submission.breakdown?.timeBonus || 0}</div>
                </div>
              </div>
            </div>

            {/* Detailed Question Answers Comparison */}
            {caseData?.questions && (
              <div className="text-left space-y-4">
                <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider">Solution Key Comparison</h3>

                <div className="space-y-3">
                  {caseData.questions.map((q: any) => {
                    const teamAns = submission.answers?.[q.id];
                    const answerKey = subRes?.answerKey;
                    const masterAns = answerKey?.[q.id];

                    const clean = (s?: string) => s?.trim().toLowerCase().replace(/[\s\-_:'"]/g, "") || "";
                    const isCorrect = teamAns && masterAns && clean(teamAns) === clean(masterAns);

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border ${
                          isCorrect ? "border-cyber-green/40 bg-cyber-green/5" : "border-red-500/40 bg-red-950/20"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-200">{q.label}</span>
                          {isCorrect ? (
                            <span className="flex items-center space-x-1 text-xs text-cyber-green font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>CORRECT (+{q.points} PTS)</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-xs text-red-400 font-bold">
                              <XCircle className="w-4 h-4" />
                              <span>INCORRECT (0 PTS)</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-2 space-y-1">
                          <div>
                            <span className="text-slate-500 uppercase font-semibold">Your Squad Pick: </span>
                            <span className={isCorrect ? "text-cyber-green font-bold" : "text-red-300 font-bold"}>
                              {teamAns || "No selection"}
                            </span>
                          </div>
                          {masterAns && !isCorrect && (
                            <div>
                              <span className="text-slate-500 uppercase font-semibold">Official Solution: </span>
                              <span className="text-cyber-cyan font-bold">{masterAns}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-cyber-cyan">
          <Cpu className="w-10 h-10 animate-spin mb-4" />
          <p className="text-sm font-mono tracking-widest animate-pulse">FETCHING SQUAD DEDUCTION LOGS...</p>
        </div>
      }
    >
      <SubmittedContent />
    </Suspense>
  );
}

