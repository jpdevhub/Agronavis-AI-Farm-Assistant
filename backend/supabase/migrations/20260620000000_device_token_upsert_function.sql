CREATE OR REPLACE FUNCTION public.upsert_device_token(
    p_farmer_id uuid,
    p_fcm_token text,
    p_device_type text
)
RETURNS public.device_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.device_tokens;
BEGIN
    INSERT INTO public.device_tokens (farmer_id, fcm_token, device_type, is_active)
    VALUES (p_farmer_id, p_fcm_token, p_device_type, true)
    ON CONFLICT (fcm_token) DO UPDATE
        SET device_type = EXCLUDED.device_type,
            is_active = true,
            updated_at = now()
        WHERE public.device_tokens.farmer_id = p_farmer_id
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'TOKEN_OWNED_BY_ANOTHER_USER' USING ERRCODE = '23505';
    END IF;

    RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_device_token(uuid, text, text) TO service_role;
