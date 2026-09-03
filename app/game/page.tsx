"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Clock,
  Shield,
  FileText,
  Users,
  Search,
  BookOpen,
  Send,
  AlertOctagon,
  ChevronRight,
  CheckCircle2,
  Lock,
  Cpu,
  Volume2,
  Terminal as TerminalIcon,
} from "lucide-react";

import SquadIconDisplay from "@/components/SquadIconDisplay";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamNameFromQuery = searchParams.get("teamName") || "";
  const caseIdFromQuery = searchParams.get("caseId") || "";

  const [teamName, setTeamName] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [squadBadge, setSquadBadge] = useState("🔍");
  const [activeTab, setActiveTab] = useState<"dossier" | "suspects" | "evidence" | "notebook">("dossier");

  // Selection states
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [selectedEvidenceTag, setSelectedEvidenceTag] = useState<string>("ALL");

  // Scratchpad state
  const [notes, setNotes] = useState("");

  // Deduction Terminal Modal State
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Dynamic SWR Case fetching based on allotted caseId or random team allotment
  const activeCaseId = caseId || caseIdFromQuery || (typeof window !== "undefined" ? localStorage.getItem("aimurdle_case_id") : "");
  const caseApiUrl = activeCaseId
    ? `/api/cases/${activeCaseId}`
    : `/api/cases/random${teamNameFromQuery ? `?teamName=${encodeURIComponent(teamNameFromQuery)}` : ""}`;

  const { data: caseRes } = useSWR(caseApiUrl, fetcher);
  const { data: configRes } = useSWR("/api/config", fetcher, { refreshInterval: 3000 });

  const caseData = caseRes?.case;
  const gameConfig = configRes?.config;

  // Initialize Team from query or localStorage
  useEffect(() => {
    const name = teamNameFromQuery || localStorage.getItem("aimurdle_team_name") || "Cyber Sleuths";
    const badge = localStorage.getItem("aimurdle_squad_badge") || "🔍";
    setTeamName(name);
    setSquadBadge(badge);

    // Load saved notebook
    const savedNotes = localStorage.getItem(`aimurdle_notebook_${name}`);
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, [teamNameFromQuery]);

  // Save Notebook changes
  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (teamName) {
      localStorage.setItem(`aimurdle_notebook_${teamName}`, text);
    }
  };

  // Live Timer Calculation
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);

  useEffect(() => {
    if (!gameConfig) return;

    if (!gameConfig.isTimerRunning && gameConfig.timerPausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(gameConfig.timerPausedTimeLeftSeconds);
      return;
    }

    if (gameConfig.timerStartTime) {
      const startMs = new Date(gameConfig.timerStartTime).getTime();
      const serverMs = gameConfig.serverTime ? new Date(gameConfig.serverTime).getTime() : Date.now();
      const elapsedSeconds = Math.floor((serverMs - startMs) / 1000);
      const totalSeconds = (gameConfig.timerDurationMinutes || 15) * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setTimeLeftSeconds(remaining);
    }
  }, [gameConfig]);

  // Local interval countdown for smooth UI ticker
  useEffect(() => {
    if (!gameConfig?.isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameConfig?.isTimerRunning]);

  // Redirect to submitted if game ended
  useEffect(() => {
    if (gameConfig?.isGameEnded) {
      router.push(`/submitted?teamName=${encodeURIComponent(teamName)}`);
    }
  }, [gameConfig?.isGameEnded, teamName, router]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: string, optionValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionValue,
    }));
  };

  const handleSubmitDeductions = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      const totalRoundSeconds = (caseData?.timeLimitMinutes || 15) * 60;
      const timeTakenSeconds = Math.max(0, totalRoundSeconds - timeLeftSeconds);

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          teamName,
          squadBadge,
          answers,
          caseId: caseData?.id || "ghost-in-the-model",
          timeTakenSeconds,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push(`/submitted?teamName=${encodeURIComponent(teamName)}`);
      } else {
        setSubmitError(data.error || "Failed to seal deductions.");
      }
    } catch {
      setSubmitError("Network error sending deductions.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!caseData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-cyber-cyan">
        <Cpu className="w-12 h-12 animate-spin mb-4" />
        <p className="text-sm uppercase tracking-widest animate-pulse">DECRYPTING CASE FILES...</p>
      </div>
    );
  }

  const questionsCount = caseData.questions?.length || 4;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-cyber-bg">
      {/* Top Header Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/90 px-4 md:px-8 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan shadow-cyan-glow">
              <SquadIconDisplay iconId={squadBadge} className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Investigator Squad</div>
              <div className="text-sm font-bold text-slate-100">{teamName || "Anonymous Sleuth"}</div>
            </div>
          </div>
        </div>

        {/* Live Synchronized Countdown Timer */}
        <div className="flex items-center space-x-3 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-inner">
          <Clock className={`w-5 h-5 ${timeLeftSeconds < 180 ? "text-red-400 animate-bounce" : "text-cyber-cyan"}`} />
          <span
            className={`font-mono text-xl font-bold tracking-widest ${
              timeLeftSeconds < 180
                ? "text-red-400 glow-red"
                : timeLeftSeconds < 300
                ? "text-yellow-400"
                : "text-cyber-cyan glow-cyan"
            }`}
          >
            {formatTime(timeLeftSeconds)}
          </span>
          <span className="text-xs text-slate-400 uppercase hidden md:inline">REMAINING</span>
        </div>

        {/* Submit Deduction Action Button */}
        <button
          onClick={() => setIsDeductionModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-magenta to-crimson-alert hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-magenta-glow transition transform active:scale-95 animate-pulse-fast"
        >
          <AlertOctagon className="w-4 h-4" />
          <span className="hidden md:inline">VICTIM BOX / FINAL DEDUCTION</span>
          <span className="md:hidden">DEDUCT ({answeredCount}/{questionsCount})</span>
        </button>
      </header>

      {/* Main Secondary Sub-Header Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 md:px-8 flex items-center space-x-2 md:space-x-4 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setActiveTab("dossier")}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-bold uppercase transition ${
            activeTab === "dossier"
              ? "border-cyber-cyan text-cyber-cyan bg-cyber-cyan/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Case Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab("suspects")}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-bold uppercase transition ${
            activeTab === "suspects"
              ? "border-cyber-magenta text-cyber-magenta bg-cyber-magenta/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Suspect Files ({caseData.suspects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("evidence")}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-bold uppercase transition ${
            activeTab === "evidence"
              ? "border-cyber-green text-cyber-green bg-cyber-green/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Evidence Locker ({caseData.evidence.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("notebook")}
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-xs font-bold uppercase transition ${
            activeTab === "notebook"
              ? "border-cyber-amber text-cyber-amber bg-cyber-amber/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Investigator Notebook</span>
        </button>
      </div>

      {/* Tab Content Panes */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Tab 1: Dossier */}
        {activeTab === "dossier" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs uppercase px-2.5 py-1 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold">
                    CLASSIFIED CASE FILE #092
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-2">{caseData.title}</h2>
                  <p className="text-xs text-slate-400">{caseData.subtitle}</p>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6 border-l-2 border-cyber-cyan pl-4 italic">
                "{caseData.summary}"
              </p>

              {/* Victim Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Victim Name</div>
                  <div className="text-lg font-bold text-red-400 flex items-center space-x-2">
                    <span>💀 {caseData.victim.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{caseData.victim.role}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Time & Location</div>
                  <div className="text-sm font-bold text-slate-200">{caseData.victim.timeOfDeath}</div>
                  <div className="text-xs text-slate-400 mt-1">{caseData.victim.location}</div>
                </div>
              </div>
            </div>

            {/* Quick Action Prompt */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cyber-cyan/10 to-cyber-magenta/10 border border-slate-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Ready to examine evidence and suspects?</h3>
                <p className="text-xs text-slate-400">Switch tabs above or click below to proceed to the victim box deduction form.</p>
              </div>

              <button
                onClick={() => setIsDeductionModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-cyber-cyan hover:bg-cyber-cyan/90 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-cyan-glow transition"
              >
                OPEN DEDUCTION TERMINAL
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Suspects */}
        {activeTab === "suspects" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-slate-100">Prime AI Suspect Dossiers</h2>
              <p className="text-xs text-slate-400">Click a suspect card to review detailed bio, alibi, & motives.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {caseData.suspects.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSuspect(s.id)}
                  className={`p-6 rounded-2xl border cursor-pointer transition duration-300 ${
                    selectedSuspect === s.id
                      ? "border-cyber-magenta bg-slate-900 shadow-magenta-glow"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center text-3xl">
                      {s.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-100">{s.name}</h3>
                      <p className="text-xs text-cyber-magenta font-semibold">{s.role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{s.bio}</p>

                  <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold uppercase">Alibi: </span>
                      <span className="text-slate-300">{s.alibi}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold uppercase">Motive: </span>
                      <span className="text-slate-300">{s.motive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Evidence Locker */}
        {activeTab === "evidence" && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Tag Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {["ALL", "Telemetry", "Git Logs", "Audio Log", "Agent Sandbox", "Audit"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedEvidenceTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                    selectedEvidenceTag === tag
                      ? "bg-cyber-green text-slate-950"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {caseData.evidence
                .filter((ev: any) => selectedEvidenceTag === "ALL" || ev.tag === selectedEvidenceTag)
                .map((ev: any) => (
                  <div key={ev.id} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-2">
                        <TerminalIcon className="w-4 h-4 text-cyber-green" />
                        <h3 className="text-sm font-bold text-slate-100">{ev.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
                          {ev.tag}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">{ev.timestamp}</span>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 text-xs font-mono text-green-400 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {ev.content}
                    </pre>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 4: Notebook */}
        {activeTab === "notebook" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-100">Investigator Scratchpad</h2>
              <span className="text-xs text-slate-400">Auto-saved to local storage</span>
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Record your theories, suspect timelines, and key evidence connections here..."
              rows={16}
              className="w-full bg-slate-900/80 border border-slate-800 focus:border-cyber-amber rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed font-mono"
            />
          </div>
        )}
      </main>

      {/* DEDUCTION TERMINAL / VICTIM BOX MODAL */}
      {isDeductionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyber-cyan/50 rounded-2xl p-6 md:p-8 shadow-cyan-glow relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyber-cyan font-bold text-lg">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
                <span>VICTIM BOX: SEAL CASE DEDUCTIONS</span>
              </div>
              <button
                onClick={() => setIsDeductionModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {caseData.questions.map((q: any) => (
                <div key={q.id} className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-100">{q.label}</h3>
                    <span className="text-xs text-cyber-cyan font-bold">{q.points} PTS</span>
                  </div>

                  <p className="text-xs text-slate-300">{q.question}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt: string) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerSelect(q.id, opt)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold transition duration-200 ${
                            isSelected
                              ? "border-cyber-cyan bg-cyber-cyan/15 text-cyber-cyan shadow-cyan-glow"
                              : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-cyber-cyan bg-cyber-cyan text-black" : "border-slate-600"}`}>
                              {isSelected && "✓"}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6 flex justify-between items-center">
              <div className="text-xs text-slate-400">
                Answered <span className="text-cyber-cyan font-bold">{answeredCount}</span> of {questionsCount} questions
              </div>

              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={answeredCount < questionsCount}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-magenta to-crimson-alert hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition"
              >
                SUBMIT DEDUCTIONS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SUBMISSION WARNING MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/60 rounded-2xl p-6 shadow-red-glow text-center">
            <AlertOctagon className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-2">SEAL & SUBMIT DEDUCTIONS?</h3>
            <p className="text-xs text-slate-300 mb-6">
              Warning: Once submitted, your squad deductions will be locked and sent to the Host Command Dashboard for final scoring!
            </p>

            {submitError && <p className="text-xs text-red-400 mb-4">{submitError}</p>}

            <div className="flex space-x-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs uppercase"
              >
                GO BACK
              </button>

              <button
                onClick={handleSubmitDeductions}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-red-glow"
              >
                {submitting ? "SEALING..." : "CONFIRM SUBMIT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-cyber-cyan">
          <Cpu className="w-12 h-12 animate-spin mb-4" />
          <p className="text-sm uppercase tracking-widest animate-pulse">LOADING INVESTIGATION TERMINAL...</p>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}

