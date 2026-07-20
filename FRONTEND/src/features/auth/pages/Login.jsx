import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../../../components/LoadingScreen'

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

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
        return <LoadingScreen message="Authenticating credentials..." />
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

                <p>Don't have an account? <Link to={"/register"}>Register now</Link></p>
            </div>
        </div>
    )
}

export default Login
