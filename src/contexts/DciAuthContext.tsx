// Vite selects this provider only for DCI. Firebase is never imported here.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import DciSignIn from "../components/DciSignIn";
import {
  clearDciSession, invalidateDciSession, getDciSession, getSessionEpoch, restoreDciSession,
  saveDciSession, sessionFromSignIn, SESSION_CHANGED_EVENT, type DciSession,
} from "../sync/dciSession";
import {
  applyCloudProgress, pullCloudProgress, queueSavedProgress, requestDci,
  resetDciSync, setSyncUid,
} from "../sync/dciSync";

interface AuthContextType {
  uid: string | null;
  isAuthReady: boolean;
  student: DciSession | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  uid: null, isAuthReady: false, student: null, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<DciSession | null>(null);
  const [isAuthReady, setAuthReady] = useState(false);
  const [isSigningIn, setSigningIn] = useState(false);
  const [showFailure, setShowFailure] = useState(false);

  useEffect(() => {
    let mounted = true;
    const changed = () => {
      if (!mounted) return;
      const current = getDciSession();
      if (!current) resetDciSync();
      else setSyncUid(current.studentId);
      setStudent(current);
      setAuthReady(true);
    };
    window.addEventListener(SESSION_CHANGED_EVENT, changed);
    void restoreDciSession().then(current => {
      if (mounted) {
        if (current) setSyncUid(current.studentId);
        setStudent(current);
        setAuthReady(true);
      }
    });
    return () => { mounted = false; window.removeEventListener(SESSION_CHANGED_EVENT, changed); };
  }, []);

  // Child useProgress effects register their cloud-pull listeners before this
  // parent effect starts. A valid cached session never waits on network access.
  useEffect(() => {
    if (!student) return;
    let mounted = true;
    const studentId = student.studentId;
    const activeEpoch = getSessionEpoch();
    setSyncUid(studentId);
    const refresh = async () => {
      const remote = await pullCloudProgress(studentId);
      if (!mounted || activeEpoch !== getSessionEpoch()) return;
      if (remote) await applyCloudProgress(remote, true);
      if (mounted && activeEpoch === getSessionEpoch()) queueSavedProgress();
    };
    void refresh();
    window.addEventListener("online", refresh);
    let expiryTimer: ReturnType<typeof setTimeout>;
    const expire = () => {
      const remaining = student.expiresAt - Date.now();
      if (remaining > 0) expiryTimer = setTimeout(expire, Math.min(remaining, 2_147_483_647));
      else { resetDciSync(); void invalidateDciSession(); }
    };
    expire();
    return () => { mounted = false; clearTimeout(expiryTimer); window.removeEventListener("online", refresh); };
  }, [student]);

  const signIn = async (email: string, accessCode: string): Promise<boolean> => {
    if (isSigningIn) return false;
    setSigningIn(true);
    setShowFailure(false);
    try {
      const reply = await requestDci<unknown>("/signin", { method: "POST", body: JSON.stringify({ email, accessCode }) }, false);
      const next = sessionFromSignIn(reply);
      if (!next) { setShowFailure(true); return false; }
      resetDciSync();
      await saveDciSession(next);
      if (getDciSession()) setSyncUid(next.studentId);
      setStudent(getDciSession());
      setAuthReady(true);
      return true;
    } catch { setShowFailure(true); return false; }
    finally { setSigningIn(false); }
  };

  const signOut = async () => {
    resetDciSync();
    await clearDciSession();
    setStudent(null);
    setShowFailure(false);
  };

  return (
    <AuthContext.Provider value={{ uid: student?.studentId ?? null, isAuthReady, student, signOut }}>
      {!isAuthReady ? (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      ) : student ? children : <DciSignIn onSignIn={signIn} isSigningIn={isSigningIn} showFailure={showFailure} />}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
