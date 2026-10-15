# Requirements traceability

Status legend: `Implemented` means code exists; `Verified` requires the specified automated/runtime check to pass. Do not infer verification from file presence.

| ID | Requirement | Implementation | Test / verification | Initial status |
|---|---|---|---|---|
| C01 | Conversation list and details | `src/features/conversations/ConversationsPage.tsx`, `src/services/api.ts` | Authenticated browser smoke test | Implemented, runtime pending |
| C02 | Customer/agent mode switch | `ConversationsPage.tsx` | E2E send in each mode | Implemented, runtime pending |
| C03 | Persist and display messages | `send-message`, `messages` table | Edge function integration test | Implemented, DB pending |
| C04 | Multiple exchanges and manual reply | Conversation composer | E2E multi-turn workflow | Implemented, runtime pending |
| C05 | Brand-scoped KB CRUD | `KnowledgePage.tsx`, `knowledge_entries`, `manage-knowledge` | CRUD with two brands | Implemented, runtime pending |
| C06 | Relevant knowledge retrieval | `generate-reply/index.ts` | Same-brand and cross-brand test | Implemented, runtime pending |
| C07 | OpenRouter generation | `generate-reply/index.ts` | Mock provider tests and live smoke test | Implemented, provider config pending |
| C08 | Missing policy/provider fallback | `generate-reply/index.ts` | Failure-injection tests | Implemented, runtime pending |
| C09 | Draft edit/approve/send | `manage-draft/index.ts` | Lifecycle integration test | Implemented, runtime pending |
| C10 | Audit and generation logs | `ai_generations`, `audit_events` | DB assertions | Implemented, DB pending |
| S01 | Auth and membership checks | `_shared/http.ts`, function handlers | Unauthorized/cross-brand tests | Implemented, runtime pending |
| S02 | RLS | `202610140001_core_schema.sql` | Supabase local DB security tests | Implemented, DB pending |
| S03 | Secret isolation | `.env.example`, Edge Functions | `npm run build` and bundle scan | Implemented, build pending |
| S04 | Input validation | Zod frontend schemas and server checks | Invalid input tests | Implemented, test coverage partial |
| R01 | Reproducible install | `package.json`, lockfile | `npm ci` | Pending lockfile verification |
| R02 | Production build | Vite + TypeScript config | `npm run build` | Pending |
| R03 | Deployment | README | Hosted smoke test | Pending |
