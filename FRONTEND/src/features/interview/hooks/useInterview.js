import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf
} from "../services/interview.api";
import { useCallback, useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const { loading, setLoading, report, setReport, reports, setReports } = context;

  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoading(true);

    try {
      const response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });

      if (response?.interviewReport || response?._id) {
        const reportData = response.interviewReport || response;
        setReport(reportData);
        return reportData;
      }

      return null;
    } catch (error) {
      console.error("Error generating report:", error);
      const errMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getReportById = useCallback(async (id, { showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    setReport(null);

    try {
      const response = await getInterviewReportById(id);
      if (response?.interviewReport) {
        setReport(response.interviewReport);
        return response.interviewReport;
      }
      return null;
    } catch (error) {
      console.error("Error fetching report by ID:", error);
      return null;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [setLoading, setReport]);

  const getReports = useCallback(async () => {
    try {
      const response = await getAllInterviewReports();
      if (response?.interviewReports) {
        setReports(response.interviewReports);
        return response.interviewReports;
      }
      return [];
    } catch (error) {
      console.error("Error fetching reports:", error);
      return [];
    }
  }, [setReports]);

  const getResumePdf = async (reportId) => {
    setLoading(true);
    try {
      const data = await generateResumePdf({ interviewReportId: reportId });
      if (data?.html) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "1024px";
        iframe.style.height = "768px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(data.html);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          document.body.removeChild(iframe);
        }, 500);
      } else {
        alert("Failed to generate resume text layout. Please try again.");
      }
    } catch (error) {
      console.error("Error generating resume PDF:", error);
      alert("Error generating resume. Please check console logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
  }, [interviewId, getReportById, getReports]);

  return { loading, report, reports, generateReport, getReportById, getReports, getResumePdf };
};
