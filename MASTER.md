# PROJECT MASTER — PashuSetu 🐄 (पशुसेतू)
### SIH26128 · Software · Gov. of Maharashtra · One-doc build plan — read → build → update STATE. Nothing else.

> **AI READ ORDER (every AI, every time):** §0 rules → §8 STATE (what's done) → your Part in §7 → open ONLY the files that Part names → build → pass its "Accept" → update §8 → stop.
> Never re-read the whole repo. Never rebuild finished parts. Never edit anything except §8 when done.

---

## 0. GROUND RULES (builder AI)
1. Build **exactly one Part** from §7, in order, unless told otherwise.
2. No scope creep, no "while I'm here" refactors, no gold-plating.
3. Small green commits. `git push` → Vercel auto-deploys `main`.
4. When a Part is done: tick its §8 checkbox, fill Commit / How to test / Notes. Edit nothing else in this file.
5. Ambiguity → pick the **simplest** option that passes "Accept"; note the deviation in §8. Don't stop to ask.
6. **Hard rule:** every AI advisory shows *"preliminary triage, not a diagnosis — consult a vet"*. Never auto-replace a vet.

---

## 1. PROBLEM (official PS, compressed)

**SIH26128** · Software · Agriculture/FoodTech & Rural Development · Sponsor: Govt. of Maharashtra (State Innovation Society). **Idea deadline: 20 Sep 2026** (verify on sih.gov.in).

Farmers, paravets, vets and govt depts have **no unified, real-time way** to spot animal-disease risk at village→block→district level. Reports arrive late, labs are far, vaccination/treatment history is fragmented, low-connectivity villages are excluded. Result: late containment, higher mortality, zoonotic spillover, farmer income loss.

**The 8 PS asks → our features:**

| # | PS asks for | We build (Part) |
|---|---|---|
| 1 | Farmer/field-worker symptom + mortality reports | Report form, offline (P1) |
| 2 | Rule-based **or AI-assisted triage** | Triage engine (P2) |
| 3 | Geospatial risk map + weather + trends | Map (P3) + early-warning + syndromic dairy (P8) |
| 4 | Animal/herd health, vaccination, treatment records | Herd/vaccination records (P1, P7) |
| 5 | Multilingual advisories & alerts | Bhashini voice/text + full i18n (P4) |
| 6 | Sample collection → lab referral → case escalation | Case/lab chain (P7) |
| 7 | Dashboards for vet officials | Officer dashboard (P3) |
| 8 | Mobile / web / IVR / **offline** | PWA offline + WhatsApp/voice (P1, P8) |

**Context stats (pitch):** LSD 2022 killed 126+ cattle across 25 Maharashtra districts; LSD 2025 — Maharashtra is the **only** state with active cases. NADCP proves surveillance+vaccination works (FMD outbreaks 132→40, 2019→2025). Bharat Pashudhan already issued ~39 crore animal **12-digit Tag IDs** — a ready-made identity layer to link into, not replace.

**Existing systems & the gap we fill:**

| System | Does | Gap |
|---|---|---|
| NADRES.v2 (ICAR-NIVEDI) | Monthly, district-level AI outbreak forecasting | Top-down, no farmer/animal layer, not real-time |
| NADRS / IDSP | Officials manually log block→district reports | No farmer self-report, no AI triage, no offline |
| Bharat Pashudhan / e-Gopala / INAPH | Animal ID + productivity records | No symptom/outbreak intelligence |
| 1962 helpline & Livestock app (Maharashtra) | Scheme info for farmers | Informational only, not diagnostic |

**→ Wedge (say this in the pitch):** PashuSetu is the **missing last-mile sensor layer** — voice/offline-first farmer symptom capture + explainable triage + geo-clustering + a **syndromic dairy signal** — designed to *feed into* NADRES/Bharat Pashudhan (import Tag ID, export NADRS-format report), not compete with them. One line = novelty + feasibility + appropriateness.

---

## 2. NOVELTY — why we win (defend each in 30s)

A report→heatmap CRUD app is **not** novel; 100 teams will build that. Our four defensible mechanisms:

| # | Mechanism | One line | Built in |
|---|---|---|---|
| 1 | 🥛 **Syndromic dairy signal (flagship)** | Village-level milk-yield dips (recorded daily at dairy collection centres — Mahanand co-op & private dairies) appear **before** clinical symptoms of FMD/LSD/mastitis → auto "field-verify" flag, *pre-empting* the report | P8 + `milk_collections` |
| 2 | 📞 **Voice-first reporting** | Feature-phone farmer: missed-call/WhatsApp → speaks symptoms in Marathi → Bhashini ASR → structured report. 100% farmer reach, not the smartphone minority | P8 |
| 3 | 🔍 **Explainable triage** | Rule engine returns a differential list + reasons + confidence, never a black box → the trust that makes a govt dept adopt it | P2 |
| 4 | 📍 **Geo-cluster + officer-confirm flywheel** | PostGIS clustering auto-flags outbreaks; every officer confirm/reject silently becomes labeled training data for the next version | P5 + P3 |
| 5 | 🐄 **IoT telemetry — "the herd reports on itself"** | Simulated wearable/shed sensors (body temp, rumination, activity, milk, THI) stream into the SAME pipeline → auto-detect fever/rumination-drop → auto-report before any human notices. Ingest is production-identical; only the data source is simulated (digital twin) | P9 |

**Anti-novelty (deliberately avoided):** CRUD-only dashboard · chatbot wrapper · blockchain-for-the-sake-of-it · "AI" with no explainability.

---

## 3. WINNING STRATEGY (judging criteria → what we do)

| Judges check | Weight | Our answer |
|---|---|---|
| Problem understanding | ~20% | Every PS bullet traced to a Part (§1 table) |
| Innovation | 20–30% | §2 mechanisms 1+2 lead; "ASHA for animals" framing |
| Technical feasibility | 20–25% | 100% free-tier stack (§5), staged build, no paid hardware |
| Prototype / live demo | 20–25% | One core loop end-to-end beats slides — always real (seeded) data |
| Impact & scalability | 20% | Real stats (§1) + cost line: "₹0 infra now; paisa-range per report at scale" |
| Presentation & team | 10–15% | Clean pitch, confident demo, official AICTE PPT template |

**Winner rules (recur across every SIH-winner study):** narrow wedge, not "solve everything" · working demo > 10 slides · explicitly cite & differentiate from existing govt systems (judges are often officials from this dept) · design visibly for low-literacy/low-connectivity users · real sustainability model · never copy a past winner.

**Team/logistics:** 6 members, ≥1 female, + faculty mentor — lock now. Official idea PPT uses AICTE 6-slide template from sih.gov.in. Public GitHub + demo video expected at later rounds.

---

## 4. PRODUCT — one-liner & scope

**PashuSetu**: a multilingual, offline-first web/WhatsApp/voice platform where a farmer or Pashu Mitra reports a sick animal (voice, photo, or checklist) in <2 min in their own language, gets instant explainable AI triage + first-aid advice, and — if the pattern matches an emerging cluster **or a village milk-yield dip** — automatically alerts the district officer's live map, while every case silently builds the animal's permanent health record.

**MVP scope (MoSCoW):**
- **Must:** symptom/mortality report (species, symptoms, geo, optional photo) online+offline · instant rule-based triage + urgency + advisory · officer map dashboard with confirm/reject · geo-cluster outbreak flag.
- **Should:** WhatsApp reporting · herd/animal + vaccination records · case escalation → lab referral with status tracking · syndromic dairy anomaly flag · **IoT telemetry (simulated sensors → auto-report)**.
- **Could (stretch):** missed-call IVR (Bhashini ASR) · ML image classifier · weather-model early warning · insurance-claim export.
- **Won't (this cycle):** building physical sensor hardware, drones, blockchain — we *simulate* sensor data (digital twin), not manufacture devices.

**Non-negotiable rules:**
1. **Disclaimer:** every advisory shows "preliminary triage, not a diagnosis — consult a vet". Photo is never required to trigger triage.
2. **Language:** every screen, label, button, form and dashboard — not just advisories — must work fully in **English, Hindi, Marathi**. A switcher sets `language_pref`; all UI strings come from a translation table, none hardcoded to English.
3. **Responsive:** one dynamic layout (Tailwind breakpoints) for mobile + desktop. Farmer screens mobile-first; officer dashboard desktop-first but usable on tablet/phone.

---

## 5. TECH STACK (free-tier only — verify limits at build time)

| Layer | Choice | Why |
|---|---|---|
| Frontend + PWA | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui | One codebase, installable offline PWA |
| Offline queue | next-pwa/Workbox + Dexie.js (IndexedDB) → sync on reconnect | Satisfies PS offline requirement |
| Hosting / CI | Vercel Hobby (free) | `git push` → auto-deploy, matches workflow |
| DB / Auth / Storage / Realtime | Supabase (Postgres + PostGIS + pgvector) | One free platform: DB, RLS, storage, live pushes, edge fns. **Pauses after 7 days idle → ping weekly** |
| Maps | Leaflet or MapLibre GL + OpenStreetMap | Free, no key; PostGIS does geo queries |
| Triage (MVP) | Deterministic rule engine (Supabase Edge Function) from ICAR/FAO/NADRES public fact sheets, ~15–20 diseases | Explainable = trusted over black box; zero training cost |
| Symptom NLP (optional) | Groq free API (Llama) or pgvector semantic match | Parses fuzzy/vernacular text; never sole authority |
| Multilingual voice/text | Bhashini (GoI, free ASR+TTS+MT, 22 languages) | Govt-aligned → strong appropriateness score |
| UI i18n | next-intl, 3 locale files (en/hi/mr) | Static UI text app-side; Bhashini handles dynamic advisories |
| Farmer channel | WhatsApp Cloud API (free ~1k convos/mo) primary · missed-call IVR (Twilio, paid) stretch · Web-Speech+Bhashini as free fallback | Matches real rural phone usage |
| Weather (stretch) | Open-Meteo (free, no key) | Feeds early-warning |
| Charts | Recharts | React-native fit |
| IoT telemetry | Ingest endpoint (Supabase Edge Fn) + `devices`/`telemetry` tables + simulator (Node script + in-app toggle) · optional MQTT (HiveMQ Cloud free, 100 devices) | Real sensors publish the same JSON → one-config swap |

**Where the "AI" actually runs — no separate host (Render) needed:**
- Triage MVP = **rule engine** (code, not a trained model) → Supabase Edge Function. Zero training.
- Early-warning = **EWMA/z-score/seasonality** (statistics, not ML) → scheduled SQL + edge job. Zero training.
- Cluster detect = **PostGIS query** (DB math). No training.
- Vernacular parsing = **Groq (hosted LLM)** — they run the model, we call an API.
- Image classifier (optional P8) = **train ONCE offline** (Colab/laptop) → freeze+quantize to `.onnx/.tflite` → commit as static file → **infer on-device in browser** (ONNX Runtime Web/WASM). No training server, works offline.
- IoT simulator = **script/in-app page streaming JSON** to the ingest endpoint — no broker needed; optional MQTT bridge (HiveMQ Cloud free) for hardware realism.
- Add Render/Fly/Railway ONLY if you later build a real Python ML service (XGBoost/Prophet on NADRS history) — a v2 upgrade, not the base.

**Env vars (`.env.example`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `GROQ_API_KEY` (opt), `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` (opt), `TWILIO_*` (opt).

**Repo layout:**
```
/app            pages + api routes        /components   shadcn UI
/lib            supabase, triage, offline-queue, bhashini, i18n
/supabase       migrations/, seed.sql, functions/   /public  PWA manifest+icons
MASTER.md       (this file — the only doc an AI needs)
```

---

## 6. DATA MODEL (core tables — add columns per-Part, don't redesign)

```
profiles      (id→auth.users, role[farmer|pashu_mitra|vet|officer|lab|admin], name, lang_pref, village, taluka, district)
animals       (id, owner_id, tag_id[Bharat Pashudhan, nullable], species, breed, dob)
reports       (id, reporter_id, animal_id, symptoms[jsonb], sick_count, dead_count, photo_url,
               geo[postgis point], village/block/district, status, offline_ts, created_at)
triage_results(id, report_id, disease_candidates[jsonb], confidence, urgency, advisory_text, advisory_lang,
               notifiable_flag, source[rule_engine|image_model|both])
clusters      (id, centroid[postgis point], radius_km, disease_guess, case_count, first_seen, last_seen, status)
cases         (id, report_id, disease_id, status[suspected→confirmed→contained], assigned_vet_id, severity)
samples       (id, case_id, barcode, lab_id, result, custody_json, status)
vaccinations  (id, animal_id, vaccine, dose_no, date, administered_by, campaign)
vets          (id, name, phone, location, district, taluka)
alerts        (id, severity, audience, channel, message_json, read)
milk_collections (id, dairy_id, village, block, date, species, avg_yield_kg, animals_count)   ← syndromic input (P8)
devices        (id, type[ear_tag|rumen_bolus|neck_collar|shed_env|milk_line], animal_id?, village, block, district, lat/lng, protocol[http|mqtt], status, last_seen)
telemetry      (id, device_id, ts, body_temp_c?, rumination_min?, activity?, milk_yield_kg?, env_temp_c?, humidity_pct?, ammonia_ppm?, battery_pct, ingested_at)  ← IoT input (P9)
```

RLS on every table: farmers see only their own data; officers only their jurisdiction; admins all.

**Architecture (data flow):**
```
Farmer (PWA offline / WhatsApp / voice)
   → reports (Supabase)
   → Triage Edge Fn (rule engine [+ Groq/pgvector NLP]) → triage_results → advisory back to farmer (Bhashini)
   → Cluster-detect job (PostGIS, scheduled) → clusters → alert to officer dashboard + nearby farmers
   → Dairy yield anomaly job (P8) → field-verify alert (flagship novelty #1)
   → Officer dashboard (map + KPIs, Realtime) → confirm/reject  ← labeling flywheel
   → confirmed → cases → samples → lab result → contained → close loop to farmer
```

---

## 7. BUILD PLAN — ONE PART AT A TIME

### DEPTH ANCHORS (anti-shallow — parts below must meet these bars, not a "kind of works" version)
A report→heatmap CRUD is commodity; these 4 anchors are what make the project win.

**ANCHOR A — Covariate-adjusted anomaly detection (dairy P8 + IoT P9 reuse).** Naive z-score on milk yield = false-alarm hell (yield also dips from heat, monsoon, feed, milk price). Correct spec: (1) detrend + deseasonalize (7-day rolling median or STL) · (2) fit linear model `yield_residual = yield − f(temp, humidity, rainfall, lactation-stage)` (covariates from Open-Meteo) · (3) flag when residual < −2.5σ for 2 consecutive days → auto "field-verify" alert (novelty #1). Accept: planted dip on a heat-wave day → NOT flagged · unexplained planted dip → flagged ≤24h · false-positive ≤5% over 90 clean synthetic days.

**ANCHOR B — Offline sync correctness.** Most teams claim offline, few do it right. Spec: client-generated `report_uuid` + unique index (idempotent, no dupes on retry) · last-writer-wins on `updated_at`/`client_ts` · ordered replay + visible sync status (queued→synced). Accept: airplane-mode submit 3 → reconnect → exactly 3 rows · offline edit vs online edit → deterministic winner · kill app mid-sync → no loss on restart.

**ANCHOR C — Explainable differential triage.** Not "lookup symptoms → best match." Spec: Bayesian `P(disease|symptoms,species,season,district) ∝ P(symptoms|disease) × prevalence_prior` · per-candidate matched + missed symptoms · top-3 with reasons + confidence · notifiable/zoonotic escalation flag · disclaimer always. Accept: "fever+mouth blisters+drooling+lameness, cattle, monsoon, Ahmednagar" → FMD top with reasons · gibberish → low confidence, no crash · every result shows *why*.

**ANCHOR D — IoT "the herd reports on itself" (P9).** Simulated sensors stream the exact schema real hardware would (§5). Depth = realistic per-animal baselines + disease-injection scenario + control day, not random noise. Accept: injected FMD scenario → auto-reports + cluster alert with zero manual input · heat-wave control day → zero false alerts.

---

Each Part = one AI session's whole task. Format: **Goal · Build · Accept · Files to read next.**

**PART 0 — Scaffold + Infra + Auth**
- Goal: empty skeleton, live and deployed; users log in with a role.
- Build: `create-next-app` (TS/Tailwind/App Router) + shadcn init · Supabase project + `schema.sql` (§6 tables, PostGIS/pgvector on, RLS stubs) + `seed.sql` (Maharashtra villages, 15–20 diseases w/ Marathi names) · Supabase Auth + role-gated routing · i18n scaffold (en/hi/mr + switcher wired to `language_pref`) · Vercel↔GitHub auto-deploy · PWA manifest + SW stub · `.env.example`.
- Accept: push → Vercel deploys; sign-up → role-based empty dashboard; tables+seed visible; switching language changes all visible UI.
- Next AI reads: `/app`, `/lib/supabase.ts`, `/supabase/migrations`.

**PART 1 — Farmer report flow + offline PWA** *(PS #1, #4, #8)*
- Goal: farmer/paravet submits a symptom report in <2 min, works offline.
- Build: multi-step report form (species → symptom checklist/icons → sick/dead counts → optional photo → GPS/manual location) → `reports` + Storage · animal/herd record create+view with optional Tag ID · Dexie local queue + background sync on reconnect.
- Accept: airplane-mode — submit → queued → reconnect → row appears in Supabase with correct linkage.
- Next AI reads: `/app/report/*`, `/lib/offline-queue.ts`, §6.

**PART 2 — Rule-based triage engine** *(PS #2 — flagship)*
- Goal: any report instantly returns suspected disease(s) + urgency + advisory, **explainably**.
- Build: disease knowledge base (symptoms, species, zoonotic flag, seasonality) from ICAR/FAO fact sheets · weighted rule-scoring Edge Function · (optional) Groq/pgvector for fuzzy vernacular text · store in `triage_results` (`source='rule_engine'`) · always append the disclaimer.
- Accept: "fever + mouth blisters + drooling, cattle" → FMD top with reasons + confidence; gibberish → low confidence, no crash; no-photo report still triages.
- Next AI reads: `/supabase/functions/triage`, disease JSON, §6.

**PART 3 — Officer dashboard: map + case queue** *(PS #3, #7)*
- Goal: officer sees live map + KPIs, confirms/rejects cases (labeling flywheel — comment this in code).
- Build: Leaflet/MapLibre heatmap+pins from `reports` geodata, jurisdiction-filtered (RLS) · KPI cards (reports today, open outbreaks, time-to-report) · Realtime so new cases appear live · confirm/reject writes `cases.status` · CSV export.
- Accept: officer logs in → sees only their district's live-updating map + list; confirm/reject updates instantly.
- Next AI reads: `/app/dashboard/*`.

**PART 4 — Multilingual: advisories + full UI (Bhashini + i18n)** *(PS #5)*
- Goal: every advisory AND every UI screen works in the user's language, text + voice.
- Build: Bhashini (translate advisory → target lang, TTS audio) · advisory library keyed by disease+urgency · complete en/hi/mr locale files covering all strings from Parts 0–3 · `language_pref` respected everywhere.
- Accept: same advisory renders in Marathi/Hindi/English by `language_pref`; switching language re-renders all chrome with zero leftover English.
- Next AI reads: `/lib/bhashini.ts`, advisory components.

**PART 5 — Outbreak cluster detection + alerts**
- Goal: auto-flag when N similar-symptom reports cluster in space+time.
- Build: PostGIS scheduled query (≥3 similar-symptom cases within 5km/72h) → `clusters` → `alerts` → Realtime push to officer dashboard + stub push/SMS to farmers in that taluka.
- Accept: seed 5–10 nearby matching reports → cluster auto-detected, banner alert appears.
- Next AI reads: `/supabase/functions/cluster-detect`, `alerts` table.

**PART 6 — Case escalation + lab referral + herd/vaccination records** *(PS #4, #6)*
- Goal: full suspected→confirmed→contained journey with lab traceability + vaccination history.
- Build: escalation UI (assign vet, status transitions) · sample QR/barcode + lab result + chain-of-custody log · vaccination records + coverage-gap view · close-the-loop alert to farmer.
- Accept: report→case→sample→lab→contained demoable; barcode scannable.
- Next AI reads: `/app/cases/*`, `/app/lab/*`, `vaccinations`/`samples` tables.

**PART 7 — Farmer channel: WhatsApp (or IVR)** *(PS #8 — high novelty)*
- Goal: a farmer with no app reports via WhatsApp message (primary) or phone call (stretch).
- Build (WhatsApp, default): WhatsApp Cloud API webhook → same `/api/reports` pipeline → template advisory reply. Build (IVR, stretch): Twilio/Web-Speech + Bhashini ASR → creates report → TTS advisory callback.
- Accept: sending a structured WhatsApp message (or calling the number) creates a report visible on the officer dashboard.
- Next AI reads: `/supabase/functions/whatsapp-webhook` or IVR route.

**PART 8 — Early-warning: syndromic dairy signal (flagship novelty) + weather**
- Goal: predict, don't just react — detect outbreaks *before* clinical reports.
- Build: `milk_collections` seeded with a normal seasonal baseline + a planted dip · nightly job computes village z-score vs seasonal baseline → anomaly → auto `alerts` ("field-verify") · EWMA/anomaly on `reports` count + Open-Meteo weather join → `/api/forecast` + risk-zone map layer. *(Optional, last: replace mock image classifier with small TFLite/ONNX model trained on public LSD/skin datasets, on-device; store as its own `triage_results` row `source='image_model'` — never overwrites the rule engine.)*
- Accept (Anchor A): planted dip on heat-wave day NOT flagged · unexplained dip flagged ≤24h with stated reason · seeded report spike → "high risk" forecast next day.
- Next AI reads: `/supabase/functions/dairy-anomaly`, `milk_collections`, forecast route.

**PART 9 — IoT telemetry + simulator ("the herd reports on itself")** *(enhancement — automated reporting on top of the PS asks)*
- Goal: 24/7 automated disease detection from simulated wearable/shed sensors feeding the SAME pipeline; architecture is real-hardware-ready.
- Build: `devices` + `telemetry` tables · ingest endpoint `POST /api/ingest/telemetry` (schema-validated, idempotent on device_id+ts) · simulator: Node script + in-app toggle page ("start simulating herd") with per-animal baselines (temp 38.5±0.3°C, rumination 400–500 min/day, activity, milk) · scenario engine: inject FMD over 5 sim-days (fever 40–42°C → rumination −60% → yield drop; vitals lead clinical signs by 12–24h) + a heat-wave control day · per-animal anomaly detection (reuse Anchor A) → herd-concurrency check (M animals same village deviate) → auto-create `reports` row `source='iot'` → triage → dashboard · optional MQTT ingest stub (HiveMQ Cloud free).
- Accept (Anchor D): injected FMD scenario → auto-reports + cluster alert, zero manual input · control day → no false alert · simulator toggle streams live charts.
- Next AI reads: `/simulator/*`, ingest route, `telemetry`/`devices`, Anchor A code.

**PART 10 — Polish, seed data, pitch assets**
- Goal: fully demo-ready.
- Build: realistic Maharashtra seed (simulate a past LSD-style outbreak timeline so clustering/dairy-anomaly "catch" it retroactively) · demo script (§9) · AICTE PPT visuals from §6 architecture · record demo video.
- Accept: full loop — milk dip → IoT auto-report → triage → cluster → map alert → case → lab → contained — runs live on seeded data.

---

## 8. STATE TRACKER — update ONLY this table when a Part is done

| Part | Status | Commit | How to test | Notes for next AI |
|---|---|---|---|---|
| ✅ P0 Scaffold + Auth | Done | 1fbd647 "P0: scaffold + auth + i18n + schema" | Sign up with a role → role-gated dashboard; switch EN/हिं/मरा → all UI re-renders; PWA manifest installable; Supabase schema+seed applied (18 diseases en/hi/mr, 15 MH villages) | Next.js 15 + TS + Tailwind v4 + next-intl (cookie locale, no URL prefix). Design system from approved mock lives in `app/globals.css`. **Deviation:** shadcn/ui skipped (mock's design system covers it). Supabase clients in `lib/supabase/*`; profile auto-created via `handle_new_user` trigger; RLS helpers `my_role()`/`my_district()`. Schema `supabase/migrations/0001_init.sql` (NOTE: predates this doc's v2 — `devices`/`telemetry` tables for P9 to be added in a later migration, do NOT redesign 0001). PWA stub `public/sw.js` (P1 adds Dexie queue). Auth: mailer_autoconfirm=ON for dev. Role-gated nav in `components/shell/AppShell.tsx`. **Deviation (UI-only, user-reviewed):** `/dashboard/alerts` empty-state page + nav/tab entry added ahead of P5 — it is P5's landing surface (§6 `alerts` table + P5 "push to farmers in taluka"); added early because role-gating removed the Cases tab for farmers, breaking the mock's 4-tabs+center bottom-bar geometry. No alert logic built; P5 fills this page. Deployed on Vercel (pashusetu-rho.vercel.app). |
| ✅ P1 Report flow + offline | Done | "P1: report wizard + herd records + offline queue (Anchor B)" | Login as farmer → Report tab → 5-step wizard (species→symptoms→counts→photo→GPS) → submit. Airplane-mode test: DevTools offline → submit → "Saved offline" + sync pill → reconnect → row lands in `reports`, zero dupes. Herd tab → add animal w/ 12-digit tag validation. Verified by automated puppeteer run: online submit PASS, 2 offline submits queued PASS, reconnect drained queue PASS, server shows 3 rows/3 distinct ids. | Anchor B: client `crypto.randomUUID()` becomes reports.id (PK) → idempotent upsert w/ `ignoreDuplicates`; ordered replay by capture time; queue item deleted only after server confirm (crash-safe); visible status = `components/OfflineSyncBadge.tsx` (Dexie liveQuery pill, syncs on mount/online-event/60s/tap). Queue: `lib/offline/{db,sync}.ts` (Dexie v1, table `pendingReports`). Wizard: `app/dashboard/report/ReportWizard.tsx`; canonical symptom keys in `lib/report/constants.ts` — MUST match diseases.symptoms in seed (P2 joins on them). Photos: client-compressed (`lib/report/image.ts`) → `report-photos` bucket (public read, owner-folder writes; migration `0002_report_flow.sql`, applied). geo sent as EWKT `SRID=4326;POINT(lng lat)`. Herd CRUD `app/dashboard/herd/HerdClient.tsx`. SW v2 caches static assets cache-first + pages network-first (visited pages open offline). Minor additions: "Recent reports" list on report page (needed to see sync result), es/hi/mr symptom+species catalog (~90 new strings/locale). LWW on updated_at deferred — reports are insert-only until a Part needs edits. |
| ✅ P2 Triage engine | Done | "P2: explainable triage engine (Anchor C)" | Submit report w/ fever+mouth blisters+drooling+lameness, cattle → done-screen shows CRITICAL + FMD top w/ confidence %, matched (✓) + missed (?) signs, per-candidate reasons, advisory, disclaimer. Empty symptoms → low urgency, 0 candidates, no crash. Triage tab lists every own report with its full differential. Verified: 3 SQL-seeded cases + headless-browser E2E (4/4 PASS) + zero console errors. | Engine = pure fn `supabase/functions/triage/engine.ts` (source of truth; client mirror types in `lib/triage/types.ts`). Scoring: weighted symptom coverage (first 2 KB symptoms = hallmark ×2) blended w/ precision × season prior (month from offline_ts) × nearby-cases prior (same-district triaged reports last 14d — flywheel input). Confidence = 0.55·relative + 0.45·absolute, smoothing +0.35, caps by match count (1→0.45, 2→0.7, ≥3→0.9). Urgency ladder w/ notifiable/zoonotic/dead escalation. Trigger chain: reports INSERT → pg_net http_post (migration `0003_triage.sql`, applied) → edge fn `triage` (deployed, verify_jwt=false + shared secret header TRIAGE_WEBHOOK_SECRET; harden before production) → upsert `triage_results` (unique report_id+source) → status='triaged'. Covers ALL ingest paths incl. future WhatsApp/IoT. advisory_text stored in EN (P4 replaces w/ Bhashini per language_pref). Groq/pgvector fuzzy free-text parsing NOT built (optional; free_text currently unused by engine). UI: `components/triage/TriageCard.tsx` (urgency badge, bars, reason list, disclaimer always) on triage page + wizard done-screen (1.5s poll). All 53 KB symptom keys translated en/hi/mr w/ safe fallback. |
| ✅ UI redesign (user-ordered, not a Part) | Done | "UI: warm premium redesign + Maharashtra map hero + perf" + "UI: 3D map hero on top + triage hierarchy" | Landing + dashboard show live Maharashtra SVG map (15 pilot villages pulsing, arcs → Mumbai hub, 1 alert village); dashboard is personalized (time-of-day greeting, role/village chips, live counts, quick actions); nav tab switches paint instantly (skeleton). Verified mobile 390×844 + desktop 1440×900 screenshots, zero console errors. | Supersedes the original index.html mock look (user rejected it). Fonts: Fraunces + Instrument Sans via next/font (`app/layout.tsx`); monospace demoted to numerals only. Tokens/primitives rewritten in `app/globals.css` (pill buttons, solid hairlines, radius 18–24, .chip/.skel added). Map: `components/HeroMap.tsx` — extruded 3D slab (CSS perspective tilt + radar sweep; village sensor pulses + report packets village→hub via SMIL so motion survives OS reduce-motion — user's laptop had animations frozen by that setting; no float bob, every animation means something), pure server-rendered SVG+CSS (no canvas/rAF/client JS), geometry precomputed in `lib/map/maharashtra.json`; hero (greeting + one-line mission + CTA + map) sits at TOP of dashboard per user. TriageCard = clinical-report layout (user-supplied mock): 3 stacked cards — verdict (urgency banner w/ species line-icon + meta, serif disease name, sign-match info note, matching-sign chips w/ circled checks, 'View all N signs' toggle, large confidence ring + 'not a diagnosis' note) / what-to-do (numbered steps + species illustration + action note) / 'See full analysis' accordion (reasons + other candidates) — plus gold disclaimer strip. Urgency ladder v3: notifiable/zoonotic escalates to high only at confidence >= 0.4 (deaths always escalate; critical unchanged) + urgencyNote explainer in UI; confidence ring compact inline strip on mobile. ZERO EMOJI anywhere (user rule): `components/SpeciesIcon.tsx` professional silhouettes from game-icons.net (CC BY 3.0, credited in README) for all 7 species (used in wizard tiles, herd, recent reports, triage), SVG check/clock/camera/pin/alert icons replace glyphs; SPECIES constant no longer has emoji field (Douglas-Peucker-simplified state outline + projected village lat/lngs); `HeroTerrain.tsx` deleted. Perf: `lib/data/session.ts` = React cache()'d profile via `auth.getClaims()` (local JWT verify, no network — replaces per-page `getUser()`); `app/dashboard/loading.tsx` skeleton; optimistic active-tab state in `AppShell`. i18n: dashboard.* keys replaced (greeting/stats/quick actions/map) + landing.feat* ×3 locales. P3+ should reuse .chip/.skel/HeroMap and getSessionProfile(). |
| ✅ P3 Officer dashboard | Done | "P3: officer command centre — district map + live case queue" | Officer logs in (officer.raigad@pashusetu.dev / Officer@12345, district Pune) → Cases tab = command centre: 4 KPI cards (reports 24h, open cases, active clusters, median triage latency), Leaflet district map (OSM tiles warm-filtered, heat layer weighted by animals affected + circleMarker pins coloured by triage urgency, popups, fitBounds), live case queue (disease name from engine, urgency chip, species icon, sick/dead, relative time). Realtime INSERT on reports prepends new rows instantly (verified E2E: SQL insert while page open → row appeared + triage backfilled via delayed refetch). Confirm/Reject buttons → `officer_decide` RPC (security definer, role+district re-checked, idempotent upsert on unique cases.report_id, sets reports.status escalated/closed) with optimistic UI. CSV export of visible queue (BOM, quoted). Filters All/Needs review/Decided. RLS scopes everything to my_district(). | Migration 0004: case_status +'rejected', cases.disease_code/decided_by/decided_at (LABELING FLYWHEEL — engine prediction stored beside human verdict as training label; commented in SQL + UI footer note), lat/lng PostgREST computed columns on reports, reports added to supabase_realtime. Files: app/dashboard/cases/{page,OfficerClient,CaseMap}.tsx, lib/officer/types.ts, types/leaflet.heat.d.ts; deps leaflet + leaflet.heat (+@types/leaflet). Carto basemaps need an API key now — OSM tiles + CSS sepia filter instead. cases.* i18n rewritten ×3. Seeded 6 geo-tagged Pune demo reports (22222222-...-2222222222{01..06}) for map demo. Vet role can also decide; lab reads only. |
| ✅ P4 Multilingual (Bhashini) | Done | "P4: multilingual — localised advisories + Bhashini voice + zero leftover English" | Log in as test.farmer@pashusetu.dev (Pune) → switch to हिं/मरा: every screen, the report wizard and triage results re-render in that language. Open a triaged report (Triage tab) → "What to do now" shows a localised advisory (suspected disease + first-aid + zoonotic/notifiable note + consult-a-vet) with a **Listen** button. Officer (`/dashboard/cases`) → drawer is now fully localised (Report details, Reported signs, Reported by, Triage result, Awaiting/Confirmed/Rejected). Sign in on a fresh browser as a किसान who saved मरा → dashboard auto-renders Marathi. `POST /api/bhashini/tts` returns 501 with no key (graceful) / audio with a key; without any key, Listen falls back to browser SpeechSynthesis (works offline). | **Advisory is now rendered client-side from i18n (`components/triage/AdvisoryPanel.tsx`)** instead of the stored English string — it follows the active locale instantly and is fully offline; the engine still stores an English `advisory_text` for CSV/back-compat. **Deviation (improvement, not a gap):** advisories use the built-in en/hi/mr library rather than routing every string through Bhashini MT at read time — more robust, offline, and re-renders live on switch. Bhashini supplies the TTS voice + `translate` building block. New: `lib/bhashini.ts` (server-only `translate` + `synthesizeSpeech`, graceful not_configured), `app/api/bhashini/tts`, `components/triage/ListenButton.tsx` (+ browser SpeechSynthesis fallback so voice works with NO key), disease-specific advisory library `lib/advisory.ts` (en/hi/mr, keyed by 18 disease codes), shared `lib/triage/name.ts` (candidateName), `components/LocalePrefSync.tsx` (cookie ↔ `profiles.language_pref` reconciliation on dashboard mount). Removed ALL hardcoded English from `TriageClient` + `OfficerClient` drawers → new `common.*` keys; all 3 locale files extended (`triage.advisory`, `common.*`, `cases.photo/note/photoNote`) and kept in key parity. Updated `.env.example` (+ `!.env.example` in .gitignore) documenting `BHASHINI_USER_ID`/`BHASHINI_API_KEY`/`GROQ_API_KEY`/WhatsApp/Twilio. No migration; no edge-function change. |
| ✅ P5 Cluster detection + alerts | Done | "P5: outbreak cluster detection + district alerts (PostGIS + pg_cron + realtime)" | Officer (`officer.raigad@pashusetu.dev` / Officer@12345, district Pune) → **Cases** tab now shows an "Outbreak clusters" strip (FMD · 7 cases · 0.8 km) → **Alerts** tab shows a critical "संभावित प्रादुर्भाव क्लस्टर आढळला" banner + a live Leaflet cluster map (severity rings, radius circles) + the alert inbox with a "Mark read" action. Farmer (`test.farmer@pashusetu.dev`) → **Alerts** tab shows the same critical district alert (they can read alerts but NOT the officer cluster map — RLS keeps clusters officer-only). Test from scratch: run `supabase/seed_cluster.sql` (6 FMD reports near Shirur, Pune, fixed UUIDs) → detection auto-forms a 6–7 case cluster + 1 critical district alert ≤ a few seconds. | Migration `0005_clusters.sql` (applied live). **Detection = pure PostGIS, no edge fn.** `detect_clusters(window_h=72h, radius_m=5km, min_cases=3, district?)` groups same-suspected-disease reports by district into clusters (absorb-into-nearby-then-seed-new), computes centroid + max-member radius, and calls `create_cluster_alert(id)` ONCE per cluster (idempotent via `clusters.alert_created_at`). Messages stored as structured `message_json` (en/hi/mr + disease name + village + case_count) so the UI localises instantly. New `clusters` columns: member_ids, village, severity, alert_created_at, created_at; FK `clusters_disease_guess_fkey(code)` for PostgREST `diseases:` embed; computed lat/lng via `lat(c)/lng(c)`. Fires on: (1) realtime AFTER INSERT/UPDATE on `triage_results` (`trigger_cluster_detect`), (2) a `pg_cron` sweep every 15 min that also retires aged-out clusters (status→resolved). RLS rewritten: alerts select/update scoped to `my_district()` or admin; clusters scoped to vet/officer/lab+district or admin (farmers keep alerts only). `clusters`+`alerts` added to `supabase_realtime`. **Deviation (noted improvement):** "push to farmers in taluka" is delivered as an in-app Realtime district **alert** (all roles read their district's `alerts`), not SMS — the alert row carries a localised message, and the officer-exclusive cluster map lives on the Alerts tab. UI: `app/dashboard/alerts/{page,AlertsClient,ClusterMap}.tsx` (realtime, unread filter, mark-read/all, cluster banner+map), officer Cases strip in `OfficerClient.tsx`, `lib/alerts/types.ts`, `lib/clusters.ts`; `alerts.*` + `clusters.*` added to all 3 locale files (kept in key parity). Seed = `supabase/seed_cluster.sql` (fixed-UUID, idempotent). |
| ✅ P6 Case escalation + lab + vaccination | Done | `39c8ae9` + `5f4c912` (authored by Abdulla Cyclewala) | Officer (officer.raigad@pashusetu.dev / Officer@12345, Pune) → **Cases** → open the `-204` AI case (now `contained`): new Case card (status chip, assigned vet, escalated/contained/closed timestamps, officer note), **escalation block** (assign Dr. Aarti Patil, optional note, Mark contained / Mark closed / Reject), **Lab samples** with a scannable QR of the barcode (seeded `PS-A1B2C3D4E5` = resulted, and `PS-720A97D00F` made via "Create sample"), specimen, lab result + summary, chain-of-custody log, and an **audit trail** ("Case history"). "Mark contained" fires a localised (en/हिं/मरा) close-the-loop alert to the reporting farmer. Farmer (test.farmer@pashusetu.dev / Test@12345, Pune) → **Alerts** shows the personal "contained" alert beside the district cluster alert; **Herd** shows 2 animals with the FMD dose record, per-animal coverage-gap chips (Fully vaccinated / N gap) and a district coverage card (FMD 1 of 2 = 50% → "Gap 50%"). Journey proven end-to-end with live JWTs (service-role + officer/farmer tokens): case_assign_vet → case_create_sample (unique PS- barcode) → sample_set_status (collected→in_transit→received→resulted) → sample_set_result (positive) → case_set_status (contained → close-the-loop alert) → farmer RLS read. **Headless browser E2E (puppeteer/Chromium) — 27/27 PASS** against the live Vercel deploy: officer login, cases queue, case-detail modal (Lab samples/Case escalation/Chain of custody/Scan to track/View traceability/barcodes/Positive/Contained/assigned vet/custody actor/farmer-notified footer), the `/sample/PS-A1B2C3D4E5` public trace page (heading/barcode/chain/disease/Positive/disclaimer), farmer herd (Vaccination coverage/FMD/50%/Gap 50%) and farmer alerts (personal contained). `tsc` + `eslint` + `next build` clean; embedded `OFFICER_ROW_SELECT` resolves via PostgREST. | **Migration `0006_case_lab_vaccine.sql` applied live** — adds cases.escalated_at/contained_at/closed_at/notes, samples.collected_at/received_at/resulted_at/specimen_type/disease_code/notes/result_summary, alerts.user_id; new `case_events` audit table; RPCs case_assign_vet / case_set_status / case_create_sample / sample_set_status / sample_set_result / add_vaccination / vaccination_coverage / create_loop_alert / append_event; district-scoped RLS + realtime for cases/samples/case_events. **Fixes applied live (mirror them in the migration file):** `cases` stores `disease_code` (NOT `disease_guess`) — case_set_status + case_create_sample read `c.disease_code`/`v_case.disease_code`; every `append_event(...)` enum arg is cast `::text` (append_event takes text) else the RPC errors 42883; create_loop_alert is idempotent per user+message `type` (existence check, no unique index). **Seed `supabase/seed_p6.sql`** (idempotent, fixed UUIDs): vet `7c7c7c7c-…-01` (Dr. Aarti Patil, Pune), resulted sample `PS-A1B2C3D4E5` (swab, positive, custody_json), FMD vaccination, 2nd unvaccinated animal → Pune coverage 1/2 = 50%. `qrcode.react` added with `--legacy-peer-deps` (its peer range excludes React 19) — use `QRCodeSVG`. New SVG icons Flask/Syringe/ShieldCheck/ArrowRight; locale en/hi/mr kept in key parity (474 keys), no emoji. **Runtime i18n fix:** the P6 audit block referenced `cases.auditTitle`/`auditHint`/`auditEmpty` and rendered sample-status events via `cases.status.{collected,in_transit,received,resulted}` — these were missing and threw `MISSING_MESSAGE` at runtime (broke the case-detail render); added to all 3 locales (474 each). **QR now encodes a public track-and-trace URL (not the raw id):** the officer sample card's `QRCodeSVG` value is `<origin>/sample/<barcode>` and the card has a "View traceability" link. The public route `app/sample/[barcode]/page.tsx` (no auth) calls the `sample_trace(p_barcode)` RPC (security definer, granted to `anon`/`authenticated`, NON-PII — returns barcode, status, specimen, disease name en/hi/mr, lab result + summary, timestamps, case id/status, chain-of-custody) and renders mobile-first, localised (en/हिं/मरा) with the consult-a-vet disclaimer; unknown barcodes return `found:false` + "not found" page. Verified anonymously via REST: `PS-A1B2C3D4E5` and `PS-720A97D00F` resolve, unknown returns `found:false`. **Raigad restoration:** `seed_p6_raigad.sql` restores the complete post-relocation live journey on FMD report `a810…005`: confirmed/assigned Dr. Sana Shaikh → swab `PS-RAIGAD-FMD-01` → cold-chain custody → positive rRT-PCR → contained → localised farmer alert. Live verified: contained FMD case, 1 resulted sample, 7 audit events; anonymous `sample_trace('PS-RAIGAD-FMD-01')` returns the full non-PII journey. Note: the git `origin` remote was reset in the sandbox — re-add `git remote add origin https://github.com/abdullacyclewala-code/pashusetu.git` and push `main` to trigger the Vercel deploy. |
| ✅ P7 WhatsApp/voice farmer channel | Done | `372c2f7` + `b288466` + `dc366b6` + `0df73c2` + `3281f79` (authored by Abdulla Cyclewala) | **What it is — an honest in-app simulation of the WhatsApp flow, clearly NOT live WhatsApp automation.** *Farmer entry point (`test.farmer@pashusetu.dev`, Pune) → **WhatsApp** tab:* a **WhatsApp simulator** — tap a sample (en/hi/mr) or type how the animal looks, press **Send**, and a chat bubble replies with the **localised advisory** (Suspected disease, urgency, first-aid, notifiable note + the mandatory *"This is preliminary triage, not a diagnosis"*), while the **"What we understood"** panel shows Species/Signs/Sick·dead/Location. The message also creates a **real report** that lands on the officer's dashboard. A separate **"In real WhatsApp"** card (clearly badged **SIMULATION**) shows the PashuSetu number + an **Open WhatsApp** button, plus a note that the automatic reply needs the number on Meta's WhatsApp Business API. The farmer also sees **their own report history** with a source badge (In-app vs WhatsApp). *Officer receiving end (`officer.raigad@pashusetu.dev` / Officer@12345, Pune) → **WhatsApp** tab:* a **receiving monitor only** — **Live reports in your district** + the **Channel inbox** (inbound/outbound, phone, message, district, report id). **No simulator, no parsed panel** — the officer receives reports, they don't simulate farmers.  A message in Marathi (`गाय ताप तोंडात फोड लाळ 2 आजारी 1 मेले Shirur`) returns the fully localised reply (`लाळ्या खुरकूत (60%)`); a **guided button** flow sequences species → symptoms → counts → location → creates the report. **Verified with headless browser E2E (16/16 farmer + officer checks) + live JWT RLS checks:** officer reads only its district's `channel_messages`; the created report has `source='whatsapp'` and `status='triaged'`; `nearest_village(lat,lng)` reverse-geocodes a shared location to `Ranjangaon/Shirur/Pune`. The full pipeline runs via the real `/api/whatsapp/webhook` (mocked Meta payload) and the now-any-role-gated `/api/whatsapp/simulate`. `tsc` + `eslint` + `next build` clean. | **Migration `0007_channel.sql` applied live** — adds `reports.source` (check in app/whatsapp/ivr/iot), `channel_sessions` (per-phone multi-turn state), `channel_messages` (inbound/outbound officer inbox log, RLS district-scoped, on realtime), `nearest_village(lat,lng)` reverse-geocoder (granted to service_role/anon/authenticated). **Deviation (kept in §2 novelty framing):** default channel is **WhatsApp** (PS #8), with the WhatsApp Cloud API webhook as production ingress; the reply also attempts a Bhashini voice-note (falls back to text). There is **no IVR/phone-call build** this part — voice notes arrive as media IDs (ASR is a later stretch), and Web-Speech is used in-app. **WhatsApp send modes:** when `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` are set the reply POSTs to the Meta Graph API; when unset it's `stored` (persisted + shown in the simulator/inbox) so the loop is demoable with zero Meta config. **Design:** transport-agnostic channel core in `lib/channel/*` (parser en/hi/mr → canonical species/symptom/count/location; reply localised + disclaimer; farmer resolve-or-provision by phone; `ingest.ts` is THE shared pipeline used by both the webhook and the simulator, writing a *normal* `reports` row so triage→cluster→case runs unchanged). `lib/whatsapp.ts` normalises Meta webhooks + sends text/interactive/audio. New nav icon `WhatsAppIcon`; `nav.whatsapp`/`titles.whatsapp` + `whatsapp.*` namespace added, **539 keys, exact en/hi/mr parity, zero emoji**. `reports.source` is surfaced on the Cases queue so an officer can see a WhatsApp-origin report; `reports.reporter_id` links a WhatsApp report to the provisioned farmer so their own history shows on the farmer page. `app/dashboard/whatsapp/{page,WhatsAppClient}.tsx` dispatch by role (farmer simulator view vs officer receiving view); `components/shell/AppShell.tsx` nav exposes the WhatsApp tab to all roles. **Incoming WhatsApp number:** the farmer page shows +919004553021 (in-code default; override with `WHATSAPP_FROM_NUMBER` once a Meta Business-API number is provisioned). **16/16 headless browser E2E** (farmer + officer receiving-only) against local. **A WhatsApp report → officer map:** a typed message that names a village is forward-geocoded from the `villages` table (new `ewkbPointToLngLat` decodes the PostGIS EWKB point), so the report sets `geo` and **appears as a dot on the officer Cases district map** and feeds cluster detection — previously only messages with an explicit shared-location pin got a dot. |
| ✅ P8 Dairy early-warning | Done | `28cd6af` + `fix-ewkb` (edge-fn weather decode) | Officer/farmer → Alerts: “Tomorrow’s risk outlook” shows block risk zones and explainable dairy signals. Live SQL acceptance: 1 Sep heat-wave dip = `normal` after −0.816 kg weather adjustment; unexplained 3–4 Sep dip = `watch` → `field_verify` on day 2 with one idempotent alert; seeded Shirur report spike = next-day `high` risk (74/100). `GET /api/forecast` returns only the signed-in user's RLS-scoped district data. | Migration `0008_early_warning.sql` applied live: aggregate `milk_collections` hardening + `weather_daily`, audited `dairy_anomalies`, `district_risk_forecasts`; district RLS + Realtime. Anchor A detector uses same-weekday 12-week median, robust MAD, adverse heat/humidity/rain covariate adjustment, then requires residual < −2.5σ for 2 consecutive days. Alert is localised en/hi/mr and idempotent. Report early-warning uses block-level 28-day baseline + EWMA/Poisson-standardised spike score, combined with dairy evidence. `dairy-anomaly` Edge Function v1 deployed: protected nightly orchestrator fetches Open-Meteo covariates with timeout/partial-failure handling then calls one security-definer RPC; SQL pg_cron is the zero-dependency nightly fallback. UI: `EarlyWarningPanel` + Leaflet `RiskMap`; 558 locale keys in exact parity. Seed: `seed_p8.sql` (96 clean days + heat control + unexplained dip). `lint`, `tsc`, `next build` clean. Optional image classifier deliberately skipped. Before external Edge invocation, set `EARLY_WARNING_CRON_SECRET`; pg_cron detection already runs without it. **Fix:** `dairy-anomaly` Edge Function v1.1 — the Open-Meteo fetch previously read `villages.location?.coordinates`, but `villages` has no `location` column (only `geo`, returned as EWKB hex by PostgREST), so the weather fetch silently no-oped and live villages fell back to default heat priors. Added `ewkbToLngLat()` to decode the EWKB POINT from `villages.geo` and use `{lng,lat}` (verified: Shirur decodes to 18.8276, 74.3742 and produces a correct Open-Meteo URL). |
| ✅ Image model v2 | Done | `pending` | Report photo step runs a real 4.8 MB three-way ONNX model locally in the browser and presents normal-appearing, LSD-like, FMD-like, or inconclusive results plus a broad normal/abnormal screen. It never changes the symptom triage. | Trained on 3,240 usable images from Kaggle `devang03mgr/cattle-diseases-datasets` (dataset page: ODC Database Contents License 1.0); 4 images in 2 conflicting pHash groups quarantined and duplicate groups kept inside one split. Held-out test: 648 images, accuracy 0.855, balanced accuracy 0.862, macro OVR AUC 0.962; class F1: FMD 0.854, healthy 0.836, LSD 0.875. Product gate requires ≥0.75 probability and ≥0.20 margin, otherwise inconclusive. `MODEL_CARD_V2.md` explicitly documents weak original provenance, heterogeneous web images, illustrations/watermarks, possible uncaught augmentations, and that these are dataset-label metrics—not clinical validation. Other diseases remain unsupported. |
| ✅ P9 IoT telemetry + simulator | Done | `P9: IoT telemetry, digital twin simulator + automatic reporting` | Officer → Sensors → Reset demo → Run 7-day scenario. Three collars learn healthy baselines; heat-wave control produces zero anomalies; FMD-like days show fever/rumination/activity/milk deviations, create one herd-level report/day after 2 concurrent animals, run normal triage, and form a live cluster/alert. Direct ingest: `POST /api/ingest/telemetry` with `x-device-key`; retry the same `ingestId` → `duplicate:true`. | Rebased first onto user commits `4b8036f` + `70af2c9` without overwrite. Migration `0009_iot.sql` applied live: `devices`, idempotent `telemetry` (`device_id+ts` and `device_id+ingest_id`), explainable `iot_anomalies`, district/owner RLS + Realtime, `process_iot_telemetry` and restricted deterministic reset RPC. Production-shaped API validates UUID/time/ranges, hashes device credentials, rejects inactive devices, handles retries, and updates last_seen. Detection uses per-device trailing robust medians; requires fever + rumination drop + activity/milk drop and ≥2 concurrent village animals. Heat at 42°C with normal behaviour is explicitly suppressed. Verified live: control day 3/3 `normal, heat_control:true`; disease day concurrent 1→2 creates report→3 reuses it; exact retry `duplicate:true`; 3 sensor reports triaged and joined an active LSD-suspected cluster (5 members) with alert. **Farmer-owned flow correction (`0010_iot_farmer_privacy.sql`, applied live):** `/dashboard/iot` and its simulator are farmer/admin-only; the endpoint verifies all demo devices belong to the signed-in farmer. Farmer sees what the signal means, own device status/detections/private auto-reports, plus a clear manual-report action. **Farmer UI redesign:** replaced the engineering-style sensor console with a calm, human hierarchy: one herd-status answer first, three animal cards with plain-language state, a 3-step visual demo story, only two meaningful trends, a “what PashuSetu did” timeline, and privacy/safety explanation; technical IDs and raw metric grids are demoted. **Demo reliability fix:** simulation/reset now call farmer-authenticated, owner-checked SQL RPCs (`0011_farmer_sensor_demo_rpc.sql`) instead of depending on Vercel's service-role env; reset deletes anomaly references before reports. Live verified reset succeeds and run returns 21 points + 3-animal concurrent report. Raw devices, telemetry and anomalies are owner-only (admin exception); another farmer and the officer cannot read them. Sensor reports stay private from the officer until they are members of an active/confirmed district cluster; then the existing officer Cases + district Alerts surfaces receive the area signal. Verified live RLS: test farmer sees 3 devices/21 points/3 reports; Pune officer sees 0 devices/0 raw points and only the 3 IoT reports already promoted through a cluster. en/hi/mr parity retained. Seed `seed_p9.sql` registers three collars. MQTT is represented by the protocol-ready schema but broker bridge remains optional. Mandatory preliminary-triage disclaimer shown. `lint`, `tsc`, production build clean. |
| ✅ P10 Polish + demo assets | Done | `P10: demo timeline, judge script and pitch assets` | Run `supabase/seed_p10_demo.sql` (idempotent), then follow `DEMO.md`: officer Alerts milk moment → farmer Sensors heat-control/FMD-like scenario → farmer explainable triage → officer cluster/case/lab → Marathi WhatsApp. Open `assets/PashuSetu-SIH-Pitch.pptx` for the 6-slide pitch and `assets/pashusetu-architecture.svg` for the system visual. | Added a fixed 5-report Shirur FMD-style synthetic timeline with transparent `Synthetic SIH demo` provenance, explainable triage rows, PostGIS points, cluster detection and early-warning run; applied live and verified one idempotent cluster alert. Added a timed 4-minute script, preflight, recovery plan and acceptance checklist in `DEMO.md`. Added editable 6-slide OOXML pitch deck + reproducible generator and a standalone 1600×900 architecture SVG. Alerts risk panel now visibly says `Synthetic pilot data` in en/hi/mr so demo readings cannot be mistaken for live government/co-op data. **Panvel live-demo relocation:** migration `0012_panvel_demo_relocation.sql` applied live; preserves real/non-demo Pune users but removes test-farmer/known seeded Pune records, moves the same demo credentials to Khandagaon (AIKTC), Panvel, Raigad, relocates dairy/weather/sensors, and reseeds the FMD timeline around campus coordinates `19.0000386,73.1045685`. Report GPS now calls `nearest_village()` after the real browser fix and automatically fills village/taluka/district (still manually correctable), preventing coordinate/jurisdiction mismatch. Live verified: campus coordinates resolve 0 km to Khandagaon (AIKTC); farmer profile/device data is Raigad. **Presentation expansion:** officer login renamed in Supabase Auth to `officer.raigad@pashusetu.dev` (same password); migration `0013_raigad_officer_email.sql`. `seed_p10_raigad_visual.sql` adds synthetic MAST/Kalamboli, BRUC/New Panvel and LSD/Uran clusters beside the FMD/AIKTC cluster, for 4 active Raigad clusters and map pins in every urgency colour (live counts: critical 4, high 4, medium 3, low 3). Demo guide and all P8–P10 seed files now use Panvel/Raigad. **Map completeness fix (`0014_report_location_fallback.sql`, applied live):** reports with real GPS use the exact point; if GPS is denied but a registered village is present, offline sync resolves the village centroid so the officer still gets an explicitly approximate map dot. Existing no-geo reports were backfilled. Verified the farmer's poultry/weakness report `36569a93…` and later sheep report both have AIKTC coordinates `19.0000386,73.1045685`. **Overlapping-dot fix:** `CaseMap` now deterministically fans out reports sharing a village-centroid coordinate into a small display-only ring with leader lines (stored GPS/heat position unchanged), so poultry/sheep/other AIKTC reports are individually visible and clickable. The map now redraws when Realtime rows change instead of freezing its SSR snapshot. **Leaflet crash fix:** removed the unnecessary immediate `marker.bringToFront()` call, which raced SVG renderer attachment and threw `parentNode` undefined; leader lines are inserted before markers so natural layer order is safe. Candidate labels fall back to disease code instead of showing `undefined` for compact presentation seed rows. `lint`, `tsc`, production build clean. **Deviation:** no demo video was fabricated in code; record the final human narration/screens after the team transfers/validates this content in the current official SIH template. |

*(Tick ✅ + Status=Done when a Part passes Accept. Use 🟡 in-progress.)*

---

## 9. DEMO SCRIPT & JUDGE Q&A PREP

**60-sec pitch:** "126 cattle died across 25 Maharashtra districts in the 2022 LSD outbreak because no one connected the village reports in time. There's no 'ASHA worker' for animals. PashuSetu turns every farmer into a sensor — and goes one better: it reads the **milk**. A village's daily milk yield drops *before* FMD/LSD symptoms show, so we flag the field visit before anyone even calls. Farmers report offline or by voice in Marathi → explainable AI triage names the suspected disease → officials see a live heatmap — built to plug into Bharat Pashudhan and NADRES, not replace them."

**Demo arc:** (1) **milk moment** — village yield dips → auto "field-verify" flag before any report (2) **herd reports on itself** — simulator injects FMD → vitals diverge → auto-report + cluster alert, zero human input (3) offline report on phone → syncs (4) triage returns FMD + reasons (5) dashboard alert + heatmap lights up (6) case → lab sample → result → contained (7) Marathi voice/WhatsApp report lands live (8) forecast flags a high-risk block (9) cost/scalability line.

**Pre-empt these questions:**
- *"How is this different from NADRES/1962?"* → §1 table, live.
- *"What if the AI is wrong?"* → always "consult a vet"; officer confirm/reject is the safety net; never auto-replaces a vet.
- *"How do you get farmers to use it?"* → voice-first + regional language + offline + real incentive (faster vet response, vaccination alerts).
- *"Where does the milk data come from?"* → Mahanand co-op & private dairies already weigh daily village collection; we read aggregate yield, nothing individually identifiable.
- *"Data privacy?"* → location/phone only for area-alerting, anonymized on aggregate dashboards, DPDP Act 2023 aware.
- *"Training data?"* → rule engine from public ICAR/FAO/NADRES fact sheets first; officer confirm/reject = labeling flywheel for future ML.
- *"Isn't the IoT data fake?"* → the sensor layer is a **digital twin/emulator**: ingest, anomaly engine and alerting are production-identical, only the data source is simulated for the demo. Swap in real ear-tags/boluses (Allflex/SmaXtec or DIY ESP32+LoRa) publishing the same JSON = one config change. We never claim real hardware.

**Business model:** Phase 1 — free pilot with Maharashtra Animal Husbandry Dept. Phase 2 — B2G SaaS per-district to other states. Phase 3 — B2B: insurers (verified claims), dairy co-ops (herd monitoring), pharma (demand forecasting). Cost: "₹0 infra during hackathon; paisa-range per report at scale."

---

## 10. RISKS

| Risk | Mitigation |
|---|---|
| Supabase free tier pauses after 7 days idle | Ping weekly or upgrade before finale |
| WhatsApp/Twilio live-demo cost/setup | Free fallback: Web-Speech + Bhashini form demo |
| No real govt/dairy data access | Seed realistic Maharashtra data; still build CSV import + NADRS-format export for interop credibility |
| AI triage judged as black box | Rule-based + explainable; framed as decision-support, never diagnosis |
| Milk-signal judged as "unproven" | Show it as anomaly detection on a real, well-documented phenomenon (yield drop precedes FMD/LSD) — cite the mechanism, not a magic model |
| Simulated IoT judged as "fake" | Present as digital-twin/emulator with production-identical pipeline; never claim real hardware; show the swap path (§9 Q&A) |
| Scope creep | One Part at a time, enforced by §7/§8 |
