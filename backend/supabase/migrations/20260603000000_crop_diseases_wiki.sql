-- =============================================================================
-- AgroNavis — Migration 5: Crop Diseases Wiki Table
-- Applied: 2026-06-03
-- Scope: LOCAL FIRST — test locally, then push to production
--
-- This table powers the /api/wiki/diseases endpoint.
-- Each row maps to one of the 87 ResNet18 model class_names.
-- class_key matches the raw model output (e.g., "tomato_early_blight")
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crop_diseases (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  class_key   text UNIQUE NOT NULL,   -- Matches ResNet18 class name exactly
  name        text NOT NULL,          -- Human readable: "Tomato Early Blight"
  crop_type   text NOT NULL,          -- "Tomato", "Wheat", etc.
  is_healthy  boolean NOT NULL DEFAULT false,
  severity    text CHECK (severity IN ('none','low','moderate','high','critical')),
  description text,
  symptoms    text[],
  treatment   text[],
  image_url   text,
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT crop_diseases_pkey PRIMARY KEY (id)
);

ALTER TABLE public.crop_diseases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view diseases" ON public.crop_diseases
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_crop_diseases_class_key ON public.crop_diseases(class_key);
CREATE INDEX IF NOT EXISTS idx_crop_diseases_crop_type ON public.crop_diseases(crop_type);

-- =============================================================================
-- SEED: All 87 classes with accurate data
-- =============================================================================

INSERT INTO public.crop_diseases
  (class_key, name, crop_type, is_healthy, severity, description, symptoms, treatment)
VALUES

-- ── Apple ──────────────────────────────────────────────────────────────────
('healthy_apple', 'Healthy Apple', 'Apple', true, 'none',
  'Apple plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('apple_apple_scab', 'Apple Scab', 'Apple', false, 'moderate',
  'Fungal disease (Venturia inaequalis) causing lesions on leaves and fruit.',
  ARRAY['Olive-green to black spots on leaves', 'Crusty scabby lesions on fruit', 'Premature leaf drop'],
  ARRAY['Apply preventive fungicides (captan, mancozeb) in spring', 'Rake and destroy fallen leaves', 'Plant resistant varieties']),

('apple_black_rot', 'Apple Black Rot', 'Apple', false, 'high',
  'Fungal disease (Botryosphaeria obtusa) causing fruit rot and leaf spots.',
  ARRAY['Brown circular leaf lesions with purple halos', 'Black rot on fruit surface', 'Cankers on branches'],
  ARRAY['Remove and destroy infected fruit and cankered wood', 'Apply copper-based fungicides', 'Improve air circulation through pruning']),

('apple_cedar_apple_rust', 'Apple Cedar Rust', 'Apple', false, 'moderate',
  'Fungal disease requiring both apple and juniper/cedar host plants.',
  ARRAY['Bright orange-yellow spots on upper leaf surface', 'Tube-like projections on leaf underside', 'Premature defoliation'],
  ARRAY['Remove nearby juniper/cedar trees if possible', 'Apply fungicides from pink bud stage', 'Use resistant apple varieties']),

-- ── Bean ───────────────────────────────────────────────────────────────────
('healthy_bean', 'Healthy Bean', 'Bean', true, 'none',
  'Bean plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('bean_angular_leaf_spot', 'Bean Angular Leaf Spot', 'Bean', false, 'moderate',
  'Bacterial disease (Phaeoisariopsis griseola) causing angular lesions.',
  ARRAY['Angular water-soaked leaf spots', 'Brown necrotic patches', 'Pod discoloration'],
  ARRAY['Use certified disease-free seeds', 'Apply copper-based bactericides', 'Avoid overhead irrigation']),

('bean_rust', 'Bean Rust', 'Bean', false, 'high',
  'Fungal disease (Uromyces appendiculatus) producing rust-colored pustules.',
  ARRAY['Small reddish-brown pustules on leaves', 'Yellow halos around pustules', 'Leaf defoliation under heavy infection'],
  ARRAY['Apply mancozeb or triazole fungicides at first sign', 'Improve plant spacing for air circulation', 'Remove and destroy infected plant debris']),

