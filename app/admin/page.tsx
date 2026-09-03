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
  Minus,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Tv,
  CheckCircle2,
  XCircle,
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
      // Verify password against API
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
          setAuthError("Invalid Admin Access Key.");
        }
      })
      .catch(() => setAuthError("Network error authenticating."));
  };

  // SWR Hooks
  const { data: subData, error: subError } = useSWR(
    isAuthenticated ? ["/api/admin/submissions", adminPassword] : null,
    ([url, pass]: [string, string]) => fetcher(url, pass),
    { refreshInterval: 2000 }
  );

  const { data: configData } = useSWR(
    isAuthenticated ? ["/api/config", adminPassword] : "/api/config",
    (arg: string | [string, string]) => (Array.isArray(arg) ? fetcher(arg[0], arg[1]) : fetcher(arg)),
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
      csv += `${idx + 1},"${s.squadBadge || "🔍"}","${s.teamName}","${s.isSubmitted ? "Submitted" : "Investigating"}",${s.score || 0},${s.breakdown?.correctCount || 0},${s.timeTakenSeconds || 0},"${s.joinedAt || ""}","${s.submittedAt || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AIMurdle_Leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Authentication barrier
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-cyber-bg cyber-bg-grid">
        <div className="w-full max-w-md bg-slate-900 border border-cyber-magenta/50 rounded-2xl p-8 shadow-magenta-glow text-center">
          <Shield className="w-12 h-12 text-cyber-magenta mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-black text-white mb-2">HOST COMMAND DASHBOARD</h1>
          <p className="text-xs text-slate-400 mb-6">Enter the Host Admin Password to access real-time game controls.</p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Host Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Default: admin123"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyber-magenta rounded-xl px-4 py-3 text-sm text-slate-100 outline-none"
                required
              />
            </div>

            {authError && <p className="text-xs text-red-400 font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-cyber-magenta hover:bg-cyber-magenta/90 text-white font-bold text-xs uppercase tracking-wider shadow-magenta-glow transition"
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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col justify-between cyber-bg-grid relative">
        <button
          onClick={() => setIsProjectorMode(false)}
          className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white z-50"
        >
          Exit Projector Mode ✕
        </button>

        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-bold uppercase tracking-widest">
            <Cpu className="w-4 h-4 animate-spin" />
            <span>AIMURDLE LIVE COMMAND CENTER</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight glow-cyan">
            {config?.roundName || "Round 1 - NeuraCore AI Cleanroom"}
          </h1>

          {/* Synchronized Giant Timer */}
          <div className="inline-flex items-center space-x-4 px-8 py-3 rounded-2xl bg-slate-900/90 border border-cyber-cyan/50 shadow-cyan-glow my-4">
            <Clock className="w-8 h-8 text-cyber-cyan animate-pulse" />
            <span className="text-5xl md:text-6xl font-mono font-black text-cyber-cyan glow-cyan tracking-widest">
              {formatTime(timeLeftSeconds)}
            </span>
          </div>
        </div>

        {/* Projector Leaderboard Table */}
        <div className="max-w-5xl mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl my-6 flex-1 flex flex-col">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5 text-cyber-green" />
            <span>LIVE SQUAD LEADERBOARD</span>
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3">
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm italic">
                Awaiting investigator squad registrations...
              </div>
            ) : (
              submissions.map((s: any, idx: number) => (
                <div
                  key={s.teamName}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                    idx === 0
                      ? "border-cyber-amber bg-cyber-amber/10 shadow-amber-glow"
                      : idx === 1
                      ? "border-slate-400 bg-slate-800/40"
                      : idx === 2
                      ? "border-amber-700 bg-slate-900/60"
                      : "border-slate-800 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        idx === 0 ? "bg-cyber-amber text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyber-cyan">
                      <SquadIconDisplay iconId={s.squadBadge || "search"} className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="text-lg font-bold text-white">{s.teamName}</div>
                      <div className="text-xs text-slate-400">
                        {s.isSubmitted ? (
                          <span className="text-cyber-green font-semibold">✓ Deductions Sealed</span>
                        ) : (
                          <span className="text-cyber-cyan animate-pulse">⏳ Investigating...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-cyber-cyan glow-cyan">{s.score || 0} PTS</div>
                    <div className="text-xs text-slate-400 font-mono">
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
    <div className="flex-1 flex flex-col min-h-screen bg-cyber-bg p-4 md:p-8">
      {/* Top Admin Navbar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-magenta/10 border border-cyber-magenta/40 flex items-center justify-center text-cyber-magenta shadow-magenta-glow">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">HOST COMMAND CENTER</h1>
            <p className="text-xs text-slate-400">Real-Time Leaderboard & Multi-Squad Timer Manager</p>
          </div>
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
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan text-xs font-bold hover:bg-cyber-cyan/20 transition"
          >
            <Tv className="w-4 h-4" />
            <span>PROJECTOR VIEW</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white transition"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </header>

      {/* Main Admin Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-8">
        {/* Card 1: Synchronized Master Timer & Round Control */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyber-cyan" />
              <span>Master Round Control</span>
            </h2>
            <span
              className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded ${
                config?.roundStatus === "active"
                  ? "bg-cyber-green/10 text-cyber-green border border-cyber-green/30"
                  : config?.roundStatus === "ended"
                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
              }`}
            >
              {config?.roundStatus === "active"
                ? "ROUND LIVE"
                : config?.roundStatus === "ended"
                ? "ROUND ENDED"
                : "WAITING FOR START"}
            </span>
          </div>

          <div className="text-center py-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-4xl font-mono font-black text-cyber-cyan glow-cyan tracking-widest">
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          {/* Master Round Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {config?.roundStatus === "waiting" && (
              <button
                onClick={() => sendConfigAction({ action: "start_round" })}
                className="col-span-2 py-3 rounded-xl bg-cyber-green hover:bg-cyber-green/90 text-slate-950 font-black text-xs uppercase tracking-wider shadow-green-glow flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>START ROUND FOR ALL TEAMS</span>
              </button>
            )}

            {config?.roundStatus === "active" && (
              <button
                onClick={() => sendConfigAction({ action: "end_round" })}
                className="col-span-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-red-glow flex items-center justify-center space-x-2"
              >
                <Pause className="w-4 h-4" />
                <span>END ALL ROUNDS NOW</span>
              </button>
            )}

            {config?.roundStatus === "ended" && (
              <button
                onClick={() => sendConfigAction({ action: "start_round" })}
                className="py-2.5 rounded-xl bg-cyber-cyan hover:bg-cyber-cyan/90 text-slate-950 font-bold text-xs uppercase"
              >
                RESTART ROUND
              </button>
            )}

            <button
              onClick={() => sendConfigAction({ action: "reset_round" })}
              className={`py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center space-x-1 hover:text-white ${
                config?.roundStatus === "waiting" ? "col-span-2" : ""
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET LOBBY</span>
            </button>
          </div>
        </div>

        {/* Card 2: Solution Key Reveal & Round Management */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyber-magenta" />
            <span>Master Answer Key & Reveal</span>
          </h2>

          <p className="text-xs text-slate-400">
            Toggling solution reveal immediately unlocks score breakdowns & victory confetti on all squad screens.
          </p>

          <button
            onClick={() => sendConfigAction({ action: "toggle_reveal" })}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition ${
              config?.answerKeyRevealed
                ? "bg-cyber-green text-slate-950 shadow-green-glow"
                : "bg-cyber-magenta hover:bg-cyber-magenta/90 text-white shadow-magenta-glow"
            }`}
          >
            {config?.answerKeyRevealed ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>REVEALED (CLICK TO HIDE)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>UNLOCK & REVEAL SOLUTIONS</span>
              </>
            )}
          </button>

          <div className="pt-2">
            <button
              onClick={() => setIsWipeModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 font-bold text-xs uppercase flex items-center justify-center space-x-2 hover:bg-red-900/40"
            >
              <Trash2 className="w-4 h-4" />
              <span>WIPE ALL ROUND SUBMISSIONS</span>
            </button>
          </div>
        </div>

        {/* Card 3: Master Answer Key Quick Reference */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-cyber-green" />
            <span>Master Case Answer Key</span>
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase font-semibold">Q1 Killer: </span>
              <span className="text-cyber-green font-bold">Dr. Aris Thorne</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase font-semibold">Q2 Vector: </span>
              <span className="text-cyber-green font-bold">Liquid Nitrogen Flush</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase font-semibold">Q3 Motive: </span>
              <span className="text-cyber-green font-bold">Patent Theft & Erasure</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 uppercase font-semibold">Q4 Key Evidence: </span>
              <span className="text-cyber-green font-bold">Git Commit #4092</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Leaderboard Table Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyber-cyan" />
              <span>Registered Squad Roster & Leaderboard</span>
            </h2>
            <p className="text-xs text-slate-400">Updates live every 2 seconds</p>
          </div>

          <div className="text-xs font-semibold text-slate-400">
            Total Squads: <span className="text-cyber-cyan font-bold">{submissions.length}</span>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No investigator squads have registered yet. Share the app URL to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Squad</th>
                  <th className="py-3 px-4">Assigned Case</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {submissions.map((s: any, idx: number) => {
                  const status = s.teamStatus || (s.isSubmitted ? "submitted" : "active");
                  return (
                    <tr key={s.teamName} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">#{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5 font-bold text-white">
                          <div className="w-7 h-7 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
                            <SquadIconDisplay iconId={s.squadBadge || "search"} className="w-4 h-4" />
                          </div>
                          <span>{s.teamName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyber-cyan capitalize">
                        {s.caseId ? s.caseId.replace(/-/g, " ") : "Ghost in the Model"}
                      </td>
                      <td className="py-3 px-4">
                        {status === "submitted" ? (
                          <span className="px-2.5 py-1 rounded bg-cyber-green/10 text-cyber-green font-bold border border-cyber-green/30">
                            SUBMITTED
                          </span>
                        ) : status === "active" ? (
                          <span className="px-2.5 py-1 rounded bg-cyber-cyan/10 text-cyber-cyan font-bold border border-cyber-cyan/30 animate-pulse">
                            ACTIVE
                          </span>
                        ) : status === "ended" ? (
                          <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/30">
                            ENDED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30">
                            WAITING
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-cyber-cyan glow-cyan text-sm">
                        {s.score || 0} PTS
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {s.timeTakenSeconds || 0}s
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {status !== "ended" && status !== "submitted" && (
                          <button
                            onClick={() => sendConfigAction({ action: "end_team", teamName: s.teamName })}
                            className="px-2.5 py-1 rounded bg-red-950/80 text-red-300 border border-red-600/80 hover:bg-red-900 font-bold text-[10px]"
                            title="End Round for this Squad"
                          >
                            END TEAM
                          </button>
                        )}
                        <button
                          onClick={() => sendSubAction({ action: "delete_team", teamName: s.teamName })}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-white font-bold text-[10px]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/60 rounded-2xl p-6 text-center shadow-red-glow">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-2">WIPE ALL ROUND DATA?</h3>
            <p className="text-xs text-slate-300 mb-6">
              This will permanently delete all registered teams and submitted deductions for a brand new round!
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs uppercase"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  sendSubAction({ action: "wipe_all" });
                  setIsWipeModalOpen(false);
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-red-glow"
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
