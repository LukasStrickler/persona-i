# Landing Page Refresh Plan (Deep Dive)

This is a broadened, copy-ready strategy for a modern, mobile‑first landing experience. It keeps your custom logo and the two-card style, adds a semi‑transparent header, elevates content quality, and positions Persona[i] beyond a single DISC test. It also sets you up for a “tests catalog,” website‑native benchmarking (no CLI emphasis), and partner outreach.

---

## Positioning & Messaging Pyramid

- Product: Personality benchmarking + comparison against LLM model profiles.
- For: Individuals, teams, and research/education use cases.
- Core value: Take validated tests, visualize your profile, and see which AI model behaves most like you.
- Differentiator: Side‑by‑side human vs LLM profiles and cross‑model similarity scores; planned multi‑test catalog and in‑browser benchmarking.
- Proof: Transparent methodology, reproducibility, and clear visuals; initial DISC + expandable test library.

Tone: clear, credible, and curious — not hypey. Use patient, plain language and lead with outcomes.

---

## IA & Navigation (Header)

- Sticky, frosted glass header (`sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-white/10`).
- Left: Logo. Middle (desktop): NavigationMenu with quick links:
  - Product
  - Tests (Catalog)
  - Models (LLM Profiles)
  - Benchmarks
  - Pricing
  - Docs
- Right: CTAs: `Sign in` (outline) and `Create account` (primary). Secondary link for Docs if you want reduced emphasis.
- Mobile: Hide desktop menu, show a hamburger `Button` that opens a Shadcn `Sheet` with the same links and stacked CTAs.

Rationale: Transparent nav + visible pricing improves trust and discoverability for SaaS. Keep links scannable (~5–6 items) and use Shadcn `navigation-menu` + `sheet` for consistent a11y and keyboard support.

---

## Hero (Above the Fold)

Goal: Immediately communicate what Persona[i] does, with a strong headline, proof visuals, and dual CTAs.

Copy options (A/B test):

- A: “Benchmark your personality against today’s leading AI models.”
  - Sub: “Take science‑informed tests like DISC, visualize your profile, and see which models behave most like you.”
- B: “See which AI thinks like you.”
  - Sub: “Take validated personality tests and compare results with GPT‑4, Claude, Gemini, and more.”

CTAs:

- Primary: `Start a Test` (links to default test or tests catalog)
- Secondary: `Explore model comparisons`

Visuals:

- Right side (desktop): stack your two existing cards (Take Test / Browse Models) over a subtle gradient grid or chart mock that previews a similarity bar.
- Optional quick metrics strip under the hero copy: “4 DISC pillars • 10+ LLM profiles • 5‑minute start”.

Design:

- Semi‑transparent/glass aesthetic must retain contrast ≥ 4.5:1. Pair `backdrop-blur` with a faint border and soft shadow to keep text readable.

---

## Tests Catalog (DISC and beyond)

Make it clear that DISC is not the only test.

Section title: “Pick a test — more coming soon”

- Cards list:
  - DISC (Live) — “Understand Dominance, Influence, Steadiness, Conscientiousness.”
  - Big Five (OCEAN) — “Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism.” (Coming soon)
  - Enneagram — “Core motivations and patterns.” (Coming soon)
  - Custom Assessments — “Organization‑specific or research instruments.” (Partner with us)

Partner CTA: prominently include the requested CTA line:

- Use button/microcopy: “Wanna add your own test? Reach out!” → opens `/contact` or `mailto:`.

Content note: Avoid CLI messaging here; emphasize that benchmarking will run in‑browser soon. Add a small “Coming soon: Run benchmarks right in your browser — no CLI needed.”

---

## LLM Profiles & Comparison Spotlight

Elevate the “Browse Models” idea to a dedicated section that previews the value.

Layout:

- A wide comparison card showing top 3 similarity matches (e.g., GPT‑4 87%, Claude 82%, Gemini 78%).
- Toggle between “Individual” and “Team aggregate” views (coming soon for teams).
- Short paragraph on “How similarity is computed” with a “Learn more” link to Docs for transparency (keep copy human, not overly technical).

CTA: `Explore model profiles` → `/models`.

---

## How It Works (3 Steps)

1. Take a test — Clear, focused questionnaire with instant results.
2. Compare — See your personality profile alongside LLM profiles.
3. Understand — Read insights on overlaps and differences; export or share.

Note: Mention “Browser‑native benchmarking is coming soon” instead of emphasizing CLI.

---

## For Individuals, Teams, Researchers

