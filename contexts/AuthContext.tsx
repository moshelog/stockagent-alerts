"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

interface User {
  username: string
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      const apiBase = 'https://stockagent-backend-production.up.railway.app/api'
      const response = await fetch(`${apiBase}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          setUser(data.user)
        } else {
          setUser(null)
          localStorage.removeItem('authToken')
        }
      } else {
        setUser(null)
        localStorage.removeItem('authToken')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      localStorage.removeItem('authToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    const apiBase = 'https://stockagent-backend-production.up.railway.app/api'
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Store token for token-based auth
    if (data.token) {
      localStorage.setItem('authToken', data.token)
    }

    // Check auth status after login
    await checkAuth()
    
    toast({
      title: "Success",
      description: "Login successful",
      className: "bg-accent-buy text-white border-accent-buy",
    })

    router.push('/')
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const apiBase = 'https://stockagent-backend-production.up.railway.app/api'
      
      if (token) {
        await fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }

      // Clear token
      localStorage.removeItem('authToken')
      setUser(null)
      
      toast({
        title: "Success",
        description: "Logged out successfully",
        className: "bg-accent-neutral text-white border-accent-neutral",
      })

      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails, clear local state
      localStorage.removeItem('authToken')
      setUser(null)
      router.push('/login')
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}