/**
 * SavedMemo.js — Saved startup references (joined to Memo)
 *
 * Tracks which memos a user has bookmarked, organized into named lists.
 * Never duplicates memo data — always references the Memo document.
 *
 * Unique index on (userId + memoId) prevents duplicate saves.
 */

import mongoose from "mongoose";

const savedMemoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  memoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Memo",
    required: true,
  },
  listName: {
    type: String,
    default: "Default",
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent saving the same memo twice for the same user
savedMemoSchema.index({ userId: 1, memoId: 1 }, { unique: true });

export default mongoose.model("SavedMemo", savedMemoSchema);
