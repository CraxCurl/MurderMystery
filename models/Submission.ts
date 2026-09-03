import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubmission extends Document {
  teamName: string;
  caseId: string;
  squadBadge?: string;
  answers?: Record<string, string>;
  score?: number;
  breakdown?: {
    correctCount: number;
    totalQuestions: number;
    basePoints: number;
    timeBonus: number;
  };
  timeTakenSeconds?: number;
  isSubmitted: boolean;
  joinedAt: Date;
  submittedAt?: Date;
}

const SubmissionSchema: Schema<ISubmission> = new Schema(
  {
    teamName: { type: String, required: true, trim: true, unique: true },
    caseId: { type: String, required: true, default: "ghost-in-the-model" },
    squadBadge: { type: String, default: "search" },
    answers: { type: Map, of: String, default: {} },
    score: { type: Number, default: 0 },
    breakdown: {
      correctCount: { type: Number, default: 0 },
      totalQuestions: { type: Number, default: 4 },
      basePoints: { type: Number, default: 0 },
      timeBonus: { type: Number, default: 0 },
    },
    timeTakenSeconds: { type: Number, default: 0 },
    isSubmitted: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

const Submission: Model<ISubmission> =
  mongoose.models.Submission || mongoose.model<ISubmission>("Submission", SubmissionSchema);

export default Submission;
