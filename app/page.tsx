"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearLocalSquadSession } from "@/lib/client-session";
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

export default function LandingPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  // Check if squad session already exists on mount -> Auto Redirect to prevent back navigation to join screen
  useEffect(() => {
    fetch("/api/submissions")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.isRemoved) {
          clearLocalSquadSession();
          return;
        }
        if (data?.success && data?.submission) {
          if (data.submission.isSubmitted) {
            router.replace("/submitted");
          } else {
            router.replace("/game");
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError("Please enter a valid Squad or Investigator Name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const trimmed = teamName.trim();
      const existingToken = typeof window !== "undefined" ? localStorage.getItem(`aimurdle_team_token_${trimmed}`) : "";

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          teamName: trimmed,
          squadBadge: "search",
          teamToken: existingToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("aimurdle_team_name", trimmed);
        localStorage.setItem("aimurdle_squad_badge", "search");
        const assignedCaseId = data.caseId || data.submission?.caseId;
        if (assignedCaseId) {
          localStorage.setItem("aimurdle_case_id", assignedCaseId);
        }
        if (data.teamToken) {
          localStorage.setItem(`aimurdle_team_token_${trimmed}`, data.teamToken);
          localStorage.setItem("aimurdle_current_token", data.teamToken);
        }
        router.push("/game");
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
    <main className="flex-1 flex flex-col items-center justify-start p-4 md:py-8 md:px-4 max-w-[640px] w-[94%] mx-auto font-mono text-black">
      {/* Newspaper Booklet Masthead */}
      <header className="w-full pb-3 mb-6 border-b-4 border-black text-center">
        <div className="flex justify-between items-center pb-2 border-b-2 border-black text-xs font-bold uppercase tracking-wider text-[#6b7280]">
          <span>VOL. 1 // CASE #092</span>
          <span>THE DAILY MYSTERY DOSSIER</span>
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-2 py-0.5 border-2 border-black bg-white text-black hover:bg-[#fff5e2] font-bold shadow-[2px_2px_0px_#000] transition"
          >
            [ HOST LOGIN ]
          </button>
        </div>

        {/* Main Title Banner */}
        <div className="pt-4 pb-2">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-black">
            MURDLE
          </h1>
          <div className="w-full border-t border-b-2 border-black my-2 py-0.5 text-center">
            <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#6b7280]">
              SOLVE THE MURDER IN THE MODEL
            </span>
          </div>
        </div>
      </header>



      {/* Squad Registration Docket (Main Docket Card) */}
      <div className="w-full bg-white border-[3px] border-black p-5 md:p-6 shadow-[4px_4px_0px_#000000] mb-8">
        <div className="border-b-2 border-black pb-2 mb-4">
          <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-black">
            [ SQUAD REGISTRATION DOCKET ]
          </h2>
          <p className="text-[11px] text-[#6b7280] uppercase">
            Enter your investigator callsign to access your allotted mystery case dossier
          </p>
        </div>

        <form onSubmit={handleJoinGame} className="space-y-5">
          {/* Callsign Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-black">
              INVESTIGATOR TEAM NAME:
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. CYBER SLEUTHS, LOGIC DETECTIVES"
              maxLength={30}
              className="w-full bg-white border-2 border-black p-3 text-xs md:text-sm font-mono uppercase font-bold text-black placeholder-[#6b7280] outline-none shadow-[2px_2px_0px_#000000] focus:border-[#A30B37]"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 border-2 border-[#A30B37] bg-[#fff5e2] text-[#A30B37] text-xs font-bold uppercase flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#A30B37] hover:bg-[#85082c] text-white border-[3px] border-black font-mono font-bold uppercase tracking-widest text-xs md:text-sm shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000] transition disabled:opacity-50"
          >
            {loading ? (
              <span>ALLOTTING CASE FILE...</span>
            ) : (
              <span>START INVESTIGATION</span>
            )}
          </button>
        </form>
      </div>



      {/* Admin Login Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-[#fff5e2] border-[3px] border-black p-6 shadow-[6px_6px_0px_#000000] relative">
            <div className="flex justify-between items-center pb-2 mb-4 border-b-2 border-black">
              <span className="font-bold uppercase text-xs md:text-sm text-[#A30B37]">
                [ HOST COMMAND ACCESS ]
              </span>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="font-bold text-xs border-2 border-black px-1.5 py-0.5 bg-white text-black hover:bg-black hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs mb-4 text-black">
              Enter the master host key to access synchronized timer controls, live squad rosters, and solution reveals.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1 text-black">
                  MASTER KEY:
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter configured access key"
                  className="w-full bg-white border-2 border-black p-2.5 text-xs font-mono font-bold text-black placeholder-[#6b7280] outline-none shadow-[2px_2px_0px_#000000]"
                  required
                />
              </div>

              {adminError && (
                <p className="text-xs font-bold text-[#A30B37]">{adminError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#A30B37] hover:bg-[#85082c] text-white border-[3px] border-black font-bold text-xs uppercase tracking-wider shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px]"
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
