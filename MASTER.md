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
| ✅ UI redesign (user-ordered, not a Part) | Done | "UI: warm premium redesign + Maharashtra map hero + perf" + "UI: 3D map hero on top + triage hierarchy" | Landing + dashboard show live Maharashtra SVG map (15 pilot villages pulsing, arcs → Mumbai hub, 1 alert village); dashboard is personalized (time-of-day greeting, role/village chips, live counts, quick actions); nav tab switches paint instantly (skeleton). Verified mobile 390×844 + desktop 1440×900 screenshots, zero console errors. | Supersedes the original index.html mock look (user rejected it). Fonts: Fraunces + Instrument Sans via next/font (`app/layout.tsx`); monospace demoted to numerals only. Tokens/primitives rewritten in `app/globals.css` (pill buttons, solid hairlines, radius 18–24, .chip/.skel added). Map: `components/HeroMap.tsx` — extruded 3D slab (CSS perspective tilt + radar sweep; village sensor pulses + report packets village→hub via SMIL so motion survives OS reduce-motion — user's laptop had animations frozen by that setting; no float bob, every animation means something), pure server-rendered SVG+CSS (no canvas/rAF/client JS), geometry precomputed in `lib/map/maharashtra.json`; hero (greeting + one-line mission + CTA + map) sits at TOP of dashboard per user. TriageCard = clinical-report layout (user-supplied mock): 3 stacked cards — verdict (urgency banner w/ species line-icon + meta, serif disease name, sign-match info note, matching-sign chips w/ circled checks, 'View all N signs' toggle, large confidence ring + 'not a diagnosis' note) / what-to-do (numbered steps + species illustration + action note) / 'See full analysis' accordion (reasons + other candidates) — plus gold disclaimer strip. ZERO EMOJI anywhere (user rule): `components/SpeciesIcon.tsx` line icons for all 7 species (used in wizard tiles, herd, recent reports, triage), SVG check/clock/camera/pin/alert icons replace glyphs; SPECIES constant no longer has emoji field (Douglas-Peucker-simplified state outline + projected village lat/lngs); `HeroTerrain.tsx` deleted. Perf: `lib/data/session.ts` = React cache()'d profile via `auth.getClaims()` (local JWT verify, no network — replaces per-page `getUser()`); `app/dashboard/loading.tsx` skeleton; optimistic active-tab state in `AppShell`. i18n: dashboard.* keys replaced (greeting/stats/quick actions/map) + landing.feat* ×3 locales. P3+ should reuse .chip/.skel/HeroMap and getSessionProfile(). |
| ☐ P3 Officer dashboard | Not started | — | — | — |
| ☐ P4 Multilingual (Bhashini) | Not started | — | — | — |
| ☐ P5 Cluster detection + alerts | Not started | — | — | — |
| ☐ P6 Case/lab/vaccination | Not started | — | — | — |
| ☐ P7 WhatsApp/IVR channel | Not started | — | — | — |
| ☐ P8 Dairy early-warning | Not started | — | — | — |
| ☐ P9 IoT telemetry + simulator | Not started | — | — | — |
| ☐ P10 Polish + demo assets | Not started | — | — | — |

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
