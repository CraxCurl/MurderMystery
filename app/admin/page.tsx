"use client";


import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  Shield,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  Lock,
  RefreshCw,
  Cpu,
  Zap,
  FileJson,
  Upload,
  FolderPlus,
  Sliders,
  Radio,
} from "lucide-react";
import SquadIconDisplay from "@/components/SquadIconDisplay";

const fetcher = (url: string, password?: string) =>
  fetch(url, {
    headers: password ? { "x-admin-password": password } : {},
  }).then((res) => {
    if (res.status === 401) throw new Error("Unauthorized");
    return res.json();
  });

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  // Presentation Display Mode
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  // Round Wipe Confirmation Modal
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  // Case Management State
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseJsonInput, setCaseJsonInput] = useState("");
  const [caseUploadError, setCaseUploadError] = useState("");
  const [caseUploadSuccess, setCaseUploadSuccess] = useState("");
  const [setActiveImmediately, setSetActiveImmediately] = useState(true);

  // Check saved password on mount
  useEffect(() => {
    const saved = localStorage.getItem("aimurdle_admin_pass") || "admin123";
    if (saved) {
      setAdminPassword(saved);
      fetch("/api/admin/submissions", {
        headers: { "x-admin-password": saved },
      }).then((res) => {
        if (res.ok) setIsAuthenticated(true);
      });
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    fetch("/api/admin/submissions", {
      headers: { "x-admin-password": adminPassword },
    })
      .then((res) => {
        if (res.ok) {
          localStorage.setItem("aimurdle_admin_pass", adminPassword);
          setIsAuthenticated(true);
        } else {
          setAuthError("Invalid Chief Inspector Access Key.");
        }
      })
      .catch(() => setAuthError("Network error authenticating."));
  };

  // SWR Hooks
  const { data: subData } = useSWR(
    isAuthenticated ? ["/api/admin/submissions", adminPassword] : null,
    ([url, pass]: [string, string]) => fetcher(url, pass),
    { refreshInterval: 2000 }
  );

  const { data: configData } = useSWR(
    isAuthenticated ? ["/api/config", adminPassword] : "/api/config",
    (arg: string | [string, string]) =>
      Array.isArray(arg) ? fetcher(arg[0], arg[1]) : fetcher(arg),
    { refreshInterval: 2000 }
  );

  const { data: casesData } = useSWR(
    isAuthenticated ? ["/api/admin/cases", adminPassword] : null,
    ([url, pass]: [string, string]) => fetcher(url, pass),
    { refreshInterval: 4000 }
  );

  const submissions = subData?.submissions || [];
  const config = configData?.config;

  const availableCases = casesData?.cases || [];
  const activeCaseId = casesData?.activeCaseId || "ghost-in-the-model";

  // Case Action Handler
  const handleCaseAction = async (payload: any) => {
    setCaseUploadError("");
    setCaseUploadSuccess("");
    try {
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCaseUploadSuccess(data.message || "Case updated successfully!");
        mutate(["/api/admin/cases", adminPassword]);
        mutate("/api/config");
      } else {
        setCaseUploadError(data.error || "Failed to process case action.");
      }
    } catch {
      setCaseUploadError("Network error sending case data.");
    }
  };

  // JSON File Picker Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setCaseJsonInput(JSON.stringify(parsed, null, 2));
      } catch {
        setCaseUploadError("Uploaded file is not valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Admin Config Action Helper
  const sendConfigAction = async (payload: any) => {
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(payload),
      });
      mutate("/api/config");
    } catch (e) {
      console.error("Failed to update config:", e);
    }
  };

  // Admin Submission Action Helper
  const sendSubAction = async (payload: any) => {
    try {
      await fetch("/api/admin/submissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(payload),
      });
      mutate(["/api/admin/submissions", adminPassword]);
    } catch (e) {
      console.error("Failed submission action:", e);
    }
  };

  // Live Timer Display Calculation
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);

  useEffect(() => {
    if (!config) return;

    if (!config.isTimerRunning && config.timerPausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(config.timerPausedTimeLeftSeconds);
      return;
    }

    if (config.timerStartTime) {
      const startMs = new Date(config.timerStartTime).getTime();
      const serverMs = config.serverTime ? new Date(config.serverTime).getTime() : Date.now();
      const elapsedSeconds = Math.floor((serverMs - startMs) / 1000);
      const totalSeconds = (config.timerDurationMinutes || 15) * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setTimeLeftSeconds(remaining);
    }
  }, [config]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    if (!submissions.length) return;
    let csv = "Rank,Squad Emblem,Team Name,Status,Score,Correct Count,Time Taken (s),Joined At,Submitted At\n";
    submissions.forEach((s: any, idx: number) => {
      csv += `${idx + 1},"${s.squadBadge || "search"}","${s.teamName}","${s.isSubmitted ? "Submitted" : "Investigating"}",${s.score || 0},${s.breakdown?.correctCount || 0},${s.timeTakenSeconds || 0},"${s.joinedAt || ""}","${s.submittedAt || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Murdle_Squad_Roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Authentication barrier
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#fbfbf9] text-black font-mono">
        <div className="w-full max-w-md bg-[#fff5e2] border-3 border-black p-6 md:p-8 shadow-[6px_6px_0px_#000] text-center">
          <div className="border-b-2 border-black pb-3 mb-4">
            <span className="text-[10px] font-bold text-[#A30B37] uppercase tracking-widest block mb-1">
              [ RESTRICTED ACCESS ]
            </span>
            <h1 className="text-xl font-black uppercase text-black">
              CHIEF INSPECTOR CONSOLE
            </h1>
          </div>

          <p className="text-xs text-black mb-5 leading-relaxed">
            Enter host credentials to access master chronometer controls, live squad scoring, and solution key dispatch.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase mb-1.5 text-black">
                MASTER HOST KEY:
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Default: admin123"
                className="w-full bg-white border-2 border-black p-3 text-xs font-mono font-bold text-black outline-none shadow-[2px_2px_0px_#000]"
                required
              />
            </div>

            {authError && <p className="text-xs text-[#A30B37] font-bold">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px]"
            >
              AUTHENTICATE COMMAND ACCESS
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PROJECTOR FULLSCREEN DISPLAY MODE
  if (isProjectorMode) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] text-black p-6 md:p-10 flex flex-col justify-between relative font-mono">
        <button
          onClick={() => setIsProjectorMode(false)}
          className="absolute top-6 right-6 px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white shadow-[2px_2px_0px_#000]"
        >
          [ EXIT PROJECTOR ✕ ]
        </button>

        <div className="text-center max-w-4xl mx-auto space-y-3 pt-2">
          <div className="inline-block px-3 py-1 border-2 border-black bg-[#fff5e2] text-xs font-bold uppercase tracking-widest">
            MURDLE // LIVE BROADCAST BOARD
          </div>

          <h1 className="text-3xl md:text-5xl font-black uppercase text-black tracking-wide">
            {config?.roundName || "CASE #092: THE GHOST IN THE MODEL"}
          </h1>

          {/* Synchronized Giant Chronometer */}
          <div className="inline-flex items-center space-x-3 px-8 py-3 bg-white border-3 border-black shadow-[5px_5px_0px_#000] my-2">
            <Clock
              className={`w-8 h-8 ${
                timeLeftSeconds < 180 ? "text-[#A30B37] animate-pulse" : "text-black"
              }`}
            />
            <span
              className={`text-5xl md:text-6xl font-mono font-black tracking-widest ${
                timeLeftSeconds < 180 ? "text-[#A30B37]" : "text-black"
              }`}
            >
              {formatTime(timeLeftSeconds)}
            </span>
          </div>
        </div>

        {/* Projector Leaderboard Table */}
        <div className="max-w-4xl mx-auto w-full bg-white border-3 border-black p-5 md:p-6 shadow-[5px_5px_0px_#000] my-4 flex-1 flex flex-col">
          <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
            <h2 className="text-sm md:text-base font-black uppercase text-black">
              [ ACTIVE SQUAD LEADERBOARD ]
            </h2>
            <span className="text-xs font-bold text-[#6b7280]">
              TOTAL SQUADS: {submissions.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-[#6b7280] text-xs uppercase">
                Awaiting investigator squad registrations...
              </div>
            ) : (
              submissions.map((s: any, idx: number) => (
                <div
                  key={s.teamName}
                  className={`p-3.5 border-2 border-black flex items-center justify-between transition ${
                    idx === 0
                      ? "bg-[#fff5e2] shadow-[3px_3px_0px_#000]"
                      : "bg-[#fbfbf9] shadow-[2px_2px_0px_#000]"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center font-black text-sm">
                      #{idx + 1}
                    </div>

                    <div className="w-8 h-8 border border-black bg-white flex items-center justify-center">
                      <SquadIconDisplay iconId={s.squadBadge || "search"} className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="text-sm font-black uppercase text-black">{s.teamName}</div>
                      <div className="text-[10px] font-bold text-[#6b7280] uppercase">
                        {s.isSubmitted ? (
                          <span className="text-[#A30B37]">✓ DEDUCTION SEALED</span>
                        ) : (
                          <span>⏳ INVESTIGATING...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-black text-black">{s.score || 0} PTS</div>
                    <div className="text-[10px] text-[#6b7280] font-bold uppercase">
                      {s.breakdown?.correctCount || 0}/4 Correct • {s.timeTakenSeconds || 0}s
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fbfbf9] p-4 md:p-8 text-black font-mono">
      {/* Top Admin Navbar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-4 border-black gap-3 max-w-5xl mx-auto w-full">
        <div>
          <div className="text-[10px] font-bold uppercase text-[#A30B37]">
            [ HOST COMMAND ROOM ]
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase text-black">
            MURDLE CHIEF INSPECTOR CONSOLE
          </h1>
          <p className="text-xs text-[#6b7280]">
            Master Incident Chronometer & Live Squad Evaluation Roster
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCaseModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyber-green/10 border border-cyber-green/40 text-cyber-green text-xs font-bold hover:bg-cyber-green/20 transition"
          >
            <FileJson className="w-4 h-4" />
            <span>CASE DOSSIER MANAGER ({availableCases.length})</span>
          </button>

          <button
            onClick={() => setIsProjectorMode(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#fff5e2] border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition shadow-[2px_2px_0px_#000]"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>PROJECTOR VIEW</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-[#fff5e2] transition shadow-[2px_2px_0px_#000]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </header>

      {/* Main Admin Controls Grid */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-5 my-6">
        {/* Card 1: Synchronized Master Timer Controls */}
        <div className="p-5 bg-white border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
          <div className="flex justify-between items-center border-b border-black pb-2">
            <h2 className="text-xs font-bold uppercase text-black flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-black" />
              <span>ROUND CHRONOMETER</span>
            </h2>
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border border-black ${
                config?.roundStatus === "active" ? "bg-[#fff5e2] text-black" : "bg-[#f5f5f5] text-[#6b7280]"
              }`}
            >
              {config?.roundStatus === "active" ? "ROUND LIVE" : config?.roundStatus === "ended" ? "ENDED" : "WAITING"}
            </span>
          </div>

          <div className="text-center py-3 bg-[#fff5e2] border-2 border-black shadow-inner">
            <span className="text-4xl font-black tracking-widest text-black">
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          {/* Master Round Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {config?.roundStatus === "waiting" && (
              <button
                onClick={() => sendConfigAction({ action: "start_round" })}
                className="col-span-2 py-2 bg-[#A30B37] text-white border-2 border-black text-xs font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#85082c] shadow-[2px_2px_0px_#000]"
              >
                <Play className="w-4 h-4" />
                <span>START ROUND FOR ALL TEAMS</span>
              </button>
            )}

            {config?.roundStatus === "active" && (
              <button
                onClick={() => sendConfigAction({ action: "end_round" })}
                className="col-span-2 py-2 bg-[#A30B37] text-white border-2 border-black text-xs font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#85082c] shadow-[2px_2px_0px_#000]"
              >
                <Pause className="w-4 h-4" />
                <span>END ALL ROUNDS NOW</span>
              </button>
            )}

            {config?.roundStatus === "ended" && (
              <button
                onClick={() => sendConfigAction({ action: "start_round" })}
                className="col-span-2 py-2 bg-[#A30B37] text-white border-2 border-black text-xs font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#85082c] shadow-[2px_2px_0px_#000]"
              >
                RESTART ROUND
              </button>
            )}

            <button
              onClick={() => sendConfigAction({ action: "reset_round" })}
              className="py-2 bg-white border-2 border-black text-xs font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#fff5e2] shadow-[2px_2px_0px_#000]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET LOBBY</span>
            </button>

            <button
              onClick={() => sendConfigAction({ action: "adjust_time", adjustSeconds: 300 })}
              className="py-2 bg-white border-2 border-black text-xs font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#fff5e2] shadow-[2px_2px_0px_#000]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+5M</span>
            </button>
          </div>
        </div>

        {/* Card 2: Solution Key Reveal & Round Management */}
        <div className="p-5 bg-white border-2 border-black shadow-[3px_3px_0px_#000] space-y-3">
          <div className="border-b border-black pb-2">
            <h2 className="text-xs font-bold uppercase text-black">
              [ SOLUTION REVEAL & ROUND RESET ]
            </h2>
          </div>

          <p className="text-xs leading-relaxed text-black">
            Toggling solutions unlocks verification scores and result cards on all squad screens.
          </p>

          <button
            onClick={() => sendConfigAction({ action: "toggle_reveal" })}
            className={`w-full py-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 border-2 border-black shadow-[2px_2px_0px_#000] transition ${
              config?.answerKeyRevealed
                ? "bg-black text-white"
                : "bg-[#A30B37] hover:bg-[#85082c] text-white"
            }`}
          >
            {config?.answerKeyRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>REVEALED (CLICK TO HIDE)</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>UNLOCK & REVEAL SOLUTIONS</span>
              </>
            )}
          </button>

          <div className="pt-1">
            <button
              onClick={() => setIsWipeModalOpen(true)}
              className="w-full py-2 bg-white hover:bg-black hover:text-white border-2 border-black font-bold text-xs uppercase flex items-center justify-center space-x-1.5 transition shadow-[2px_2px_0px_#000]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>WIPE ROUND SUBMISSIONS</span>
            </button>
          </div>
        </div>

        {/* Card 3: Master Answer Key Quick Reference */}
        <div className="p-5 bg-[#fff5e2] border-2 border-black shadow-[3px_3px_0px_#000] space-y-2.5">
          <div className="border-b border-black pb-1.5">
            <h2 className="text-xs font-bold uppercase text-black">
              [ MASTER ANSWER KEY REFERENCE ]
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 bg-white border border-black">
              <span className="text-[#6b7280] uppercase text-[10px] font-bold">Q1 KILLER: </span>
              <span className="font-bold text-black">Dr. Aris Thorne</span>
            </div>
            <div className="p-2 bg-white border border-black">
              <span className="text-[#6b7280] uppercase text-[10px] font-bold">Q2 VECTOR: </span>
              <span className="font-bold text-black">Liquid Nitrogen Flush</span>
            </div>
            <div className="p-2 bg-white border border-black">
              <span className="text-[#6b7280] uppercase text-[10px] font-bold">Q3 MOTIVE: </span>
              <span className="font-bold text-black">Patent Theft & Erasure</span>
            </div>
            <div className="p-2 bg-white border border-black">
              <span className="text-[#6b7280] uppercase text-[10px] font-bold">Q4 PROOF: </span>
              <span className="font-bold text-black">Git Commit #4092</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Leaderboard Table Section */}
      <div className="max-w-5xl mx-auto w-full bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000]">
        <div className="flex justify-between items-center pb-3 mb-3 border-b-2 border-black">
          <div>
            <h2 className="text-sm font-black uppercase text-black">
              [ REGISTERED SQUAD ROSTER & LEADERBOARD ]
            </h2>
            <p className="text-[11px] text-[#6b7280] uppercase">Live updates every 2 seconds</p>
          </div>

          <div className="text-xs font-bold uppercase text-black">
            TOTAL SQUADS: <span className="text-[#A30B37]">{submissions.length}</span>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 text-center text-[#6b7280] text-xs uppercase">
            No investigator squads have registered yet. Share the app URL to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-[#f5f5f5] text-black font-bold uppercase">
                  <th className="p-2.5">Rank</th>
                  <th className="p-2.5">Squad</th>
                  <th className="p-2.5">Assigned Case</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Accuracy</th>
                  <th className="p-2.5">Score</th>
                  <th className="p-2.5">Duration</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {submissions.map((s: any, idx: number) => {
                  const status = s.teamStatus || (s.isSubmitted ? "submitted" : "active");
                  return (
                    <tr key={s.teamName} className="hover:bg-[#fbfbf9]">
                      <td className="p-2.5 font-bold">#{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="flex items-center space-x-2 font-bold uppercase">
                          <div className="w-6 h-6 border border-black bg-[#fff5e2] flex items-center justify-center">
                            <SquadIconDisplay iconId={s.squadBadge || "search"} className="w-3.5 h-3.5" />
                          </div>
                          <span>{s.teamName}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-bold uppercase text-[#A30B37]">
                        {s.caseId ? s.caseId.replace(/-/g, " ") : "Ghost in the Model"}
                      </td>
                      <td className="p-2.5 font-bold uppercase">
                        {status === "submitted" || s.isSubmitted ? (
                          <span className="px-2 py-0.5 border border-black bg-[#fff5e2] text-black text-[10px]">
                            SEALED
                          </span>
                        ) : status === "ended" ? (
                          <span className="px-2 py-0.5 border border-black bg-[#f5f5f5] text-[#A30B37] text-[10px]">
                            ENDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 border border-black bg-[#f5f5f5] text-[#6b7280] text-[10px] animate-pulse">
                            INVESTIGATING
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold">
                        {s.breakdown?.correctCount || 0} / 3
                      </td>
                      <td className="p-2.5 font-black text-black">
                        {s.score || 0} PTS
                      </td>
                      <td className="p-2.5 text-[#6b7280]">
                        {s.timeTakenSeconds || 0}s
                      </td>
                      <td className="p-2.5 text-right space-x-2">
                        {!s.isSubmitted && status !== "ended" && (
                          <button
                            onClick={() => sendSubAction({ action: "force_submit", teamName: s.teamName })}
                            className="px-2 py-1 border border-black bg-[#fff5e2] hover:bg-black hover:text-white font-bold text-[10px] uppercase shadow-[1px_1px_0px_#000]"
                            title="Force End Squad Round"
                          >
                            FORCE SUBMIT
                          </button>
                        )}
                        <button
                          onClick={() => sendSubAction({ action: "delete_team", teamName: s.teamName })}
                          className="px-2 py-1 border border-black bg-white hover:bg-[#A30B37] hover:text-white font-bold text-[10px] uppercase shadow-[1px_1px_0px_#000]"
                          title="Delete Team"
                        >
                          DELETE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CASE MANAGEMENT & JSON UPLOAD MODAL */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-slate-900 border border-cyber-green/50 rounded-2xl p-6 md:p-8 shadow-green-glow relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-cyber-green font-bold text-lg">
                <FileJson className="w-6 h-6 animate-pulse" />
                <span>CASE DOSSIER MANAGER & JSON UPLOADER</span>
              </div>
              <button
                onClick={() => setIsCaseModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Active Case Switcher */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-cyber-cyan" />
                  <span>Select Active Mystery Case</span>
                </h3>

                <p className="text-xs text-slate-400">
                  Switch the active case dossier loaded for squads entering the game.
                </p>

                <div className="flex space-x-3">
                  <select
                    value={activeCaseId}
                    onChange={(e) => handleCaseAction({ action: "set_active", caseId: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyber-cyan"
                  >
                    {availableCases.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.id}.json) - {c.difficulty}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleCaseAction({ action: "set_active", caseId: activeCaseId })}
                    className="px-4 py-2.5 rounded-xl bg-cyber-cyan hover:bg-cyber-cyan/90 text-slate-950 font-bold text-xs uppercase"
                  >
                    ACTIVATE
                  </button>
                </div>
              </div>

              {/* Upload New JSON Case File */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                    <FolderPlus className="w-4 h-4 text-cyber-green" />
                    <span>Upload or Create New Case File</span>
                  </h3>
                </div>

                {/* File Upload Selector */}
                <div>
                  <label className="block text-xs uppercase text-slate-400 mb-1">Upload `.json` File</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyber-green hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>

                {/* Raw JSON Editor */}
                <div>
                  <label className="block text-xs uppercase text-slate-400 mb-1">Or Paste Case JSON Content</label>
                  <textarea
                    value={caseJsonInput}
                    onChange={(e) => setCaseJsonInput(e.target.value)}
                    placeholder='{"id": "case-slug", "title": "New AI Mystery", "questions": [...], "answerKey": {...}}'
                    rows={8}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyber-green rounded-xl p-3 text-xs font-mono text-slate-200 outline-none leading-relaxed"
                  />
                </div>

                {caseUploadError && <p className="text-xs text-red-400 font-semibold">{caseUploadError}</p>}
                {caseUploadSuccess && <p className="text-xs text-cyber-green font-semibold">{caseUploadSuccess}</p>}

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setActiveImmediately}
                      onChange={(e) => setSetActiveImmediately(e.target.checked)}
                      className="rounded border-slate-700 text-cyber-green focus:ring-0"
                    />
                    <span>Set as Active Case Immediately</span>
                  </label>

                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(caseJsonInput);
                        handleCaseAction({
                          action: "upload",
                          caseJson: parsed,
                          setActiveImmediately,
                        });
                      } catch {
                        setCaseUploadError("Input text is not valid JSON. Please check syntax.");
                      }
                    }}
                    disabled={!caseJsonInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-cyber-green hover:bg-cyber-green/90 text-slate-950 font-bold text-xs uppercase disabled:opacity-40"
                  >
                    SAVE & IMPORT CASE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WIPE ALL CONFIRMATION MODAL */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-[#fff5e2] border-3 border-black p-6 text-center shadow-[6px_6px_0px_#000]">
            <h3 className="text-base font-black uppercase text-[#A30B37] mb-2">
              [ WIPE ALL ROUND SUBMISSIONS? ]
            </h3>
            <p className="text-xs text-black mb-6 leading-relaxed">
              This will permanently delete all registered teams and submitted deductions to reset for a fresh investigation round.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-black bg-white text-black font-bold text-xs uppercase hover:bg-[#f5f5f5]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  sendSubAction({ action: "wipe_all" });
                  setIsWipeModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_#000]"
              >
                WIPE ALL DATA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
