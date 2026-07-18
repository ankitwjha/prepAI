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

const Home = () => {
  const { loading, generateReport, reports } = useInterview()
  const [jobDescription, setJobDescription] = useState("")
  const [selfDescription, setSelfDescription] = useState("")
  const [resumeFileName, setResumeFileName] = useState("No file selected")   // ✅ new state
  const resumeInputRef = useRef()

  const navigate = useNavigate()

  const handleGenerateReport = async () => {
    try {
      const resumeFile = resumeInputRef.current.files[0]
      const data = await generateReport({ jobDescription, selfDescription, resumeFile })

      if (data && data._id) {
        navigate(`/interview/${data._id}`)
      } else {
        console.error("No report ID returned:", data)
        alert("Failed to generate report. Please try again.")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Server error while generating report. Please check backend logs.")
    }
  }

  if (loading) {
    return (
      <main className='loading-screen'>
        <h1>Loading your interview plan...</h1>
      </main>
    )
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
                setResumeFileName(file ? file.name : "No file selected")   // ✅ update filename
              }}
            />
            <span className="file-name">{resumeFileName}</span>   {/* ✅ dynamic filename */}
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

      {/* Recent Reports List */}
      {reports.length > 0 && (
        <section className='recent-reports'>
          <h2>My Recent Interview Plans</h2>
          <ul className='reports-list'>
            {reports.map(report => (
              <li key={report._id} className='report-item' onClick={() => navigate(`/interview/${report._id}`)}>
                <h3>{report.title || 'Untitled Position'}</h3>
                <p className='report-meta'>Generated on {new Date(report.createdAt).toLocaleDateString()}</p>
                <p className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>Match Score: {report.matchScore}%</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

export default Home

