-- =============================================================================
-- AgroNavis — Migration 2: Enhanced Schema
-- Applied: 2026-03-15
-- Scope: LOCAL ONLY — do not push to production until validated
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Replace crop_varieties with enhanced schema
-- The original table (from migration 1) had only basic columns.
-- We drop it and recreate with full NPK, pH, and category support.
-- The LATERAL JOIN in the fertilizer view requires these columns.
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS public.crop_varieties CASCADE;

CREATE TABLE public.crop_varieties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Broad categorization
  crop_category text CHECK (crop_category = ANY (ARRAY['cereal','pulse','vegetable','fruit','medicinal','cash_crop','spice'])),

  crop_type text NOT NULL,      -- e.g., 'Wheat', 'Ashwagandha'
  variety   text NOT NULL,      -- e.g., 'HD2967', 'Jawahar-20'
  season    text[] NOT NULL,    -- e.g., ARRAY['rabi'] or ARRAY['kharif','rabi']

  -- What the farmer actually sells
  primary_harvest_part text CHECK (primary_harvest_part = ANY (ARRAY['grain','fruit','leaf','root','bark','whole_plant','flower'])),
  yield_unit text DEFAULT 'kg',

  -- Yield & timeline
  avg_yield_per_acre     numeric,
  growth_duration_days   integer,

  -- Nutritional baselines (for the Fertilizer Calculator view)
  req_nitrogen_kg_per_acre   numeric,
  req_phosphorus_kg_per_acre numeric,
  req_potassium_kg_per_acre  numeric,

  -- Environmental thresholds (for pre-sowing warnings)
  ideal_ph_min          numeric,
  ideal_ph_max          numeric,
  water_req_mm_per_season integer,

  created_at timestamp without time zone DEFAULT now(),

  CONSTRAINT crop_varieties_pkey PRIMARY KEY (id)
);

-- RLS: read-only for all authenticated users
ALTER TABLE public.crop_varieties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view crop varieties" ON public.crop_varieties
  FOR SELECT TO authenticated USING (true);

-- Seed: enhanced crop varieties with NPK + pH data
INSERT INTO public.crop_varieties
  (crop_category, crop_type, variety, season, primary_harvest_part,
   avg_yield_per_acre, growth_duration_days,
   req_nitrogen_kg_per_acre, req_phosphorus_kg_per_acre, req_potassium_kg_per_acre,
   ideal_ph_min, ideal_ph_max, water_req_mm_per_season)
VALUES
  -- Cereals
  ('cereal',   'Rice',      'Basmati',   ARRAY['kharif'],         'grain',       25.0, 120,  80, 40, 40, 5.5, 6.5, 1200),
  ('cereal',   'Rice',      'IR64',      ARRAY['kharif'],         'grain',       30.0, 110, 100, 50, 50, 5.5, 6.5, 1200),
  ('cereal',   'Wheat',     'HD2967',    ARRAY['rabi'],           'grain',       35.0, 120, 120, 60, 40, 6.0, 7.5,  450),
  ('cereal',   'Wheat',     'PBW343',    ARRAY['rabi'],           'grain',       32.0, 125, 120, 60, 40, 6.0, 7.5,  450),
  ('cereal',   'Maize',     'Pioneer',   ARRAY['kharif','rabi'],  'grain',       40.0,  90, 100, 60, 40, 5.8, 7.0,  500),

  -- Cash crops
  ('cash_crop','Cotton',    'Bt Cotton', ARRAY['kharif'],         'fruit',       20.0, 180,  80, 40, 40, 5.8, 8.0,  700),
  ('cash_crop','Sugarcane', 'Co238',     ARRAY['perennial'],      'whole_plant',400.0, 365, 150, 60, 60, 6.0, 7.5, 1500),

  -- Pulses
  ('pulse',    'Soybean',   'JS335',     ARRAY['kharif'],         'grain',       15.0, 100,  20, 60, 20, 6.0, 7.5,  400),

  -- Medicinal
  ('medicinal','Ashwagandha','Jawahar-20',ARRAY['kharif','rabi'], 'root',         8.0, 150,  15, 20, 10, 6.5, 8.5,  300),
  ('medicinal','Turmeric',  'Pratibha',  ARRAY['kharif'],         'root',        25.0, 270,  25, 25, 50, 5.5, 7.0,  1500),

  -- Vegetables
  ('vegetable','Tomato',    'Pusa Ruby', ARRAY['kharif','rabi'],  'fruit',       80.0,  90, 100, 60, 80, 6.0, 7.0,  600),
  ('vegetable','Onion',     'Nasik Red', ARRAY['rabi'],           'root',        60.0, 120,  80, 40, 60, 6.0, 7.5,  350),

  -- Spices
  ('spice',    'Chilli',    'Pusa Jwala',ARRAY['kharif','rabi'],  'fruit',       10.0, 100,  60, 30, 30, 6.0, 7.0,  600);


-- -----------------------------------------------------------------------------
-- STEP 2: farm_tasks — auto-generated task timeline per crop
-- -----------------------------------------------------------------------------

