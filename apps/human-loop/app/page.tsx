import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Play } from "lucide-react";
import { SiteFooter } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { HeroScene } from "@/components/site/HeroScene";
import { PathwayGrid } from "@/components/site/PathwayGrid";
import { ShiftSteps } from "@/components/site/ShiftSteps";
import { Wordmark } from "@/components/site/Wordmark";
import { buttonClass, container } from "@/components/site/ui";

const QUESTIONS = ["Who asked?", "Does it match the record?", "Can we undo it?"];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="hl-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_45%,black_10%,transparent_65%)]"
          />
          <div
            className={`${container} relative grid items-center gap-8 pb-12 pt-8 sm:pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pb-20 lg:pt-16`}
          >
            <div className="max-w-xl lg:max-w-none">
              <p>
                <Wordmark size="lg" />
              </p>
              <h1
                id="hero-title"
                className="mt-5 font-display text-[2.15rem] font-bold max-[359px]:text-[1.85rem] leading-[1.08] tracking-tight text-pretty text-ink sm:mt-6 sm:text-5xl lg:text-[3rem] xl:text-[3.3rem]"
              >
                AI agents are your new coworkers. Learn to <span className="hl-mark">supervise&nbsp;them.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft sm:text-xl">
                Human Loop is a free card game about keeping AI in check at work. Read the agent&rsquo;s plan, check the
                evidence, and make the call before it resets the wrong thing.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
                <Link href="/play" className={buttonClass("primary", "lg", "flex-1 whitespace-nowrap px-4 sm:flex-none sm:px-8")}>
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  Play free
                </Link>
                <a href="#how-it-works" className={buttonClass("secondary", "lg", "flex-1 whitespace-nowrap px-4 sm:flex-none sm:px-6")}>
                  How it works
                  <ArrowDown className="hidden h-5 w-5 sm:block" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-4 text-[15px] text-muted">No download. Plays in your browser on a phone or laptop.</p>
            </div>
            <div className="relative mx-auto w-full max-w-[34rem] lg:-mr-4 lg:max-w-none xl:-mr-10">
              <HeroScene />
            </div>
          </div>
        </section>

        {/* How a shift works */}
        <section id="how-it-works" aria-labelledby="how-title" className="border-t border-line py-16 sm:py-24">
          <div className={container}>
            <div className="max-w-2xl">
              <h2 id="how-title" className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                How a shift works
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-soft">
                One shift. One AI coworker with a lot of confidence. You play oversight cards to keep its work safe.
              </p>
            </div>
            <div className="mt-10 sm:mt-12">
              <ShiftSteps />
            </div>

            <div className="hl-reveal mt-12 flex flex-col gap-5 rounded-3xl border-2 border-ink bg-paper p-5 shadow-[0_5px_0_0_var(--hl-ink)] sm:mt-16 sm:flex-row sm:items-center sm:gap-8 sm:p-7">
              <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
                <Image
                  src="/game/sprites/dana.svg"
                  alt=""
                  unoptimized
                  width={40}
                  height={74}
                  className="h-20 w-auto shrink-0"
                />
                <div>
                  <h3 className="font-display text-lg font-bold leading-snug text-ink">
                    Dana&rsquo;s rule for every shift
                  </h3>
                  <p className="mt-0.5 text-[15px] text-muted">Help desk manager, Fenwick IT</p>
                </div>
              </div>
              <ol className="grid flex-1 gap-3 sm:grid-cols-3">
                {QUESTIONS.map((q, i) => (
                  <li
                    key={q}
                    className="flex items-center gap-3 rounded-2xl bg-teal-tint px-4 py-3 font-display text-[17px] font-semibold text-ink"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal font-bold text-paper">
                      {i + 1}
                    </span>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Five pathways */}
        <section id="pathways" aria-labelledby="pathways-title" className="border-t border-line bg-paper py-16 sm:py-24">
          <div className={container}>
            <div className="max-w-2xl">
              <h2 id="pathways-title" className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Five pathways
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-soft">
                Each DCI career pathway gets its own office and its own overeager AI coworker. Help Desk is open now. The
                rest are on the way.
              </p>
            </div>
            <div className="mt-10 sm:mt-12">
              <PathwayGrid />
            </div>
          </div>
        </section>

        {/* Why this matters */}
        <section aria-labelledby="why-title" className="pb-16 sm:pb-24">
          <div className={container}>
            <div className="hl-reveal relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-paper sm:px-12 sm:py-14">
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, #43e0c4 1px, transparent 0)",
                  backgroundSize: "22px 22px",
                }}
              />
              <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                <div className="max-w-2xl">
                  <h2 id="why-title" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    Why this matters
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed text-[#E3E7EA] sm:text-xl">
                    Employers are adding AI agents to help desks, security teams, dev teams, and cloud operations. These
                    agents can take real actions, fast. Someone has to check their work and keep a human in the loop.
                  </p>
                  <p className="mt-4 font-display text-xl font-semibold text-paper sm:text-2xl">
                    Human Loop lets you practice being that someone.
                  </p>
                  <div className="mt-8">
                    <Link href="/play" className={buttonClass("primary", "lg", "w-full sm:w-auto sm:px-8")}>
                      <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                      Start your first shift
                    </Link>
                  </div>
                </div>
                <Image
                  src="/game/sprites/resetbot-idle.svg"
                  alt=""
                  unoptimized
                  width={220}
                  height={220}
                  className="hl-float mx-auto hidden h-56 w-56 lg:block"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
