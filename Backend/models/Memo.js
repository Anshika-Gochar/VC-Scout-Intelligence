/**
 * Memo.js — Investment Memo document model
 * Tracks agentic research pipeline state + final memo output
 */

import mongoose from "mongoose";

const agentStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["idle", "running", "done", "failed"],
      default: "idle",
    },
    completedAt: { type: Date },
  },
  { _id: false }
);

const vcMatchSchema = new mongoose.Schema(
  {
    name:              { type: String },
    focus:             { type: String },
    matchScore:        { type: Number, min: 0, max: 100 },
    thesis:            { type: String },
    recentInvestments: [{ type: String }],
    stage:             { type: String },
    reason:            { type: String },
  },
  { _id: false }
);

const memoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  companyName: { type: String, required: true, trim: true },
  websiteUrl:  { type: String, trim: true },

  // ── Overall pipeline status ─────────────────────────────────────────────
  status: {
    type: String,
    enum: ["pending", "running", "complete", "failed"],
    default: "pending",
  },

  // ── Per-agent status ────────────────────────────────────────────────────
  agentStatus: {
    webAgent:          { type: agentStatusSchema, default: () => ({}) },
    newsAgent:         { type: agentStatusSchema, default: () => ({}) },
    githubAgent:       { type: agentStatusSchema, default: () => ({}) },
    synthesizerAgent:  { type: agentStatusSchema, default: () => ({}) },
    vcMatchingAgent:   { type: agentStatusSchema, default: () => ({}) },
  },

  // ── Raw data collected by agents ────────────────────────────────────────
  rawData: {
    webContent: { type: String },
    newsArticles: [
      {
        _id: false,
        title:   { type: String },
        url:     { type: String },
        summary: { type: String },
      },
    ],
    githubData: {
      stars:      { type: Number },
      forks:      { type: Number },
      lastCommit: { type: Date },
      repoUrl:    { type: String },
      activity:   { type: String },
    },
  },

  // ── Synthesized investment memo ─────────────────────────────────────────
  memo: {
    overview:              { type: String },
    problem:               { type: String },
    solution:              { type: String },
    market:                { type: String },
    traction:              { type: String },
    businessModel:         { type: String },
    competition:           { type: String },
    risks:                 { type: String },
    investmentScore:       { type: Number, min: 0, max: 100 },
    confidenceScore:       { type: Number, min: 0, max: 100 },
    totalAddressableMarket:{ type: String },
    arr:                   { type: String },
    fundingStage:          { type: String },
  },

  // ── VC Matching results ─────────────────────────────────────────────────
  // TODO: replace with ChromaDB semantic matching in v2
  vcMatches: [vcMatchSchema],

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Memo", memoSchema);
