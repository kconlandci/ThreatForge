import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Check, EyeOff, Trash2 } from "lucide-react";
import { SiteFooter } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { container, textLink } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What Human Loop collects, why, where it is stored, and how to delete it. Plain language.",
};

const SHORT = [
  { Icon: Ban, text: "We never sell your data." },
  { Icon: EyeOff, text: "No ads. No third-party trackers." },
  { Icon: Check, text: "Guests: your progress stays in your browser." },
  { Icon: Trash2, text: "Delete your data any time with “Start over.”" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-8">
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-ink">
        {title}
      </h2>
      <div className="hl-prose mt-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className={`${container} py-10 sm:py-14`}>
          <div className="mx-auto max-w-3xl">
            <p className="font-display text-sm font-semibold text-teal">Human Loop · DCI Resources</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Privacy notice</h1>
            <p className="mt-3 text-[15px] text-muted">Last updated: September 24, 2026</p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft sm:text-xl">
              Human Loop is a free training game by DCI Resources. This page explains what we collect, why we
              collect it, and how to delete it. Plain words, no tricks.
            </p>

            <div className="mt-8 rounded-3xl border-2 border-ink bg-teal-tint p-5 shadow-[0_5px_0_0_var(--hl-ink)] sm:p-7">
              <h2 className="font-display text-xl font-bold text-ink">The short version</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {SHORT.map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-[17px] leading-snug text-ink">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal text-paper">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="pt-1">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 space-y-10">
              <Section id="collect" title="What we collect">
                <p>If you sign up, we collect:</p>
                <ul>
                  <li>
                    <strong>Your name and email.</strong>
                  </li>
                  <li>
                    <strong>Your email choice.</strong> Whether you said DCI can email you about training programs.
                    This box is optional and starts unchecked.
                  </li>
                  <li>
                    <strong>Your game progress.</strong> Things like stars, shifts played, where you left off, and the
                    choices you made in the game.
                  </li>
                  <li>
                    <strong>A random player ID.</strong> We store it in a cookie called <code>hl_pid</code> when you
                    sign up. It links your browser to your saved progress. We don&rsquo;t use it for ads or tracking.
                  </li>
                </ul>
                <p>
                  The game also saves your progress in your browser&rsquo;s storage, so it works even when you&rsquo;re
                  offline. We don&rsquo;t collect your location, your contacts, or any payment details.
                </p>
              </Section>

              <Section id="why" title="Why we collect it">
                <ul>
                  <li>To save your progress, so you can pick up where you left off.</li>
                  <li>
                    To tell you about DCI training programs, <strong>only if you checked that box</strong>. You can ask
                    us to stop at any time.
                  </li>
                  <li>To keep the game working and fix problems.</li>
                </ul>
              </Section>

              <Section id="where" title="Where it’s stored">
                <p>
                  The website is hosted by <strong>Vercel</strong>. Sign-up and progress data are stored in a Postgres
                  database run by <strong>Neon</strong>. Both are in the United States.
                </p>
                <p>
                  Like most websites, our hosting provider keeps short-term server logs, such as IP address and
                  browser type, to run the site and keep it secure.
                </p>
              </Section>

              <Section id="dont" title="What we don’t do">
                <ul>
                  <li>We don&rsquo;t sell or rent your data.</li>
                  <li>We don&rsquo;t show ads.</li>
                  <li>We don&rsquo;t use third-party trackers or analytics.</li>
                  <li>
                    We don&rsquo;t share your data, except with the hosting services above that store it for us, or
                    if the law requires it.
                  </li>
                </ul>
              </Section>

              <Section id="keep" title="How long we keep it">
                <p>
                  We keep your data until you ask us to delete it, or until 24 months after you last play, whichever
                  comes first.
                </p>
              </Section>

              <Section id="guests" title="Playing as a guest">
                <p>
                  Guests don&rsquo;t give us a name or email. Your progress is stored only in your browser. If you
                  clear your browser data, it&rsquo;s gone.
                </p>
              </Section>

              <Section id="age" title="Age">
                <p>
                  Human Loop is for people 13 and older. We don&rsquo;t knowingly collect personal information from
                  children under 13. If you think a child under 13 signed up, contact us and we&rsquo;ll delete it.
                </p>
              </Section>

              <Section id="delete" title="How to delete your data">
                <ul>
                  <li>
                    Go to the{" "}
                    <Link href="/play" className={textLink}>
                      Play page
                    </Link>{" "}
                    and choose <strong>&ldquo;Not you? Start over.&rdquo;</strong> This deletes your progress on this
                    device. If you signed up, it also deletes your sign-up and progress from our database.
                  </li>
                  <li>Or contact DCI Resources and ask us to delete it. We&rsquo;ll confirm when it&rsquo;s done.</li>
                </ul>
              </Section>

              <Section id="contact" title="Contact">
                <p>Questions, or want your data deleted? Contact DCI Resources:</p>
                <p>
                  <span className="inline-block rounded-lg border-2 border-dashed border-orange-text bg-orange-tint px-3 py-1.5 font-mono text-[15px] font-semibold text-orange-text">
                    [DCI contact email]
                  </span>
                </p>
              </Section>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
