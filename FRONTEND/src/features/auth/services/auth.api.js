import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000' : '');

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
})

export async function register({ username, email, password }) {
    const response = await api.post("/api/auth/register", {
        username,
        email,
        password
    })

    return response.data
}

export async function login({ email, password }) {
    const response = await api.post("/api/auth/login", { email, password })

    return response.data
}

export async function logout() {
    const response = await api.get("/api/auth/logout")

    return response.data
}

export async function getMe() {
    const response = await api.get("/api/auth/get-me")

    return response.data
}

export async function verifyOtp({ email, otp }) {
    const response = await api.post("/api/auth/verify-otp", { email, otp })
    return response.data
}

export async function resendOtp({ email }) {
    const response = await api.post("/api/auth/resend-otp", { email })
    return response.data
}
