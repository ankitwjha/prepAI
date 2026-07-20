import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router'
import React from 'react'
import Navbar from '../../../components/Navbar'
import LoadingScreen from '../../../components/LoadingScreen'

const Protected = ({ children }) => {
  const { loading, user } = useAuth()

  if (loading) {
    return <LoadingScreen message="Verifying session credentials..." />
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default Protected
