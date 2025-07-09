const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const apiClient = {
  async get(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  },

  async post(endpoint: string, data: any, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }
}

export default apiClient