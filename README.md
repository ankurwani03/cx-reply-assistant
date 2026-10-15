# Datastraw AI-Powered CX Reply Assistant

A React + TypeScript customer-support workspace using Supabase Auth/PostgreSQL/Edge Functions and OpenRouter for server-side AI reply generation. Sample brands, customers, orders, and policies are fictional.

## Scope

Implements Part 1 of the Datastraw assessment: conversation history, customer/agent demonstration modes, multi-brand knowledge management, brand-filtered retrieval, AI draft generation, editing, approval, sending, manual replies, and audit records. It does not implement assessment Parts 2–4 or external email/WhatsApp delivery.

## Prerequisites

- Node.js LTS and npm
- Git
- Docker Desktop or another Docker engine for local Supabase
- Supabase CLI
- Supabase project for hosted deployment
- OpenRouter account/API key for live AI generation
- GitHub and Vercel accounts for deployment

## Local installation

```bash
git clone YOUR_GITHUB_REPOSITORY_URL cx-reply-assistant
cd cx-reply-assistant
npm ci
cp .env.example .env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` after starting local Supabase. Do not place private credentials in Vite variables.

Start local services:

```bash
supabase start
supabase db reset
```

Copy the API URL and anon key from `supabase status` to `.env`, then run:

```bash
npm run dev
```

The local app is available at `http://localhost:5173`.

## Create a first administrator

1. Use the local Supabase Studio at `http://localhost:54323` or the hosted Supabase dashboard.
2. Create an Auth user with an email/password you control.
3. Copy the user's UUID from the Auth users table.
4. Use the SQL editor as project administrator to assign brand memberships. For the seeded local brands:

```sql
insert into public.brand_memberships (brand_id, user_id, role)
values
  ('10000000-0000-4000-8000-000000000001', 'YOUR_AUTH_USER_UUID', 'admin'),
  ('10000000-0000-4000-8000-000000000002', 'YOUR_AUTH_USER_UUID', 'admin')
on conflict (brand_id, user_id) do update set role = excluded.role;
```

Replace `YOUR_AUTH_USER_UUID` with the actual Auth UUID. Never expose an admin bootstrap endpoint or commit a real UUID/password.

## Configure OpenRouter

Set the private values as Edge Function secrets:

```bash
supabase secrets set OPENROUTER_API_KEY=YOUR_PRIVATE_KEY
supabase secrets set OPENROUTER_MODEL=openai/gpt-4o-mini
supabase secrets set OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
supabase secrets set AI_REQUEST_TIMEOUT_MS=20000
supabase secrets set AI_MAX_OUTPUT_TOKENS=350
supabase secrets set AI_MAX_RETRIES=1
```

Model availability and pricing change. Confirm the model ID in the OpenRouter model catalog before use. If no key is configured or the provider fails, the app records a cautious fallback and the agent can still send a manual response.

## Apply migrations and seed data

Local reset applies all migrations and `supabase/seed.sql`:

```bash
supabase db reset
```

For a hosted project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Review migrations before production changes. Do not run local destructive reset commands against production.

## Deploy Edge Functions

```bash
supabase functions deploy send-message
supabase functions deploy manage-knowledge
supabase functions deploy generate-reply
supabase functions deploy manage-draft
```

Set `APP_ORIGIN` to the exact deployed frontend origin in function secrets/config before production use. Keep `SUPABASE_SERVICE_ROLE_KEY` available only to the trusted Edge Function runtime. Supabase normally provides service-role environment values in its function runtime; verify that configuration in your project.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm run preview
```

`tests/security/schema-invariants.sql` can be run with `psql` against the local database, for example:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f tests/security/schema-invariants.sql
```

Automated unit tests validate input schemas. Database RLS and end-to-end behavior require a running Supabase instance and configured Auth users. Report actual command results; do not infer passing checks.

## GitHub

```bash
git init
git add .
git commit -m "Build AI-powered CX reply assistant"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

If the remote already contains commits, fetch and reconcile before pushing.

## Vercel deployment

1. Import the repository in Vercel and select Vite.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment settings.
3. Deploy the frontend.
4. Configure Supabase Auth site URL and allowed redirect URLs to the Vercel domain.
5. Set the OpenRouter key and AI configuration as Supabase function secrets, not Vercel frontend variables.
6. Deploy the Edge Functions.
7. Sign in with an invited test user and run the smoke checklist below.

## Smoke checklist

- Sign in and verify only authorized brands appear.
- Open a seeded conversation and inspect order/customer context.
- Send a customer message, switch to Agent mode, generate a reply and inspect the retrieved evidence.
- Edit, save, approve and send the draft; confirm the final text appears in the thread.
- Send a manual reply with AI provider configuration removed in a local test environment.
- Change a policy and regenerate; confirm the changed policy is used.
- Sign in as a user who has membership in only one brand and verify access to the other brand is denied.

## API and architecture docs

- `docs/api.md`
- `docs/security.md`
- `docs/requirements-traceability.md`

## Troubleshooting

- **Supabase configuration screen:** `.env` is missing project URL/key or still contains placeholders.
- **No conversations:** run `supabase db reset` locally and assign the signed-in user a membership in a seeded brand.
- **Permission denied:** verify membership and RLS; never disable RLS as a workaround.
- **AI fallback shown:** check Edge Function logs and OpenRouter secret/model ID. Manual replies remain available.
- **Edge Function returns unauthorized:** ensure the frontend session is valid and the request includes the access token.
- **CORS issue:** set `APP_ORIGIN` to the exact app origin and redeploy the function.
- **Seed conflict:** inspect the local DB state; `supabase db reset` is destructive to local data only.

## Known limitations requiring verification or hardening before broad production use

- The Customer/Agent toggle is a demonstration UI; both sides require an authenticated brand member. It is not a real public customer portal.
- Keyword relevance scoring is intentionally simple for a small assessment knowledge base.
- Cost estimation depends on reliable provider pricing configuration; usage fields are persisted when returned.
- Add edge-level rate limiting and review retention/PII policy before production-scale use.
- Run database policy tests, browser E2E tests, live provider smoke tests, and deployment smoke tests before calling the project fully verified.
