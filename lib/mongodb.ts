import mongoose from "mongoose";
import dns from "dns";

/**
 * Global cache interface to prevent redundant connections in Next.js hot reloads / serverless functions
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var inMemoryStore: {
    config: {
      configKey: string;
      caseId: string;
      timerDurationMinutes: number;
      roundStatus: "waiting" | "active" | "ended";
      roundStartedAt: string | null;
      answerKeyRevealed: boolean;
      roundName: string;
    };
    submissions: Map<string, {
      teamName: string;
      caseId: string;
      squadBadge: string;
      teamToken: string;
      assignedQuestionIndex: number;
      teamStatus: "waiting" | "active" | "ended" | "submitted";
      answers: Record<string, string>;
      score: number;
      breakdown: {
        correctCount: number;
        totalQuestions: number;
        basePoints: number;
        timeBonus: number;
      };
      timeTakenSeconds: number;
      isSubmitted: boolean;
      joinedAt: string;
      startTime?: string;
      submittedAt?: string;
    }>;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

// Initialize fallback in-memory store if not present
if (!global.inMemoryStore) {
  global.inMemoryStore = {
    config: {
      configKey: "global",
      caseId: "ghost-in-the-model",
      timerDurationMinutes: 15,
      roundStatus: "waiting",
      roundStartedAt: null,
      answerKeyRevealed: false,
      roundName: "Round 1 - NeuraCore AI Cleanroom",
    },
    submissions: new Map(),
  };
}

export async function connectToDatabase(): Promise<{ isConnected: boolean }> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.warn("MONGODB_URI missing from environment variables.");
    return { isConnected: false };
  }

  if (cached!.conn && mongoose.connection.readyState === 1) {
    return { isConnected: true };
  }

  // Force public DNS resolvers to prevent Windows DNS SRV ECONNREFUSED error on mongodb+srv://
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {
    // Ignore if custom DNS servers fail
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("Successfully connected to MongoDB Atlas!");
      return mongooseInstance;
    }).catch((err) => {
      console.error("MongoDB Atlas connection error:", err.message || err);
      throw err;
    });
  }

  try {
    cached!.conn = await cached!.promise;
    return { isConnected: true };
  } catch (e: any) {
    cached!.promise = null;
    console.error("MongoDB connection failed details:", e.message || e);
    return { isConnected: false };
  }
}

export function getInMemoryStore() {
  return global.inMemoryStore!;
}
