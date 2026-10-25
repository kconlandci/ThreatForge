import { useState, type FormEvent } from "react";
import { displayName, subline, editionBranding } from "../config/edition";

export const SIGN_IN_FAILURE = "That email and access code don't match our records. Check both and try again — or ask your instructor for help.";

interface DciSignInProps {
  onSignIn: (email: string, accessCode: string) => Promise<boolean>;
  isSigningIn: boolean;
  showFailure: boolean;
}

export default function DciSignIn({ onSignIn, isSigningIn, showFailure }: DciSignInProps) {
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await onSignIn(email, accessCode)) setAccessCode("");
  };

  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {editionBranding.signInLogo && <img {...editionBranding.signInLogo} />}
        <h1 className="text-2xl font-bold text-white">{displayName}</h1>
        <p className="text-sm text-slate-400 mt-2">{subline}</p>
        <p className="text-sm text-slate-400 mt-6">Use the email and access code from your instructor.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4" aria-busy={isSigningIn}>
          <div>
            <label htmlFor="dci-email" className="block text-sm font-medium text-white mb-2">Email</label>
            <input id="dci-email" type="email" autoComplete="username" placeholder="Student email"
              value={email} onChange={event => setEmail(event.target.value)} required disabled={isSigningIn}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 text-white p-3 focus:outline-2 focus:outline-orange-400" />
          </div>
          <div>
            <label htmlFor="dci-access-code" className="block text-sm font-medium text-white mb-2">Access code</label>
            <input id="dci-access-code" type="password" autoComplete="current-password" placeholder="Access code"
              value={accessCode} onChange={event => setAccessCode(event.target.value)} required disabled={isSigningIn}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 text-white p-3 focus:outline-2 focus:outline-orange-400" />
          </div>
          <button type="submit" disabled={isSigningIn}
            className="w-full min-h-[48px] rounded-lg bg-orange-500 text-white font-semibold px-4 py-3 disabled:opacity-60">Sign in</button>
          <p aria-live="polite" className="text-sm text-red-400">{showFailure ? SIGN_IN_FAILURE : ""}</p>
        </form>
      </div>
    </main>
  );
}
