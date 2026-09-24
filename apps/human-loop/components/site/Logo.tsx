import Image from "next/image";

/** Official DCI Resources logo (public/brand/dci-logo.png, 1054 x 510). */
export function DciLogo({
  className = "h-9 w-auto",
  priority = false,
  decorative = false,
}: {
  className?: string;
  priority?: boolean;
  /** Use when the logo sits next to text that already names DCI Resources. */
  decorative?: boolean;
}) {
  return (
    <Image
      src="/brand/dci-logo.png"
      width={1054}
      height={510}
      alt={decorative ? "" : "DCI Resources"}
      priority={priority}
      sizes="(min-width: 640px) 100px, 80px"
      className={className}
    />
  );
}