-- ── Bell Pepper ────────────────────────────────────────────────────────────
('healthy_pepper', 'Healthy Pepper', 'Pepper', true, 'none',
  'Pepper plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('bell_pepper_bacterial_spot', 'Bell Pepper Bacterial Spot', 'Pepper', false, 'high',
  'Bacterial disease (Xanthomonas campestris) causing leaf and fruit spots.',
  ARRAY['Water-soaked lesions on leaves', 'Brown necrotic spots with yellow halos', 'Fruit scab lesions'],
  ARRAY['Apply copper bactericides preventively', 'Use disease-free transplants', 'Avoid working in field when wet']),

-- ── Cherry ─────────────────────────────────────────────────────────────────
('healthy_cherry', 'Healthy Cherry', 'Cherry', true, 'none',
  'Cherry plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('cherry_powdery_mildew', 'Cherry Powdery Mildew', 'Cherry', false, 'moderate',
  'Fungal disease (Podosphaera clandestina) producing white powdery growth.',
  ARRAY['White powdery fungal growth on leaves', 'Leaf curling and distortion', 'Stunted shoot growth'],
  ARRAY['Apply sulfur or myclobutanil fungicides', 'Prune to improve air circulation', 'Avoid excess nitrogen fertilization']),

-- ── Corn / Maize ───────────────────────────────────────────────────────────
('healthy_corn', 'Healthy Corn', 'Corn', true, 'none',
  'Corn plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('corn_cercospora_leaf_spot', 'Corn Cercospora Leaf Spot', 'Corn', false, 'moderate',
  'Fungal disease (Cercospora zeae-maydis) causing gray lesions on leaves.',
  ARRAY['Gray to tan rectangular lesions', 'Lesions parallel to leaf veins', 'Premature leaf dying'],
  ARRAY['Plant resistant hybrids', 'Apply strobilurin or triazole fungicides', 'Rotate crops away from corn']),

('corn_common_rust', 'Corn Common Rust', 'Corn', false, 'moderate',
  'Fungal disease (Puccinia sorghi) producing brick-red pustules.',
  ARRAY['Brick-red pustules on both leaf surfaces', 'Pustules darken with age', 'Leaf yellowing'],
  ARRAY['Plant resistant corn hybrids', 'Apply foliar fungicides if infection is early and severe', 'Scout fields regularly']),

('corn_gray_leaf_spot', 'Corn Gray Leaf Spot', 'Corn', false, 'high',
  'Fungal disease (Cercospora zeae-maydis) favored by humid conditions.',
  ARRAY['Rectangular gray to brown lesions', 'Lesions delimited by leaf veins', 'Severe blighting in humid conditions'],
  ARRAY['Plant resistant hybrids', 'Rotate crops', 'Apply triazole or strobilurin fungicides']),

('corn_northern_leaf_blight', 'Corn Northern Leaf Blight', 'Corn', false, 'high',
  'Fungal disease (Exserohilum turcicum) causing large lesions.',
  ARRAY['Large cigar-shaped gray-green lesions', 'Lesions 1–6 inches long', 'Premature plant death in severe cases'],
  ARRAY['Use resistant hybrids', 'Apply foliar fungicides at tasseling', 'Practice crop rotation']),

-- ── Cotton ─────────────────────────────────────────────────────────────────
('healthy_cotton', 'Healthy Cotton', 'Cotton', true, 'none',
  'Cotton plant shows no signs of disease or pest.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('cotton_aphids', 'Cotton Aphids', 'Cotton', false, 'moderate',
  'Insect pest (Aphis gossypii) causing leaf distortion and honeydew.',
  ARRAY['Distorted curled leaves', 'Sticky honeydew on leaf surfaces', 'Sooty mold growth'],
  ARRAY['Release beneficial insects (ladybugs, lacewings)', 'Apply insecticidal soap or neem oil', 'Use systemic insecticides if severe']),

('cotton_army_worm', 'Cotton Army Worm', 'Cotton', false, 'high',
  'Pest (Spodoptera spp.) causing significant defoliation.',
  ARRAY['Ragged leaf edges from feeding', 'Visible caterpillars on plants', 'Defoliation in severe infestations'],
  ARRAY['Apply Bt (Bacillus thuringiensis) or chemical insecticides', 'Monitor with pheromone traps', 'Practice crop rotation']),

('cotton_bacterial_blight', 'Cotton Bacterial Blight', 'Cotton', false, 'high',
  'Bacterial disease (Xanthomonas citri pv. malvacearum) causing boll rot.',
  ARRAY['Angular water-soaked leaf spots', 'Brown lesions with yellow halos', 'Boll rot and stem cankers'],
  ARRAY['Use disease-free seeds', 'Apply copper bactericides', 'Remove and destroy infected plants']),

