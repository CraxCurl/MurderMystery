# 🤖 AGENTS.md - Developer & AI Agent Architecture Guide

This document outlines the architectural patterns, conventions, and security guidelines for AI coding assistants and developers working on **AIMurdle**.

---

## 🏛️ Code Architecture & Standards

### 1. Framework & App Router Conventions
- **Next.js 14 (App Router)**: All pages and API routes reside in `app/`.
- **Client Components (`"use client"`)**: Pages using interactive hooks (`useState`, `useEffect`, `useSearchParams`, `useSWR`) must include `"use client"` at the top.
- **Suspense Boundary Requirement**: Any client page consuming `useSearchParams()` (such as `app/game/page.tsx` and `app/submitted/page.tsx`) **MUST** be wrapped in a `<Suspense>` boundary to prevent static pre-rendering build failures (`missing-suspense-with-csr-bailout`).

### 2. Dual-Mode Database Architecture (`lib/mongodb.ts`)
- The application is designed to function seamlessly both with a live **MongoDB Atlas** database and without one.
- In `lib/mongodb.ts`:
  - If `process.env.MONGODB_URI` is present, Mongoose connects and caches the serverless connection pool.
  - If `MONGODB_URI` is missing or fails to connect, the system automatically falls back to an **In-Memory Store** (`global.inMemoryStore`).
  - **Rule**: When adding or updating API endpoints, always maintain dual support for both MongoDB queries and fallback memory store mutations.

### 3. API Security & Cheating Prevention
- **Answer Key Protection**: The master answer key (`answerKey`) stored in `data/cases/<caseId>.json` MUST NOT be exposed to the public client API (`/api/cases/[caseId]/route.ts`).
- Public endpoints must strip `answerKey` before returning case dossier payloads to prevent users from inspecting HTTP responses in Chrome DevTools to cheat.
- Server-side scoring in `/api/submissions/route.ts` reads the server-side master file directly to compute points.

### 4. Admin Authentication
- Admin API endpoints (`/api/admin/config`, `/api/admin/submissions`) require authentication verified via `lib/admin-auth.ts`.
- The client sends the password via `x-admin-password` header or `Authorization: Bearer <password>`.

---

## 📄 Case Schema Specification (`data/cases/<caseId>.json`)

To add a new mystery case to AIMurdle, create a JSON file under `data/cases/` following this structure:

```json
{
  "id": "case-id-slug",
  "title": "Case Title",
  "subtitle": "Subtitle Description",
  "difficulty": "BEGINNER | INTERMEDIATE | HARD",
  "timeLimitMinutes": 15,
  "victim": {
    "name": "Victim Name",
    "role": "Role / Occupation",
    "timeOfDeath": "Timestamp",
    "location": "Location Name"
  },
  "summary": "Detailed narrative story summary...",
  "suspects": [
    {
      "id": "suspect_1",
      "name": "Suspect Name",
      "role": "Suspect Role",
      "avatar": "Emoji Avatar",
      "bio": "Background bio",
      "alibi": "Claimed alibi",
      "motive": "Potential motive"
    }
  ],
  "evidence": [
    {
      "id": "evd_1",
      "title": "Evidence Title",
      "type": "METRICS | CODE | AUDIO_TRANSCRIPT | SYSTEM_LOG | FINANCIAL",
      "tag": "Category Tag",
      "timestamp": "Timestamp",
      "content": "Raw log or transcript content..."
    }
  ],
  "questions": [
    {
      "id": "q1",
      "label": "Question 1: The Killer",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "points": 350
    }
  ],
  "answerKey": {
    "q1": "Exact Matching Option String",
    "q2": "Exact Matching Option String",
    "q3": "Exact Matching Option String",
    "q4": "Exact Matching Option String"
  }
}
```

---

## 🛠️ Verification Checklist for Code Changes

Before committing changes or creating PRs, execute:
1. `npx tsc --noEmit` (Ensure 0 TypeScript errors)
2. `npm run build` (Ensure clean static generation & build success)
3. Test squad join flow (`/`) -> investigation (`/game`) -> submission (`/submitted`) -> admin dashboard (`/admin`).
