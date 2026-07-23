// import React from 'react'
// import "../style/home.scss"
// const Home = () => {
//   return (
//    <main className='home'>
//     <div className="interview-input-group">
//            <div className="left">
//         <textarea name="jobDescription" id="jobDescription" placeholder="Enter your job description here..."></textarea>
//     </div>
//     <div className="right">
//         <div className="input-group">
//             <label htmlFor="resume">Upload Resume</label>
//             <input type="file" name ="resume" id="resume" accept='.pdf' />
//         </div>
//         <div className="input-group">
//             <label htmlFor="selfDescription">Self Description</label>
//             <textarea name="selfDescription" id="selfDescription" placeholder='Describe yourself in a few sentences...'></textarea>
//         </div>
//         <button className='generate-btn'>Generate Interview Report</button>
//     </div>
//     </div>
 


//    </main>
//   )
// }

// export default Home













import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview'
import { useNavigate } from 'react-router'
import LoadingScreen from '../../../components/LoadingScreen'

const Home = () => {
  const { loading, generateReport, reports } = useInterview()
  const [jobDescription, setJobDescription] = useState("")
  const [selfDescription, setSelfDescription] = useState("")
  const [resumeFileName, setResumeFileName] = useState("No file selected")
  const resumeInputRef = useRef()

  const navigate = useNavigate()

  const handleGenerateReport = async () => {
    if (!jobDescription.trim() || !selfDescription.trim()) {
      alert("Please enter both a job description and self description.")
      return
    }

    const resumeFile = resumeInputRef.current?.files?.[0]
    if (!resumeFile) {
      alert("Please upload your resume PDF.")
      return
    }

    try {
      const data = await generateReport({ jobDescription, selfDescription, resumeFile })

      if (data?._id) {
        navigate(`/interview/${data._id}`)
      } else {
        alert("Failed to generate report. Please try again.")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert(error.message || "Server error while generating report. Please check backend logs.")
    }
  }

  if (loading) {
    return <LoadingScreen message="Generating tailored 5-day interview plan & questions..." />
  }

  return (
    <main className='home'>
      <div className="hero-text">
        <h1>AI‑Powered Interview Prep</h1>
        <p>Upload your resume, describe yourself, and get a tailored interview report instantly.</p>
      </div>

      <div className="interview-input-group">
        <div className="left">
          <textarea
            onChange={(e) => setJobDescription(e.target.value)}
            name="jobDescription"
            id="jobDescription"
            placeholder="Enter your job description here..."
          ></textarea>
        </div>
        <div className="right">
          <div className="input-group file-upload">
            <label htmlFor="resume" className="custom-file-label">Upload Resume</label>
            <input
              ref={resumeInputRef}
              type="file"
              name="resume"
              id="resume"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files[0]
                setResumeFileName(file ? file.name : "No file selected")
              }}
            />
            <span className="file-name">{resumeFileName}</span>
          </div>
          <div className="input-group">
            <label htmlFor="selfDescription">Self Description</label>
            <textarea
              onChange={(e) => setSelfDescription(e.target.value)}
              name="selfDescription"
              id="selfDescription"
              placeholder="Describe yourself in a few sentences..."
            ></textarea>
          </div>
          <button
            onClick={handleGenerateReport}
            className='generate-btn'>Generate Interview Report</button>
        </div>
      </div>

      {/* Redesigned Previous Reports List */}
      {reports && reports.length > 0 && (
        <section className='recent-reports'>
          <div className="reports-header">
            <h2>My Previous Interview Plans</h2>
            <span className="reports-count">{reports.length} Reports</span>
          </div>

          <div className='reports-grid'>
            {reports.map(report => (
              <div key={report._id} className='report-card' onClick={() => navigate(`/interview/${report._id}`)}>
                <div className="card-top">
                  <span className="card-icon">🎯</span>
                  <h3 className="card-title">{report.title || 'Untitled Position'}</h3>
                </div>

                <div className="card-body">
                  <span className={`match-pill ${report.matchScore >= 80 ? 'match--high' : report.matchScore >= 60 ? 'match--mid' : 'match--low'}`}>
                    {report.matchScore}% Match
                  </span>
                  <span className="date-badge">
                    {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="card-footer">
                  <span>View Plan</span>
                  <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default Home