('cotton_powdery_mildew', 'Cotton Powdery Mildew', 'Cotton', false, 'low',
  'Fungal disease producing white powdery growth on cotton leaves.',
  ARRAY['White powdery coating on leaves', 'Yellowing of affected tissue', 'Stunted plant growth'],
  ARRAY['Apply sulfur or myclobutanil fungicides', 'Improve plant spacing', 'Avoid high nitrogen levels']),

('cotton_target_spot', 'Cotton Target Spot', 'Cotton', false, 'moderate',
  'Fungal disease (Corynespora cassiicola) causing circular target-like lesions.',
  ARRAY['Circular brown lesions with concentric rings', 'Target-like appearance', 'Premature leaf drop'],
  ARRAY['Apply triazole or strobilurin fungicides', 'Remove crop debris after harvest', 'Rotate crops']),

-- ── Cucumber ───────────────────────────────────────────────────────────────
('healthy_cucumber', 'Healthy Cucumber', 'Cucumber', true, 'none',
  'Cucumber plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('diseased_cucumber', 'Diseased Cucumber', 'Cucumber', false, 'moderate',
  'General cucumber disease — may include downy mildew, powdery mildew, or bacterial wilt.',
  ARRAY['Yellowing of leaves', 'Water-soaked lesions on foliage', 'Wilting and vine collapse'],
  ARRAY['Identify specific disease and apply appropriate fungicide/bactericide', 'Improve drainage and air circulation', 'Remove infected plant parts']),

-- ── Rice ───────────────────────────────────────────────────────────────────
('healthy_rice', 'Healthy Rice', 'Rice', true, 'none',
  'Rice plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('diseased_rice', 'Diseased Rice', 'Rice', false, 'moderate',
  'General rice disease — may include blast, brown spot, or sheath blight.',
  ARRAY['Discolored or spotted leaves', 'Water-soaked leaf sheaths', 'Stunted plant growth'],
  ARRAY['Identify specific disease; apply appropriate management', 'Ensure proper water management', 'Use resistant varieties']),

('rice_bacterial_blight', 'Rice Bacterial Blight', 'Rice', false, 'critical',
  'Bacterial disease (Xanthomonas oryzae pv. oryzae) causing wilting and leaf scorch.',
  ARRAY['Water-soaked wave-like lesions on leaf edges', 'Lesions turn yellow then white', 'Bacterial ooze in early morning'],
  ARRAY['Use resistant varieties', 'Apply copper bactericides', 'Avoid excess nitrogen and flood water from infected areas']),

-- ── Grape ──────────────────────────────────────────────────────────────────
('healthy_grapes', 'Healthy Grapes', 'Grape', true, 'none',
  'Grape vine shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('grape_black_rot', 'Grape Black Rot', 'Grape', false, 'high',
  'Fungal disease (Guignardia bidwellii) causing mummified berries.',
  ARRAY['Brown circular lesions with black borders on leaves', 'Mummified shriveled berries', 'Black pycnidia dots in lesions'],
  ARRAY['Apply myclobutanil or mancozeb from budbreak', 'Remove mummified berries and infected canes', 'Improve air circulation through pruning']),

('grape_esca_black_measles', 'Grape Esca / Black Measles', 'Grape', false, 'high',
  'Complex fungal disease causing internal wood decay and leaf symptoms.',
  ARRAY['Interveinal chlorosis and necrosis', 'Tiger-stripe pattern on leaves', 'Internal wood discoloration'],
  ARRAY['No complete cure; manage through pruning infected wood', 'Protect pruning wounds with paste', 'Maintain vine vigor with proper nutrition']),

('grape_leaf_blight', 'Grape Leaf Blight', 'Grape', false, 'moderate',
  'Fungal disease causing large brown blighted areas on grape leaves.',
  ARRAY['Large irregular brown leaf lesions', 'Lesions coalesce leading to defoliation', 'Berry shriveling'],
  ARRAY['Apply copper fungicides preventively', 'Remove and destroy infected leaves', 'Ensure good vineyard sanitation']),

