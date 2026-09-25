# Human Loop launch plan

Human Loop was built inside the ThreatForge repository (`apps/human-loop`). Before going public it
moves to its own repository, then production is deployed from there. Steps marked **Owner** need
Kevin; everything else Claude does.

## 1. Move to its own repository

The app is already self-contained (own `package.json`, lock file and config; nothing outside
`apps/human-loop` is used), so the move is mechanical.

1. **Owner (or Claude, if the GitHub connector allows it):** create an empty private repository
   `kconlandci/human-loop`. No README, no license, no .gitignore, so the first push is clean.
2. Split out the folder with its history and push it as `main`:
   ```sh
   git subtree split --prefix=apps/human-loop -b human-loop-only
   git push https://github.com/kconlandci/human-loop.git human-loop-only:main
   ```
   This keeps every commit that touched the game. ThreatForge's own history does not come along.
3. In the new repository: run every gate (`npm ci`, `npx tsc --noEmit`, `npx eslint .`,
   `npx vitest run`, `npm run build`, `npm run check:bundles`) to prove it builds on its own.
   Remove `docs/launch-plan.md` references to ThreatForge once the move is done.

## 2. Point Vercel at the new repository

Same Vercel project ("human-loop"), so environment variables (`AIRTABLE_TOKEN`), the
`human-loop-eight.vercel.app` domain and analytics stay.

1. **Owner:** Vercel → human-loop → Settings → Git → Disconnect ThreatForge, then Connect
   `kconlandci/human-loop`.
2. **Owner:** Settings → Build and Deployment → Root Directory: clear it (the app is now the repo
   root). Production branch stays `main`.
3. Claude triggers a deploy and checks it: landing page, both live pathways, a real sign-up that
   lands in Airtable ("Human Loop — Players"), a finished shift that adds a Shift Results row.

## 3. Go public

1. Final checks before switching: real-device test (an iPhone about 3-4 years old, a 2-3 GB
   Android phone, a Chromebook), privacy page facts confirmed, instructor spot-check of the
   tickets if possible.
2. Production deploys from `main` of the new repository (the go-public pull request is opened and
   merged there, not in ThreatForge).
3. **Owner:** custom domain, e.g. `play.dciresourcesllc.com`: Vercel → human-loop → Settings →
   Domains → Add, then add the one DNS record Vercel shows at the domain's DNS host. Claude updates
   `metadataBase` in `app/layout.tsx` to the new domain.

## 4. Clean up ThreatForge

After the new repository is live and verified: a ThreatForge pull request that removes
`apps/human-loop` and leaves a one-line pointer to the new repository. Nothing else in
ThreatForge changes. Future Claude sessions for the game start in `kconlandci/human-loop`.

## Rollback

Until step 4, the ThreatForge copy stays intact. If anything goes wrong, reconnect the Vercel
project to ThreatForge with Root Directory `apps/human-loop` and redeploy.
