"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { AlertCircle, ArrowRight, LoaderCircle, UserRound } from "lucide-react";
import { buttonClass, textLink } from "./ui";

export type SignUpValues = { name: string; email: string; marketingOptIn: boolean };

type Field = "name" | "email" | "age";
type Errors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function validate(v: { name: string; email: string; age: boolean }): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  const email = v.email.trim();
  if (!name) e.name = "Please enter your name.";
  else if (name.length > 80) e.name = "Please use 80 characters or fewer.";
  if (!email) e.email = "Please enter your email.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) e.email = "That email doesn't look right. Try one like name@example.com.";
  if (!v.age) e.age = "Please confirm you're 13 or older.";
  return e;
}

const inputClass =
  "block min-h-12 w-full rounded-xl border-2 bg-paper px-3.5 text-[17px] text-ink placeholder:text-muted " +
  "transition-colors";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[15px] font-semibold text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export function SignUpForm({
  onSignUp,
  onGuest,
}: {
  onSignUp: (values: SignUpValues) => Promise<void>;
  onGuest: () => void;
}) {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    emailHint: `${uid}-email-hint`,
    age: `${uid}-age`,
    optIn: `${uid}-optin`,
    guestNote: `${uid}-guest-note`,
    err: (f: Field) => `${uid}-${f}-error`,
  };
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState(false);
  const [optIn, setOptIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState("");
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    age: useRef<HTMLInputElement>(null),
  };

  // Errors show after the first submit attempt, then update as the player types.
  const errors: Errors = submitted ? validate({ name, email, age }) : {};

  const describedBy = (f: Field, ...extra: string[]) =>
    [...extra, errors[f] ? ids.err(f) : ""].filter(Boolean).join(" ") || undefined;

  async function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (pending) return;
    setSubmitted(true);
    const found = validate({ name, email, age });
    const bad = (Object.keys(found) as Field[]).filter((f) => found[f]);
    if (bad.length > 0) {
      setSummary(bad.length === 1 ? "Please fix 1 thing below." : `Please fix ${bad.length} things below.`);
      refs[bad[0]].current?.focus();
      return;
    }
    setSummary("");
    setPending(true);
    try {
      await onSignUp({ name: name.trim(), email: email.trim(), marketingOptIn: optIn });
    } finally {
      setPending(false);
    }
  }

  // #7B8792 keeps the field outline at 3:1+ against white (WCAG 1.4.11).
  const border = (f: Field) => (errors[f] ? "border-danger" : "border-[#7B8792] hover:border-ink-soft focus:border-teal");

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={pending}>
      <div role="alert">
        {summary && Object.keys(errors).length > 0 ? (
          <p className="mb-5 flex items-center gap-2 rounded-xl border-2 border-danger bg-[#FEF3F2] px-3.5 py-2.5 text-[15px] font-semibold text-danger">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {summary}
          </p>
        ) : null}
      </div>
      <div className="space-y-5">

      <div>
        <label htmlFor={ids.name} className="mb-1.5 block font-display text-[15px] font-semibold text-ink">
          Your name
        </label>
        <input
          ref={refs.name}
          id={ids.name}
          name="name"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          aria-required="true"
          className={`${inputClass} ${border("name")}`}
        />
        <FieldError id={ids.err("name")} message={errors.name} />
      </div>

      <div>
        <label htmlFor={ids.email} className="mb-1.5 block font-display text-[15px] font-semibold text-ink">
          Email
        </label>
        <input
          ref={refs.email}
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("email", ids.emailHint)}
          aria-required="true"
          className={`${inputClass} ${border("email")}`}
        />
        <p id={ids.emailHint} className="mt-1.5 text-[15px] text-muted">
          We only email you about DCI programs if you say yes below.
        </p>
        <FieldError id={ids.err("email")} message={errors.email} />
      </div>

      <fieldset className="space-y-1">
        <legend className="sr-only">Your choices</legend>
        <div>
          <label
            htmlFor={ids.age}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl py-2 text-[17px] leading-snug text-ink"
          >
            <input
              ref={refs.age}
              id={ids.age}
              name="ageConfirmed"
              type="checkbox"
              checked={age}
              onChange={(e) => setAge(e.target.checked)}
              aria-invalid={errors.age ? true : undefined}
              aria-describedby={describedBy("age")}
              aria-required="true"
              className="hl-check"
            />
            <span>
              I&rsquo;m 13 or older <span className="text-muted">(required)</span>
            </span>
          </label>
          <FieldError id={ids.err("age")} message={errors.age} />
        </div>
        <label
          htmlFor={ids.optIn}
          className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl py-2 text-[17px] leading-snug text-ink"
        >
          <input
            id={ids.optIn}
            name="marketingOptIn"
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="hl-check"
          />
          <span>
            DCI can email me about training programs <span className="text-muted">(optional)</span>
          </span>
        </label>
      </fieldset>

      <p className="text-[15px] text-ink-soft">
        By playing, you agree to our{" "}
        <Link href="/privacy" className={textLink}>
          privacy notice
        </Link>
        .
      </p>

      <div className="space-y-3 pt-1">
        <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
          {pending ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              Start playing
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </>
          )}
        </button>
        <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>
        <button
          type="button"
          onClick={onGuest}
          disabled={pending}
          aria-describedby={ids.guestNote}
          className={buttonClass("secondary", "lg", "w-full")}
        >
          <UserRound className="h-5 w-5" aria-hidden="true" />
          Play as guest
        </button>
        <p id={ids.guestNote} className="text-center text-[15px] text-muted">
          No sign-up, any age. Your progress stays on this device.
        </p>
      </div>
      </div>
    </form>
  );
}
