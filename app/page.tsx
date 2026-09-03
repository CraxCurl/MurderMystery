"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Play,
  Lock,
  AlertTriangle,
  Fingerprint,
  Users,
  Award,
  Radio,
  Search,
} from "lucide-react";
import { SQUAD_ICONS } from "@/lib/squad-icons";

export default function LandingPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("search");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a valid Squad or Investigator Name.");
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
          squadBadge: selectedBadge,
        }),
      });

      const data = await res.json();

      if (data.success || caseRes.ok) {
        localStorage.setItem("aimurdle_team_name", teamName.trim());
        localStorage.setItem("aimurdle_case_id", allottedCaseId);
        localStorage.setItem("aimurdle_squad_badge", selectedBadge);
        router.push(`/game?teamName=${encodeURIComponent(teamName.trim())}&caseId=${allottedCaseId}`);
      } else {
        setError(data.error || "Failed to enter investigation room.");
      }
    } catch {
      setError("Network error connecting to investigation server.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError("Access key is required.");
      return;
    }
    localStorage.setItem("aimurdle_admin_pass", adminPassword);
    router.push("/admin");
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-4 md:py-8 md:px-4 max-w-[620px] w-[94%] mx-auto font-mono text-[#f5f4ef]">
      {/* Newspaper Booklet Masthead */}
      <header className="w-full pb-3 mb-6 border-b-4 border-[#f0eee6] text-center">
        <div className="flex justify-between items-center pb-2 border-b-2 border-[#f0eee6] text-xs font-bold uppercase tracking-wider text-[#9b9ba3]">
          <span>VOL. 1 // CASE #092</span>
          <span>THE DAILY MYSTERY DOSSIER</span>
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-2 py-0.5 border-2 border-[#f0eee6] bg-transparent text-[#f0eee6] hover:bg-[#f0eee6] hover:text-[#121316] transition"
          >
            [ HOST LOGIN ]
          </button>
        </div>

        {/* Main Title Banner */}
        <div className="pt-4 pb-2">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-[#f5f4ef]">
            MURDLE
          </h1>
          <div className="w-full border-t border-b-2 border-[#f0eee6] my-2 py-0.5 text-center">
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#9b9ba3]">
              SOLVE THE MURDER IN THE MODEL
            </span>
          </div>
        </div>
      </header>

      {/* Case Incident Briefing Box (Aged Dark Amber Parchment) */}
      <div className="w-full bg-[#24211a] border-[3px] border-[#f0eee6] p-4 md:p-5 shadow-[4px_4px_0px_#000000] mb-6">
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[#f0eee6] text-xs font-bold uppercase tracking-wider">
          <span className="text-[#ff4d6d]">CRIME SCENE REPORT</span>
          <span className="text-[#9b9ba3]">ZONE 7 CLEANROOM</span>
        </div>
        <p className="text-xs md:text-sm leading-relaxed text-[#f5f4ef]">
          At 02:47 AM, Chief AI Scientist <strong className="text-white">DR. EVAN VANCE</strong> was found deceased.
          Thermal telemetry feeds were cut. The liquid nitrogen cooling valves were forced open.
          Deduce who killed him, with what vector, and what motive before the server logs purge!
        </p>
      </div>

      {/* Squad Registration Docket (Main Docket Card) */}
      <div className="w-full bg-[#1b1d22] border-[3px] border-[#f0eee6] p-5 md:p-6 shadow-[4px_4px_0px_#000000] mb-8">
        <div className="border-b-2 border-[#f0eee6] pb-2 mb-4">
          <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-[#f5f4ef]">
            [ SQUAD REGISTRATION DOCKET ]
          </h2>
          <p className="text-[11px] text-[#9b9ba3] uppercase">
            Enter your investigator callsign to access your allotted mystery case dossier
          </p>
        </div>

        <form onSubmit={handleJoinGame} className="space-y-5">
          {/* Callsign Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#f5f4ef]">
              INVESTIGATOR TEAM NAME:
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. CYBER SLEUTHS, LOGIC DETECTIVES"
              maxLength={30}
              className="w-full bg-[#0d0e11] border-2 border-[#f0eee6] p-3 text-xs md:text-sm font-mono uppercase font-bold text-[#f5f4ef] placeholder-[#757987] outline-none shadow-[4px_4px_0px_#000000] focus:border-white"
              required
            />
          </div>

          {/* Crest / Badge Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-xs font-bold uppercase text-[#f5f4ef]">
              <span>SELECT SQUAD EMBLEM:</span>
              <span className="text-[#9b9ba3] text-[10px]">
                {SQUAD_ICONS.length} AVAILABLE
              </span>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex space-x-1.5 overflow-x-auto pb-1.5 mb-2.5">
              {["ALL", "Detective", "Tech", "Tactical", "Cyber"].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-bold uppercase border-2 transition ${
                      isActive
                        ? "bg-[#f0eee6] text-[#121316] border-[#f0eee6] shadow-[2px_2px_0px_#000000]"
                        : "bg-[#1b1d22] text-[#f0eee6] border-[#f0eee6] hover:bg-[#24211a]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-2 bg-[#0d0e11] border-2 border-[#f0eee6]">
              {SQUAD_ICONS.filter((item) => selectedCategory === "ALL" || item.category === selectedCategory).map((item) => {
                const Icon = item.icon;
                const isSelected = selectedBadge === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedBadge(item.id)}
                    className={`flex flex-col items-center justify-center p-2 border-2 text-center transition ${
                      isSelected
                        ? "border-[#ffffff] bg-[#d90429] text-[#ffffff] shadow-[2px_2px_0px_#000000]"
                        : "border-[#3d414d] bg-[#1b1d22] text-[#f5f4ef] hover:border-[#f0eee6]"
                    }`}
                    title={item.name}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[9px] font-bold truncate w-full uppercase">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-2.5 border-2 border-[#ff4d6d] bg-[#24211a] text-[#ff4d6d] text-xs font-bold uppercase flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#d90429] hover:bg-[#ba0323] text-white border-[3px] border-[#ffffff] font-mono font-bold uppercase tracking-widest text-xs md:text-sm shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition disabled:opacity-50"
          >
            {loading ? (
              <span>ALLOTTING CASE FILE...</span>
            ) : (
              <span>START INVESTIGATION</span>
            )}
          </button>
        </form>
      </div>

      {/* 3 Dossier Modules Summary (Evidence & Interrogation Cards) */}
      <div className="w-full space-y-3 mb-8">
        <div className="p-3 bg-[#1b1d22] border-2 border-[#f0eee6] shadow-[4px_4px_0px_#000000] text-xs">
          <span className="font-bold uppercase text-[#ff4d6d] block mb-0.5">
            [ 1. EVIDENCE LOCKER ]
          </span>
          <span className="text-[#f5f4ef]">Thermal sensor dumps, Git commit #4092, wiretap audio logs, and hedge fund transactions.</span>
        </div>

        <div className="p-3 bg-[#1b1d22] border-2 border-[#f0eee6] shadow-[4px_4px_0px_#000000] text-xs">
          <span className="font-bold uppercase text-[#ff4d6d] block mb-0.5">
            [ 2. SUSPECT INTERROGATIONS ]
          </span>
          <span className="text-[#f5f4ef]">Review alibis and motives for Dr. Thorne, Maya Lin, Autonomous Cipher-9, and Vance Sterling.</span>
        </div>

        <div className="p-3 bg-[#1b1d22] border-2 border-[#f0eee6] shadow-[4px_4px_0px_#000000] text-xs">
          <span className="font-bold uppercase text-[#ff4d6d] block mb-0.5">
            [ 3. DEDUCTION ACCUSATION ]
          </span>
          <span className="text-[#f5f4ef]">Submit your sworn verdict for accuracy points plus speed bonus multiplier.</span>
        </div>
      </div>

      {/* Admin Login Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-[#1b1d22] border-[3px] border-[#f0eee6] p-6 shadow-[6px_6px_0px_#000000] relative">
            <div className="flex justify-between items-center pb-2 mb-4 border-b-2 border-[#f0eee6]">
              <span className="font-bold uppercase text-xs md:text-sm text-[#f5f4ef]">
                [ HOST COMMAND ACCESS ]
              </span>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="font-bold text-xs border border-[#f0eee6] px-1.5 py-0.5 bg-[#1b1d22] text-[#f5f4ef] hover:bg-[#f0eee6] hover:text-[#121316]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs mb-4 text-[#9b9ba3]">
              Enter the master host key to access synchronized timer controls, live squad rosters, and solution reveals.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-[#f5f4ef]">
                  MASTER KEY:
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Default: admin123"
                  className="w-full bg-[#0d0e11] border-2 border-[#f0eee6] p-2.5 text-xs font-mono font-bold text-[#f5f4ef] placeholder-[#757987] outline-none shadow-[2px_2px_0px_#000000]"
                  required
                />
              </div>

              {adminError && (
                <p className="text-xs font-bold text-[#ff4d6d]">{adminError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#d90429] hover:bg-[#ba0323] text-white border-[3px] border-[#ffffff] font-bold text-xs uppercase tracking-wider shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px]"
              >
                ENTER COMMAND DASHBOARD
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
