import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Lets several local dev servers run side by side without sharing a build folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
