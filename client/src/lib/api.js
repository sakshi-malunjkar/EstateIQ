import axios from 'axios'

// Base URL for the FastAPI backend (see api/main.py). Read from Vite's
// env so it can differ between local dev and a deployed build without
// a code change -- see .env / .env.example.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
})

// Normalizes every failure into one shape ({ message, isNetworkError,
// status }) so every page can handle errors the same way, whether the
// backend returned a JSON error body (FastAPI's {"detail": "..."}),
// a validation 422, or the request never reached the server at all
// (backend down / CORS / network).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        message: 'Cannot reach the EstateIQ backend. Is the API running?',
        isNetworkError: true,
        status: null,
      })
    }

    const { status, data } = error.response
    let message = 'Something went wrong.'
    if (typeof data?.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data?.detail)) {
      // FastAPI/Pydantic 422 validation errors come back as a list of
      // {loc, msg, type} objects, not a plain string.
      message = data.detail.map((d) => d.msg).join('; ')
    }

    return Promise.reject({ message, isNetworkError: false, status })
  }
)

export default api
