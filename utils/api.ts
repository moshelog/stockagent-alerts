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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
  
  // If we get a 401, clear the token and redirect to login
  if (response.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/login'
  }
  
  return response
}