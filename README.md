# 🔍 AIMurdle - AI Murder Mystery Web Game

Full-stack, team-based browser web game built with Next.js 14, Tailwind CSS, Lucide Icons, Mongoose, and SWR.

For full documentation, agent guidelines, and technical decision records, check the [`docs/`](./docs/) directory:

- 📖 [docs/README.md](./docs/README.md) - Complete Setup & User Guide
- 🤖 [docs/AGENTS.md](./docs/AGENTS.md) - Architecture & AI Developer Conventions
- 🧠 [docs/MEMORY.md](./docs/MEMORY.md) - Technical Decision Records & Case Solutions

## Local Wi-Fi play (no internet required)

With MongoDB reachable from the host laptop, start the LAN server:

```bash
npm run dev:lan
```

The terminal prints a URL such as `http://192.168.1.25:3000`. Share that URL with players connected to the same Wi-Fi. Do not share `127.0.0.1`; it only points to the device on which it is entered. The host dashboard is available at the printed URL followed by `/admin`.

For a fully offline event, run MongoDB on the host laptop and configure its local URI in `.env`, for example `MONGODB_URI=mongodb://127.0.0.1:27017/aimurdle`. Atlas requires internet access, while a local MongoDB instance does not.
