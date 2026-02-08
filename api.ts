import axios from 'axios';
import { Platform } from 'react-native';

// Android emulator uses 10.0.2.2 to reach host localhost
// iOS simulator and web use localhost directly
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth API calls ───

export interface SignupPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phonePrefix: string;
  phoneSuffix: string;
  role: 'CLIENT' | 'COACH';
}

export interface VerifyOtpPayload {
  userId: string;
  code: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function signup(payload: SignupPayload) {
  const { data } = await api.post('/auth/signup', payload);
  return data;
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  const { data } = await api.post('/auth/verify-otp', payload);
  return data;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function googleLogin(token: string) {
  const { data } = await api.post('/auth/google', { token });
  return data;
}

export async function appleLogin(token: string) {
  const { data } = await api.post('/auth/apple', { token });
  return data;
}

export default api;