CREATE TABLE public.farm_tasks (
  id   uuid NOT NULL DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL,
  crop_id uuid,

  task_type text CHECK (task_type = ANY (ARRAY[
    'soil_prep','sowing','fertilizer_application',
    'irrigation','pest_scan','harvesting','market_prep'
  ])),

  title       text NOT NULL,
  description text,

  due_date       date NOT NULL,
  completed_date date,
  status text DEFAULT 'pending' CHECK (status = ANY (ARRAY[
    'pending','in_progress','completed','overdue','skipped'
  ])),

  -- JSONB payload for frontend context (e.g., which calculator to open)
  action_data jsonb,

  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),

  CONSTRAINT farm_tasks_pkey        PRIMARY KEY (id),
  CONSTRAINT farm_tasks_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id)  ON DELETE CASCADE,
  CONSTRAINT farm_tasks_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id)  ON DELETE CASCADE
);

-- RLS: farmers see tasks belonging to their own farms
ALTER TABLE public.farm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view tasks on own farms" ON public.farm_tasks
  FOR SELECT USING (
    auth.uid() IN (SELECT farmer_id FROM public.farms WHERE id = farm_id)
  );

CREATE POLICY "Farmers can insert tasks on own farms" ON public.farm_tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT farmer_id FROM public.farms WHERE id = farm_id)
  );

CREATE POLICY "Farmers can update tasks on own farms" ON public.farm_tasks
  FOR UPDATE USING (
    auth.uid() IN (SELECT farmer_id FROM public.farms WHERE id = farm_id)
  );

-- Indexes
CREATE INDEX idx_farm_tasks_farm_id   ON public.farm_tasks(farm_id);
CREATE INDEX idx_farm_tasks_crop_id   ON public.farm_tasks(crop_id);
CREATE INDEX idx_farm_tasks_due_date  ON public.farm_tasks(due_date);
CREATE INDEX idx_farm_tasks_status    ON public.farm_tasks(status);


-- -----------------------------------------------------------------------------
-- STEP 3: crop_scans — stores ML disease/pest detection results
-- -----------------------------------------------------------------------------

CREATE TABLE public.crop_scans (
  id      uuid NOT NULL DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
  crop_id uuid REFERENCES public.crops(id) ON DELETE CASCADE,

  -- The image (stored in Supabase Storage)
  image_url text NOT NULL,

  -- YOLO model output
  detected_disease  text    DEFAULT 'Pending Analysis',
  confidence_score  numeric,
  recommendation    text,

  scan_date timestamp without time zone DEFAULT now(),

  CONSTRAINT crop_scans_pkey PRIMARY KEY (id)
);

ALTER TABLE public.crop_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view scans on own farms" ON public.crop_scans
  FOR SELECT USING (
    auth.uid() IN (SELECT farmer_id FROM public.farms WHERE id = farm_id)
  );

CREATE POLICY "Farmers can insert scans on own farms" ON public.crop_scans
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT farmer_id FROM public.farms WHERE id = farm_id)
  );

CREATE INDEX idx_crop_scans_farm_id ON public.crop_scans(farm_id);
CREATE INDEX idx_crop_scans_crop_id ON public.crop_scans(crop_id);


-- -----------------------------------------------------------------------------
-- STEP 4: community_posts & community_replies — geo-tagged farmer forum
-- -----------------------------------------------------------------------------

CREATE TABLE public.community_posts (
  id        uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.farmers(id) ON DELETE CASCADE,

  title               text NOT NULL,
  content             text NOT NULL,
  attached_image_url  text,

  -- e.g., {"state": "West Bengal", "district": "North 24 Parganas"}
  location_tags jsonb,

  upvotes    integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),

  CONSTRAINT community_posts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.community_replies (
  id        uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id   uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.farmers(id)         ON DELETE CASCADE,

  reply_content text NOT NULL,
  created_at    timestamp without time zone DEFAULT now(),

  CONSTRAINT community_replies_pkey PRIMARY KEY (id)
);

-- RLS: posts readable by all authenticated users; write = own rows only
ALTER TABLE public.community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view posts" ON public.community_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authors can insert their posts" ON public.community_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts" ON public.community_posts
  FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can view replies" ON public.community_replies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authors can insert their replies" ON public.community_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE INDEX idx_community_posts_author   ON public.community_posts(author_id);
CREATE INDEX idx_community_replies_post   ON public.community_replies(post_id);
CREATE INDEX idx_community_replies_author ON public.community_replies(author_id);