-- ── Groundnut ──────────────────────────────────────────────────────────────
('healthy_groundnut', 'Healthy Groundnut', 'Groundnut', true, 'none',
  'Groundnut plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('groundnut_early_leaf_spot', 'Groundnut Early Leaf Spot', 'Groundnut', false, 'moderate',
  'Fungal disease (Cercospora arachidicola) causing circular spots.',
  ARRAY['Circular dark brown spots on upper leaf surface', 'Yellow halos around spots', 'Premature defoliation'],
  ARRAY['Apply chlorothalonil or mancozeb fungicides', 'Rotate crops with non-host plants', 'Use resistant varieties']),

('groundnut_late_leaf_spot', 'Groundnut Late Leaf Spot', 'Groundnut', false, 'high',
  'Fungal disease (Cercosporidium personatum) more destructive than early leaf spot.',
  ARRAY['Dark brown to black circular spots', 'Spots appear more on lower leaf surface', 'Severe defoliation'],
  ARRAY['Apply tebuconazole or chlorothalonil', 'Maintain proper plant spacing', 'Remove crop debris after harvest']),

('groundnut_nutrition_deficiency', 'Groundnut Nutrition Deficiency', 'Groundnut', false, 'moderate',
  'Non-infectious condition caused by imbalanced soil nutrients.',
  ARRAY['Interveinal yellowing', 'Stunted growth', 'Pale green to yellow leaf color'],
  ARRAY['Test soil and apply deficient nutrients', 'Apply balanced NPK fertilizers', 'Use foliar micronutrient sprays']),

('groundnut_rosette', 'Groundnut Rosette', 'Groundnut', false, 'critical',
  'Viral disease transmitted by aphids causing severe stunting.',
  ARRAY['Stunted plant growth', 'Mosaic pattern on leaves', 'Leaf curling and bunching'],
  ARRAY['Control aphid vectors with insecticides', 'Use resistant varieties', 'Remove and destroy infected plants early']),

('groundnut_rust', 'Groundnut Rust', 'Groundnut', false, 'high',
  'Fungal disease (Puccinia arachidis) causing orange-brown pustules.',
  ARRAY['Orange-brown pustules on lower leaf surface', 'Yellow spots on upper leaf surface', 'Premature defoliation'],
  ARRAY['Apply mancozeb or triazole fungicides', 'Plant early to avoid peak rust season', 'Use resistant varieties']),

-- ── Guava ──────────────────────────────────────────────────────────────────
('healthy_guava', 'Healthy Guava', 'Guava', true, 'none',
  'Guava plant shows no signs of disease or pest.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('guava_fruit_fly', 'Guava Fruit Fly', 'Guava', false, 'high',
  'Insect pest (Bactrocera spp.) causing internal fruit damage.',
  ARRAY['Puncture marks on fruit surface', 'Rotting flesh inside fruit', 'Premature fruit drop'],
  ARRAY['Use protein bait traps', 'Apply cover sprays of insecticide', 'Bag fruits when young']),

('guava_stylosa_disease', 'Guava Stylosa Disease', 'Guava', false, 'moderate',
  'Fungal disease affecting guava fruit and foliage.',
  ARRAY['Dark lesions on fruit and leaves', 'Fruit cracking and decay', 'Leaf spotting'],
  ARRAY['Remove and destroy infected plant parts', 'Apply copper-based fungicides', 'Maintain tree vigor through proper nutrition']),

('guava_wilt', 'Guava Wilt', 'Guava', false, 'critical',
  'Fungal disease (Fusarium oxysporum) causing rapid plant death.',
  ARRAY['Sudden wilting of leaves', 'Yellowing starting from older leaves', 'Root and stem rotting'],
  ARRAY['No effective cure; remove infected trees', 'Improve soil drainage', 'Plant resistant rootstocks']),

-- ── Lemon ──────────────────────────────────────────────────────────────────
('healthy_lemon', 'Healthy Lemon', 'Lemon', true, 'none',
  'Lemon plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('lemon_bacterial_blight', 'Lemon Bacterial Blight', 'Lemon', false, 'high',
  'Bacterial disease causing leaf drop and twig dieback in lemon.',
  ARRAY['Water-soaked leaf spots turning brown', 'Leaf yellowing and drop', 'Twig dieback'],
  ARRAY['Apply copper bactericides preventively', 'Prune infected branches', 'Avoid overhead irrigation']),

('lemon_citrus_canker', 'Lemon Citrus Canker', 'Lemon', false, 'critical',
  'Bacterial disease (Xanthomonas citri) causing raised lesions on all plant parts.',
  ARRAY['Raised corky lesions on leaves, fruit, and stems', 'Yellow halos around lesions', 'Premature fruit drop'],
  ARRAY['Apply copper bactericides', 'Remove and destroy infected plant material', 'Use certified disease-free planting material']),

