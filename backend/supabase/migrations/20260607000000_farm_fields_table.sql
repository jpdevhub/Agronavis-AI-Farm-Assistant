-- =============================================================================
-- AgroNavis — Migration 6: Dedicated farm_fields table
-- Applied: 2026-06-07
--
-- Replaces the JSONB fields array embedded in farms.location with a proper
-- relational table. This enables:
--   • RLS policies scoped to individual fields
--   • Indexed spatial lookups by farm
--   • Clean foreign-key cascade deletes
--   • Accurate total_area derived via DB aggregation
--
-- Backwards compatibility: farms.location.polygon (legacy single-polygon)
-- is left untouched so existing data continues to render in FarmMap.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create farm_fields table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.farm_fields (
    id               uuid        NOT NULL DEFAULT gen_random_uuid(),
    farm_id          uuid        NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,

    name             text        NOT NULL,
    area_acres       numeric     NOT NULL CHECK (area_acres > 0),
    area_hectares    numeric     GENERATED ALWAYS AS (area_acres * 0.404686) STORED,

    -- Polygon stored as JSONB array of {lat, lng} points
    -- e.g. [{"lat": 22.57, "lng": 88.36}, ...]
    polygon          jsonb       NOT NULL,

    center_latitude  numeric,
    center_longitude numeric,

    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT farm_fields_pkey PRIMARY KEY (id)
);

-- Index: fast lookup of all fields for a given farm
CREATE INDEX IF NOT EXISTS idx_farm_fields_farm_id
    ON public.farm_fields (farm_id);

-- Index: spatial-ish lookup by centre coordinates
CREATE INDEX IF NOT EXISTS idx_farm_fields_center
    ON public.farm_fields (center_latitude, center_longitude)
    WHERE center_latitude IS NOT NULL AND center_longitude IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. updated_at trigger
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_farm_fields_updated_at
    BEFORE UPDATE ON public.farm_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- Farmers can only see and modify fields that belong to their own farms.
-- -----------------------------------------------------------------------------

ALTER TABLE public.farm_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view fields on own farms"
    ON public.farm_fields FOR SELECT
    USING (
        auth.uid() IN (
            SELECT farmer_id FROM public.farms WHERE id = farm_id
        )
    );

CREATE POLICY "Farmers can insert fields on own farms"
    ON public.farm_fields FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT farmer_id FROM public.farms WHERE id = farm_id
        )
    );

CREATE POLICY "Farmers can update fields on own farms"
    ON public.farm_fields FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT farmer_id FROM public.farms WHERE id = farm_id
        )
    );

CREATE POLICY "Farmers can delete fields on own farms"
    ON public.farm_fields FOR DELETE
    USING (
        auth.uid() IN (
            SELECT farmer_id FROM public.farms WHERE id = farm_id
        )
    );


-- -----------------------------------------------------------------------------
-- 4. Auto-update farms.total_area when fields change
-- Keeps the farms row in sync without needing application-level bookkeeping.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_farm_total_area()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_farm_id uuid;
    v_total   numeric;
BEGIN
    -- Determine the affected farm_id from either NEW or OLD row
    v_farm_id := COALESCE(NEW.farm_id, OLD.farm_id);

    SELECT COALESCE(SUM(area_acres), 0)
    INTO   v_total
    FROM   public.farm_fields
    WHERE  farm_id = v_farm_id;

    UPDATE public.farms
    SET    total_area = v_total
    WHERE  id = v_farm_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_farm_total_area
    AFTER INSERT OR UPDATE OR DELETE ON public.farm_fields
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_farm_total_area();


-- -----------------------------------------------------------------------------
-- 5. Migrate existing JSONB fields into the new table
-- Reads farms.location->>'fields' and inserts each entry as a proper row.
-- Safe to run even if the JSONB array is empty or missing.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    r         RECORD;
    field_row jsonb;
BEGIN
    FOR r IN
        SELECT id, location
        FROM   public.farms
        WHERE  location IS NOT NULL
          AND  location->'fields' IS NOT NULL
          AND  jsonb_array_length(location->'fields') > 0
    LOOP
        FOR field_row IN
            SELECT jsonb_array_elements(r.location->'fields')
        LOOP
            INSERT INTO public.farm_fields (
                id,
                farm_id,
                name,
                area_acres,
                polygon,
                center_latitude,
                center_longitude
            ) VALUES (
                COALESCE((field_row->>'id')::uuid, gen_random_uuid()),
                r.id,
                COALESCE(field_row->>'name', 'Unnamed Field'),
                COALESCE((field_row->>'area_acres')::numeric, 0),
                COALESCE(field_row->'polygon', '[]'::jsonb),
                (field_row->>'center_latitude')::numeric,
                (field_row->>'center_longitude')::numeric
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 6. Grant service_role access (used by FastAPI backend)
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_fields TO service_role;


-- =============================================================================
-- DONE
-- Table:    farm_fields (id, farm_id, name, area_acres, area_hectares,
--                        polygon, center_latitude, center_longitude,
--                        created_at, updated_at)
-- Trigger:  trg_sync_farm_total_area  — keeps farms.total_area accurate
-- Trigger:  set_farm_fields_updated_at — auto-updates updated_at
-- RLS:      SELECT / INSERT / UPDATE / DELETE scoped to farm owner
-- Index:    idx_farm_fields_farm_id, idx_farm_fields_center
-- Migration: existing JSONB fields copied into new table
-- =============================================================================
