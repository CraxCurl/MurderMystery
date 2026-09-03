"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Play, Lock, AlertTriangle, Terminal, Cpu, Users, Award } from "lucide-react";
import MatrixRain from "@/components/MatrixRain";

export default function LandingPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a valid Team Name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Allot a random case for this team
      const caseRes = await fetch(`/api/cases/random?teamName=${encodeURIComponent(teamName.trim())}`);
      const caseData = await caseRes.json();
      const allottedCaseId = caseData.caseId || "ghost-in-the-model";

      // 2. Register team submission session
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          teamName: teamName.trim(),
          squadBadge: "search",
        }),
      });

      const data = await res.json();

      if (data.success || caseRes.ok) {
        // Store in localStorage for seamless session resume
        localStorage.setItem("aimurdle_team_name", teamName.trim());
        localStorage.setItem("aimurdle_case_id", allottedCaseId);
        localStorage.setItem("aimurdle_squad_badge", "search");
        router.push(`/game?teamName=${encodeURIComponent(teamName.trim())}&caseId=${allottedCaseId}`);
      } else {
        setError(data.error || "Failed to enter game.");
      }
    } catch {
      setError("Network error connecting to game server.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError("Password is required.");
      return;
    }
    localStorage.setItem("aimurdle_admin_pass", adminPassword);
    router.push("/admin");
  };

  return (
    <main className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8 cyber-bg-grid min-h-screen overflow-hidden">
      <MatrixRain />
      {/* Top Navbar */}
      <header className="w-full max-w-6xl flex justify-between items-center py-4 mb-6 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Cpu className="w-6 h-6 text-cyber-cyan animate-pulse" />
          <span className="text-xl font-bold tracking-widest text-slate-100 glow-cyan">
            AI<span className="text-cyber-cyan">MURDLE</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono">
            v1.0 LIVE
          </span>
        </div>

        <button
          onClick={() => setIsAdminModalOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-cyber-magenta bg-slate-900/60 hover:bg-cyber-magenta/10 text-xs text-slate-300 hover:text-cyber-magenta transition duration-200"
        >
          <Shield className="w-4 h-4 text-cyber-magenta" />
          <span>Host Command Login</span>
        </button>
      </header>

      {/* Hero Header */}
      <div className="text-center max-w-3xl mb-8">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-cyber-cyan/40 mb-4 text-xs text-cyber-cyan font-mono">
          <Terminal className="w-4 h-4" />
          <span>AIMURDLE — LIVE INVESTIGATION PLATFORM</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">
          AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-cyber-green to-cyber-magenta glow-cyan">MURDER MYSTERY</span> CHALLENGE
        </h1>

        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
          Uncover the clues. Name the killer. Race against the clock.<br />
          In AI, even ghosts leave traces. Find them.
        </p>
      </div>

      {/* Main Team Join Card */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 hover:border-cyber-cyan/50 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl transition duration-300 relative overflow-hidden mb-12">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan via-cyber-magenta to-cyber-green" />

        <div className="flex items-center space-x-3 mb-6">
          <Users className="w-6 h-6 text-cyber-cyan" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">Squad Registration</h2>
            <p className="text-xs text-slate-400">Enter your team name to be allotted your mystery case dossier.</p>
          </div>
        </div>

        <form onSubmit={handleJoinGame} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-2 font-mono">
              Investigator Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name..."
              maxLength={30}
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-cyber-cyan focus:ring-1 focus:ring-cyber-cyan rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition duration-200 font-mono"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-green hover:from-cyber-cyan/90 hover:to-cyber-green/90 text-slate-950 font-bold tracking-wider uppercase flex items-center justify-center space-x-2 shadow-cyan-glow transition transform active:scale-95 disabled:opacity-50 font-mono"
          >
            {loading ? (
              <span>ALLOTTING CASE FILE...</span>
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                <span>INITIALIZE INVESTIGATION</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Features Overview Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-left">
          <Terminal className="w-6 h-6 text-cyber-cyan mb-2" />
          <h3 className="text-sm font-bold text-slate-200 mb-1">Interactive Evidence Locker</h3>
          <p className="text-xs text-slate-400">Analyze thermal telemetry dumps, git commits, audio transcripts, and financial ledgers.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-left">
          <Users className="w-6 h-6 text-cyber-magenta mb-2" />
          <h3 className="text-sm font-bold text-slate-200 mb-1">AI Suspect Dossiers</h3>
          <p className="text-xs text-slate-400">Interrogate suspects, examine motives and alibis, and shatter false statements.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-left">
          <Award className="w-6 h-6 text-cyber-green mb-2" />
          <h3 className="text-sm font-bold text-slate-200 mb-1">Real-Time Host Leaderboard</h3>
          <p className="text-xs text-slate-400">Race against synchronized clock for base deduction points + speed bonus multiplier.</p>
        </div>
      </div>

      {/* Admin Login Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-cyber-magenta/50 rounded-2xl p-6 shadow-magenta-glow relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2 text-cyber-magenta font-bold">
                <Shield className="w-5 h-5" />
                <span>Host Admin Command Login</span>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Enter the Host Access Key to access real-time leaderboard, timer controls, and master solution controls.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1 font-mono">Access Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter Admin Password (Default: admin123)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyber-magenta rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none font-mono"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {adminError && <p className="text-xs text-red-400">{adminError}</p>}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyber-magenta hover:bg-cyber-magenta/90 text-white font-bold text-xs uppercase tracking-wider transition font-mono"
              >
                ACCESS COMMAND DASHBOARD
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
