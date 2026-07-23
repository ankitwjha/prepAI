const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require ("../middlewares/file.middleware")

const interviewRouter= express.Router()

/**
 * @route POST /api/interview
 * @description generate new interview report on the nasis of users self description , resume pdf and job descript
 * @access private
 */


interviewRouter.post("/", authMiddleware.authUser,upload.single("resume"),interviewController.generateInterViewReportController)



/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId
 * @access private
 */

interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)



/**@route GET /api/interview/
 * @description get all interview reports of logged in user
 * @access private
 */

interviewRouter.get("/",authMiddleware.authUser,interviewController.getAllInterviewReportsController)


/**
 * GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self , job desc
 * @acccess private
 */

interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser,interviewController.generateResumePdfController)


/**
 * POST /api/interview/chat/:interviewReportId
 * @description chat with AI helper about the interview report
 * @access private
 */
interviewRouter.post("/chat/:interviewReportId", authMiddleware.authUser, interviewController.chatWithInterviewReportController)


module.exports= interviewRouter