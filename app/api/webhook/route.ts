import { NextRequest, NextResponse } from 'next/server'

// Proxy webhook requests to the backend
export async function POST(request: NextRequest) {
  try {
    // Get the webhook data as text (TradingView sends text format)
    const body = await request.text()
    
    console.log('Webhook received:', body)
    
    // Forward to Railway backend
    const backendUrl = 'https://stockagent-backend-production.up.railway.app/webhook'
    
    // Forward all headers including webhook secret if present
    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
    }
    
    // Forward webhook secret if present in request
    const webhookSecret = request.headers.get('x-webhook-secret')
    if (webhookSecret) {
      headers['x-webhook-secret'] = webhookSecret
    }
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: body,
    })
    
    const responseText = await response.text()
    console.log('Backend response:', response.status, responseText)
    
    // Try to parse as JSON, but handle text responses too
    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data, { status: response.status })
    } catch {
      // If not JSON, return as text
      return new NextResponse(responseText, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
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