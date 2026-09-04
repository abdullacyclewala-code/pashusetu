# PashuSetu — 4-minute judge demo

> All outbreak, milk and sensor readings shown in this demo are clearly labelled synthetic pilot data. PashuSetu provides preliminary triage, not a diagnosis; a veterinarian remains the decision-maker.

## Before presenting (2 minutes)

1. Open `https://pashusetu-rho.vercel.app` once on laptop and phone so the PWA shell is cached.
2. Keep two browser profiles open:
   - Farmer: `test.farmer@pashusetu.dev` / `Test@12345`
   - Officer: `officer.raigad@pashusetu.dev` / `Officer@12345`
3. Farmer → Sensors → **Reset demo**, then leave the page ready.
4. Officer → Alerts; confirm the risk outlook, dairy signal and cluster card load.
5. Never claim seeded data is live government or cooperative data.

## Demo story

### 0:00–0:35 — The milk speaks first

Officer → **Alerts**.

Say: “Before a farmer reports visible symptoms, a village dairy can show a shared milk-yield dip. PashuSetu removes weekly seasonality and heat, humidity and rainfall effects. Only an unexplained dip below −2.5 sigma for two consecutive days asks an officer to field-verify. This is a signal score, not disease probability.”

Show: AIKTC / Khandagaon dairy card, expected vs observed yield, risk-zone map.

### 0:35–1:15 — The herd reports itself

Farmer → **Sensors** → **Play the demo**.

Say: “These are three simulated collars using the same JSON contract as real hardware. Healthy days establish each animal’s baseline. A 42°C heat-wave control creates no alert. Then fever, rumination and activity shift together across animals.”

Show: herd status, animal cards, temperature/rumination trends, private sensor report.

### 1:15–1:55 — Farmer privacy and choice

Say: “Raw readings stay with the farmer; other farmers and the officer cannot see them. The farmer can report visible symptoms immediately. A sensor report reaches the officer only when matching signals form a serious district pattern.”

Farmer → **Report**. If time permits: submit cattle → fever + mouth blisters + drooling + lameness.

### 1:55–2:30 — Explainable triage

Farmer → **Triage**.

Show: FMD differential, matched and missed signs, confidence and reasons.

Say: “The system shows why, not only what. Every advisory says preliminary triage, not a diagnosis, and asks the farmer to consult a veterinarian.”

### 2:30–3:20 — District action

Officer → **Cases**.

Show: district map, report source, queue, confirm/reject, case escalation and sample QR.

Say: “The officer sees only their district. Confirmation or rejection becomes a labelled example for future model improvement. A confirmed case moves through vet assignment, sample custody, lab result and containment.”

### 3:20–3:50 — Last-mile channel

Farmer → **WhatsApp** and send the Marathi sample.

Say: “The same report pipeline works without the app. Marathi text becomes a normal report, triage and officer map point. The in-app screen is an honest simulator until a Meta Business number is provisioned.”

### 3:50–4:00 — Close

“PashuSetu is the missing last-mile sensor layer for NADRES and Bharat Pashudhan: offline farmer reporting, explainable triage, dairy and wearable early warning, and district action—with the veterinarian always in control.”

## Recovery plan

- **No internet:** demonstrate cached farmer report entry and queued sync badge.
- **Map tiles fail:** continue with the report/cluster lists; data and detection remain available.
- **Sensor demo error:** press Reset once, refresh, then Play. Do not repeatedly click while it is running.
- **Voice unavailable:** advisory text remains fully localised and offline.
- **WhatsApp credentials absent:** use the clearly labelled in-app simulator.

## Acceptance checklist

- [ ] Farmer can submit three offline reports and sync exactly three rows.
- [ ] FMD signs return an explainable top differential and disclaimer.
- [ ] Heat-wave dairy dip remains normal; unexplained two-day dip field-verifies.
- [ ] Sensor heat control creates no anomaly; disease scenario creates a private report.
- [ ] Other farmer/officer cannot read raw sensor data.
- [ ] District cluster alert appears to the Raigad officer.
- [ ] Officer can confirm/reject and export CSV.
- [ ] Sample QR opens anonymous non-PII traceability.
- [ ] Marathi/Hindi/English switches leave no English-only UI.