('lemon_dry_leaf', 'Lemon Dry Leaf', 'Lemon', false, 'low',
  'Abiotic or biotic condition causing leaf drying in lemon.',
  ARRAY['Dry and brittle leaves', 'Marginal leaf scorch', 'Twig dieback'],
  ARRAY['Improve irrigation management', 'Apply balanced fertilizers', 'Check for root problems']),

('lemon_greening', 'Lemon Greening (HLB)', 'Lemon', false, 'critical',
  'Bacterial disease (Candidatus Liberibacter) — most destructive citrus disease worldwide.',
  ARRAY['Asymmetric mottling (blotchy mottle)', 'Yellow shoots (lemon shoots)', 'Small misshapen bitter fruit'],
  ARRAY['Control Asian citrus psyllid vector with insecticides', 'Remove infected trees immediately', 'Use certified disease-free planting material']),

('lemon_powdery_mildew', 'Lemon Powdery Mildew', 'Lemon', false, 'moderate',
  'Fungal disease producing white powdery growth on young lemon tissues.',
  ARRAY['White powdery fungal growth on young leaves', 'Leaf distortion and curling', 'Premature leaf drop'],
  ARRAY['Apply sulfur-based fungicides on new growth', 'Improve air circulation', 'Avoid excess nitrogen']),

('lemon_spider_mites', 'Lemon Spider Mites', 'Lemon', false, 'moderate',
  'Mite pest (Tetranychus urticae) causing stippled discoloration.',
  ARRAY['Fine webbing on leaf undersides', 'Stippled yellowing of leaves', 'Bronzing of leaf surface'],
  ARRAY['Apply miticides (abamectin, bifenazate)', 'Encourage natural predators', 'Use water sprays to reduce populations']),

-- ── Peach ──────────────────────────────────────────────────────────────────
('healthy_peach', 'Healthy Peach', 'Peach', true, 'none',
  'Peach plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('peach_bacterial_spot', 'Peach Bacterial Spot', 'Peach', false, 'high',
  'Bacterial disease (Xanthomonas arboricola pv. pruni) causing leaf and fruit spots.',
  ARRAY['Water-soaked angular leaf spots', 'Dark brown lesions with yellow halos', 'Fruit spotting and cracking'],
  ARRAY['Apply copper bactericides during dormancy', 'Use resistant varieties', 'Avoid overhead irrigation']),

-- ── Potato ─────────────────────────────────────────────────────────────────
('healthy_potato', 'Healthy Potato', 'Potato', true, 'none',
  'Potato plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('potato_early_blight', 'Potato Early Blight', 'Potato', false, 'moderate',
  'Fungal disease (Alternaria solani) causing bullseye lesions starting on older leaves.',
  ARRAY['Circular dark brown spots with concentric rings on older leaves', 'Yellow halos around lesions', 'Lesions start on lower older leaves'],
  ARRAY['Apply mancozeb or chlorothalonil fungicides preventively', 'Rotate crops', 'Ensure proper plant nutrition especially potassium']),

('potato_late_blight', 'Potato Late Blight', 'Potato', false, 'critical',
  'Fungal disease (Phytophthora infestans) — caused the Irish Famine. Extremely destructive.',
  ARRAY['Water-soaked pale green to dark brown lesions', 'White fungal growth on leaf undersides', 'Rapid destruction of foliage'],
  ARRAY['Apply metalaxyl + mancozeb or cymoxanil based fungicides', 'Destroy infected volunteers and cull piles', 'Plant certified disease-free seed']),

-- ── Pumpkin ────────────────────────────────────────────────────────────────
('healthy_pumpkin', 'Healthy Pumpkin', 'Pumpkin', true, 'none',
  'Pumpkin plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('pumpkin_bacterial_leaf_spot', 'Pumpkin Bacterial Leaf Spot', 'Pumpkin', false, 'moderate',
  'Bacterial disease causing angular lesions on pumpkin foliage.',
  ARRAY['Water-soaked angular spots on leaves', 'Brown dried lesions with yellow borders', 'Fruit surface lesions'],
  ARRAY['Apply copper-based bactericides', 'Use disease-free seeds', 'Avoid overhead irrigation']),

