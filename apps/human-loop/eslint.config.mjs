import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Pathway content ships only with its own route. Shared code gets the pathway as a PathwayBundle
 * (a prop or usePathway()), never by importing a pathway's bundle or its JSON.
 */
const PATHWAY_CONTENT = {
  group: [
    "@/content/*",
    "@/content/**",
    "@/lib/pathways/help-desk",
    "@/lib/pathways/help-desk/*",
    "@/lib/pathways/cybersecurity",
    "@/lib/pathways/cybersecurity/*",
    "@/lib/pathways/cloud-network",
    "@/lib/pathways/cloud-network/*",
    "@/lib/pathways/full-stack",
    "@/lib/pathways/full-stack/*",
    "@/lib/pathways/business-analyst",
    "@/lib/pathways/business-analyst/*",
    "@/lib/game/content",
    "./content",
    "../content",
  ],
  message:
    "Pathway content ships only with its own route. Take the pathway as a PathwayBundle (prop or usePathway()); import bundles only in lib/pathways/**, components/game/entries/**, lib/game/fixtures.ts, StageLab or tests.",
};

const eslintConfig = [
  { ignores: [".next/**", ".next-*/**", "node_modules/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "lib/pathways/**",
      "components/game/entries/**",
      "lib/game/fixtures.ts",
      "lib/game/content.ts",
      "components/game/stage/StageLab.tsx",
      "**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": ["error", { patterns: [PATHWAY_CONTENT] }],
    },
  },
];

export default eslintConfig;
