# Database Plan

> **Note**: This document describes the **planned** database schema for Persona[i]. The current implementation only includes BetterAuth tables (`user`, `session`, `account`, `verification`) and a basic `post` table. The schema described below is the target architecture for future implementation.

This document proposes a first real schema and data-modeling strategy for Persona[i]. It assumes we stay on Turso/libSQL with Drizzle ORM, but nothing in here prevents us from promoting critical tables to Postgres later if we need stronger analytics or materialized views.

## Current Implementation Status

**Currently Implemented:**
- ✅ BetterAuth tables (`user`, `session`, `account`, `verification`) - See `src/server/db/schema/_auth.ts`
- ✅ Basic `post` table - See `src/server/db/schema/index.ts`

**Planned (Not Yet Implemented):**
- ⏳ `subject_profile` - Assessment actor profiles
- ⏳ `questionnaire` / `questionnaire_version` - Questionnaire library
- ⏳ `question_bank_item` / `question_option` - Question management
- ⏳ `analysis_model` / `trait_dimension` - Analysis frameworks
- ⏳ `assessment_session` / `response` - Assessment delivery
- ⏳ `analysis_run` / `trait_score` - Scoring & results

See [SETUP.md](../../SETUP.md) for current setup instructions.

## Product Goals To Support
- Create and version dynamic questionnaires (initially DISC, later other frameworks).
- Capture structured responses for multiple input modes: yes/no, 0-10 scalar, single choice (Pick 1 of X), with room for future multi-select/text answers.
- Represent analysis frameworks (DISC colors, Big Five, etc.) as data so we can add, tune, or recombine traits without a code push.
- Allow different scoring strategies (direct weights, range scaling, derived composites) and store explainability breadcrumbs for each score.
- Make querying fast for the two hot paths: (1) rendering a questionnaire, (2) compiling a participant’s latest results for dashboards/comparisons.

## Storage Components
- **Primary OLTP**: Turso/libSQL (regional replicas, <10 ms reads) accessed through Drizzle. Use normalized schema + JSON columns for configurable bits.
- **Analytical Helpers**: Optional DuckDB/Parquet exports or Turso replicas for analytical workloads. Not required at MVP, but plan for nightly export.
- **Caching Layer**: Edge cache (Vercel KV/Upstash) for rendered questionnaire metadata keyed by `questionnaire_version_id`.
- **Object Store**: (Future) store rich assets (charts, report PDFs) in S3-compatible storage with pointers from `analysis_reports`.

## High-Level Module Layout
```text
┌────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
│ Identity/Auth  │ │ Questionnaire Library │ │ Assessment Delivery │
│ (BetterAuth)   │ │  templates & traits   │ │ (sessions/responses)│
└────────┬───────┘ └───────────┬──────────┘ └──────────┬──────────┘
         │                     │                       │
         ▼                     ▼                       ▼
                     ┌────────────────────┐ ┌─────────────────────┐
                     │ Analysis Models &  │ │ Scoring/Results     │
                     │ Trait Definitions  │ │ (runs, trait scores)│
                     └─────────┬──────────┘ └──────────┬──────────┘
                               │                       │
                               ▼                       ▼
                         ┌────────────┐        ┌──────────────────┐
                         │ Audit/Logs │        │ Reporting Export │
                         └────────────┘        └──────────────────┘
```

### Diagram Index
- `db.puml` — ER view of the core (Phase 0) schema.
- `db_extended.puml` — adds optional Phase 1+ tables in context.
- `workflow_assessment.puml` — Human subject session + scoring flow.
- `workflow_llm_batch.puml` — LLM batch runs and aggregation.
- `workflow_setup_analysis.puml` — Authoring/publishing pipeline.

## Core Schema (Phase 0)

These tables are the minimum viable set to ship both headline features (people/LLMs taking questionnaires and comparing results) without accumulating technical debt.

### Identity & Profiles
- `user` / `session` / `account` / `verification`: provided by BetterAuth.
- `subject_profile` — canonical record for any assessment actor.
  - Columns: `id`, `subject_type` (`human`, `agent`, `cohort`), `user_id` (nullable), `display_name`, `metadata_json` (demographics, model version, etc.), consent + locale flags.
  - Normalizes the surface so humans, anonymous testers, and AI runs use the same downstream tables.

> **Why not reuse `user`?**  
> - Humans can take a test before sign-in; we still want continuity when they later link an account.  
> - LLM personas do not authenticate, yet we need durable IDs for benchmarking.  
> - Cohorts/averages (“GPT-4o July 2025”) behave like subjects but are not real users.  
> Keeping them in `subject_profile` avoids stretching auth semantics while staying fully normalized.