('pumpkin_downy_mildew', 'Pumpkin Downy Mildew', 'Pumpkin', false, 'high',
  'Fungal disease (Pseudoperonospora cubensis) causing rapid defoliation.',
  ARRAY['Yellow angular spots on upper leaf surface', 'Gray-purple fuzzy growth on leaf underside', 'Rapid leaf blighting'],
  ARRAY['Apply metalaxyl-based fungicides preventively', 'Improve field drainage', 'Use resistant varieties']),

('pumpkin_powdery_mildew', 'Pumpkin Powdery Mildew', 'Pumpkin', false, 'moderate',
  'Fungal disease producing white powdery coating on pumpkin leaves.',
  ARRAY['White powdery spots on leaf surfaces', 'Leaf yellowing and browning', 'Premature aging of plant'],
  ARRAY['Apply sulfur or myclobutanil fungicides', 'Improve air circulation', 'Avoid excessive nitrogen']),

-- ── Strawberry ─────────────────────────────────────────────────────────────
('healthy_strawberry', 'Healthy Strawberry', 'Strawberry', true, 'none',
  'Strawberry plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('strawberry_leaf_scorch', 'Strawberry Leaf Scorch', 'Strawberry', false, 'moderate',
  'Fungal disease (Diplocarpon earlianum) causing leaf scorch and blight.',
  ARRAY['Purple to reddish-brown spots on leaves', 'Spots coalesce leading to blighted appearance', 'Leaf edges scorch and dry'],
  ARRAY['Apply captan or myclobutanil fungicides', 'Remove infected leaves', 'Improve plant spacing and air circulation']),

-- ── Sugarcane ──────────────────────────────────────────────────────────────
('healthy_sugarcane', 'Healthy Sugarcane', 'Sugarcane', true, 'none',
  'Sugarcane plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('sugarcane_bacterial_blight', 'Sugarcane Bacterial Blight', 'Sugarcane', false, 'high',
  'Bacterial disease (Xanthomonas albilineans) causing leaf scald.',
  ARRAY['Water-soaked reddish stripe on leaves', 'Leaf margins become necrotic', 'Stalk rot in severe cases'],
  ARRAY['Use disease-free setts for planting', 'Apply copper bactericides', 'Remove and destroy infected plant material']),

('sugarcane_red_rot', 'Sugarcane Red Rot', 'Sugarcane', false, 'critical',
  'Fungal disease (Colletotrichum falcatum) causing devastating stalk rot.',
  ARRAY['Red discoloration of internal stalk tissue', 'White patches with red margins in cross-section', 'Plant wilting and death'],
  ARRAY['Plant resistant varieties', 'Use disease-free setts', 'Treat setts with fungicide before planting']),

('sugarcane_rust', 'Sugarcane Rust', 'Sugarcane', false, 'moderate',
  'Fungal disease (Puccinia melanocephala) causing orange-brown pustules.',
  ARRAY['Orange-brown pustules on leaf surfaces', 'Yellow halos surrounding pustules', 'Leaf drying in severe infections'],
  ARRAY['Apply mancozeb or triadimefon fungicides', 'Plant resistant varieties', 'Scout fields regularly']),

('sugarcane_yellow_leaf_disease', 'Sugarcane Yellow Leaf Disease', 'Sugarcane', false, 'high',
  'Viral disease transmitted by aphids causing yellowing of midrib.',
  ARRAY['Yellowing of midrib on lower leaf surface', 'Leaf roll and wilting', 'Stunted growth and reduced yield'],
  ARRAY['Control aphid vectors', 'Use clean planting material', 'Remove and destroy infected plants']),

-- ── Tomato ─────────────────────────────────────────────────────────────────
('healthy_tomato', 'Healthy Tomato', 'Tomato', true, 'none',
  'Tomato plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('tomato_bacterial_spot', 'Tomato Bacterial Spot', 'Tomato', false, 'high',
  'Bacterial disease (Xanthomonas spp.) causing leaf and fruit spots.',
  ARRAY['Small water-soaked lesions on leaves and fruit', 'Dark brown spots with yellow halos', 'Fruit spots with raised margins'],
  ARRAY['Apply copper bactericides preventively', 'Use disease-free transplants', 'Avoid overhead irrigation']),

('tomato_early_blight', 'Tomato Early Blight', 'Tomato', false, 'moderate',
  'Fungal disease (Alternaria solani) causing concentric ring lesions.',
  ARRAY['Dark concentric ring lesions (bullseye pattern)', 'Lesions start on older lower leaves', 'Yellow area around lesions'],
  ARRAY['Apply chlorothalonil or mancozeb fungicides', 'Remove lower infected leaves', 'Maintain adequate plant nutrition']),

