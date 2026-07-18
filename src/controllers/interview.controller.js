// const pdfParse=require ("pdf-parse")
// const {generateInterviewReport,generateResumePdf} =require ("../services/ai.service")
// const interviewReportModel=require ("../models/interviewReport.model")


// //controller to generate interview report by resume , selfdes,jobdesc
// async function generateInterViewReportController(req,res){
    

//     const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
//     const {selfDescription,jobDescription}=req.body

//     const interViewReportByAi=await generateInterviewReport({
//         resume : resumeContent.text,
//         selfDescription,
//         jobDescription
//     })

//     const interviewReport=await interviewReportModel.create({
//         user:req.user.id,
//         resume:resumeContent.text,
//         selfDescription,
//         jobDescription,
//         ...interViewReportByAi
//     })

//     res.status(201).json({
//         message:"Interview report generated successfully",
//         interviewReport
//     })
// }



// //controller to get interview report by interviewid
// async function getInterviewReportByIdController(req,res){
//     const {interviewId}= req.params

//     const interviewReport = await interviewReportModel.findOne({_id:interviewId, user:req.user.id})

//     if(!interviewReport){
//         return res.status(404).json({
//             message:"Interview Report not found"
//         })
//     }

//     res.status(200).json({
//         message:"Interview report fetched successfully",
//         interviewReport
//     })


// }


// //controller to get all interview reports of logged in user
// async function getAllInterviewReportsController(req, res) {
//     const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

//     res.status(200).json({
//         message: "Interview reports fetched successfully.",
//         interviewReports
//     })
// }


// //controller to generate resume pdf based on selfdes jobdes
// async function generateResumePdfController (req,res){
//     const {interviewResportId}=req.params

//     const interviewReport = await interviewReportModel.findById(interviewReportId)

//     if (!interviewReport){
//         return res.status (404).json({
//             message :"Interview report not found"
//         })
//     }

//     const {resume,jobDescription,selfDescription}=interviewReport

//     const pdfBuffer = await generateResumePdf ({resume,selfDescription,jobDescription})

//     res.set ({
//         "Content-Type": "application/pdf",
//         "Content-Disposition":`attachment; filename=resume_${interviewReportId}.pdf`
//     })
//     res.send (pdfBuffer)
// }

// module.exports ={generateInterViewReportController,getInterviewReportByIdController,getAllInterviewReportsController,  generateResumePdfController}













const pdfParse = require("pdf-parse");
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

// Controller to generate interview report by resume, selfDescription, jobDescription
async function generateInterViewReportController(req, res) {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    console.log("USER:", req.user);

    if (!req.file) {
      return res.status(400).json({
        error: "No resume file uploaded",
      });
    }

   let resumeText = "";

try {
  console.log("FILE INFO:", {
    originalname: req.file?.originalname,
    mimetype: req.file?.mimetype,
    size: req.file?.size,
    hasBuffer: !!req.file?.buffer,
    bufferLength: req.file?.buffer?.length,
  });

  const resumeData = await pdfParse(req.file.buffer);

  resumeText = resumeData.text;

  console.log("PDF parsed successfully");
} catch (pdfError) {
  console.error("PDF PARSE ERROR:", pdfError);

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

      console.log("AI RESPONSE:", interViewReportByAi);
    } catch (aiError) {
  console.log("=========== AI ERROR ===========");
  console.log(aiError);
  console.log("ERROR MESSAGE:", aiError.message);

  if (aiError.response) {
    console.log("API RESPONSE:", aiError.response);
  }

  console.log("================================");

  interViewReportByAi = {
    title: jobDescription.substring(0, 50),
    matchScore: 75,
    technicalQuestions: [],
    behavioralQuestions: [],
    skillGaps: [],
    preparationPlan: [],
  };
}

  console.log("FINAL AI DATA:", interViewReportByAi);

const interviewReport = await interviewReportModel.create({
  user: req.user?._id || req.user?.id,
  resume: resumeText,
  selfDescription,
  jobDescription,

  title:
    interViewReportByAi?.title ||
    "Interview Report",

  matchScore:
    interViewReportByAi?.matchScore || 75,

  technicalQuestions:
    interViewReportByAi?.technicalQuestions || [],

  behavioralQuestions:
    interViewReportByAi?.behavioralQuestions || [],

  skillGaps:
    interViewReportByAi?.skillGaps || [],

  preparationPlan:
    interViewReportByAi?.preparationPlan || [],
});

    return res.status(201).json({
      message: "Interview report generated successfully",
      interviewReport,
    });
  } catch (err) {
    console.error("CONTROLLER ERROR:", err);

    return res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}

// Controller to get interview report by interviewId
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

// Controller to get all interview reports of logged in user
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

// Controller to generate resume PDF based on selfDescription + jobDescription
async function generateResumePdfController(req, res) {
  try {
    const { interviewReportId } = req.params;

    const interviewReport = await interviewReportModel.findById(interviewReportId);

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
