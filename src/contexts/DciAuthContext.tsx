// DCI currently uses on-device progress without a remote identity.
// Vite selects this module for DCI builds so Firebase is never imported.
import { createContext, useContext, type ReactNode } from "react";

interface AuthContextType {
  uid: string | null;
  isAuthReady: boolean;
}

const localAuth: AuthContextType = { uid: null, isAuthReady: true };
const AuthContext = createContext<AuthContextType>(localAuth);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={localAuth}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
