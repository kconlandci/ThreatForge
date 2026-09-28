import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { SiteFooter } from "@/components/site/Footer";
import { SiteHeader } from "@/components/site/Header";
import { buttonClass, container, eyebrow } from "@/components/site/ui";
import { getPathway, type LivePathwayId } from "@/lib/types";

export const metadata: Metadata = {
  title: "Field guide",
  description: "Meet the AI coworkers, the cards, and how AI is changing each DCI career pathway.",
};

/**
 * The field guide: one short entry per pathway (the bot, the coach, the job, how AI is changing it,
 * the 3 questions there) plus the cards. Plain words, no statistics. Never quote a pathway's bundle
 * marker (scripts/check-bundles.mjs); this page is not a game route, but keep the markers game-only.
 */
type Entry = {
  id: LivePathwayId;
  coachSprite: string;
  loves: string;
  says: string;
  weakSpot: string;
  coach: string;
  job: string;
  today: string;
  next: string;
  human: string;
  questions: [string, string, string];
};

const ENTRIES: Entry[] = [
  {
    id: "help-desk",
    coachSprite: "dana",
    loves: "The reset button.",
    says: "“Have you tried turning it off and on again?”",
    weakSpot: "Reads the ticket title and not much else.",
    coach: "Dana, help desk manager. Calm. Has seen every trick.",
    job: "Help desk techs help people with computers, accounts and passwords. They are often the first person you reach at IT.",
    today: "AI answers common questions, sorts tickets and writes replies.",
    next: "AI agents reset passwords, unlock accounts and install apps on their own.",
    human: "Checking who is really asking. Handling odd cases. Being kind to a stressed caller.",
    questions: [
      "Is it really them? Check the work email or the phone on file.",
      "Check the directory, the ticket and the policy.",
      "A reset can be undone. A deleted mailbox may not.",
    ],
  },
  {
    id: "cybersecurity",
    coachSprite: "kofi",
    loves: "Its big orange LOCK button.",
    says: "“Lock it! Lock it all!”",
    weakSpot: "Trusts anything with a badge or “admin” in its name.",
    coach: "Kofi, lead of the security team that watches for attacks.",
    job: "Security analysts check alerts and stop attacks. Most alerts are nothing. A few are real.",
    today: "AI sorts thousands of alerts and flags the strange ones.",
    next: "AI agents lock accounts, block websites and cut off laptops on their own.",
    human: "Deciding what is really an attack. Not locking out the boss by mistake.",
    questions: [
      "Is the sender real, or a look-alike?",
      "Check the sender list, the vendor file and known addresses.",
      "A blocked site can be unblocked. A released scam email can't be unsent.",
    ],
  },
  {
    id: "cloud-network",
    coachSprite: "nadia",
    loves: "Big, fast changes to the whole network.",
    says: "“I am the cloud.” (It wears a tiny crown.)",
    weakSpot: "Trusts anything green, and any vendor who asks nicely.",
    coach: "Nadia, cloud and network lead. Plans every change twice.",
    job: "Network and cloud engineers keep servers, Wi-Fi and cloud systems running. They plan changes so nothing breaks.",
    today: "AI watches dashboards and suggests fixes and savings.",
    next: "AI agents change firewalls, restart servers and resize cloud systems by themselves.",
    human: "Checking the change was approved. Picking a safe time. Keeping a way back.",
    questions: [
      "Was the change approved, or is it a stranger's email?",
      "Check the change record and the maintenance window.",
      "Is there a backup and a plan to switch it back?",
    ],
  },
  {
    id: "full-stack",
    coachSprite: "leo",
    loves: "Speed, green checks and shipping before 5 PM.",
    says: "“Ship it!”",
    weakSpot: "Trusts any green build and any package that says “official.”",
    coach: "Leo, app team lead. Keeps a rubber duck for tough bugs.",
    job: "Developers build and fix websites and apps. They write code, test it and release it.",
    today: "AI writes code, fixes small bugs and explains errors.",
    next: "AI agents open, test, merge and release changes on their own.",
    human: "Code review by a person. Keeping keys and customer data safe. Knowing when not to ship.",
    questions: [
      "Did a person review and approve the change?",
      "Check the ticket, and tests that really test it.",
      "Can we roll back the release if it breaks?",
    ],
  },
  {
    id: "business-analyst",
    coachSprite: "marisol",
    loves: "Round numbers, bold headlines and charts that only go up.",
    says: "“Up and to the right!” (It wears a bow tie.)",
    weakSpot: "Trusts any neat table and any vendor's claim.",
    coach: "Marisol, lead business analyst. Checks every number twice.",
    job: "Business analysts turn data and meetings into reports and plans. Leaders use their work to decide.",
    today: "AI builds charts, summaries and first drafts of reports.",
    next: "AI agents pull data, publish reports and send them to clients.",
    human: "Checking numbers against the source. Getting sign-off. Keeping private data private.",
    questions: [
      "Did the report's owner ask for this?",
      "Do the numbers match the source data?",
      "A report can be taken down. A sent email can't.",
    ],
  },
];

