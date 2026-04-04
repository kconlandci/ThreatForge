// ============================================================
// ThreatForge — Auth Context
// Firebase Anonymous Auth with UID persistence via Capacitor Preferences
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { Preferences } from "@capacitor/preferences";
import { auth } from "../config/firebase";

interface AuthContextType {
  uid: string | null;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  uid: null,
  isAuthReady: false,
});

const UID_STORAGE_KEY = "threatforge_firebase_uid";

async function getStoredUid(): Promise<string | null> {
  const { value } = await Preferences.get({ key: UID_STORAGE_KEY });
  return value;
}

async function storeUid(uid: string): Promise<void> {
  await Preferences.set({ key: UID_STORAGE_KEY, value: uid });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // User is signed in (anonymous or otherwise)
          const currentUid = user.uid;
          setUid(currentUid);

          // Check for UID change (indicates storage was cleared or reinstall)
          const storedUid = await getStoredUid();
          if (storedUid && storedUid !== currentUid) {
            console.warn(
              `[ThreatForge] UID changed: stored=${storedUid}, current=${currentUid}. ` +
                `User may have lost progress. Previous purchases may need restoration.`
            );
            // Future: trigger recovery flow or prompt user
          }

          // Always update stored UID to current
          await storeUid(currentUid);
        } catch (error) {
          console.error("[ThreatForge] UID persistence failed:", error);
        } finally {
          setIsAuthReady(true);
        }
      } else {
        // No user — sign in anonymously
        try {
          await signInAnonymously(auth);
          // onAuthStateChanged will fire again with the new user
          return;
        } catch (error) {
          console.error("[ThreatForge] Anonymous sign-in failed:", error);
          setUid(null);
          setIsAuthReady(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ uid, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
