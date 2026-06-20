CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.device_tokens (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    farmer_id   uuid        NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    fcm_token   text        NOT NULL,
    device_type text        NOT NULL DEFAULT 'web'
                            CHECK (device_type = ANY (ARRAY['web', 'android', 'ios'])),
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT device_tokens_pkey         PRIMARY KEY (id),
    CONSTRAINT device_tokens_token_unique UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_farmer_id
    ON public.device_tokens (farmer_id)
    WHERE is_active = true;

CREATE TRIGGER set_device_tokens_updated_at
    BEFORE UPDATE ON public.device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own device tokens"
    ON public.device_tokens FOR SELECT
    USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert own device tokens"
    ON public.device_tokens FOR INSERT
    WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own device tokens"
    ON public.device_tokens FOR UPDATE
    USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete own device tokens"
    ON public.device_tokens FOR DELETE
    USING (auth.uid() = farmer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO service_role;

SELECT cron.schedule(
    'send-daily-task-notifications',
    '30 0 * * *',
    $$
    SELECT extensions.http_post(
        url     := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/send-daily-tasks',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := '{}'::jsonb
    );
    $$
);
