# Human Loop Review 2 Findings

## 1. Rate limiting IP spoofing vulnerability
- **Severity**: high
- **File**: `apps/human-loop/lib/server/rate-limit.ts:63`
- **How to reproduce**: The `clientIp` function reads the `x-forwarded-for` header and takes the first IP in the comma-separated list (`forwarded?.split(",")[0]?.trim()`). A client can send their own `X-Forwarded-For` header containing a spoofed IP. Vercel appends the real client IP to the end of the header, making the first IP the spoofed one. An attacker can rotate this spoofed IP on every request to bypass the rate limit completely.
- **Suggested fix**: Read `req.headers.get("x-real-ip")` first, which Vercel guarantees to be the actual client IP and cannot be spoofed. Alternatively, take the *last* IP in the `x-forwarded-for` list if you are on a proxy that appends. On Vercel, this is the safest: `return req.headers.get("x-real-ip")?.trim() || "unknown";`

## 2. Mobile viewport layout issue (content under notch)
- **Severity**: medium
- **File**: `apps/human-loop/app/play/help-desk/page.tsx:11` (and `app/play/cloud-network/page.tsx`, `app/play/cybersecurity/page.tsx`, `app/play/full-stack/page.tsx`)
- **How to reproduce**: The `viewportFit: "cover"` property is present in the exported `viewport` object for every pathway route. As noted in a recent commit message, this change was intended to be rejected because it puts content under the notch, making the game UI unplayable/inaccessible on mobile phones in landscape mode, but it is still in the code.
- **Suggested fix**: Remove `viewportFit: "cover"` from the `Viewport` objects in all `/play/*/page.tsx` files.

## Check results
Ran `npm ci && npm run typecheck && npm run lint && npm test`.
Everything compiled successfully. All tests and lint checks passed with no errors.
