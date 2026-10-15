SELECT created_at, model, status, warning, error_code,
       prompt_tokens, completion_tokens
FROM public.ai_generations
ORDER BY created_at DESC
LIMIT 3;