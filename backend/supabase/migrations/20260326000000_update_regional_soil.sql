-- =============================================================================
-- Migration: Re-create Regional Soil Data + Estimation Functions
-- Force drop and recreate to match CSV headers in backend/data/all_states.csv.
-- =============================================================================

-- 1. Create the table matching CSV headers
DROP TABLE IF EXISTS public.regional_soil_data CASCADE;

CREATE TABLE public.regional_soil_data (
    id            BIGSERIAL PRIMARY KEY,

    -- Location identifiers (match CSV headers)
    "State"       TEXT        NOT NULL,
    "District"    TEXT        NOT NULL,
    "Block"       TEXT,
    "Scheme"      TEXT,
    "Cycle"       TEXT,

    -- Nitrogen counts
    "n_High"      INTEGER     DEFAULT 0,
    "n_Medium"    INTEGER     DEFAULT 0,
    "n_Low"       INTEGER     DEFAULT 0,

    -- Phosphorus counts
    "p_High"      INTEGER     DEFAULT 0,
    "p_Medium"    INTEGER     DEFAULT 0,
    "p_Low"       INTEGER     DEFAULT 0,

    -- Potassium counts
    "k_High"      INTEGER     DEFAULT 0,
    "k_Medium"    INTEGER     DEFAULT 0,
    "k_Low"       INTEGER     DEFAULT 0,

    -- Organic Carbon counts
    "OC_High"     INTEGER     DEFAULT 0,
    "OC_Medium"   INTEGER     DEFAULT 0,
    "OC_Low"      INTEGER     DEFAULT 0,

    -- pH counts
    "pH_Alkaline" INTEGER     DEFAULT 0,
    "pH_Acidic"   INTEGER     DEFAULT 0,
    "pH_Neutral"  INTEGER     DEFAULT 0,

    -- EC counts
    "EC_NonSaline" INTEGER    DEFAULT 0,
    "EC_Saline"    INTEGER    DEFAULT 0,

    -- Sulphur counts
    "S_Sufficient"  INTEGER   DEFAULT 0,
    "S_Deficient"   INTEGER   DEFAULT 0,

    -- Iron counts
    "Fe_Sufficient" INTEGER   DEFAULT 0,
    "Fe_Deficient"  INTEGER   DEFAULT 0,

    -- Zinc counts
    "Zn_Sufficient" INTEGER   DEFAULT 0,
    "Zn_Deficient"  INTEGER   DEFAULT 0,

    -- Copper counts
    "Cu_Sufficient" INTEGER   DEFAULT 0,
    "Cu_Deficient"  INTEGER   DEFAULT 0,

    -- Boron counts
    "B_Sufficient"  INTEGER   DEFAULT 0,
    "B_Deficient"   INTEGER   DEFAULT 0,

    -- Manganese counts
    "Mn_Sufficient" INTEGER   DEFAULT 0,
    "Mn_Deficient"  INTEGER   DEFAULT 0,

    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by State + District
CREATE INDEX IF NOT EXISTS idx_regional_soil_state_district
  ON public.regional_soil_data (UPPER("State"), UPPER("District"));


-- =============================================================================
-- 2. Core estimation function
-- Aggregates block-level data for a state+district, determines majority
-- category per nutrient, returns estimated kg/acre values + raw counts.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_estimated_soil_health(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_estimated_soil_health(
  p_state    TEXT,
  p_district TEXT
)
RETURNS TABLE (
  matched_state       TEXT,
  matched_district    TEXT,
  blocks_aggregated   BIGINT,

  nitrogen_category   TEXT,
  phosphorus_category TEXT,
  potassium_category  TEXT,
  ph_category         TEXT,

  estimated_nitrogen_kg_per_acre   NUMERIC,
  estimated_phosphorus_kg_per_acre NUMERIC,
  estimated_potassium_kg_per_acre  NUMERIC,
  estimated_ph_value               NUMERIC,

  total_n_high    BIGINT,
  total_n_medium  BIGINT,
  total_n_low     BIGINT,
  total_p_high    BIGINT,
  total_p_medium  BIGINT,
  total_p_low     BIGINT,
  total_k_high    BIGINT,
  total_k_medium  BIGINT,
  total_k_low     BIGINT,
  total_ph_alkaline BIGINT,
  total_ph_neutral  BIGINT,
  total_ph_acidic   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_n_high   BIGINT; v_n_medium BIGINT; v_n_low    BIGINT;
  v_p_high   BIGINT; v_p_medium BIGINT; v_p_low    BIGINT;
  v_k_high   BIGINT; v_k_medium BIGINT; v_k_low    BIGINT;
  v_ph_alkaline BIGINT; v_ph_neutral BIGINT; v_ph_acidic BIGINT;
  v_block_count BIGINT;
  v_n_cat  TEXT; v_p_cat  TEXT; v_k_cat  TEXT; v_ph_cat TEXT;
  v_n_val  NUMERIC; v_p_val  NUMERIC; v_k_val  NUMERIC; v_ph_val NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM("n_High"),      0),
    COALESCE(SUM("n_Medium"),    0),
    COALESCE(SUM("n_Low"),       0),
    COALESCE(SUM("p_High"),      0),
    COALESCE(SUM("p_Medium"),    0),
    COALESCE(SUM("p_Low"),       0),
    COALESCE(SUM("k_High"),      0),
    COALESCE(SUM("k_Medium"),    0),
    COALESCE(SUM("k_Low"),       0),
    COALESCE(SUM("pH_Alkaline"), 0),
    COALESCE(SUM("pH_Neutral"),  0),
    COALESCE(SUM("pH_Acidic"),   0)
  INTO
    v_block_count,
    v_n_high, v_n_medium, v_n_low,
    v_p_high, v_p_medium, v_p_low,
    v_k_high, v_k_medium, v_k_low,
    v_ph_alkaline, v_ph_neutral, v_ph_acidic
  FROM public.regional_soil_data
  WHERE UPPER("State")    = UPPER(p_state)
    AND UPPER("District") = UPPER(p_district);

  IF v_block_count = 0 THEN
    RAISE EXCEPTION 'No soil data found for state: % district: %', p_state, p_district;
  END IF;

  -- Nitrogen majority
  IF v_n_low >= v_n_medium AND v_n_low >= v_n_high THEN
    v_n_cat := 'Low'; v_n_val := 112;
  ELSIF v_n_medium >= v_n_high THEN
    v_n_cat := 'Medium'; v_n_val := 160;
  ELSE
    v_n_cat := 'High'; v_n_val := 220;
  END IF;

  -- Phosphorus majority
  IF v_p_low >= v_p_medium AND v_p_low >= v_p_high THEN
    v_p_cat := 'Low'; v_p_val := 9;
  ELSIF v_p_medium >= v_p_high THEN
    v_p_cat := 'Medium'; v_p_val := 15;
  ELSE
    v_p_cat := 'High'; v_p_val := 22;
  END IF;

  -- Potassium majority
  IF v_k_low >= v_k_medium AND v_k_low >= v_k_high THEN
    v_k_cat := 'Low'; v_k_val := 45;
  ELSIF v_k_medium >= v_k_high THEN
    v_k_cat := 'Medium'; v_k_val := 85;
  ELSE
    v_k_cat := 'High'; v_k_val := 130;
  END IF;

  -- pH majority
  IF v_ph_neutral >= v_ph_alkaline AND v_ph_neutral >= v_ph_acidic THEN
    v_ph_cat := 'Neutral'; v_ph_val := 7.0;
  ELSIF v_ph_alkaline >= v_ph_acidic THEN
    v_ph_cat := 'Alkaline'; v_ph_val := 8.5;
  ELSE
    v_ph_cat := 'Acidic'; v_ph_val := 5.5;
  END IF;

  RETURN QUERY SELECT
    p_state, p_district, v_block_count,
    v_n_cat, v_p_cat, v_k_cat, v_ph_cat,
    v_n_val, v_p_val, v_k_val, v_ph_val,
    v_n_high, v_n_medium, v_n_low,
    v_p_high, v_p_medium, v_p_low,
    v_k_high, v_k_medium, v_k_low,
    v_ph_alkaline, v_ph_neutral, v_ph_acidic;
END;
$$;


-- =============================================================================
-- 3. Integration: auto-insert a soil_health_history record for a farm
-- =============================================================================

DROP FUNCTION IF EXISTS public.insert_estimated_soil_history(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.insert_estimated_soil_history(
  p_farm_id  UUID,
  p_state    TEXT,
  p_district TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_history_id UUID;
  calc_n NUMERIC; calc_p NUMERIC; calc_k NUMERIC; calc_ph NUMERIC;
BEGIN
  SELECT estimated_nitrogen_kg_per_acre, estimated_phosphorus_kg_per_acre,
         estimated_potassium_kg_per_acre, estimated_ph_value
  INTO   calc_n, calc_p, calc_k, calc_ph
  FROM   public.get_estimated_soil_health(p_state, p_district);

  -- Fallback to safe averages if district not found
  IF calc_n IS NULL THEN
    calc_n := 160; calc_p := 15; calc_k := 85; calc_ph := 7.0;
  END IF;

  INSERT INTO public.soil_health_history (
    farm_id, ph_level, nitrogen, phosphorus, potassium, tested_date
  ) VALUES (
    p_farm_id, calc_ph, calc_n, calc_p, calc_k, CURRENT_DATE
  ) RETURNING id INTO new_history_id;

  RETURN new_history_id;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_estimated_soil_health(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_estimated_soil_history(UUID, TEXT, TEXT) TO service_role;
GRANT SELECT ON public.regional_soil_data TO service_role;
