# Hot Load Check-In

Mobile-first internal app for replacing a manual truck paperwork workflow with:

- one or more image uploads
- AI extraction into structured JSON
- user review and edits with low-confidence highlights
- per-truck Excel generation
- master Excel log export generated from Postgres
- email delivery with Excel plus source images attached

## 1. File Structure

```text
.
|-- app
|   |-- api
|   |   |-- check-ins
|   |   |   |-- [id]
|   |   |   |   `-- route.ts
|   |   |   |-- extract
|   |   |   |   `-- route.ts
|   |   |   |-- master-export
|   |   |   |   `-- route.ts
|   |   |   |-- recent
|   |   |   |   `-- route.ts
|   |   |   `-- submit
|   |   |       `-- route.ts
|   |-- globals.css
|   |-- layout.tsx
|   |-- page.tsx
|   |-- dashboard
|   |   `-- page.tsx
|   `-- recovery
|       `-- page.tsx
|-- components
|   |-- check-in
|   |   |-- field-row.tsx
|   |   |-- hot-load-check-in-app.tsx
|   |   |-- image-picker.tsx
|   |   |-- review-form.tsx
|   |   `-- summary-card.tsx
|   `-- dashboard
|       |-- avg-by-material-chart.tsx
|       |-- avg-by-vendor-chart.tsx
|       |-- distribution-chart.tsx
|       |-- filter-bar.tsx
|       |-- kpi-card.tsx
|       |-- problem-loads-table.tsx
|       |-- time-trend-chart.tsx
|       `-- top-slow-loads-table.tsx
|-- lib
|   |-- ai
|   |   `-- extract-check-in.ts
|   |-- check-ins
|   |   |-- constants.ts
|   |   |-- repository.ts
|   |   |-- schema.ts
|   |   |-- storage.ts
|   |   |-- submission.ts
|   |   `-- types.ts
|   |-- email
|   |   `-- send-check-in-email.ts
|   |-- dashboard
|   |   |-- metrics.ts
|   |   |-- queries.ts
|   |   `-- types.ts
|   |-- date-time.ts
|   |-- excel
|   |   `-- check-in-workbooks.ts
|   |-- supabase
|   |   `-- admin.ts
|   |-- env.ts
|   `-- utils.ts
|-- supabase
|   `-- schema.sql
|-- scripts
|   |-- check-openai-integration.mjs
|   |-- check-supabase-integration.mjs
|   |-- generate-excel-samples.ts
|   `-- load-env.mjs
`-- .env.example
```

## 2. Database Schema SQL

The full schema lives in [supabase/schema.sql](/C:/Users/carte/CodeProjects/Gerdau/supabase/schema.sql).

Highlights:

- `check_ins`: draft and submitted records, extracted values, confidence maps, submission metadata
- review and downstream workflow state: `review_status`, `submission_status`, `export_status`, `email_status`
- operator recovery data: `error_message`, `submitted_at`, `manually_edited_fields`
- `check_in_images`: one-to-many image metadata for each check-in
- private storage bucket: `hot-load-check-ins`
- update trigger: keeps `updated_at` fresh

Apply the schema in Supabase SQL Editor, then set the matching environment variables from [.env.example](/C:/Users/carte/CodeProjects/Gerdau/.env.example).

## 3. API Routes

- `POST /api/check-ins/extract`
  Receives multipart images, uploads them to Supabase Storage, runs OpenAI vision extraction, stores a draft record, and returns extracted fields plus confidence metadata.
- `GET /api/check-ins/[id]`
  Loads an existing draft or submitted record with images and review flags.
- `GET /api/check-ins/master-export`
  Generates a fresh master workbook directly from submitted Postgres records with no stored master file mutation.
- `GET /api/check-ins/[id]/workbook`
  Downloads the individual per-truck workbook for a submitted check-in. The route reuses the stored workbook when available and regenerates it from the submitted Postgres record when storage is missing.
- `POST /api/check-ins/submit`
  Validates required fields, generates the per-truck workbook, stores it, records the master export route, sends email with attachments, and finalizes the check-in.
- `GET /api/check-ins/recent`
  Returns a minimal recovery payload for recent check-ins with workflow statuses and the latest error message.

## 4. React Screen Components

- [app/page.tsx](/C:/Users/carte/CodeProjects/Gerdau/app/page.tsx)
  The web-first shell and hero.
- [components/check-in/hot-load-check-in-app.tsx](/C:/Users/carte/CodeProjects/Gerdau/components/check-in/hot-load-check-in-app.tsx)
  Client-side workflow state for upload, extraction, review, and submit.
- [components/check-in/image-picker.tsx](/C:/Users/carte/CodeProjects/Gerdau/components/check-in/image-picker.tsx)
  Mobile-friendly multi-image capture and preview UI.
- [components/check-in/review-form.tsx](/C:/Users/carte/CodeProjects/Gerdau/components/check-in/review-form.tsx)
  Required-field review, workflow status, recovery messaging, and sticky submit action.
