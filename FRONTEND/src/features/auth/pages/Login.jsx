import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../../../components/LoadingScreen'

const FUNNY_QUOTES = [
    "Because practicing interviews in front of your mirror is starting to feel weird.",
    "We promise not to tell your current boss.",
    "Preparing you for questions that have nothing to do with your day-to-day job.",
    "Welcome back. Your future salary is waiting.",
    "Practice now. Cry during the code review later.",
    "Your resume says 'team player'. Let's make sure you can talk to humans."
];

const Login = () => {
    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [quote] = useState(() => {
        const randomIndex = Math.floor(Math.random() * FUNNY_QUOTES.length);
        return FUNNY_QUOTES[randomIndex];
    });

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        const res = await handleLogin({ email, password })
        if (res?.success) {
            navigate("/")
        } else if (res?.error) {
            setError(res.error)
        }
    }

    if (loading) {
        return <LoadingScreen message="Unlocking your PrepAI dashboard..." />
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
                    <span className="quote-icon">💡</span>
                    <p className="quote-text">"{quote}"</p>
                </div>

                <h1>Welcome Back</h1>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email or Username</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="text" id="email" name="email" placeholder='Enter email or username' required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name="password" placeholder='Enter your password' required />
                    </div>

                    <button type="submit" className='auth-submit-btn'>Sign In</button>
                </form>

                <p className="auth-footer-text">Don't have an account? <Link to={"/register"}>Register now</Link></p>
            </div>
        </div>
    )
}

export default Login
