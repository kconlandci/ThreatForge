// ============================================================
// ThreatForge — Firebase Configuration
// JS SDK with explicit browserLocalPersistence for WebView
// ============================================================

import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";

// IMPORTANT: These are client-side Firebase config values.
// They are NOT secrets — they identify the project to Firebase.
// Security is enforced by Firebase Security Rules, not by hiding these.
const firebaseConfig = {
  apiKey: "AIzaSyAySXkyhLr16_Ozc01o9hF_IUmepulh0wU",
  authDomain: "threatforge-713ca.firebaseapp.com",
  projectId: "threatforge-713ca",
  storageBucket: "threatforge-713ca.firebasestorage.app",
  messagingSenderId: "468748941075",
  appId: "1:468748941075:web:62d6fa1d8876caf6798ce6",
};

const app = initializeApp(firebaseConfig);

// Use initializeAuth with explicit persistence instead of getAuth().
// getAuth() uses indexedDB by default, which can fail silently in
// Android WebView. browserLocalPersistence uses localStorage, which
// combined with our @capacitor/preferences UID backup, provides
// resilient auth persistence.
const auth: Auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

export { app, auth };