- [components/check-in/field-row.tsx](/C:/Users/carte/CodeProjects/Gerdau/components/check-in/field-row.tsx)
  Individual field rendering with missing, low-confidence, and manual-edit styling.
- [components/check-in/summary-card.tsx](/C:/Users/carte/CodeProjects/Gerdau/components/check-in/summary-card.tsx)
  Workflow, status, and completion summaries.

## 5. AI Extraction Service

The extraction service lives in [lib/ai/extract-check-in.ts](/C:/Users/carte/CodeProjects/Gerdau/lib/ai/extract-check-in.ts).

Behavior:

- sends all uploaded images to OpenAI in one request
- requests structured output for every required field
- returns `value`, `confidence`, and `rationale` per field
- stores both normalized field values and raw AI output
- leaves uncertain fields blank instead of guessing

## 6. Excel Generation Logic

The Excel service lives in [lib/excel/check-in-workbooks.ts](/C:/Users/carte/CodeProjects/Gerdau/lib/excel/check-in-workbooks.ts).

Behavior:

- per-truck workbook: one sheet, one header row, one data row
- master workbook: same columns, generated fresh from submitted DB records on demand
- no download/overwrite of an existing master file
- race conditions avoided because submit no longer mutates shared workbook state

## 7. Email Service

The email adapter lives in [lib/email/send-check-in-email.ts](/C:/Users/carte/CodeProjects/Gerdau/lib/email/send-check-in-email.ts).

Supported delivery:

- Resend when `RESEND_API_KEY` is present
- SMTP when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are configured

Email output:

- subject: `Truck Check-In – [Ticket #] – [Vendor]`
- HTML + text summary body
- attachments: Excel export plus all uploaded images

## 8. Step-by-Step Build Order

1. Create the Next.js app shell and mobile-first UI.
2. Add the shared check-in field model and validation rules.
3. Create the Supabase SQL schema and storage bucket.
4. Build the draft upload route and save images into Storage.
5. Add OpenAI extraction with structured JSON output and confidence scores.
6. Render extracted fields in a review form and block submit when required fields are missing.
7. Generate the per-truck Excel file on submit.
8. Generate the master workbook from submitted DB records when requested.
9. Send the summary email with Excel and image attachments.
10. Persist submission status and export metadata back to Supabase.

## Local Setup

1. Copy [.env.example](/C:/Users/carte/CodeProjects/Gerdau/.env.example) to `.env.local`.
2. Run the SQL in [supabase/schema.sql](/C:/Users/carte/CodeProjects/Gerdau/supabase/schema.sql).
   The current schema includes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements, so it also works as a migration for existing V1 databases.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. If `localhost:3000` is already tied up in your browser or another project, use the dedicated port:

```bash
npm run dev:3001
```

Main routes during development:

