import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../../../components/LoadingScreen'

const FUNNY_QUOTES = [
    "Sign up in 10 seconds. (Fewer than the seconds spent deciding whether to use tabs or spaces).",
    "Join us and discover why your self-assessed 99% skill rating is actually a 20% match score.",
    "Let's build a plan that makes your resume look like you know what you're doing.",
    "Practice interviewing. Or prepare to explain that 6-month 'gap' of finding yourself.",
    "AI is taking over. Might as well use it to get a job first.",
    "Start preparing. Because 'I'll wing it' has a 0% success rate."
];

const Register = () => {
    const navigate = useNavigate()

    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [quote] = useState(() => {
        const randomIndex = Math.floor(Math.random() * FUNNY_QUOTES.length);
        return FUNNY_QUOTES[randomIndex];
    });

    const { loading, handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const res = await handleRegister({ username, email, password })
        if (res?.success) {
            navigate("/")
        } else if (res?.error) {
            setError(res.error)
        }
    }

    if (loading) {
        return <LoadingScreen message="Creating your PrepAI account..." />
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

                <div className="humor-quote-card">
                    <span className="quote-icon">🚀</span>
                    <p className="quote-text">"{quote}"</p>
                </div>

                <h1>Create an Account</h1>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text" id="username" name="username" placeholder='Enter username' required />
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name="email" placeholder='Enter your email address' required />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name="password" placeholder='Create a password' required />
                    </div>

                    <button type="submit" className='auth-submit-btn'>Register Now</button>
                </form>

                <p className="auth-footer-text">Already have an account? <Link to={"/login"}>Sign In</Link></p>
            </div>
        </div>
    )
}

export default Register
