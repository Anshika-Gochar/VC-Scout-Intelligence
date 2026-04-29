import mongoose from "mongoose";

const enrichmentSchema = new mongoose.Schema({
  companyId: String,
  summary: String,
  bullets: [String],
  keywords: [String],
  signals: [String],
  sources: [String],
  timestamp: Date,
});

export default mongoose.model("Enrichment", enrichmentSchema);