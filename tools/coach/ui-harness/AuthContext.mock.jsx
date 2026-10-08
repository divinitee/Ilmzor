import React from "react";
export const useAuth = () => ({ user: { email: "tee.test@x", role: "user", full_name: "Tee" }, isLoadingAuth: false });
export const AuthProvider = ({ children }) => <>{children}</>;
