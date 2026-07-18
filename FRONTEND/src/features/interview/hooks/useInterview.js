// import {getAllInterviewReports,generateInterviewReport,getInterviewReportById,generateResumePdf} from "../services/interview.api"
// import { useContext ,useEffect} from "react"
// import { InterviewContext } from "../interview.context"
// import {useParams} from "react-router"



// export const useInterview = () => {

//     const context = useContext(InterviewContext)
//     const {interviewId}=useParams()

//     if (!context) {
//         throw new Error("useInterview must be used within an InterviewProvider")
//     }

//     const { loading, setLoading, report, setReport, reports, setReports } = context

//   const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
//   setLoading(true)
//   let response = null
//   try {
//     response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
//     if (response && response.interviewReport) {
//       setReport(response.interviewReport)
//       return response.interviewReport
//     } else {
//       console.error("generateInterviewReport returned null or invalid response")
//       return null
//     }
//   } catch (error) {
//     console.error("Error generating report:", error)
//     return null
//   } finally {
//     setLoading(false)
//   }
// }


//     const getReportById = async (interviewId) => {
//         setLoading(true)
//         let response = null
//         try {
//             response = await getInterviewReportById(interviewId)
//             setReport(response.interviewReport)
//         } catch (error) {
//             console.log(error)
//         } finally {
//             setLoading(false)
//         }
//         return response.interviewReport
//     }

//     const getReports = async () => {
//         setLoading(true)
//         let response = null
//         try {
//             response = await getAllInterviewReports()
//             setReports(response.interviewReports)
//         } catch (error) {
//             console.log(error)
//         } finally {
//             setLoading(false)
//         }

//         return response.interviewReports
//     }



//      const getResumePdf = async (interviewReportId) => {
//         setLoading(true)
//         let response = null
//         try {
//             response = await generateResumePdf({ interviewReportId })
//             const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
//             const link = document.createElement("a")
//             link.href = url
//             link.setAttribute("download", `resume_${interviewReportId}.pdf`)
//             document.body.appendChild(link)
//             link.click()
//         }
//         catch (error) {
//             console.log(error)
//         } finally {
//             setLoading(false)
//         }
//     }


//     useEffect(()=>{
//         if(interviewId){
//             getReportById(interviewId)
//         }else{
//             getReports()
//         }
//     },[interviewId])

//      return { loading, report, reports, generateReport, getReportById, getReports , getResumePdf }
// } 


import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf
} from "../services/interview.api";
import { useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const { loading, setLoading, report, setReport, reports, setReports } = context;

  // Generate a new report
 const generateReport = async ({
  jobDescription,
  selfDescription,
  resumeFile,
}) => {
  setLoading(true);

  try {
    console.log("Sending Data:");
    console.log("jobDescription:", jobDescription);
    console.log("selfDescription:", selfDescription);
    console.log("resumeFile:", resumeFile);

    const response = await generateInterviewReport({
      jobDescription,
      selfDescription,
      resumeFile,
    });

    console.log("Raw Response:", response);

    if (response && (response.interviewReport || response._id)) {
      const reportData = response.interviewReport || response;
      setReport(reportData);
      return reportData;
    }

    return null;
  } catch (error) {
    console.error("Error generating report:", error);

    console.log("========== API ERROR ==========");
    console.log("Status:", error?.response?.status);
    console.log("Response Data:", error?.response?.data);
    console.log("Response:", error?.response);
    console.log("Request:", error?.request);
    console.log("================================");

    return null;
  } finally {
    setLoading(false);
  }
};

  // Fetch a single report by ID
  const getReportById = async (id) => {
    setLoading(true);
    try {
      const response = await getInterviewReportById(id);
      if (response && response.interviewReport) {
        setReport(response.interviewReport);
        return response.interviewReport;
      }
      return null;
    } catch (error) {
      console.error("Error fetching report by ID:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch all reports
  const getReports = async () => {
    setLoading(true);
    try {
      const response = await getAllInterviewReports();
      if (response && response.interviewReports) {
        setReports(response.interviewReports);
        return response.interviewReports;
      }
      return [];
    } catch (error) {
      console.error("Error fetching reports:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Generate a resume PDF
  const getResumePdf = async (interviewReportId) => {
    setLoading(true);
    try {
      const response = await generateResumePdf({ interviewReportId });
      const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resume_${interviewReportId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Error generating resume PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load reports on mount or when interviewId changes
  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
  }, [interviewId]);

  return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf };
};







