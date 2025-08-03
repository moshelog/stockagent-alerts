"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Login successful. Redirecting...",
          className: "bg-accent-buy text-white border-accent-buy",
        })
        
        // Store the token in httpOnly cookie is handled by the backend
        // Redirect to dashboard
        router.push("/")
      } else {
        setError(data.error || "Invalid credentials")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error("Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-[#1a1f2e] border-gray-800">
        <div className="text-center mb-8">
          {/* Using the existing logo style from the main dashboard */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 bg-accent-buy rounded" />
              <div className="w-8 h-8 bg-accent-sell rounded" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">StockAgent</h1>
          <p className="text-sm text-gray-400 mt-2">
            Crypto Signals. Real-Time. Fully Automated
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-gray-300">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              disabled={isLoading}
              className="bg-[#0a0f1e] border-gray-700 text-white placeholder:text-gray-500 focus:border-accent-buy"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm text-gray-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
              className="bg-[#0a0f1e] border-gray-700 text-white placeholder:text-gray-500 focus:border-accent-buy"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent-buy hover:bg-accent-buy/80 text-white font-medium py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-400 text-center flex items-center justify-center gap-2">
            🔒 Platform currently under development
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Opening soon for beta testing
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">Secure Trading Platform</p>
          <p className="text-xs text-gray-600 mt-2">
            © 2025 StockAgent. All rights reserved.
          </p>
        </div>
      </Card>
    </div>
  )
}