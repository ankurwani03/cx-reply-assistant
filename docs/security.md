# Security notes

- Frontend keys are public project identifiers only; RLS is mandatory.
- `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` belong only in Supabase Edge Function secrets.
- The Customer/Agent switch is a demo interaction, not a permission boundary. The authenticated actor is authorized as a brand member on the server.
- Every Edge Function derives brand ownership from the persisted conversation or generation, then checks membership.
- Retrieval queries filter by the trusted `brand_id` before ranking. A second in-memory brand assertion fails closed if the result set unexpectedly contains another brand.
- The model receives only selected same-brand active policy evidence. Customer messages are untrusted data and cannot override system instructions.
- A missing policy returns a cautious fallback and warning rather than inventing a policy answer.
- Never treat model confidence as correctness. Agent review is required.
- RLS prevents direct cross-brand table access. Service-role functions bypass RLS, so they must explicitly authorize each operation.
- Sample brands/customers/orders are fictional. Use synthetic data only in development.
- Audit metadata should not contain secrets or unnecessary personal data.
- Bootstrap the first admin by creating/inviting a real Supabase Auth user and inserting their membership with an authorized SQL editor; never expose a public admin-creation endpoint.
- For production, restrict `APP_ORIGIN` to the exact frontend origin and add rate limiting at the edge/provider boundary before broad use.
