/**
 * researchRoutes.js — REST endpoints for the agentic research pipeline
 *
 * POST   /api/research/start                      — kick off a new research run
 * GET    /api/research/status/:memoId             — poll pipeline status (every 3s from FE)
 * GET    /api/research/memos                      — list all memos for the current user
 * GET    /api/research/memos/:memoId              — fetch a single full memo
 * GET    /api/research/memos/:memoId/export-pdf   — stream PDF investment memo
 * DELETE /api/research/memos/:memoId              — delete a memo
 */

import express from "express";
import PDFDocument               from "pdfkit";
import { protect }              from "../middleware/auth.js";
import asyncWrapper             from "../middleware/asyncWrapper.js";
import Memo                     from "../models/Memo.js";
import { orchestrateResearch }  from "../services/researchOrchestrator.js";
import logger                   from "../utils/logger.js";

const router = express.Router();

// All research routes require authentication
router.use(protect);

// ── POST /api/research/start ───────────────────────────────────────────────
router.post(
  "/start",
  asyncWrapper(async (req, res) => {
    const { companyName, websiteUrl } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: "companyName is required." });
    }

    // Create the Memo document (status: pending)
    const memo = await Memo.create({
      userId:      req.user._id,
      companyName: companyName.trim(),
      websiteUrl:  websiteUrl?.trim() || "",
      status:      "pending",
    });

    logger.info(`[ResearchRoutes] New memo created: ${memo._id} for "${companyName}"`);

    // Fire-and-forget: don't await — return immediately to the client
    orchestrateResearch({
      memoId:      memo._id.toString(),
      companyName: companyName.trim(),
      websiteUrl:  websiteUrl?.trim() || "",
    }).catch((err) => {
      logger.error(`[ResearchRoutes] Unhandled orchestration error: ${err.message}`);
    });

    return res.status(202).json({
      memoId: memo._id,
      status: "running",
      message: "Research pipeline started. Poll /api/research/status/:memoId for updates.",
    });
  })
);

// ── GET /api/research/status/:memoId ─────────────────────────────────────
router.get(
  "/status/:memoId",
  asyncWrapper(async (req, res) => {
    const memo = await Memo.findOne({
      _id:    req.params.memoId,
      userId: req.user._id,
    }).select("status agentStatus companyName websiteUrl memo vcMatches createdAt");

    if (!memo) {
      return res.status(404).json({ error: "Memo not found." });
    }

    return res.json(memo);
  })
);

// ── GET /api/research/memos ───────────────────────────────────────────────
router.get(
  "/memos",
  asyncWrapper(async (req, res) => {
    const memos = await Memo.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select("companyName websiteUrl status agentStatus createdAt memo.investmentScore memo.confidenceScore memo.fundingStage memo.totalAddressableMarket memo.arr memo.overview");

    return res.json({ memos });
  })
);

// ── GET /api/research/memos/:memoId ──────────────────────────────────────
router.get(
  "/memos/:memoId",
  asyncWrapper(async (req, res) => {
    const memo = await Memo.findOne({
      _id:    req.params.memoId,
      userId: req.user._id,
    });

    if (!memo) {
      return res.status(404).json({ error: "Memo not found." });
    }

    return res.json(memo);
  })
);

