# 🔍 AIMurdle - AI Murder Mystery Web Game

**AIMurdle** is a full-stack, team-based, browser AI murder mystery game inspired by *Murdle.com*. Multiple teams race against a synchronized live countdown timer to solve an AI-themed mystery ("The Ghost in the Model") while a host screen runs the real-time Admin Command Dashboard to manage the timer, observe live squad standings, and project the leaderboard.

---

## 🌟 Technologies Used

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Cyberpunk Dark Theme, Scanline Overlays, Neon Utilities)
- **Database**: [Mongoose](https://mongoosejs.com/) (MongoDB Atlas with zero-config in-memory fallback for local demos)
- **State & Polling**: [SWR](https://swr.vercel.app/) (Real-time automatic polling)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: `canvas-confetti` (Victory reveal animations)

---

## 📁 Project Structure

```text
aimurdle/
├── app/
│   ├── layout.tsx                     <- Global Cyberpunk Root Layout & Fonts
│   ├── page.tsx                       <- Landing Page (Squad Entry & Admin Modal)
│   ├── game/
│   │   └── page.tsx                   <- Team Investigation Terminal (Case, Evidence, Suspects, Notebook, Timer)
│   ├── submitted/
│   │   └── page.tsx                   <- Lock Screen / Live Host Reveal Polling Page
│   ├── admin/
│   │   └── page.tsx                   <- ⭐ Real-Time Host Admin Command Dashboard
│   └── api/
│       ├── cases/[caseId]/route.ts    <- Public Case File API (Strips correct answer key)
│       ├── submissions/route.ts       <- Team Submission & Server Scoring API
│       ├── config/route.ts            <- Public Live Timer & Game State API
│       └── admin/
│           ├── submissions/route.ts   <- Protected Admin API (Leaderboard / Team Delete / Wipe)
│           └── config/route.ts        <- Protected Admin API (Start, Pause, Reset, Adjust Timer, Reveal)
├── docs/
│   ├── README.md                      <- Project Overview & Guide
│   ├── AGENTS.md                      <- AI Agent Architecture & Conventions Guide
│   └── MEMORY.md                      <- Project Context & Historical Decision Log
├── models/
│   ├── Submission.ts                  <- Mongoose Team Submission Schema
│   └── GameConfig.ts                  <- Mongoose Global Game Config Schema
├── lib/
│   ├── mongodb.ts                     <- Serverless MongoDB connection pool + Fallback Memory Store
│   └── admin-auth.ts                  <- Admin Access Password verification helper
├── data/
│   └── cases/
│       └── ghost-in-the-model.json    <- Master Case File (Contains Narrative, Suspects, Evidence, Answer Key)
└── .env                               <- Local Environment Variables
```

---

## 🎮 Game Experience & Features

### 1. Squad Join (`/`)
- Teams enter their **Team Name** and pick a **Squad Emblem** (🔍, 💻, 🧠, 🛡️, ⚡).
- Entry instantly registers the squad and updates the Host Command Dashboard roster.

### 2. Case Investigation (`/game`)
- **Case Dossier**: Murder of Chief AI Scientist Dr. Evan Vance inside NeuraCore's liquid-cooled Quantum-LLM cleanroom.
- **4 Suspect Files**: Dr. Aris Thorne (Rival Architect), Maya Lin (Whistleblower), Cipher-9 (Autonomous AI Agent), Vance Sterling (VC Investor).
- **Evidence Locker**: Thermal telemetry dumps, Git commit logs, voice acoustic logs, agent sandbox telemetry, financial ledgers.
- **Investigator Scratchpad**: Persistent note-taking tab.
- **Synchronized Live Timer**: Countdown timer synced with host master timer.

### 3. Victim Box / Final Deduction Terminal
- 4 Mystery Questions:
  1. *Who killed Dr. Vance?* (Killer)
  2. *What weapon/vector was used?* (Liquid Nitrogen Flush)
  3. *What was the primary motive?* (Patent Theft & Co-Author Erasure)
  4. *Which key evidence log proves forced remote access?* (Git Commit #4092)
- Server-side deduction scoring: Base Points + Speed Bonus multiplier.

### 4. Lock Screen & Victory Reveal (`/submitted`)
- Displays sealed deduction summary and live indicator: *"Awaiting Host Master Reveal..."*.
- Host unlock triggers score breakdown, ranking, solution comparison, and victory confetti!

### 5. Host Admin Command Dashboard (`/admin`)
- Protected by the required `ADMIN_PASSWORD` environment variable.
- **Live Leaderboard**: Real-time ranking with score, correct count, and time taken.
- **Projector Presentation View**: Fullscreen presentation display optimized for room projection.
- **Timer Controls**: Start, Pause, Reset, +5m, -5m.
- **Round Management**: Force submit squad, delete team, wipe all data for fresh round, export CSV.

---

## ⚙️ Environment Variables (`.env`)

```env
# Required MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aimurdle

# Required Admin Command Dashboard Access Key (use a long random secret)
ADMIN_PASSWORD=replace-with-a-long-random-secret
```

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# Team View: http://localhost:3000
# Admin Command View: http://localhost:3000/admin
```

---

## ☁️ Deployment on Vercel

1. Push code repository to GitHub.
2. Import project into Vercel.
3. Configure `MONGODB_URI` and `ADMIN_PASSWORD` in Vercel Environment Variables.
4. Deploy!
