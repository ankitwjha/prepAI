import React, { useState, useEffect } from 'react'
import "../auth.form.scss"
import { useNavigate, useLocation, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../../../components/LoadingScreen'

const VerifyOtp = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { loading, handleVerifyOtp, handleResendOtp } = useAuth()

    const email = location.state?.email || ""
    const [otp, setOtp] = useState("")
    const [error, setError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [timer, setTimer] = useState(60)
    const [canResend, setCanResend] = useState(false)

    useEffect(() => {
        if (!email) {
            navigate("/login")
        }
    }, [email, navigate])

    useEffect(() => {
        let interval = null
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        } else {
            setCanResend(true)
            clearInterval(interval)
        }
        return () => clearInterval(interval)
    }, [timer])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccessMessage("")

        if (otp.trim().length !== 6 || isNaN(otp)) {
            setError("Please enter a valid 6-digit OTP code")
            return
        }

        const res = await handleVerifyOtp({ email, otp: otp.trim() })
        if (res?.success) {
            navigate("/")
        } else if (res?.error) {
            setError(res.error)
        }
    }

    const handleResend = async () => {
        if (!canResend) return

        setError("")
        setSuccessMessage("")
        const res = await handleResendOtp({ email })

        if (res?.success) {
            setSuccessMessage("New verification code sent! Check your inbox.")
            setTimer(60)
            setCanResend(false)
        } else if (res?.error) {
            setError(res.error)
        }
    }

    if (loading) {
        return <LoadingScreen message="Verifying your OTP code..." />
    }

    return (
        <div className="auth-page">
            <div className="form-container">
                {/* Brand Header */}
                <div className="brand-logo-header">
                    <div className="brand-title-wrap">
                        <span className="brand-dot"></span>
                        <span className="brand-title">PrepAI</span>
                    </div>
                    <p className="brand-tagline">AI-Powered Interview Intelligence</p>
                </div>

                <h1>Verify Your Account</h1>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", textAlign: "center" }}>
                    We sent a 6-digit verification code to <strong>{email}</strong>.
                </p>

                {error && <div className="error-message">{error}</div>}
                {successMessage && <div style={{ color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "6px", fontSize: "13px", marginBottom: "15px", textAlign: "center" }}>{successMessage}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="otp">6-Digit Verification Code</label>
                        <input
                            onChange={(e) => setOtp(e.target.value)}
                            value={otp}
                            type="text"
                            maxLength="6"
                            id="otp"
                            name="otp"
                            placeholder="Enter 6-digit OTP"
                            style={{ letterSpacing: "8px", textAlign: "center", fontSize: "20px", fontWeight: "bold" }}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-submit-btn">Verify Account</button>
                </form>

                <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#64748b" }}>
                    {canResend ? (
                        <p>Didn't receive code? <span onClick={handleResend} style={{ color: "#2563eb", cursor: "pointer", fontWeight: "600" }}>Resend OTP</span></p>
                    ) : (
                        <p>Resend code in <strong>{timer}s</strong></p>
                    )}
                </div>

                <p className="auth-footer-text"><Link to="/login">Back to Sign In</Link></p>
            </div>
        </div>
    )
}

export default VerifyOtp