### Questionnaire Library
- `questionnaire` — logical container (e.g., “DISC Baseline”). Columns: `id`, `slug`, `title`, `default_analysis_model_id`, `status`, timestamps.
- `questionnaire_version` — immutable snapshot of ordering/config. Columns: `id`, `questionnaire_id`, `version`, `is_active`, `metadata_json`, `published_at`. Unique `(questionnaire_id, version)`.
- `question_bank_item` — reusable master question catalog with `question_type` enum and config metadata.
- `question_option` — permissible answers for choice-based questions.
- `questionnaire_item` — links a version to bank questions, handles ordering/section overrides, and keeps history intact.

### Analysis Models & Traits
- `analysis_model` — identifies DISC/other frameworks, stores scoring strategy metadata.
- `trait_dimension` — the axes we score (e.g., `dominance`, `influence`). Includes display metadata and range hints.
- `question_trait_mapping` — join table that maps each question (or option) to trait contributions, weights, or rules. Without it, scoring logic would be hard-coded.

### Assessment Delivery
- `assessment_session` — a single run by a subject against a questionnaire version. Columns cover status and timestamps; index by `(subject_profile_id, status)` and `(questionnaire_version_id, status)`.
- `response` — atomic answer records (one per question per session) holding boolean/numeric/text/option payloads.

### Scoring & Results
- `analysis_run` — deterministic scoring pass attached to an `assessment_session`. Includes `score_version` and worker bookkeeping so we can re-run later.
- `trait_score` — per-dimension aggregates produced by an `analysis_run`.
- *Optional in Phase 0:* expose a SQL view (e.g., `subject_trait_average_v`) that averages `trait_score` by `subject_profile_id` and `questionnaire_version_id`; this powers LLM benchmarking and comparison without extra tables.

## Extension Tables (Phase 1+)
These tighten analytics/debuggability but can ship later as needed:

- `assessment_batch` — persist aggregated LLM runs (mean/median, rolling windows) instead of relying solely on views.
- `trait_composite` — model derived constructs (primary color, stress profile).
- `trait_threshold` — define interpretation bands + narratives per trait.
- `response_trait_component` — audit-level breakdown of how each answer fed into scores.
- `analysis_report` — cached JSON/Markdown/PDF snapshots for offline rendering.
- `composite_score` — results for composites if/when we introduce them.
- `question_branch_rule` — dynamic skip logic (JSON Logic).
- `questionnaire_event_log` — timeline of autosave/resume/debug events.
- `system_setting` — feature toggles / config pins.
- `response_option_selection` — join table if we support multi-select answers.

Keep the columns described earlier; the difference is timing. Each extension is independent and can be added through additive migrations.

## Table Rationale Cheat Sheet
- `subject_profile`: decouples authentication from assessment subjects and keeps human vs. agent data tidy.
- `questionnaire` / `questionnaire_version`: versioning guarantees every historical run can be reproduced.
- `question_bank_item` + `questionnaire_item`: reuse questions across releases without duplicating strings.
- `question_option`: first-class place for labels/values, enabling localized text and weighted scoring.
- `analysis_model` + `trait_dimension`: describe DISC (and future frameworks) as data rather than code.
- `question_trait_mapping`: the scoring matrix—lets us rebalance traits without deploys.
- `assessment_session`: anchors responses, status, and who took what.
- `response`: stores raw answers; combined with mappings, drives scoring and exports.
- `analysis_run` + `trait_score`: deterministic scoring artifacts; enabling re-runs and comparisons.
- `assessment_batch` (extension): caches averaged agent cohorts when SQL-on-demand isn’t enough.
- `trait_composite` / `trait_threshold` (extension): deliver richer storytelling when product needs them.
- `response_trait_component` (extension): forensic auditability.

## Question Type Handling
- `boolean`: store in `value_boolean`; map to traits using `constant` or `boolean_gate` rules. Example: “Yes” adds +2 to Dominance.
- `scalar` (0–10): `question_bank_item.config_json` holds `min`, `max`, `step`. Scoring uses `range_linear` (value × multiplier) or `range_bucket` for thresholds.
- `single_choice`: `selected_option_id` references `question_option.id`. `question_trait_mapping` rows at `option_id` granularity assign weights. This makes it easy to attach DISC colors to specific answers.
- Extensibility: future `matrix`, `ranked`, `text` can live in same schema by extending `question_type` enum and storing additional metadata in `config_json`.