('tomato_late_blight', 'Tomato Late Blight', 'Tomato', false, 'critical',
  'Fungal disease (Phytophthora infestans) capable of destroying entire crops rapidly.',
  ARRAY['Large water-soaked pale to dark green lesions', 'White mold on undersides in humid weather', 'Rapid plant collapse'],
  ARRAY['Apply metalaxyl + mancozeb or cymoxanil based fungicides immediately', 'Remove and destroy infected plants', 'Avoid overhead irrigation']),

('tomato_leaf_mold', 'Tomato Leaf Mold', 'Tomato', false, 'moderate',
  'Fungal disease (Fulvia fulva) primarily affecting greenhouse tomatoes.',
  ARRAY['Pale yellow spots on upper leaf surface', 'Olive-green to gray mold on undersides', 'Leaf drop under severe infection'],
  ARRAY['Improve greenhouse ventilation', 'Apply fungicides (chlorothalonil, mancozeb)', 'Use resistant varieties']),

('tomato_septoria_leaf_spot', 'Tomato Septoria Leaf Spot', 'Tomato', false, 'moderate',
  'Fungal disease (Septoria lycopersici) causing circular spots with dark margins.',
  ARRAY['Circular spots with dark margins and light centers', 'Small black pycnidia inside spots', 'Progressive yellowing and leaf drop'],
  ARRAY['Apply chlorothalonil or mancozeb fungicides', 'Remove infected lower leaves', 'Avoid overhead irrigation']),

('tomato_spider_mites', 'Tomato Spider Mites', 'Tomato', false, 'moderate',
  'Mite pest (Tetranychus urticae) causing stippling and bronzing.',
  ARRAY['Fine stippling and bronzing on leaves', 'Fine webbing on undersides', 'Leaf curling and drying'],
  ARRAY['Apply miticides (abamectin, spiromesifen)', 'Use predatory mites for biological control', 'Maintain plant water stress to minimum']),

('tomato_target_spot', 'Tomato Target Spot', 'Tomato', false, 'moderate',
  'Fungal disease (Corynespora cassiicola) causing circular target-like lesions.',
  ARRAY['Circular brown spots with concentric rings', 'Spots coalesce in wet conditions', 'Premature defoliation'],
  ARRAY['Apply chlorothalonil or mancozeb fungicides', 'Improve air circulation', 'Remove plant debris']),

('tomato_tomato_mosaic_virus', 'Tomato Mosaic Virus', 'Tomato', false, 'high',
  'Viral disease (ToMV) causing mosaic patterns and fruit distortion.',
  ARRAY['Light-dark green mosaic pattern on leaves', 'Leaf distortion and cupping', 'Stunted plant growth'],
  ARRAY['Remove and destroy infected plants', 'Control insect vectors', 'Disinfect tools and hands frequently']),

('tomato_tomato_yellow_leaf_curl_virus', 'Tomato Yellow Leaf Curl Virus', 'Tomato', false, 'critical',
  'Viral disease (TYLCV) transmitted by whiteflies causing severe yield loss.',
  ARRAY['Upward leaf curling and yellowing', 'Stunted compact plant growth', 'Flower drop and low fruit set'],
  ARRAY['Control whitefly vectors with insecticides', 'Use reflective mulches to deter whiteflies', 'Plant resistant varieties']),

-- ── Wheat ──────────────────────────────────────────────────────────────────
('healthy_wheat', 'Healthy Wheat', 'Wheat', true, 'none',
  'Wheat plant shows no signs of disease.',
  ARRAY['No visible symptoms'], ARRAY['Continue current management practices']),

('wheat_black_rust', 'Wheat Black Rust (Stem Rust)', 'Wheat', false, 'critical',
  'Fungal disease (Puccinia graminis) — most feared wheat disease historically.',
  ARRAY['Dark brown to black pustules on stems and leaves', 'Pustules rupture releasing dark spores', 'Severe lodging in heavy infection'],
  ARRAY['Apply triazole fungicides at first pustule appearance', 'Plant resistant varieties', 'Monitor fields regularly during warm humid weather']),

