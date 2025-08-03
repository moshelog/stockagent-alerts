// Utility functions for API calls with authentication

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders()
  
  // Debug logging
  console.log('🔐 Authenticated fetch:', {
    url,
    hasToken: !!localStorage.getItem('authToken'),
    headers
  })
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  
  console.log('📡 Response:', {
    url,
    status: response.status,
    statusText: response.statusText
  })
  
  // If we get a 401, clear the token and redirect to login
  if (response.status === 401) {
    console.error('❌ Authentication failed for:', url)
    console.error('Token:', localStorage.getItem('authToken'))
    // Temporarily disable auto-redirect to debug
    // localStorage.removeItem('authToken')
    // window.location.href = '/login'
  }
  
  return response
}