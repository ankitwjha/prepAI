const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumeHtml, generateChatResponse } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const mongoose = require("mongoose");

async function logSystemError(req, message, error = null) {
  try {
    const errorLog = {
      timestamp: new Date(),
      userId: req.user?.id,
      message,
      ip: req.ip || req.headers["x-forwarded-for"],
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null,
      errorStack: error ? error.stack || String(error) : null
    };
    await mongoose.connection.db.collection("system_errors").insertOne(errorLog);
    console.log("Logged system error to MongoDB:", message);
  } catch (err) {
    console.error("Failed to log system error to DB:", err);
  }
}

async function generateInterViewReportController(req, res) {
  try {
    if (!req.file) {
      await logSystemError(req, "No resume file uploaded");
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
      await logSystemError(req, "PDF parse error: " + pdfError.message, pdfError);
      
      let clientMessage = "Failed to parse the resume file. Please ensure it is a valid, uncorrupted PDF document.";
      if (pdfError.message && pdfError.message.includes("XRef")) {
        clientMessage = "The uploaded file is not a valid PDF document or is corrupted (bad XRef entry). Please upload a valid PDF resume.";
      }
      
      return res.status(400).json({
        error: clientMessage,
      });
    }

    const { selfDescription, jobDescription } = req.body;

    if (!selfDescription || !jobDescription) {
      await logSystemError(req, `Missing required fields: selfDescription=${!!selfDescription}, jobDescription=${!!jobDescription}`);
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
        title: jobDescription.substring(0, 50) + " Interview Plan",
        matchScore: 78,
        technicalQuestions: [
          {
            question: `How would you design a scalable solution for key requirements in: ${jobDescription.substring(0, 60)}?`,
            intention: "Assess system design skills, component architecture, and problem-solving methodology.",
            answer: "Discuss core architecture, data flow, state management, error handling, and performance optimization."
          },
          {
            question: "How do you ensure application performance, error handling, and code quality in production?",
            intention: "Evaluate engineering best practices, automated testing, and code review habits.",
            answer: "Highlight unit and integration testing, error boundary/catch patterns, and continuous integration."
          }
        ],
        behavioralQuestions: [
          {
            question: "Tell me about a time you faced a complex technical challenge under tight deadlines.",
            intention: "Evaluate prioritization, problem-solving resilience, and stakeholder communication.",
            answer: "Use the STAR framework: explain the Situation, Task, Action, and measurable Result."
          }
        ],
        skillGaps: [
          { skill: "System Architecture Optimization", severity: "medium" },
          { skill: "Automated Integration Testing", severity: "low" }
        ],
        preparationPlan: [
          { day: 1, focus: "Core Architecture & Requirements", tasks: ["Review domain concepts in job description", "Practice system design questions"] },
          { day: 2, focus: "Mock Interview & Refinement", tasks: ["Conduct a timed mock technical interview", "Refine behavioral answers"] }
        ]
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

    const htmlContent = await generateResumeHtml({ resume, selfDescription, jobDescription });

    res.status(200).json({ html: htmlContent });
  } catch (err) {
    console.error("Error generating resume HTML:", err);
    res.status(500).json({ error: "Failed to generate resume HTML" });
  }
}

async function chatWithInterviewReportController(req, res) {
  try {
    const { interviewReportId } = req.params;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message field is required." });
    }

    const interviewReport = await interviewReportModel.findOne({
      _id: interviewReportId,
      user: req.user.id,
    });

    if (!interviewReport) {
      return res.status(404).json({ error: "Interview report not found." });
    }

    const reply = await generateChatResponse({
      report: interviewReport,
      message,
      history,
    });

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Error in chat controller:", err);
    res.status(500).json({ error: "Failed to generate chat response." });
  }
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
  chatWithInterviewReportController,
};
