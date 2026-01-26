# Database Schema and API Contract

## Database (Vercel Postgres)

### users
- id (uuid, pk)
- entra_oid (text, unique, not null)
- email (text, not null)
- name (text)
- role (text, not null) // "consultant" | "admin"
- created_at (timestamp, default now)

### customers
- id (uuid, pk)
- name (text, not null)
- created_by (uuid, fk -> users.id)
- created_at (timestamp, default now)

### uploads
- id (uuid, pk)
- customer_id (uuid, fk -> customers.id)
- blob_url (text, not null)
- original_filename (text, not null)
- parsed_at (timestamp)
- status (text, not null) // "uploaded" | "parsed" | "error"
- error_message (text)
- created_at (timestamp, default now)

### applications
- id (uuid, pk)
- customer_id (uuid, fk -> customers.id)
- name (text, not null)
- assessment_scope (text)
- data_center (text)
- environment (text)
- server (text)
- treatment (text)
- solution (text)
- other_solution (text)
- created_at (timestamp, default now)
- updated_at (timestamp, default now)

### app_questions
- application_id (uuid, pk, fk -> applications.id)
- answers_json (jsonb, not null)
- updated_at (timestamp, default now)

### strategy_questions
- application_id (uuid, pk, fk -> applications.id)
- answers_json (jsonb, not null)
- scores_json (jsonb)
- updated_at (timestamp, default now)

### thresholds
- id (uuid, pk)
- scope (text, not null) // "global" | "customer"
- customer_id (uuid, nullable, fk -> customers.id)
- config_json (jsonb, not null)
- updated_at (timestamp, default now)

## API Contract (Next.js Routes)

### Auth
- Auth.js with Entra ID (single-tenant)
- JWT session includes user id + role

### Customers
- GET /api/customers
  - Returns customers visible to the user
- POST /api/customers
  - Body: { name }
  - Creates a new customer

### Uploads
- POST /api/uploads
  - Returns signed upload URL for Vercel Blob
  - Body: { customerId, filename, contentType }
- POST /api/uploads/parse
  - Body: { uploadId }
  - Parses XLSX, upserts applications, updates upload status

### Applications
- GET /api/customers/:customerId/apps
  - Returns app list with completion status
- GET /api/apps/:appId
  - Returns full app detail

### App Questions
- GET /api/apps/:appId/app-questions
  - Returns saved answers if present
- POST /api/apps/:appId/app-questions
  - Body: { answersJson }
  - Saves answers

### Strategy Questions
- GET /api/apps/:appId/strategy-questions
  - Returns saved answers + scores
- POST /api/apps/:appId/strategy-questions
  - Body: { answersJson, scoresJson }
  - Saves answers + computed scores

### Thresholds (Admin)
- GET /api/thresholds
  - Returns global thresholds
- POST /api/thresholds
  - Body: { configJson }
  - Updates thresholds

### Exports
- GET /api/exports/completed?customerId=...
  - Generates XLSX (template-based) and returns download URL
- GET /api/exports/app-questions?customerId=...
  - Generates CSV and returns download URL

## Notes on Parity
- XLSX parsing must preserve required/optional columns and dedupe rules from `main.js`.
- Exports must match existing templates and column order exactly.
- All existing scoring/logic from `strategy-questions.js` should be reused without changes where possible.

## Checklist (Milestones for AI Agent)
- [ ] M2: Data model + core APIs complete.
- [ ] M3: Upload + parse pipeline complete.
- [ ] M4: Questionnaire UI port complete.
- [ ] M5: Export parity complete.
- [ ] M6: Admin + thresholds complete.
