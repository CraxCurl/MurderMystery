import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

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
  if (!MONGODB_URI) {
    return { isConnected: false };
  }

  if (cached!.conn) {
    return { isConnected: true };
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
    return { isConnected: true };
  } catch (e) {
    cached!.promise = null;
    console.warn("MongoDB connection failed, falling back to in-memory store:", e);
    return { isConnected: false };
  }
}

export function getInMemoryStore() {
  return global.inMemoryStore!;
}