// ── GET /api/research/memos/:memoId/export-pdf ───────────────────────────
router.get(
  "/memos/:memoId/export-pdf",
  asyncWrapper(async (req, res) => {
    const memo = await Memo.findOne({
      _id:    req.params.memoId,
      userId: req.user._id,
    });

    if (!memo) {
      return res.status(404).json({ error: "Memo not found." });
    }
    if (memo.status !== "complete") {
      return res.status(400).json({ error: "Memo is not yet complete." });
    }

    const { companyName, websiteUrl, memo: m, vcMatches, createdAt } = memo;

    // ── PDF Setup ────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    const filename = `${companyName.replace(/\s+/g, "-").toLowerCase()}-memo.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Helper functions ─────────────────────────────────────────────────
    const PURPLE = "#7c3aed";
    const DARK   = "#1a1a2e";
    const GRAY   = "#6b7280";
    const pageW  = doc.page.width - 100; // usable width with margins

    const section = (title, content, color = PURPLE) => {
      if (!content) return;
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(color).text(title.toUpperCase());
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10).fillColor("#1f2937").text(content, { lineGap: 4 });
    };

    const scoreBar = (label, value, color = PURPLE) => {
      const barW = pageW * 0.6;
      const filled = barW * (Math.min(value, 100) / 100);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text(`${label}: ${value}/100`);
      doc.moveDown(0.2);
      const y = doc.y;
      doc.rect(50, y, barW, 8).fillColor("#e5e7eb").fill();
      doc.rect(50, y, filled, 8).fillColor(color).fill();
      doc.moveDown(0.8);
    };

    // ── COVER PAGE ───────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 180).fillColor(DARK).fill();
    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(28).fillColor("#ffffff").text(companyName, { align: "center" });
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(11).fillColor("#a78bfa")
      .text("INVESTMENT MEMORANDUM • CONFIDENTIAL", { align: "center" });
    doc.moveDown(0.3);
    if (websiteUrl) {
      doc.font("Helvetica").fontSize(9).fillColor("#c4b5fd").text(websiteUrl, { align: "center" });
    }

    doc.moveDown(1.5);
    doc.fillColor("#374151");

    // Key metrics row
    const metrics = [
      ["DATE",          new Date(createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })],
      ["STAGE",         m?.fundingStage || "—"],
      ["TAM",           m?.totalAddressableMarket || "—"],
      ["ARR",           m?.arr || "—"],
      ["INV. SCORE",    m?.investmentScore != null ? `${m.investmentScore}/100` : "—"],
      ["CONFIDENCE",    m?.confidenceScore  != null ? `${m.confidenceScore}/100`  : "—"],
    ];

    const colW = pageW / metrics.length;
    const startX = 50;
    const metricY = doc.y + 10;
    metrics.forEach(([label, value], i) => {
      const x = startX + i * colW;
      doc.font("Helvetica-Bold").fontSize(7).fillColor(GRAY)
        .text(label, x, metricY, { width: colW - 4, align: "center" });
      doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK)
        .text(value, x, metricY + 14, { width: colW - 4, align: "center" });
    });

    doc.moveDown(5);
    doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor("#e5e7eb").stroke();

    // ── PAGE 2: MEMO SECTIONS ────────────────────────────────────────────
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK)
      .text(`${companyName} — Investment Memo`);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor(PURPLE).lineWidth(2).stroke();
    doc.lineWidth(1);

    section("Executive Summary",  m?.overview);
    section("Problem",            m?.problem,        "#dc2626");
    section("Solution",           m?.solution,       "#d97706");
    section("Market Opportunity", m?.market,         "#2563eb");
    section("Traction",           m?.traction,       "#059669");
    section("Business Model",     m?.businessModel,  "#0891b2");
    section("Competition",        m?.competition,    "#ea580c");
    section("Risk Assessment",    m?.risks,          "#dc2626");

    // ── SCORES PAGE ──────────────────────────────────────────────────────
    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK).text("Investment Score");
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor(PURPLE).lineWidth(2).stroke();
    doc.lineWidth(1);
    doc.moveDown(0.8);

    if (m?.investmentScore != null) scoreBar("Investment Score", m.investmentScore, PURPLE);
    if (m?.confidenceScore  != null) scoreBar("AI Confidence",   m.confidenceScore,  "#059669");

    // ── VC MATCHES PAGE ──────────────────────────────────────────────────
    if (vcMatches && vcMatches.length > 0) {
      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK).text("Best-Fit VC Investors");
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor(PURPLE).lineWidth(2).stroke();
      doc.lineWidth(1);

      vcMatches.slice(0, 3).forEach((vc, i) => {
        doc.moveDown(0.8);
        doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK).text(`${i + 1}. ${vc.name}`);
        doc.font("Helvetica").fontSize(9).fillColor(GRAY)
          .text(`${vc.focus} · ${vc.stage} · Match: ${vc.matchScore}%`);
        if (vc.thesis) {
          doc.moveDown(0.3);
          doc.font("Helvetica-Oblique").fontSize(10).fillColor("#374151")
            .text(`"${vc.thesis}"`);
        }
        if (vc.reason) {
          doc.moveDown(0.2);
          doc.font("Helvetica").fontSize(9).fillColor(GRAY).text(vc.reason);
        }
        if (vc.recentInvestments?.length) {
          doc.moveDown(0.2);
          doc.font("Helvetica-Bold").fontSize(9).fillColor(GRAY)
            .text(`Portfolio: ${vc.recentInvestments.join(", ")}`);
        }
        if (i < vcMatches.slice(0, 3).length - 1) {
          doc.moveDown(0.4);
          doc.moveTo(50, doc.y).lineTo(50 + pageW, doc.y).strokeColor("#f3f4f6").stroke();
        }
      });
    }

    // ── Footer ───────────────────────────────────────────────────────────
    doc.font("Helvetica").fontSize(8).fillColor(GRAY)
      .text(
        `Generated by VC Scout Intelligence • ${new Date().toLocaleDateString()} • Confidential`,
        50, doc.page.height - 40, { align: "center", width: pageW }
      );

    doc.end();
    logger.info(`[ResearchRoutes] PDF exported for memo ${memo._id} (${companyName})`);
  })
);

// ── DELETE /api/research/memos/:memoId ────────────────────────────────────
router.delete(
  "/memos/:memoId",
  asyncWrapper(async (req, res) => {
    const memo = await Memo.findOneAndDelete({
      _id:    req.params.memoId,
      userId: req.user._id,   // ownership check — users can only delete their own
    });

    if (!memo) {
      return res.status(404).json({ error: "Memo not found or not authorized." });
    }

    logger.info(`[ResearchRoutes] Deleted memo ${req.params.memoId} for user ${req.user._id}`);
    return res.json({ success: true, message: `Memo for "${memo.companyName}" deleted.` });
  })
);

export default router;
