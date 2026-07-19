const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

async function generateInterViewReportController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No resume file uploaded",
      });
    }

    let resumeText = "";

    try {
      const resumeData = await pdfParse(req.file.buffer);
      resumeText = resumeData.text;
    } catch (pdfError) {
      console.error("PDF parse error:", pdfError);
      return res.status(400).json({
        error: pdfError.message,
      });
    }

    const { selfDescription, jobDescription } = req.body;

    if (!selfDescription || !jobDescription) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    let interViewReportByAi = {};

    try {
      interViewReportByAi = await generateInterviewReport({
        resume: resumeText,
        selfDescription,
        jobDescription,
      });
    } catch (aiError) {
      console.error("AI generation error:", aiError.message);
      interViewReportByAi = {
        title: jobDescription.substring(0, 50),
        matchScore: 75,
        technicalQuestions: [],
        behavioralQuestions: [],
        skillGaps: [],
        preparationPlan: [],
      };
    }

    const interviewReport = await interviewReportModel.create({
      user: req.user.id,
      resume: resumeText,
      selfDescription,
      jobDescription,
      title: interViewReportByAi?.title || "Interview Report",
      matchScore: interViewReportByAi?.matchScore ?? 75,
      technicalQuestions: interViewReportByAi?.technicalQuestions || [],
      behavioralQuestions: interViewReportByAi?.behavioralQuestions || [],
      skillGaps: interViewReportByAi?.skillGaps || [],
      preparationPlan: interViewReportByAi?.preparationPlan || [],
    });

    return res.status(201).json({
      message: "Interview report generated successfully",
      interviewReport,
    });
  } catch (err) {
    console.error("Interview report controller error:", err);
    return res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}

async function getInterviewReportByIdController(req, res) {
  try {
    const { interviewId } = req.params;
    const interviewReport = await interviewReportModel.findOne({
      _id: interviewId,
      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({ message: "Interview Report not found" });
    }

    res.status(200).json({
      message: "Interview report fetched successfully",
      interviewReport,
    });
  } catch (err) {
    console.error("Error fetching report by ID:", err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
}

async function getAllInterviewReportsController(req, res) {
  try {
    const interviewReports = await interviewReportModel
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select(
        "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
      );

    res.status(200).json({
      message: "Interview reports fetched successfully.",
      interviewReports,
    });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
}

async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params;

    const interviewReport = await interviewReportModel.findOne({
      _id: interviewReportId,
      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({ message: "Interview report not found" });
    }

    const { resume, jobDescription, selfDescription } = interviewReport;

    const pdfBuffer = await generateResumePdf({ resume, selfDescription, jobDescription });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error generating resume PDF:", err);
    res.status(500).json({ error: "Failed to generate resume PDF" });
  }
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
};
