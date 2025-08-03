"use client"

import { useState, useEffect } from 'react'

export default function TestPage() {
  const [mounted, setMounted] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8">
      <h1>Hydration Test Page</h1>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Increment
      </button>
    </div>
  )
}