-- -----------------------------------------------------------------------------
-- STEP 5: Fertilizer Calculator VIEW
-- Auto-calculates how many commercial fertilizer bags are needed
-- based on the gap between current soil NPK and the crop's requirements.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.farm_fertilizer_calculator AS
SELECT
    f.id         AS farm_id,
    f.name       AS farm_name,
    f.total_area,
    c.crop_type,
    c.variety,

    -- Raw NPK deficit per acre (never negative)
    GREATEST(0, cv.req_nitrogen_kg_per_acre   - COALESCE(sh.nitrogen,   0)) AS n_deficit_per_acre,
    GREATEST(0, cv.req_phosphorus_kg_per_acre - COALESCE(sh.phosphorus, 0)) AS p_deficit_per_acre,
    GREATEST(0, cv.req_potassium_kg_per_acre  - COALESCE(sh.potassium,  0)) AS k_deficit_per_acre,

    -- Bags needed for the whole farm
    -- Urea:   46% N content,  50 kg bags
    -- SSP:    16% P2O5,       50 kg bags
    -- MOP:    60% K2O,        50 kg bags
    CEIL(((GREATEST(0, cv.req_nitrogen_kg_per_acre   - COALESCE(sh.nitrogen,   0)) * f.total_area) / 0.46) / 50) AS urea_50kg_bags,
    CEIL(((GREATEST(0, cv.req_phosphorus_kg_per_acre - COALESCE(sh.phosphorus, 0)) * f.total_area) / 0.16) / 50) AS ssp_50kg_bags,
    CEIL(((GREATEST(0, cv.req_potassium_kg_per_acre  - COALESCE(sh.potassium,  0)) * f.total_area) / 0.60) / 50) AS mop_50kg_bags

FROM public.farms f
JOIN public.crops c
  ON c.farm_id = f.id
JOIN public.crop_varieties cv
  ON cv.crop_type = c.crop_type AND cv.variety = c.variety
-- Most-recent soil test for this farm (LATERAL for performance)
LEFT JOIN LATERAL (
    SELECT nitrogen, phosphorus, potassium
    FROM   public.soil_health_history
    WHERE  farm_id = f.id
    ORDER  BY tested_date DESC
    LIMIT  1
) sh ON true
WHERE c.current_growth_stage IN ('sowing', 'vegetative');


-- -----------------------------------------------------------------------------
-- STEP 6: Auto-timeline trigger — creates farm_tasks when a crop is added
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_crop_timeline()
RETURNS TRIGGER AS $$
DECLARE
    v_growth_days INTEGER;
BEGIN
    -- Look up growth duration from the variety rules table
    SELECT growth_duration_days
    INTO   v_growth_days
    FROM   public.crop_varieties
    WHERE  crop_type = NEW.crop_type
    AND    variety   = NEW.variety
    LIMIT  1;

    -- Default to 90 days if variety not found
    IF v_growth_days IS NULL THEN
        v_growth_days := 90;
    END IF;

    -- Only generate tasks if sowing_date is known
    IF NEW.sowing_date IS NOT NULL THEN

        -- Task 1: Sowing (auto-completed)
        INSERT INTO public.farm_tasks
          (farm_id, crop_id, task_type, title, description, due_date, status)
        VALUES
          (NEW.farm_id, NEW.id, 'sowing',
           'Crop Sown',
           'Initial sowing recorded in the system.',
           NEW.sowing_date, 'completed');

        -- Task 2: First Fertilizer Dose (21 days)
        INSERT INTO public.farm_tasks
          (farm_id, crop_id, task_type, title, description, due_date, action_data)
        VALUES
          (NEW.farm_id, NEW.id, 'fertilizer_application',
           'First Fertilizer Dose',
           'Check the calculator tab for exact Urea requirements based on your soil health.',
           NEW.sowing_date + INTERVAL '21 days',
           '{"stage": "vegetative", "requires_calculator": true}'::jsonb);

        -- Task 3: Mid-Cycle Pest Scan (45 days)
        INSERT INTO public.farm_tasks
          (farm_id, crop_id, task_type, title, description, due_date, action_data)
        VALUES
          (NEW.farm_id, NEW.id, 'pest_scan',
           'Mid-Cycle Pest Scan',
           'High vulnerability period. Inspect leaves for early signs of disease.',
           NEW.sowing_date + INTERVAL '45 days',
           '{"scan_type": "visual", "severity_risk": "high"}'::jsonb);

        -- Task 4: Estimated Harvest (growth_duration_days after sowing)
        INSERT INTO public.farm_tasks
          (farm_id, crop_id, task_type, title, description, due_date)
        VALUES
          (NEW.farm_id, NEW.id, 'harvesting',
           'Estimated Harvest Window',
           'Prepare market logistics and check current Mandi prices.',
           NEW.sowing_date + (v_growth_days || ' days')::INTERVAL);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger: fires AFTER every INSERT on the crops table
DROP TRIGGER IF EXISTS on_crop_created ON public.crops;
CREATE TRIGGER on_crop_created
  AFTER INSERT ON public.crops
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_crop_timeline();


-- -----------------------------------------------------------------------------
-- STEP 7: Add profile_settings column to farmers
-- Stores per-user preferences (language, notification flags, etc.)
-- -----------------------------------------------------------------------------

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS profile_settings jsonb
  DEFAULT '{"language": "en", "push_notifications": true, "sms_alerts": false}'::jsonb;


-- -----------------------------------------------------------------------------
-- DONE
-- Tables: crop_varieties(v2), farm_tasks, crop_scans, community_posts,
--         community_replies
-- View:   farm_fertilizer_calculator
-- Func:   generate_crop_timeline()
-- Trig:   on_crop_created (crops)
-- Col:    farmers.profile_settings
-- =============================================================================