## Dynamic Analysis Structures
1. **Define Model**: Insert into `analysis_model`.
2. **Seed Dimensions**: Add rows to `trait_dimension` (e.g., `disc_d`, `disc_i`, `disc_s`, `disc_c`).
3. **Attach Questions**: Use `question_trait_mapping` to map each question/option to dimension weights. For range questions, use linear/bucket configs. For boolean, specify `rule_type = "boolean_gate"` with `true_contribution` and `false_contribution`.
4. **Compose Traits (optional extension)**: Add `trait_composite` rows for derived values (e.g., “primary color”) when the product needs them.
5. **Compute Narratives (optional extension)**: `trait_threshold` yields localized narratives. During scoring, look up the band that matches a participant’s normalized score.
6. **Switching Frameworks**: Because sessions reference `questionnaire_version` → `analysis_model`, adding a new framework is a data exercise: seed new model, publish new questionnaire version, map new traits.

## Scoring Flow (MVP)
1. participant completes questionnaire → all responses stored.
2. `analysis_run` inserted with `status = "pending"`.
3. Worker/service fetches rules for the relevant `analysis_model`.
4. For each response:
   - Resolve applicable `question_trait_mapping` entries.
   - Evaluate rule (using deterministic runtime; prefer JSONLogic or embedded TypeScript executed via sandbox).
   - If the audit extension is enabled, write `response_trait_component` rows for transparency.
5. Aggregate contributions per `trait_dimension` (simple SUM + bias). Store in `trait_score`.
   - For LLM benchmarking, expose a SQL view that averages `trait_score` by `subject_profile_id` + `questionnaire_version_id`; if we later adopt `assessment_batch`, the worker can populate it here.
6. Apply normalization (min/max scaling or z-score) if defined in `analysis_model.config_json`.
7. If composites/narratives are enabled, derive them using `trait_composite` + `trait_threshold`.
8. If cached reports are enabled, upsert into `analysis_report` to avoid regenerating narratives repeatedly.

Re-running scoring after rule tweaks: bump `score_version`, insert new `analysis_run`, leave previous runs for audit.

## Subject Workflows (Key Features)
1. **Human user completes questionnaire**  
   - `subject_profile` linked to `user`.  
   - Frontend creates `assessment_session` and streams answers into `response`.  
   - Once submitted, scoring service generates an `analysis_run` → `trait_score`.  
   - Latest run is surfaced via API; historical runs stay for trend charts.  
   - Diagram: see `workflow_assessment.puml` (`Human lane`).

2. **LLM benchmark runs & averaging**  
   - Create a `subject_profile` with `subject_type = "agent"` (e.g., `gpt-4o-2025-07`).  
   - Kick off N runs; each produces an `assessment_session` with `analysis_run`.  
   - Surfacing comparisons: start with a SQL view that averages `trait_score` per `(subject_profile_id, questionnaire_version_id)`.  
   - If repeated recalculation becomes expensive, introduce the optional `assessment_batch` table + worker job to persist cohort snapshots.  
   - Diagram: see `workflow_llm_batch.puml` (shows both the view-first approach and the optional persistence step).

3. **Questionnaire authoring & publishing**  
   - Product/admin tool edits `question_bank_item` records, wires them into a fresh `questionnaire_version`, and attaches trait mappings.  
   - When ready, mark the version `is_active`, then release via feature flag or routing.  
   - After version bump, new sessions automatically use the latest release thanks to the FK chain.  
   - Diagram: see `workflow_setup_analysis.puml`.

## Indexing & Performance Notes
- Add covering indexes on `response (assessment_session_id, question_id)` and `response (question_id)` for analytics.
- Use partial index on `analysis_run (status)` to fetch incomplete runs fast.
- Precompute denormalized materialized views (or cached JSON) for “latest results per user” to drive dashboards.
- Keep `question_bank_item.config_json` small; consider splitting out heavy localization text into `question_localization` table keyed by locale.

## Migration & Versioning Strategy
- Prefer additive migrations to avoid downtime (Drizzle migrations as usual).
- Lock questionnaire versions once published; create a new `questionnaire_version` row instead of editing in place. `assessment_session` references guarantee historical integrity.
- For scoring changes, add new rows in `question_trait_mapping` with `effective_from`/`effective_to` timestamps (optional columns) so we can backfill or replay runs using the appropriate rule set.

## Next Steps
1. Finalize enums and JSON schemas (`question_type`, rule config payloads) in TypeScript so the API can validate input.
2. Implement Drizzle table definitions for the Phase 0 tables; gate extensions behind feature flags or separate migrations.
3. Build seed scripts for DISC model: insert dimensions and question mappings, then verify scoring outputs match the current manual spreadsheet.
4. Add integration tests that simulate an assessment session and assert stored trait scores for known answer sets (golden fixtures). This keeps the rules honest as we tweak mappings.


