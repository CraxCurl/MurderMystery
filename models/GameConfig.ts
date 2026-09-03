import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGameConfig extends Document {
  configKey: string;
  caseId: string;
  timerDurationMinutes: number;
  roundStatus: "waiting" | "active" | "ended";
  roundStartedAt: Date | null;
  answerKeyRevealed: boolean;
  roundName: string;
}

const GameConfigSchema: Schema<IGameConfig> = new Schema(
  {
    configKey: { type: String, required: true, unique: true, default: "global" },
    caseId: { type: String, default: "ghost-in-the-model" },
    timerDurationMinutes: { type: Number, default: 15 },
    roundStatus: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    roundStartedAt: { type: Date, default: null },
    answerKeyRevealed: { type: Boolean, default: false },
    roundName: { type: String, default: "Round 1 - NeuraCore AI Cleanroom" },
  },
  { timestamps: true }
);

const GameConfig: Model<IGameConfig> =
  mongoose.models.GameConfig || mongoose.model<IGameConfig>("GameConfig", GameConfigSchema);

export default GameConfig;
