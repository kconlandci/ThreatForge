import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Lets several local dev servers run side by side without sharing a build folder.
  // Use NEXT_DIST_DIR=.next-alt: tsconfig.json already includes ".next-alt/types/**/*.ts", so Next
  // won't rewrite tsconfig.json. Any other folder name makes Next edit tsconfig.json (revert it).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Framing: DCI may embed the game in its own site or LMS. Before launch, ask the owner and
          // add e.g. { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://<dci domain>" }.
        ],
      },
    ];
  },
};

export default nextConfig;
