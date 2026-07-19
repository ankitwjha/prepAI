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
      return null;
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
      const response = await generateResumePdf({ interviewReportId: reportId });
      const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resume_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating resume PDF:", error);
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
