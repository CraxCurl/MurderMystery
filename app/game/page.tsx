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
  AlertOctagon,
  CheckCircle2,
  Lock,
  Volume2,
  Terminal as TerminalIcon,
  AlertTriangle,
  FolderLock,
  Cpu,
} from "lucide-react";

import SquadIconDisplay from "@/components/SquadIconDisplay";
import { clearLocalSquadSession } from "@/lib/client-session";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function GameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamNameFromQuery = searchParams.get("teamName") || "";
  const caseIdFromQuery = searchParams.get("caseId") || "";

  const [teamName, setTeamName] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [squadBadge, setSquadBadge] = useState("search");
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

  // Get stored security token for current team
  const [teamToken, setTeamToken] = useState("");
  const [securityError, setSecurityError] = useState("");

  // Prevent Browser Back Button from leaving the game page after joining
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Initialize Team & Security Token from Session
  useEffect(() => {
    const name = teamNameFromQuery || localStorage.getItem("aimurdle_team_name") || "Special Sleuths";
    const badge = localStorage.getItem("aimurdle_squad_badge") || "search";
    const token = localStorage.getItem(`aimurdle_team_token_${name}`) || localStorage.getItem("aimurdle_current_token") || "";
    setTeamName(name);
    setSquadBadge(badge);
    setTeamToken(token);

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

  // SWR Hooks with security headers
  const fetcherWithAuth = (url: string, token: string) =>
    fetch(url, {
      headers: { "x-team-token": token },
    }).then((res) => {
      if (res.status === 401) {
        throw new Error("UNAUTHORIZED_SQUAD_ACCESS");
      }
      return res.json();
    });

  const { data: caseRes } = useSWR("/api/cases/ghost-in-the-model", fetcher);
  const { data: configRes } = useSWR("/api/config", fetcher, { refreshInterval: 2000 });
  const { data: teamSubRes, error: teamSubError } = useSWR(
    teamToken ? ["/api/submissions", teamToken] : null,
    ([url, token]: [string, string]) => fetcherWithAuth(url, token),
    { refreshInterval: 2000 }
  );

  const caseData = teamSubRes?.caseData || caseRes?.case;
  const gameConfig = configRes?.config;
  const teamSubmission = teamSubRes?.submission;
  const globalRoundStatus = teamSubRes?.roundStatus || gameConfig?.roundStatus || "waiting";
  // A newly registered squad must remain in the lobby, even when the previous
  // round is still displayed as ended for its existing participants.
  const roundStatus = teamSubmission?.teamStatus === "waiting"
    ? "waiting"
    : teamSubmission?.teamStatus === "ended"
      ? "ended"
      : globalRoundStatus;
  const roundStartedAt = teamSubRes?.roundStartedAt || gameConfig?.roundStartedAt;

  // Sync team metadata from submission response
  useEffect(() => {
    if (teamSubmission) {
      if (teamSubmission.teamName) setTeamName(teamSubmission.teamName);
      if (teamSubmission.squadBadge) setSquadBadge(teamSubmission.squadBadge);
      if (teamSubmission.isSubmitted || teamSubmission.teamStatus === "ended") {
        router.replace("/submitted");
      }
    }
  }, [teamSubmission, router]);

  // A host reset deletes this squad server-side. Clear the now-invalid local
  // session and make the player register a fresh team name.
  useEffect(() => {
    if (teamSubRes?.isRemoved) {
      clearLocalSquadSession();
      router.replace("/");
    }
  }, [teamSubRes?.isRemoved, router]);

  // Handle unauthorized access attempt
  useEffect(() => {
    if (teamSubError && teamSubError.message === "UNAUTHORIZED_SQUAD_ACCESS") {
      setSecurityError("Unauthorized access attempt! Please register your squad first.");
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
  }, [teamSubError, router]);

  // Server-Synced Timer Calculation
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);

  useEffect(() => {
    if (roundStatus !== "active" || !roundStartedAt) {
      const dur = teamSubRes?.timerDurationMinutes || gameConfig?.timerDurationMinutes || 15;
      setTimeLeftSeconds(dur * 60);
      return;
    }

    const durationMinutes = teamSubRes?.timerDurationMinutes || gameConfig?.timerDurationMinutes || 15;
    const totalSeconds = durationMinutes * 60;
    const startMs = new Date(roundStartedAt).getTime();
    const nowMs = teamSubRes?.serverTime ? new Date(teamSubRes.serverTime).getTime() : Date.now();
    const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsedSeconds);
    setTimeLeftSeconds(remaining);
  }, [roundStatus, roundStartedAt, teamSubRes, gameConfig]);

  // Local 1-second countdown ticker
  useEffect(() => {
    if (roundStatus !== "active") return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [roundStatus]);

  // Auto-submit when timer reaches 00:00 or when round ends
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  useEffect(() => {
    if (
      roundStatus === "active" &&
      timeLeftSeconds <= 0 &&
      !hasAutoSubmitted &&
      !submitting &&
      teamSubmission &&
      !teamSubmission.isSubmitted
    ) {
      setHasAutoSubmitted(true);
      handleSubmitDeductions();
    }
  }, [timeLeftSeconds, roundStatus, hasAutoSubmitted, submitting, teamSubmission]);

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
      const totalRoundSeconds = (teamSubRes?.timerDurationMinutes || 15) * 60;
      const timeTakenSeconds = Math.max(0, totalRoundSeconds - timeLeftSeconds);

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-team-token": teamToken,
        },
        body: JSON.stringify({
          action: "submit",
          teamName,
          squadBadge,
          answers,
          caseId: "ghost-in-the-model",
          timeTakenSeconds,
          teamToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/submitted");
      } else {
        setSubmitError(data.error || "Failed to file indictment.");
      }
    } catch {
      setSubmitError("Network error transmitting deductions.");
    } finally {
      setSubmitting(false);
    }
  };

  if (securityError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fbfbf9] font-mono text-black">
        <div className="p-8 max-w-md bg-[#fff5e2] border-3 border-black shadow-[6px_6px_0px_#000] space-y-4">
          <AlertOctagon className="w-12 h-12 text-[#A30B37] mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-[#A30B37]">ACCESS DENIED</h2>
          <p className="text-xs text-black leading-relaxed">{securityError}</p>
          <p className="text-[10px] text-[#6b7280]">Redirecting to squad registration...</p>
        </div>
      </div>
    );
  }

  // WAITING LOBBY SCREEN (when host has not started the round yet)
  if (roundStatus === "waiting" || teamSubmission?.teamStatus === "waiting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#fbfbf9] text-center font-mono text-black">
        <div className="max-w-lg w-full bg-[#fff5e2] border-3 border-black p-8 shadow-[6px_6px_0px_#000] space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 border-2 border-black bg-white text-black text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_#000] animate-pulse">
            <Clock className="w-4 h-4 text-[#A30B37]" />
            <span>WAITING FOR HOST TO START ROUND</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-black tracking-wider">[ SYSTEM STANDBY ]</h1>
            <p className="text-xs text-black leading-relaxed">
              Your squad has successfully registered. All investigation teams start simultaneously when the host triggers the round timer.
            </p>
          </div>

          <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 border-2 border-black bg-[#fff5e2] text-black">
                <SquadIconDisplay iconId={squadBadge} className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-black uppercase">{teamName || "Squad"}</div>
                <div className="text-[10px] text-[#A30B37] font-bold uppercase">
                  {caseData?.title ? `Case Dossier: ${caseData.title}` : "Assigned Case Dossier Loading..."}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 border-2 border-black bg-[#fff5e2] text-black text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#A30B37] animate-ping" />
              <span>READY</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#6b7280] flex items-center justify-center space-x-2">
            <Cpu className="w-4 h-4 text-[#A30B37] animate-spin" />
            <span>Polling host command signal every 2s...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfbf9] text-black font-mono">
        <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000] text-center">
          <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
            [ OPENING CASE DOSSIER... ]
          </p>
        </div>
      </div>
    );
  }

  const questionsCount = caseData.questions?.length || 3;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fbfbf9] text-black font-mono">
      {/* Top Booklet Command Masthead */}
      <header className="border-b-4 border-black bg-white px-4 py-2.5 z-20 flex-shrink-0">
        <div className="max-w-[720px] w-full mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Squad Badge & Title */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 border-2 border-black bg-[#fff5e2] flex items-center justify-center text-black shadow-[2px_2px_0px_#000]">
              <SquadIconDisplay iconId={squadBadge} className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-[#6b7280]">
                CASE #092 // UNIT
              </div>
              <div className="text-xs font-bold uppercase text-black truncate max-w-[160px] sm:max-w-[220px]">
                {teamName || "ANONYMOUS SLEUTH"}
              </div>
            </div>
          </div>

          {/* Typewriter Chronometer Box */}
          <div className="flex items-center space-x-2 px-3 py-1 border-2 border-black bg-[#fff5e2] shadow-[2px_2px_0px_#000]">
            <Clock
              className={`w-3.5 h-3.5 ${
                timeLeftSeconds < 180 ? "text-[#A30B37] animate-pulse" : "text-black"
              }`}
            />
            <span
              className={`font-mono text-sm md:text-base font-bold tracking-wider ${
                timeLeftSeconds < 180 ? "text-[#A30B37]" : "text-black"
              }`}
            >
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          {/* Primary Accusation / Deduction Action Button */}
          <button
            onClick={() => setIsDeductionModalOpen(true)}
            className="px-3 py-1.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
          >
            [ ACCUSE ({answeredCount}/{questionsCount}) ]
          </button>
        </div>
      </header>

      {/* Main Centered Booklet Container */}
      <div className="max-w-[720px] w-[95%] mx-auto flex-1 flex flex-col pt-4 pb-8">
        {/* Retro Folder Index Tabs */}
        <div className="flex space-x-1 border-b-2 border-black flex-shrink-0 overflow-x-auto pb-0">
          <button
            onClick={() => setActiveTab("dossier")}
            className={`py-2 px-3 md:px-4 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "dossier"
                ? "bg-white text-black border-t-3 border-x-2 border-b-0 border-black shadow-[2px_-2px_0px_#000] -mb-[2px] z-10"
                : "bg-[#f0efe9] text-[#6b7280] border-2 border-black hover:bg-[#fff5e2] hover:text-black"
            }`}
          >
            [ 1. DOSSIER ]
          </button>

          <button
            onClick={() => setActiveTab("suspects")}
            className={`py-2 px-3 md:px-4 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "suspects"
                ? "bg-white text-black border-t-3 border-x-2 border-b-0 border-black shadow-[2px_-2px_0px_#000] -mb-[2px] z-10"
                : "bg-[#f0efe9] text-[#6b7280] border-2 border-black hover:bg-[#fff5e2] hover:text-black"
            }`}
          >
            [ 2. SUSPECTS ({caseData.suspects.length}) ]
          </button>

          <button
            onClick={() => setActiveTab("evidence")}
            className={`py-2 px-3 md:px-4 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "evidence"
                ? "bg-white text-black border-t-3 border-x-2 border-b-0 border-black shadow-[2px_-2px_0px_#000] -mb-[2px] z-10"
                : "bg-[#f0efe9] text-[#6b7280] border-2 border-black hover:bg-[#fff5e2] hover:text-black"
            }`}
          >
            [ 3. EVIDENCE ({caseData.evidence.length}) ]
          </button>

          <button
            onClick={() => setActiveTab("notebook")}
            className={`py-2 px-3 md:px-4 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "notebook"
                ? "bg-white text-black border-t-3 border-x-2 border-b-0 border-black shadow-[2px_-2px_0px_#000] -mb-[2px] z-10"
                : "bg-[#f0efe9] text-[#6b7280] border-2 border-black hover:bg-[#fff5e2] hover:text-black"
            }`}
          >
            [ 4. NOTEBOOK ]
          </button>
        </div>

        {/* Tab Content Panes */}
        <main className="flex-1 bg-white border-2 border-t-0 border-black p-4 md:p-6 shadow-[4px_4px_0px_#000]">
          {/* Tab 1: Case Dossier */}
          {activeTab === "dossier" && (
            <div className="space-y-5">
              <div className="border-b-2 border-black pb-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-[#6b7280] mb-1">
                  <span>OFFICIAL MURDLE DOSSIER</span>
                  <span>DIFFICULTY: {caseData.difficulty || "INTERMEDIATE"}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black uppercase text-black">
                  {caseData.title}
                </h2>
                <p className="text-xs uppercase text-[#6b7280] mt-0.5">
                  {caseData.subtitle}
                </p>
              </div>

              {/* Case Narrative Box */}
              <div className="bg-[#fbfbf9] border-2 border-black p-4 text-xs md:text-sm leading-relaxed text-black">
                <span className="font-bold text-[#A30B37] uppercase block mb-1">
                  [ INCIDENT SUMMARY ]
                </span>
                "{caseData.summary}"
              </div>

              {/* Victim Information Docket */}
              <div className="bg-[#fff5e2] border-2 border-black p-4 space-y-2">
                <div className="text-xs font-bold uppercase text-[#A30B37] border-b border-black pb-1">
                  [ DECEASED VICTIM REPORT ]
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#6b7280] block text-[10px] uppercase font-bold">
                      VICTIM:
                    </span>
                    <span className="font-black text-sm uppercase text-black">
                      {caseData.victim.name}
                    </span>
                    <span className="block text-[11px] text-[#6b7280] uppercase">
                      {caseData.victim.role}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#6b7280] block text-[10px] uppercase font-bold">
                      TIME & LOCATION:
                    </span>
                    <span className="font-bold text-black uppercase">
                      {caseData.victim.timeOfDeath}
                    </span>
                    <span className="block text-[11px] text-black">
                      {caseData.victim.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call to Action Banner */}
              <div className="border-2 border-black p-4 bg-[#f5f5f5] flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-xs">
                  <span className="font-bold uppercase block text-black">
                    READY TO FILE YOUR ACCUSATION?
                  </span>
                  <span className="text-[#6b7280] text-[11px]">
                    Examine suspects & evidence or enter the accusation terminal.
                  </span>
                </div>

                <button
                  onClick={() => setIsDeductionModalOpen(true)}
                  className="px-4 py-2 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000] whitespace-nowrap"
                >
                  OPEN ACCUSATION FORM
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Suspect Dossiers */}
          {activeTab === "suspects" && (
            <div className="space-y-4">
              <div className="border-b-2 border-black pb-2 flex justify-between items-center text-xs font-bold uppercase">
                <span>[ 4 PRIME SUSPECTS ]</span>
                <span className="text-[#6b7280] text-[10px]">CLICK CARD TO INSPECT</span>
              </div>

              <div className="space-y-4">
                {caseData.suspects.map((s: any, idx: number) => {
                  const isSelected = selectedSuspect === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSuspect(s.id)}
                      className={`p-4 border-2 border-black cursor-pointer transition ${
                        isSelected
                          ? "bg-[#fff5e2] shadow-[3px_3px_0px_#000]"
                          : "bg-white hover:bg-[#fbfbf9] shadow-[2px_2px_0px_#000]"
                      }`}
                    >
                      <div className="flex items-start space-x-3 mb-3 pb-2 border-b border-black">
                        <div className="w-12 h-12 border-2 border-black bg-[#fbfbf9] flex items-center justify-center text-2xl flex-shrink-0">
                          {s.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-[#6b7280] uppercase">
                            SUSPECT #{idx + 1}
                          </div>
                          <h3 className="text-sm md:text-base font-black uppercase text-black">
                            {s.name}
                          </h3>
                          <div className="text-xs font-bold text-[#A30B37] uppercase">
                            {s.role}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed mb-3 text-black">
                        {s.bio}
                      </p>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 border border-black bg-[#fbfbf9]">
                          <span className="font-bold text-[#6b7280] uppercase block text-[10px]">
                            RECORDED ALIBI:
                          </span>
                          <span className="text-black">{s.alibi}</span>
                        </div>
                        <div className="p-2 border border-black bg-[#fbfbf9]">
                          <span className="font-bold text-[#A30B37] uppercase block text-[10px]">
                            SUSPECT MOTIVE:
                          </span>
                          <span className="text-black">{s.motive}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Evidence Locker */}
          {activeTab === "evidence" && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex space-x-1 overflow-x-auto pb-2 border-b-2 border-black">
                {["ALL", "Telemetry", "Git Logs", "Audio Log", "Agent Sandbox", "Audit"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedEvidenceTag(tag)}
                    className={`px-2.5 py-1 text-xs font-bold uppercase border border-black transition ${
                      selectedEvidenceTag === tag
                        ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                        : "bg-[#f5f5f5] text-black hover:bg-[#fff5e2]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Evidence Cards List */}
              <div className="space-y-4">
                {caseData.evidence
                  .filter((ev: any) => selectedEvidenceTag === "ALL" || ev.tag === selectedEvidenceTag)
                  .map((ev: any, idx: number) => {
                    const isAudio = ev.tag === "Audio Log";
                    return (
                      <div key={ev.id} className="p-4 border-2 border-black bg-white shadow-[3px_3px_0px_#000]">
                        <div className="flex flex-wrap justify-between items-center gap-1.5 pb-2 mb-2 border-b border-black">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold uppercase text-[#A30B37]">
                              ITEM #0{idx + 1}:
                            </span>
                            <span className="text-xs font-black uppercase text-black">
                              {ev.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] font-bold text-[#6b7280]">
                            <span>[{ev.tag}]</span>
                            <span>{ev.timestamp}</span>
                          </div>
                        </div>

                        {/* ASCII Waveform simulation for Audio Log */}
                        {isAudio && (
                          <div className="mb-2 p-2 border border-black bg-[#fff5e2] text-xs font-mono font-bold text-center tracking-widest text-black">
                            [ AUDIO INTERCEPT: |||!||!||||!||||!||!||| ]
                          </div>
                        )}

                        <pre className="p-3 bg-[#fbfbf9] border border-black text-xs font-mono text-black whitespace-pre-wrap leading-relaxed overflow-x-auto">
                          {ev.content}
                        </pre>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tab 4: Field Notebook */}
          {activeTab === "notebook" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                <span className="text-xs font-bold uppercase text-black">
                  [ INVESTIGATOR FIELD NOTEBOOK ]
                </span>
                <span className="text-[10px] font-bold text-[#6b7280] uppercase">
                  AUTO-SAVED IN LOCAL MEMORY
                </span>
              </div>

              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Record your suspect deduction matrix, eliminate suspects, and cross-reference alibis here..."
                rows={16}
                className="w-full bg-[#fff5e2] border-2 border-black p-3.5 text-xs font-mono text-black placeholder-[#888888] outline-none leading-relaxed shadow-inner"
              />
            </div>
          )}
        </main>
      </div>

      {/* DEDUCTION / ACCUSATION MODAL */}
      {isDeductionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#fff5e2] border-3 border-black p-5 md:p-7 shadow-[6px_6px_0px_#000] relative my-6 max-h-[92vh] flex flex-col font-mono">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 mb-4 border-b-2 border-black">
              <div>
                <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-black">
                  [ FILE SWORN ACCUSATION ]
                </h2>
                <p className="text-[11px] text-[#6b7280] uppercase">
                  Identify the killer, weapon vector, motive, and key evidence.
                </p>
              </div>
              <button
                onClick={() => setIsDeductionModalOpen(false)}
                className="border border-black bg-white px-2 py-0.5 text-xs font-bold hover:bg-black hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {(caseData.questions || []).map((q: any) => (
                <div key={q.id} className="p-4 bg-white border-2 border-black shadow-[2px_2px_0px_#000] space-y-2.5">
                  <div className="flex justify-between items-center border-b border-black pb-1.5">
                    <h3 className="text-xs font-black uppercase text-black">{q.label}</h3>
                    <span className="text-[10px] font-bold text-[#A30B37]">
                      {q.points || 250} PTS
                    </span>
                  </div>

                  <p className="text-xs text-black leading-relaxed">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt: string) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerSelect(q.id, opt)}
                          className={`p-2.5 border-2 text-left text-xs font-bold uppercase transition ${
                            isSelected
                              ? "border-black bg-[#A30B37] text-white shadow-[2px_2px_0px_#000]"
                              : "border-black bg-white text-black hover:bg-[#fff5e2]"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-3.5 h-3.5 border border-black flex items-center justify-center text-[9px] ${
                              isSelected ? "bg-white text-black font-black" : "bg-[#f5f5f5]"
                            }`}>
                              {isSelected ? "✓" : ""}
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Submit Actions */}
            <div className="pt-4 border-t-2 border-black mt-4 flex justify-between items-center">
              <div className="text-xs font-bold uppercase text-[#6b7280]">
                ANSWERED: <span className="text-black font-black">{answeredCount}</span>/{questionsCount}
              </div>

              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={answeredCount < questionsCount}
                className="px-5 py-2.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px]"
              >
                SUBMIT ACCUSATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION WARNING MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-[#fff5e2] border-3 border-black p-6 shadow-[6px_6px_0px_#000] text-center font-mono">
            <h3 className="text-base font-black uppercase text-[#A30B37] mb-2">
              [ SEAL & SUBMIT ACCUSATION? ]
            </h3>
            <p className="text-xs text-black mb-6 leading-relaxed">
              WARNING: Once sealed, your squad's deductions will be locked into the master docket and cannot be modified!
            </p>

            {submitError && (
              <p className="text-xs font-bold text-[#A30B37] mb-3">{submitError}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-black bg-white text-black font-bold text-xs uppercase hover:bg-[#f5f5f5]"
              >
                RETURN TO CASE
              </button>

              <button
                onClick={handleSubmitDeductions}
                disabled={submitting}
                className="flex-1 py-2.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[2px_2px_0px_#000]"
              >
                {submitting ? "SEALING..." : "CONFIRM ACCUSATION"}
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#fbfbf9] text-black font-mono">
          <div className="border-2 border-black p-4 bg-white shadow-[3px_3px_0px_#000]">
            <p className="text-xs font-bold uppercase tracking-widest animate-pulse">
              [ LOADING INVESTIGATION BOOKLET... ]
            </p>
          </div>
        </div>
      }
    >
      <GameContent />
    </Suspense>
  );
}