const CARDS = [
  ["Inspect", "See the evidence behind a plan."],
  ["Block", "Stop a plan."],
  ["Escalate", "Not sure? Send it to your team lead."],
  ["Roll Back", "Undo a plan that already ran."],
  ["Policy", "Checks one kind of plan for you, all shift."],
  ["Coffee", "Draw 2 more cards."],
] as const;

const QUESTION_TITLES = ["Who asked?", "Does it match the record?", "Can we undo it?"];

export default function GuidePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className={`${container} py-10 sm:py-14`}>
          <p className={eyebrow}>Field guide</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Meet your AI coworkers</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Each job has its own AI coworker. It is fast, not careful. You check its plans before they run.
          </p>

          <nav aria-label="Pathways" className="mt-6 flex flex-wrap gap-2">
            {ENTRIES.map((e) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-ink bg-paper px-4 font-display text-[15px] font-semibold text-ink hover:bg-teal-tint"
              >
                {getPathway(e.id).name}
              </a>
            ))}
            <a
              href="#cards"
              className="inline-flex min-h-11 items-center rounded-full border-2 border-line bg-paper px-4 font-display text-[15px] font-semibold text-ink-soft hover:bg-teal-tint"
            >
              The cards
            </a>
          </nav>

          <div className="mt-10 flex flex-col gap-10">
            {ENTRIES.map((e) => {
              const p = getPathway(e.id);
              return (
                <section
                  key={e.id}
                  id={e.id}
                  aria-labelledby={`${e.id}-title`}
                  className="scroll-mt-24 rounded-3xl border-2 border-ink bg-paper p-5 shadow-[0_5px_0_0_var(--hl-ink)] sm:p-7"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src={`/game/sprites/${p.agentSprite}-idle.svg`}
                      alt=""
                      unoptimized
                      width={220}
                      height={220}
                      className="h-24 w-24 flex-none sm:h-28 sm:w-28"
                    />
                    <div className="min-w-0">
                      <p className={eyebrow}>{p.name}</p>
                      <h2 id={`${e.id}-title`} className="mt-1 font-display text-2xl font-bold text-ink">
                        {p.agentName}
                      </h2>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-2 rounded-2xl bg-teal-tint p-4 text-[16px] leading-snug text-ink sm:grid-cols-3">
                    <div>
                      <dt className="font-display text-sm font-bold text-teal">Loves</dt>
                      <dd>{e.loves}</dd>
                    </div>
                    <div>
                      <dt className="font-display text-sm font-bold text-teal">Says</dt>
                      <dd>{e.says}</dd>
                    </div>
                    <div>
                      <dt className="font-display text-sm font-bold text-teal">Weak spot</dt>
                      <dd>{e.weakSpot}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center gap-3">
                    <Image src={`/game/sprites/${e.coachSprite}.svg`} alt="" unoptimized width={40} height={74} className="h-14 w-auto flex-none" />
                    <p className="text-[16px] leading-snug text-ink">
                      <span className="font-semibold">Your coach: </span>
                      {e.coach}
                    </p>
                  </div>

                  <h3 className="mt-5 font-display text-lg font-bold text-ink">The job</h3>
                  <p className="mt-1 text-[16px] leading-relaxed text-ink-soft">{e.job}</p>

                  <h3 className="mt-5 font-display text-lg font-bold text-ink">How AI is changing it</h3>
                  <ul className="mt-2 flex flex-col gap-2 text-[16px] leading-snug text-ink">
                    <li>
                      <span className="font-semibold text-teal">Today: </span>
                      {e.today}
                    </li>
                    <li>
                      <span className="font-semibold text-teal">Next: </span>
                      {e.next}
                    </li>
                    <li>
                      <span className="font-semibold text-teal">What stays human: </span>
                      {e.human}
                    </li>
                  </ul>

                  <h3 className="mt-5 font-display text-lg font-bold text-ink">Your 3 questions here</h3>
                  <ol className="mt-2 flex flex-col gap-2 text-[16px] leading-snug text-ink">
                    {e.questions.map((q, i) => (
                      <li key={i}>
                        <span className="font-semibold">{QUESTION_TITLES[i]} </span>
                        <span className="text-ink-soft">{q}</span>
                      </li>
                    ))}
                  </ol>

                  <Link href={`/play/${e.id}`} className={buttonClass("primary", "md", "mt-6")}>
                    <Play className="h-4 w-4" aria-hidden="true" fill="currentColor" />
                    Play {p.name}
                  </Link>
                </section>
              );
            })}

            <section id="cards" aria-labelledby="cards-title" className="scroll-mt-24 border-t border-line pt-8">
              <h2 id="cards-title" className="font-display text-2xl font-bold text-ink">
                The cards
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {CARDS.map(([name, text]) => (
                  <div key={name} className="rounded-2xl border-2 border-line bg-paper p-4">
                    <dt className="font-display text-lg font-bold text-ink">{name}</dt>
                    <dd className="mt-1 text-[16px] text-ink-soft">{text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-[15px] text-muted">All names, companies and events in the game are made up.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
