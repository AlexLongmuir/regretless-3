/**
 * Backend Bridge Service
 * 
 * This service provides a React Native-compatible interface to backend AI functionality.
 * It makes HTTP requests to the backend API endpoints.
 */

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL! // e.g. https://api.yourapp.com

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const runFeasibility = (b: any) => post('/api/feasibility', b)
export const generateAreas  = (b: any) => post('/api/generate-areas', b)
export const generateActions= (b: any) => post('/api/generate-actions', b)
export const activateDream  = (b: any) => post('/api/activate-dream', b)