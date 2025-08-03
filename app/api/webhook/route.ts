import { NextRequest, NextResponse } from 'next/server'

// Proxy webhook requests to the backend
export async function POST(request: NextRequest) {
  try {
    // Get the webhook data
    const body = await request.json()
    
    // Forward to Railway backend
    const backendUrl = 'https://stockagent-backend-production.up.railway.app/webhook'
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Webhook proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Also handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({ 
    message: 'Webhook endpoint is active. Send POST requests to this URL.',
    backend: 'https://stockagent-backend-production.up.railway.app/webhook'
  })
}