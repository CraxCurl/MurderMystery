"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  Clock,
  Play,
  Square,
  RotateCcw,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Tv,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  Timer,
  Shield,
  Zap,
  RefreshCw,
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
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isEndAllModalOpen, setIsEndAllModalOpen] = useState(false);
  const [customDuration, setCustomDuration] = useState("15");
  const [roundName, setRoundName] = useState("");

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

  const { data: subData } = useSWR(
    isAuthenticated ? ["/api/admin/submissions", adminPassword] : null,
    ([url, pass]: [string, string]) => fetcher(url, pass),
    { refreshInterval: 2000 }
  );

  const { data: configData } = useSWR(
    "/api/config",
    (url: string) => fetcher(url),
    { refreshInterval: 2000 }
  );

  const submissions = subData?.submissions || [];
  const config = configData?.config;

  // Sync round name from config
  useEffect(() => {
    if (config?.roundName && !roundName) {
      setRoundName(config.roundName);
    }
  }, [config?.roundName]);

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
      mutate(["/api/admin/submissions", adminPassword]);
    } catch (e) {
      console.error("Config action failed:", e);
    }
  };

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
      mutate("/api/config");
    } catch (e) {
      console.error("Submission action failed:", e);
    }
  };

  // Live Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(900);
  useEffect(() => {
    if (!config) return;
    if (config.roundStatus !== "active" || !config.roundStartedAt) {
      setTimeLeftSeconds((config?.timerDurationMinutes || 15) * 60);
      return;
    }
    const startMs = new Date(config.roundStartedAt).getTime();
    const nowMs = Date.now();
    const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
    const totalSeconds = (config.timerDurationMinutes || 15) * 60;
    setTimeLeftSeconds(Math.max(0, totalSeconds - elapsedSeconds));
  }, [config]);

  useEffect(() => {
    if (config?.roundStatus !== "active") return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [config?.roundStatus]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleExportCSV = () => {
    if (!submissions.length) return;
    // Add UTF-8 BOM so Excel opens team names and scores with proper formatting
    let content = "\uFEFF";
    content += "Rank,Team Name,Points Earned,Correct Answers,Time Taken (s),Assigned Case,Status\n";
    submissions.forEach((s: any, idx: number) => {
      const team = (s.teamName || "").replace(/"/g, '""');
      const caseTitle = (s.caseId || "").replace(/-/g, " ").replace(/"/g, '""');
      const status = s.isSubmitted ? "Sealed" : (s.teamStatus || "Active");
      content += `${idx + 1},"${team}",${s.score || 0},"${s.breakdown?.correctCount || 0}/3",${s.timeTakenSeconds || 0},"${caseTitle}","${status}"\n`;
    });
    const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `AIMurdle_Leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const roundStatus = config?.roundStatus || "waiting";
  const submittedCount = submissions.filter((s: any) => s.isSubmitted || s.teamStatus === "submitted" || s.teamStatus === "ended").length;
  const activeCount = submissions.filter((s: any) => s.teamStatus === "active" && !s.isSubmitted).length;

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#fbfbf9] text-black font-mono">
        <div className="w-full max-w-md bg-[#fff5e2] border-[3px] border-black p-6 md:p-8 shadow-[6px_6px_0px_#000] text-center">
          <div className="border-b-2 border-black pb-3 mb-5">
            <span className="text-[10px] font-bold text-[#A30B37] uppercase tracking-widest block mb-1">
              [ RESTRICTED ACCESS ]
            </span>
            <h1 className="text-xl font-black uppercase text-black">
              CHIEF INSPECTOR CONSOLE
            </h1>
          </div>

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
                className="w-full bg-white border-2 border-black p-3 text-xs font-mono font-bold text-black outline-none shadow-[2px_2px_0px_#000] focus:border-[#A30B37]"
                required
              />
            </div>

            {authError && (
              <p className="text-xs text-[#A30B37] font-bold">{authError}</p>
            )}

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

  // ── PROJECTOR MODE ────────────────────────────────────────────────────────
  if (isProjectorMode) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] text-black p-6 md:p-10 flex flex-col font-mono">
        <button
          onClick={() => setIsProjectorMode(false)}
          className="self-end mb-4 px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white shadow-[2px_2px_0px_#000]"
        >
          [ EXIT PROJECTOR ✕ ]
        </button>

        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 border-2 border-black bg-[#fff5e2] text-xs font-bold uppercase tracking-widest mb-3">
            MURDLE // LIVE BROADCAST
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-black tracking-wide">
            {config?.roundName || "MURDER MYSTERY — LIVE ROUND"}
          </h1>

          <div className="inline-flex items-center space-x-3 px-8 py-3 bg-white border-[3px] border-black shadow-[5px_5px_0px_#000] mt-4">
            <Clock className={`w-7 h-7 ${timeLeftSeconds < 180 ? "text-[#A30B37] animate-pulse" : "text-black"}`} />
            <span className={`text-5xl md:text-6xl font-black tracking-widest ${timeLeftSeconds < 180 ? "text-[#A30B37]" : "text-black"}`}>
              {formatTime(timeLeftSeconds)}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-white border-[3px] border-black p-5 shadow-[5px_5px_0px_#000] overflow-y-auto">
          <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
            <h2 className="text-sm font-black uppercase">[ SQUAD LEADERBOARD ]</h2>
            <span className="text-xs font-bold text-[#6b7280]">{submissions.length} SQUADS</span>
          </div>

          <div className="space-y-2">
            {submissions.length === 0 ? (
              <p className="text-center text-xs text-[#6b7280] py-8 uppercase">Awaiting squad registrations...</p>
            ) : (
              submissions.map((s: any, idx: number) => (
                <div
                  key={s.teamName}
                  className={`p-3.5 border-2 border-black flex items-center justify-between ${
                    idx === 0 ? "bg-[#fff5e2] shadow-[3px_3px_0px_#000]" : "bg-[#fbfbf9]"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center font-black text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-black uppercase">{s.teamName}</div>
                      <div className="text-[10px] font-bold text-[#6b7280] uppercase">
                        {s.caseId?.replace(/-/g, " ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black">{s.score || 0} PTS</div>
                    <div className="text-[10px] text-[#6b7280] font-bold">
                      {s.breakdown?.correctCount || 0}/3 correct • {s.timeTakenSeconds || 0}s
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

  // ── MAIN ADMIN DASHBOARD ─────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fbfbf9] text-black font-mono">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b-4 border-black px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#A30B37] uppercase tracking-widest block">
            [ HOST COMMAND ROOM ]
          </span>
          <h1 className="text-lg md:text-xl font-black uppercase text-black leading-tight">
            MURDLE — CHIEF INSPECTOR CONSOLE
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Round name pill */}
          <span className="px-3 py-1 border-2 border-black bg-[#fff5e2] text-xs font-bold uppercase text-black shadow-[2px_2px_0px_#000]">
            {config?.roundName || "ROUND 1"}
          </span>

          <button
            onClick={() => setIsProjectorMode(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#fff5e2] border-2 border-black text-xs font-bold uppercase hover:bg-black hover:text-white transition shadow-[2px_2px_0px_#000]"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>PROJECTOR</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-[#fff5e2] transition shadow-[2px_2px_0px_#000]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT EXCEL SHEET</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">

        {/* ── STATS BAR ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Squads", value: submissions.length, color: "text-black" },
            { label: "Investigating", value: activeCount, color: "text-black" },
            { label: "Submitted", value: submittedCount, color: "text-[#A30B37]" },
            { label: "Round Status", value: roundStatus.toUpperCase(), color: roundStatus === "active" ? "text-[#A30B37]" : "text-[#6b7280]" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_#000] text-center">
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] font-bold uppercase text-[#6b7280] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTROL ROW ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── CARD 1: ROUND CHRONOMETER ─────────────────── */}
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-5 space-y-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h2 className="text-xs font-black uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                ROUND CHRONOMETER
              </h2>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 ${
                roundStatus === "active"
                  ? "border-black bg-[#A30B37] text-white animate-pulse"
                  : roundStatus === "ended"
                  ? "border-black bg-[#f5f5f5] text-[#6b7280]"
                  : "border-black bg-[#fff5e2] text-black"
              }`}>
                {roundStatus === "active" ? "● LIVE" : roundStatus === "ended" ? "ENDED" : "STANDBY"}
              </span>
            </div>

            {/* Giant Timer Display */}
            <div className={`text-center py-5 border-2 border-black shadow-[inset_2px_2px_0px_#00000020] ${
              timeLeftSeconds < 180 ? "bg-[#A30B37]" : "bg-[#fff5e2]"
            }`}>
              <span className={`text-5xl md:text-6xl font-black tracking-widest ${
                timeLeftSeconds < 180 ? "text-white" : "text-black"
              }`}>
                {formatTime(timeLeftSeconds)}
              </span>
              {timeLeftSeconds < 180 && roundStatus === "active" && (
                <div className="text-white text-[10px] font-bold uppercase mt-1 animate-pulse">
                  ⚠ TIME CRITICAL
                </div>
              )}
            </div>

            {/* Primary Round Button */}
            <div className="space-y-2">
              {roundStatus === "waiting" && (
                <button
                  onClick={() => sendConfigAction({ action: "start_round" })}
                  className="w-full py-3 bg-[#A30B37] hover:bg-[#85082c] text-white border-[3px] border-black text-sm font-black uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                >
                  <Play className="w-4 h-4" />
                  START ROUND FOR ALL TEAMS
                </button>
              )}

              {roundStatus === "active" && (
                <button
                  onClick={() => setIsEndAllModalOpen(true)}
                  className="w-full py-3 bg-black hover:bg-[#222] text-white border-[3px] border-black text-sm font-black uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                >
                  <Square className="w-4 h-4" />
                  END ALL ROUNDS NOW
                </button>
              )}

              {roundStatus === "ended" && (
                <button
                  onClick={() => sendConfigAction({ action: "start_round" })}
                  className="w-full py-3 bg-[#A30B37] hover:bg-[#85082c] text-white border-[3px] border-black text-sm font-black uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
                >
                  <Play className="w-4 h-4" />
                  RESTART ROUND
                </button>
              )}

              {/* Secondary Controls */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => sendConfigAction({ action: "adjust_time", adjustSeconds: 300 })}
                  className="py-2 border-2 border-black bg-white hover:bg-[#fff5e2] text-xs font-bold uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000]"
                  title="Add 5 minutes"
                >
                  <Plus className="w-3 h-3" />
                  5 MIN
                </button>
                <button
                  onClick={() => sendConfigAction({ action: "adjust_time", adjustSeconds: -300 })}
                  className="py-2 border-2 border-black bg-white hover:bg-[#fff5e2] text-xs font-bold uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000]"
                  title="Remove 5 minutes"
                >
                  <Minus className="w-3 h-3" />
                  5 MIN
                </button>
                <button
                  onClick={() => sendConfigAction({ action: "reset_round" })}
                  className="py-2 border-2 border-black bg-white hover:bg-[#fff5e2] text-xs font-bold uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000]"
                  title="Reset lobby — clears all teams"
                >
                  <RotateCcw className="w-3 h-3" />
                  RESET
                </button>
              </div>

              {/* Custom Duration Setter */}
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="flex-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black outline-none shadow-[2px_2px_0px_#000] focus:border-[#A30B37]"
                  placeholder="Duration (mins)"
                />
                <button
                  onClick={() => sendConfigAction({ action: "set_duration", durationMinutes: Number(customDuration) })}
                  className="px-3 py-1.5 border-2 border-black bg-[#fff5e2] hover:bg-black hover:text-white text-xs font-bold uppercase shadow-[2px_2px_0px_#000]"
                >
                  SET DURATION
                </button>
              </div>
            </div>
          </div>

          {/* ── CARD 2: SOLUTION & ROUND MANAGEMENT ───────────── */}
          <div className="space-y-4">

            {/* Solution Reveal */}
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-5 space-y-3">
              <div className="border-b-2 border-black pb-2">
                <h2 className="text-xs font-black uppercase flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  SOLUTION KEY REVEAL
                </h2>
              </div>

              <p className="text-[11px] text-[#6b7280] leading-relaxed">
                Unlocking reveals correct answers and final scores on all squad screens simultaneously.
              </p>

              <button
                onClick={() => sendConfigAction({ action: "toggle_reveal" })}
                className={`w-full py-3 font-black text-sm uppercase flex items-center justify-center gap-2 border-[3px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition ${
                  config?.answerKeyRevealed
                    ? "bg-[#f5f5f5] text-[#6b7280] hover:bg-[#e0e0e0]"
                    : "bg-[#A30B37] hover:bg-[#85082c] text-white"
                }`}
              >
                {config?.answerKeyRevealed ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    HIDE SOLUTIONS (CURRENTLY REVEALED)
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    REVEAL SOLUTIONS TO ALL SQUADS
                  </>
                )}
              </button>

              {config?.answerKeyRevealed && (
                <div className="p-2 bg-[#fff5e2] border-2 border-black text-[10px] font-bold uppercase text-[#A30B37] text-center">
                  ✓ ANSWER KEY CURRENTLY VISIBLE TO ALL TEAMS
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] p-5 space-y-3">
              <div className="border-b-2 border-black pb-2">
                <h2 className="text-xs font-black uppercase flex items-center gap-2 text-[#A30B37]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  DANGER ZONE
                </h2>
              </div>

              <button
                onClick={() => setIsWipeModalOpen(true)}
                className="w-full py-2.5 bg-white hover:bg-[#A30B37] hover:text-white border-2 border-black font-bold text-xs uppercase flex items-center justify-center gap-2 transition shadow-[2px_2px_0px_#000]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                WIPE ALL TEAMS & RESET DATA
              </button>

              <p className="text-[10px] text-[#6b7280] leading-relaxed">
                Permanently deletes all registered teams and submissions. Use before starting a fresh round.
              </p>
            </div>

            {/* Round Name Editor */}
            <div className="bg-white border-2 border-black shadow-[3px_3px_0px_#000] p-4 space-y-2">
              <h2 className="text-[10px] font-black uppercase text-black">ROUND NAME / LABEL</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roundName}
                  onChange={(e) => setRoundName(e.target.value)}
                  placeholder="e.g. Round 1 — The Ghost in the Model"
                  className="flex-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold text-black outline-none shadow-[2px_2px_0px_#000] focus:border-[#A30B37] placeholder-[#6b7280]"
                />
                <button
                  onClick={() => sendConfigAction({ action: "update_round_name", roundName })}
                  className="px-3 py-1.5 border-2 border-black bg-[#fff5e2] hover:bg-black hover:text-white text-xs font-bold uppercase shadow-[2px_2px_0px_#000]"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── LIVE SQUAD ROSTER TABLE ──────────────────────────────────── */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_#000]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b-2 border-black gap-2">
            <div>
              <h2 className="text-sm font-black uppercase flex items-center gap-2">
                <Users className="w-4 h-4" />
                LIVE SQUAD ROSTER & LEADERBOARD
              </h2>
              <p className="text-[10px] text-[#6b7280] uppercase mt-0.5">Auto-refreshes every 2 seconds</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase flex-wrap">
              <span>{submissions.length} <span className="text-[#6b7280]">Registered</span></span>
              <span className="text-[#A30B37]">{submittedCount} <span className="text-[#6b7280]">Submitted</span></span>
              <span>{activeCount} <span className="text-[#6b7280]">Active</span></span>
              <button
                onClick={handleExportCSV}
                className="ml-2 flex items-center space-x-1.5 px-3 py-1 bg-[#fff5e2] hover:bg-black hover:text-white border-2 border-black text-[11px] font-black uppercase transition shadow-[2px_2px_0px_#000]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT EXCEL SHEET</span>
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-8 h-8 text-[#6b7280] mx-auto mb-3" />
              <p className="text-xs text-[#6b7280] uppercase">
                No squads registered yet. Share the app URL to begin!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#f5f5f5] text-black font-black uppercase">
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Squad</th>
                    <th className="p-3 text-left">Assigned Case</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Correct</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Time</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {submissions.map((s: any, idx: number) => {
                    const status = s.teamStatus || (s.isSubmitted ? "submitted" : "active");
                    const isFinished = s.isSubmitted || status === "submitted" || status === "ended";
                    return (
                      <tr key={s.teamName} className={`hover:bg-[#fbfbf9] ${idx === 0 && isFinished ? "bg-[#fffbf4]" : ""}`}>
                        <td className="p-3 font-black">
                          <span className="w-7 h-7 border-2 border-black bg-[#fff5e2] flex items-center justify-center font-black text-xs">
                            #{idx + 1}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2 font-bold uppercase">
                            <div className="w-6 h-6 border border-black bg-[#fff5e2] flex items-center justify-center flex-shrink-0">
                              <SquadIconDisplay iconId={s.squadBadge || "search"} className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate max-w-[120px]">{s.teamName}</span>
                          </div>
                        </td>

                        <td className="p-3 text-[#A30B37] font-bold uppercase text-[10px]">
                          {s.caseId ? s.caseId.replace(/-/g, " ") : "—"}
                        </td>

                        <td className="p-3 text-center">
                          {isFinished ? (
                            <span className="inline-block whitespace-nowrap px-2 py-0.5 border-2 border-black bg-[#A30B37] text-white text-[10px] font-black uppercase">
                              SEALED
                            </span>
                          ) : status === "ended" ? (
                            <span className="inline-block whitespace-nowrap px-2 py-0.5 border-2 border-black bg-[#f5f5f5] text-[#6b7280] text-[10px] font-black uppercase">
                              ENDED
                            </span>
                          ) : status === "active" ? (
                            <span className="inline-block whitespace-nowrap px-2 py-0.5 border-2 border-black bg-[#fff5e2] text-black text-[10px] font-black uppercase animate-pulse">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-block whitespace-nowrap px-2 py-0.5 border-2 border-black bg-[#f5f5f5] text-[#6b7280] text-[10px] font-black uppercase">
                              WAITING
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center font-black">
                          <span className={s.breakdown?.correctCount > 0 ? "text-[#A30B37]" : "text-[#6b7280]"}>
                            {s.breakdown?.correctCount || 0}
                          </span>
                          <span className="text-[#6b7280]">/3</span>
                        </td>

                        <td className="p-3 text-center font-black">
                          {s.score || 0}
                          <span className="text-[#6b7280] font-bold text-[10px] ml-0.5">pts</span>
                        </td>

                        <td className="p-3 text-center text-[#6b7280] font-bold">
                          {s.timeTakenSeconds || 0}s
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Move Team back to Main Menu / Registration */}
                            <button
                              onClick={() => sendSubAction({ action: "delete_team", teamName: s.teamName })}
                              className="px-2.5 py-1 border-2 border-black bg-[#fff5e2] hover:bg-black hover:text-white font-bold text-[10px] uppercase shadow-[1px_1px_0px_#000] flex items-center gap-1 whitespace-nowrap transition"
                              title="Reset team & move back to main menu registration screen"
                            >
                              <RotateCcw className="w-3 h-3 text-[#A30B37]" />
                              <span>MAIN MENU</span>
                            </button>

                            {/* Force End (only for non-finished active teams) */}
                            {!isFinished && status !== "ended" && (
                              <button
                                onClick={() => sendSubAction({ action: "force_submit", teamName: s.teamName })}
                                className="px-2 py-1 border-2 border-black bg-white hover:bg-[#A30B37] hover:text-white font-bold text-[10px] uppercase shadow-[1px_1px_0px_#000] whitespace-nowrap transition"
                                title="Force end this team's round"
                              >
                                FORCE END
                              </button>
                            )}

                            {/* Delete Team */}
                            <button
                              onClick={() => sendSubAction({ action: "delete_team", teamName: s.teamName })}
                              className="px-2 py-1 border-2 border-black bg-white hover:bg-[#A30B37] hover:text-white font-bold text-[10px] uppercase shadow-[1px_1px_0px_#000] transition"
                              title="Delete team completely"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── WIPE CONFIRMATION MODAL ──────────────────────────────────────── */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-[#fff5e2] border-[3px] border-black p-6 text-center shadow-[6px_6px_0px_#000]">
            <AlertTriangle className="w-10 h-10 text-[#A30B37] mx-auto mb-3" />
            <h3 className="text-base font-black uppercase text-[#A30B37] mb-2">
              [ WIPE ALL ROUND DATA? ]
            </h3>
            <p className="text-xs text-black mb-6 leading-relaxed">
              This permanently deletes all registered teams, submitted deductions, and scores. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsWipeModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-black bg-white text-black font-bold text-xs uppercase hover:bg-[#f5f5f5] shadow-[2px_2px_0px_#000]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  sendSubAction({ action: "wipe_all" });
                  sendConfigAction({ action: "reset_round" });
                  setIsWipeModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_#000]"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── END ALL ROUNDS CONFIRMATION MODAL ───────────────────────────── */}
      {isEndAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white border-[3px] border-black p-6 text-center shadow-[6px_6px_0px_#000]">
            <Square className="w-10 h-10 text-black mx-auto mb-3" />
            <h3 className="text-base font-black uppercase text-black mb-2">
              [ END ALL ROUNDS NOW? ]
            </h3>
            <p className="text-xs text-black mb-6 leading-relaxed">
              This will immediately end the round for ALL active teams. Unsubmitted teams will receive 0 points for unanswered questions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEndAllModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-black bg-white text-black font-bold text-xs uppercase hover:bg-[#f5f5f5] shadow-[2px_2px_0px_#000]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  sendConfigAction({ action: "end_round" });
                  setIsEndAllModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-black hover:bg-[#222] text-white border-2 border-black font-bold text-xs uppercase shadow-[2px_2px_0px_#000]"
              >
                END ALL ROUNDS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
