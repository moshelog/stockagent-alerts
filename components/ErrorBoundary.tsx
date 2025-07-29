"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error to backend monitoring endpoint
      await fetch('/api/client-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (logError) {
      console.error('Failed to log error to service:', logError)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-background-surface rounded-2xl shadow-lg p-6 border border-gray-800">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#E0E6ED" }}>
                Something went wrong
              </h2>
              
              <p className="text-sm mb-6" style={{ color: "#A3A9B8" }}>
                An unexpected error occurred in the StockAgent dashboard. 
                Our team has been notified and is working on a fix.
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={this.handleReset}
                  className="w-full bg-accent-buy hover:bg-accent-buy/80"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-sm cursor-pointer text-gray-400 hover:text-gray-300">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-300 overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}