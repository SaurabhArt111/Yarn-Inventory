import axios from 'axios';

// httpOnly auth cookie is sent automatically via withCredentials; the
// frontend never touches the token directly (it can't -- that's the point).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

export function extractErrorMessage(err) {
  return err?.response?.data?.error?.message || err?.message || 'Something went wrong';
}

export function extractFieldErrors(err) {
  return err?.response?.data?.error?.details || null;
}