- App: [http://localhost:3001/](http://localhost:3001/)
- Dashboard: [http://localhost:3001/dashboard](http://localhost:3001/dashboard)
- Recovery: [http://localhost:3001/recovery](http://localhost:3001/recovery)

There is also now a visible `Open Dashboard` button on the home page hero.

## Test And Verification Commands

```bash
npm test
npm run lint
npm run build
```

Optional live integration checks:

```bash
npm run integration:supabase
npm run integration:openai
```

These two integration commands are opt-in and meant for local environment verification against your real Supabase project and OpenAI credentials.

To regenerate the sample Excel files:

```bash
npx tsx scripts/generate-excel-samples.ts
```

## Happy Path

1. Matt captures or uploads one or more images on the phone.
2. `POST /api/check-ins/extract` saves a draft, uploads images to Supabase Storage, runs OpenAI extraction, and marks the record `review_status = ready`.
3. The review screen groups fields into ticket info, vendor/material/load, truck/vehicle, times, and comments/employee.
4. Missing fields show in red, low-confidence fields show in amber, and manual edits show in teal.
5. `POST /api/check-ins/submit` validates every required field, saves the approved values to Postgres, marks the row submitted, and then runs export and email steps.
6. The per-truck Excel file is stored in Supabase Storage, and the email is sent with the workbook plus images attached.
7. The master export remains DB-driven and is generated fresh from submitted Postgres records on demand.

## Data Normalization Standard

One shared helper layer now standardizes quantity, date, time, timezone, and duration handling in [lib/date-time.ts](/C:/Users/carte/CodeProjects/Gerdau/lib/date-time.ts) and [lib/check-ins/schema.ts](/C:/Users/carte/CodeProjects/Gerdau/lib/check-ins/schema.ts).

- Quantity accepts commas and optional `lb` / `lbs`, normalizes before validation, and exports as formatted uppercase `LB`.
- Date display is standardized to `M/D/YYYY`.
- Time display is standardized to `h:mm AM/PM`.
- Datetime display is standardized to `M/D/YYYY h:mm AM/PM`.
- Dallas local time is explicit everywhere with `America/Chicago`.
- Time on site is computed server-side from normalized time values and reused in Excel and dashboard metrics.

## Failure Path

- Validation failure:
  The submit API returns exact `fieldErrors` and the UI highlights each field.
- Duplicate or double-tap submit:
  The server marks `submission_status = processing` and rejects parallel submit attempts for the same record.
- Export failure:
  The approved record stays saved in Postgres with `status = submitted`, `submission_status = failed`, and `export_status = failed`. Retrying submit reruns the export step.
- Email failure:
  The approved record and export stay saved with `email_status = failed`. Retrying submit reruns only the email step.
- Master export failure:
  The source of truth is still Postgres, so the operator can retry the DB-generated master export without touching submitted records.

## Manual QA Checklist

1. Start the app with `npm run dev:3001`.
2. Upload one paperwork image and confirm a new draft row appears in `check_ins`.
3. Confirm linked rows appear in `check_in_images`.
4. Verify the UI shows `Extraction complete` and loads the grouped review form.
5. Clear a required field and confirm submit is blocked with an exact field-level error.
6. Re-enter the field, confirm the sticky action changes back to a submit-ready state, and submit successfully.
7. Confirm the row shows `status = submitted`, `review_status = reviewed`, `submission_status = succeeded`, `export_status = succeeded`, and `email_status = succeeded`.
8. Download the master export and confirm it builds from submitted Postgres rows.
9. Visit `/recovery` and confirm the recent check-in shows the latest statuses, `error_message`, and `submitted_at`.
10. Use `Download Sheet` from the dashboard tables or `Download Check-In Sheet` from `/recovery` to open the individual workbook for a submitted record.
10. If you want to exercise failure recovery, temporarily break email or export configuration, submit once, and confirm the approved row stays saved while the failed step is marked clearly for retry.

## Individual Workbook Downloads

Users can download the per-check-in Excel workbook from:

- `/dashboard` via the `Download Sheet` action in `Top Slow Loads`
- `/dashboard` via the `Download Sheet` action in `Problem Loads`
- `/recovery` via the `Download Check-In Sheet` action on submitted records

The download route is `GET /api/check-ins/[id]/workbook`. It serves the stored workbook when available and regenerates the workbook from the submitted Postgres record when the stored file is missing.

## Upload / Extract Troubleshooting

If `POST /api/check-ins/extract` fails, check the browser message first and then the server logs. The extract route now logs these steps in order:

- `request_received`
- `configuration_check_success`
- `file_parse_start` / `file_parse_success`
- `draft_insert_start` / `draft_insert_success`
- `storage_upload_start` / `storage_upload_success`
- `openai_call_start` / `openai_call_success`
- `final_update_start` / `final_update_success`

Common causes:

- `NEXT_PUBLIC_SUPABASE_URL` host does not match the project ref in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` is missing or invalid for server-side DB and Storage writes
- `CHECKIN_STORAGE_BUCKET` is not exactly `hot-load-check-ins`
- `OPENAI_API_KEY` or `OPENAI_MODEL` is missing or invalid

Expected environment names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CHECKIN_STORAGE_BUCKET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Failure behavior:

- storage upload failure returns a specific `image_upload` error
- OpenAI failure keeps the draft and image rows, marks extraction as failed, and returns a retryable `extraction` error
- final save failure keeps the draft and image rows and returns a retryable `final_update` error
- schema drift failures now call out the missing column directly and tell the operator to run [supabase/schema.sql](/C:/Users/carte/CodeProjects/Gerdau/supabase/schema.sql)

## Review / Submit Notes

- `manually_edited_fields` stores which values Matt changed during review.
- `review_status` shows whether the draft is still waiting on review or has been reviewed.
- `submission_status`, `export_status`, and `email_status` track each submit step independently.
- `error_message` stores the latest recoverable workflow failure for operator visibility and support.

## Recovery Steps

Failed export:

1. Open `/recovery` or query `GET /api/check-ins/recent`.
2. Confirm the row is still `status = submitted` with `export_status = failed`.
3. Retry submit from the review screen.
4. The app reuses the approved row and reruns only the export step.

Failed email:

1. Open `/recovery` or query `GET /api/check-ins/recent`.
2. Confirm the row is still `status = submitted` with `email_status = failed`.
3. Retry submit from the review screen.
4. The app reuses the approved row and saved workbook, then reruns only the email step.

Schema drift or missing columns:

1. Run the SQL in [supabase/schema.sql](/C:/Users/carte/CodeProjects/Gerdau/supabase/schema.sql) against the current Supabase project.
2. Retry extraction or submit after the schema update is complete.

## Notes

- V1 intentionally has no auth, so deploy only to an internal network or protected environment.
- The database is the source of truth; the master Excel file is an operational export.
- The master export is generated fresh from Postgres via `GET /api/check-ins/master-export`, so there is no shared workbook overwrite path and no submission-time race condition.
