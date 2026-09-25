import { hintParts } from "@/lib/game/coach";

/** Dana's hint text, with **control names** in bold. */
export function HintText({ text }: { text: string }) {
  return (
    <>
      {hintParts(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}