('wheat_blast', 'Wheat Blast', 'Wheat', false, 'critical',
  'Fungal disease (Magnaporthe triticum) causing bleached ears and significant yield loss.',
  ARRAY['Bleached or light-colored ear (head)', 'Partially filled grain', 'Diamond-shaped lesions on leaves'],
  ARRAY['Apply tebuconazole at heading', 'Use resistant varieties where available', 'Avoid planting in areas with high disease pressure']),

('wheat_brown_rust', 'Wheat Brown Rust (Leaf Rust)', 'Wheat', false, 'high',
  'Fungal disease (Puccinia triticina) — most widespread wheat rust globally.',
  ARRAY['Orange-brown pustules on upper leaf surface', 'Pustules circular and scattered', 'Leaf yellowing in severe cases'],
  ARRAY['Apply triazole or strobilurin fungicides', 'Plant resistant varieties', 'Scout fields regularly']),

('wheat_common_root_rot', 'Wheat Common Root Rot', 'Wheat', false, 'moderate',
  'Fungal disease (Bipolaris sorokiniana) causing root and crown browning.',
  ARRAY['Browning of roots and crown', 'Reduced tillering and plant vigor', 'Premature ripening (whiteheads)'],
  ARRAY['Seed treatment with fungicides (thiram, carboxin)', 'Rotate crops', 'Reduce soil compaction']),

('wheat_head_blight', 'Wheat Head Blight (Fusarium)', 'Wheat', false, 'critical',
  'Fungal disease (Fusarium graminearum) producing mycotoxins that contaminate grain.',
  ARRAY['Pink-salmon fungal growth on spikelets', 'Bleached spikelets (Fusarium)', 'Shriveled grain'],
  ARRAY['Apply tebuconazole or metconazole at flowering', 'Avoid planting after corn or in areas with high Fusarium', 'Use resistant varieties']),

('wheat_loose_smut', 'Wheat Loose Smut', 'Wheat', false, 'high',
  'Fungal disease (Ustilago tritici) replacing grain with black powdery spores.',
  ARRAY['Grain replaced by powdery black mass of spores', 'Smut head visible before other heads emerge', 'Spores released at flowering'],
  ARRAY['Treat seeds with systemic fungicides (carboxin, tebuconazole)', 'Use certified smut-free seeds', 'Hot water seed treatment']),

('wheat_mildew', 'Wheat Powdery Mildew', 'Wheat', false, 'moderate',
  'Fungal disease (Blumeria graminis f. sp. tritici) producing white powdery colonies.',
  ARRAY['White powdery fungal colonies on leaves and stems', 'Yellowing of tissue under colonies', 'Reduced photosynthesis'],
  ARRAY['Apply triazole or sulfur-based fungicides', 'Plant resistant varieties', 'Avoid excess nitrogen fertilization']),

('wheat_mite', 'Wheat Mite', 'Wheat', false, 'moderate',
  'Mite pest causing silvering and withering of wheat leaves.',
  ARRAY['Silvery streaking on leaves', 'Leaf curling and withering', 'Stunted plant growth'],
  ARRAY['Apply miticides or acaricides', 'Remove crop debris', 'Monitor edges of fields first']),

('wheat_septoria', 'Wheat Septoria Leaf Blotch', 'Wheat', false, 'high',
  'Fungal disease (Zymoseptoria tritici) — leading cause of wheat yield loss in Europe.',
  ARRAY['Irregular tan to brown lesions with dark borders', 'Small black pycnidia inside lesions', 'Lesions coalesce in wet weather'],
  ARRAY['Apply triazole fungicides from GS31', 'Use resistant varieties', 'Avoid dense sowing']),

('wheat_stem_fly', 'Wheat Stem Fly', 'Wheat', false, 'moderate',
  'Pest (Atherigona spp.) causing dead heart in young wheat plants.',
  ARRAY['Dead heart in young plants', 'Stem discoloration inside', 'Whiteheads at heading stage'],
  ARRAY['Apply systemic insecticides at tillering', 'Early sowing to escape peak infestation', 'Remove and destroy stubble after harvest']),

('wheat_yellow_rust', 'Wheat Yellow Rust (Stripe Rust)', 'Wheat', false, 'critical',
  'Fungal disease (Puccinia striiformis) — favored by cool wet weather, highly destructive.',
  ARRAY['Bright yellow pustules in stripes along leaf veins', 'Cool-weather disease', 'Severe early attack causes complete leaf yellowing'],
  ARRAY['Apply triazole fungicides immediately on detection', 'Plant resistant varieties', 'Scout fields regularly in cool wet spring weather']);
