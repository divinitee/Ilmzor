import { scenario } from './base44Client.js';
export const useAuth = () => ({ user: scenario.user });
export const AuthProvider = ({ children }) => children;
