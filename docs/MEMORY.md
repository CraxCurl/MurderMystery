# 🧠 MEMORY.md - Project Context & Technical Decision Record

This file records historical decisions, system context, scoring mechanics, and architectural rationale for **AIMurdle**.

---

## 📌 Project Overview & Origin

- **Project Name**: AIMurdle
- **Concept**: Team-based AI Murder Mystery web game inspired by *Murdle.com*.
- **Tech Stack**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, Mongoose (MongoDB Atlas), SWR, Canvas-Confetti.
- **Master Case File**: `data/cases/ghost-in-the-model.json` ("The Ghost in the Model").

---

## 🔑 Key Technical Decisions & Rationale

### 1. Zero-Config Database Fallback Store (`lib/mongodb.ts`)
- **Problem**: Requiring an active MongoDB connection string upfront prevents instant out-of-the-box local testing or demoing.
- **Solution**: Implemented a dual-layer connection manager. If `MONGODB_URI` is supplied in `.env`, Mongoose connects to MongoDB Atlas. If omitted or unreachable, the system seamlessly falls back to `global.inMemoryStore` so all APIs (`/api/submissions`, `/api/config`, `/api/admin/*`) continue working without errors.

### 2. Next.js App Router Suspense Boundaries (`app/game/page.tsx`, `app/submitted/page.tsx`)
- **Gotcha**: Using `useSearchParams()` directly in Client Components during static site compilation causes `missing-suspense-with-csr-bailout` build errors.
- **Fix**: Factored the inner logic into `GameContent()` and `SubmittedContent()`, exporting outer components wrapped in `<Suspense fallback={...}>`.

### 3. Master Answer Key Stripping (`app/api/cases/[caseId]/route.ts`)
- **Security Rule**: The case dossier JSON file contains `answerKey`. To prevent players from viewing network requests in Chrome DevTools to cheat, `/api/cases/[caseId]` destructures and removes `answerKey` before sending JSON to the client.
- Final scoring is strictly computed server-side in `app/api/submissions/route.ts`.

### 4. Scoring Formula & Speed Bonus
- **Base Question Points**:
  - Q1 (Killer): 350 PTS
  - Q2 (Attack Vector): 250 PTS
  - Q3 (Primary Motive): 250 PTS
  - Q4 (Key Evidence): 150 PTS
  - *Max Base Points*: 1000 PTS
- **Speed Bonus Formula**:
  $$\text{Speed Bonus} = \max\left(0, \left\lfloor \frac{\text{Remaining Seconds}}{\text{Total Seconds}} \times 250 \right\rfloor\right)$$
- Teams that submit correctly earlier receive up to 250 extra bonus points!

---

## 🔐 Credentials & Environment Log

- **Local Environment File**: `.env`
- **Default Admin Password**: `admin123` (configurable via `ADMIN_PASSWORD` in `.env`)
- **MongoDB URI**: Configured in `.env` for MongoDB Atlas database `AIMurdle`.

---

## 🕵️ Master Case Solution Quick Reference ("The Ghost in the Model")

- **Killer**: `Dr. Aris Thorne` (Lead Neural Architect)
- **Vector / Weapon**: `Liquid Nitrogen Safety Overdrive Flush`
- **Motive**: `Patent Theft & Co-Author Erasure`
- **Key Evidence**: `Git Commit #4092 script modification`