- Individuals: “Discover your profile, reflect, and compare with AI behavior.”
- Teams: “Compare aggregate team profiles with model traits for collaboration and training scenarios.” (coming soon)
- Researchers/Educators: “Run studies, import custom instruments, analyze results reproducibly.” Include an outreach link: `Partner with us`.

CTA block: `Talk to us` + “Wanna add your own test? Reach out!”

---

## Social Proof & Trust

- Placeholder carousel for testimonials and a logo row (can be “As seen on” or “Used by learners at …”).
- Privacy & transparency blurbs: what’s stored, how similarity is computed, option to delete results, and anonymization for research.

---

## FAQ (starter set)

- “Do I need an account?” → Not to browse; needed to save results.
- “Is DISC the only test?” → No; Big Five and more are planned.
- “Do I need a CLI?” → No. Benchmarks will run in‑browser soon.
- “How do you compare with AI models?” → High‑level explanation with link to Docs.

---

## Footer

- Utility links: Tests, Models, Pricing, Docs, Changelog, Privacy, Terms, Contact.
- Small newsletter input (optional) for updates on new tests and benchmarks.

---

## Copy & Content Guidelines

- Keep headlines crisp (≤12 words). Lead with outcomes, not jargon.
- Use one accent color for CTAs to avoid competing emphasis.
- Microcopy for trust: “No spam. Delete anytime.”, “No account needed to explore.”
- Reuse a consistent writing voice: calm, precise, friendly.

---

## SEO & Sharing

- Title: “Persona[i] — Personality benchmarking with AI model comparisons”
- Meta description (~155 chars): “Take validated personality tests and compare your profile with leading AI models like GPT‑4, Claude, and Gemini. Clear visuals. Instant results.”
- Canonical + Open Graph + Twitter meta; generate OG images for major sections.
- Structured data (FAQPage) for the FAQ block.

---

## Performance & Accessibility

- Mobile‑first layout; test for LCP on hero. Keep hero images optimized (next/image) and pre-sized.
- Respect reduced‑motion; avoid heavy blur on low‑end devices; ensure text contrast ≥ 4.5:1.
- Keyboard and screen‑reader friendly NavigationMenu/Sheet from Shadcn. Add `aria-label`s and visible focus.

---

## Analytics & Experiments

- Metrics: CTA CTR (Start Test), test start rate, completion rate, time‑to‑first‑question, click‑through to Models.
- A/B tests: hero headline (A/B above), CTA phrasing (“Start a Test” vs “Take the Test”), presence of quick metrics bar.
- Tools: Vercel Analytics or Plausible; later, PostHog for experiments.

---

## Component Implementation Plan (Shadcn/UI)

- `components/landing/MainHeader.tsx`
  - `NavigationMenu` (desktop), `Sheet` (mobile), `Button` CTAs, `Logo`.
- `components/landing/Hero.tsx`
  - Headline, subcopy, primary/secondary CTAs, stacked cards as visual proof.
- `components/landing/TestsCatalog.tsx`
  - Cards for DISC (live) and upcoming tests; partner CTA: “Wanna add your own test? Reach out!”.
- `components/landing/ModelSpotlight.tsx`
  - Top matches preview, toggles, “How we compare” link.
- `components/landing/HowItWorks.tsx`
- `components/landing/Audiences.tsx` (Individuals/Teams/Researchers)
- `components/landing/SocialProof.tsx`
- `components/landing/FAQ.tsx`
- `components/landing/CTASection.tsx`

Route stubs to consider:

- `/tests` (catalog), `/models`, `/benchmarks`, `/pricing`, `/docs`, `/contact`.

---

## Copy Snippets (Ready to Use)

- Hero H1: “Benchmark your personality against today’s leading AI models.”
- Hero sub: “Take science‑informed tests like DISC, visualize your profile, and see which models behave most like you.”
- Primary CTA: “Start a Test”
- Secondary CTA: “Explore model comparisons”
- Partner CTA: “Wanna add your own test? Reach out!”
- Coming soon label: “In‑browser benchmarking — no CLI needed.”

---

## Next Steps

1. Approve IA, hero copy, and section lineup.
2. Implement `MainHeader` + `Hero` first; validate mobile.
3. Add `TestsCatalog` with partner CTA; wire `/contact`.
4. Layer in `ModelSpotlight`, `HowItWorks`, and `FAQ`.
5. Add analytics events for primary CTAs; run headline A/B.

This plan balances stronger design with richer, conversion‑oriented content, deemphasizes CLI, and clearly signals that multiple tests are supported — with a prominent partner CTA: “Wanna add your own test? Reach out!”.
