-- ============================================================================
-- PashuSetu · seed.sql — Part 0 reference data
-- 18 priority livestock/poultry diseases (ICAR/FAO/NADRES fact-sheet derived)
-- with Hindi + Marathi names, and sample Maharashtra villages.
-- Idempotent: safe to re-run.
-- ============================================================================

insert into public.diseases (code, name_en, name_hi, name_mr, species, symptoms, zoonotic, notifiable, seasonality) values
('FMD',  'Foot and Mouth Disease', 'खुरपका-मुंहपका रोग', 'लाळ्या खुरकूत', '{cattle,buffalo,sheep,goat,pig}',
 '["fever","mouth_blisters","drooling","lameness","foot_lesions","reduced_appetite","milk_drop"]', false, true, 'monsoon_winter'),
('LSD',  'Lumpy Skin Disease', 'लम्पी त्वचा रोग', 'लम्पी त्वचा रोग', '{cattle,buffalo}',
 '["fever","skin_nodules","swollen_lymph_nodes","milk_drop","nasal_discharge","reduced_appetite"]', false, true, 'monsoon_post_monsoon'),
('HS',   'Haemorrhagic Septicaemia', 'गलघोंटू', 'घटसर्प', '{cattle,buffalo}',
 '["high_fever","throat_swelling","difficulty_breathing","drooling","sudden_death"]', false, true, 'monsoon'),
('BQ',   'Black Quarter', 'लंगड़ी बुखार', 'फऱ्या', '{cattle,buffalo,sheep}',
 '["fever","lameness","muscle_swelling","crepitation","sudden_death"]', false, true, 'monsoon'),
('ANTH', 'Anthrax', 'गिल्टी रोग', 'फाशी रोग', '{cattle,buffalo,sheep,goat}',
 '["sudden_death","high_fever","bleeding_openings","swelling","staggering"]', true, true, 'summer_monsoon'),
('BRUC', 'Brucellosis', 'ब्रुसेलोसिस', 'ब्रुसेलोसिस', '{cattle,buffalo,goat,sheep}',
 '["abortion","retained_placenta","infertility","swollen_joints","milk_drop"]', true, true, 'year_round'),
('PPR',  'Peste des Petits Ruminants', 'पीपीआर (बकरी प्लेग)', 'पीपीआर (शेळी प्लेग)', '{sheep,goat}',
 '["fever","mouth_ulcers","diarrhoea","nasal_discharge","pneumonia","death"]', false, true, 'winter'),
('GOATPOX','Goat Pox', 'बकरी चेचक', 'देवी (शेळी)', '{goat,sheep}',
 '["fever","skin_pox_lesions","nasal_discharge","reduced_appetite"]', false, true, 'winter'),
('ET',   'Enterotoxaemia', 'एंटरोटॉक्सीमिया', 'आंत्रविषार', '{sheep,goat}',
 '["sudden_death","convulsions","bloating","diarrhoea"]', false, false, 'monsoon'),
('MAST', 'Mastitis', 'थनैला रोग', 'कासदाह (स्तनदाह)', '{cattle,buffalo,goat}',
 '["udder_swelling","abnormal_milk","milk_drop","udder_pain","fever"]', false, false, 'year_round'),
('THEIL','Theileriosis', 'थिलेरियोसिस', 'थायलेरिओसिस', '{cattle}',
 '["fever","swollen_lymph_nodes","anaemia","weakness","milk_drop"]', false, false, 'summer'),
('BABES','Babesiosis', 'बबेसियोसिस', 'बॅबेसिओसिस', '{cattle,buffalo}',
 '["fever","red_urine","anaemia","weakness","jaundice"]', false, false, 'summer_monsoon'),
('TRYP', 'Trypanosomiasis (Surra)', 'सर्रा रोग', 'सर्रा', '{cattle,buffalo,horse,camel}',
 '["intermittent_fever","weakness","circling","anaemia","oedema"]', false, false, 'monsoon'),
('RABIES','Rabies', 'रेबीज', 'रेबीज', '{cattle,buffalo,dog,goat,sheep}',
 '["behaviour_change","aggression","excess_salivation","paralysis","difficulty_swallowing"]', true, true, 'year_round'),
('BTV',  'Bluetongue', 'ब्लूटंग', 'निळी जीभ', '{sheep,goat}',
 '["fever","swollen_tongue","mouth_ulcers","nasal_discharge","lameness"]', false, true, 'monsoon_post_monsoon'),
('AI',   'Avian Influenza (Bird Flu)', 'बर्ड फ्लू', 'बर्ड फ्लू', '{poultry}',
 '["sudden_death","respiratory_distress","swollen_head","drop_egg_production","diarrhoea"]', true, true, 'winter'),
('ND',   'Newcastle Disease (Ranikhet)', 'रानीखेत रोग', 'राणीखेत रोग', '{poultry}',
 '["twisted_neck","paralysis","greenish_diarrhoea","respiratory_distress","drop_egg_production"]', false, true, 'winter'),
('CSF',  'Classical Swine Fever', 'सूअर ज्वर', 'स्वाइन फिव्हर', '{pig}',
 '["high_fever","purple_skin","huddling","diarrhoea","death"]', false, true, 'year_round')
on conflict (code) do nothing;

-- Sample Maharashtra villages (Pune / Ahmednagar / Nashik belt) ---------------
insert into public.villages (name, taluka, district, geo) values
('Shirur',      'Shirur',      'Pune',        st_geogfromtext('POINT(74.3742 18.8276)')),
('Ranjangaon',  'Shirur',      'Pune',        st_geogfromtext('POINT(74.2394 18.7754)')),
('Baramati',    'Baramati',    'Pune',        st_geogfromtext('POINT(74.5762 18.1514)')),
('Indapur',     'Indapur',     'Pune',        st_geogfromtext('POINT(75.0204 18.1124)')),
('Junnar',      'Junnar',      'Pune',        st_geogfromtext('POINT(73.8753 19.2094)')),
('Sangamner',   'Sangamner',   'Ahmednagar',  st_geogfromtext('POINT(74.2116 19.5771)')),
('Rahuri',      'Rahuri',      'Ahmednagar',  st_geogfromtext('POINT(74.6499 19.3927)')),
('Shrirampur',  'Shrirampur',  'Ahmednagar',  st_geogfromtext('POINT(74.6584 19.6216)')),
('Kopargaon',   'Kopargaon',   'Ahmednagar',  st_geogfromtext('POINT(74.4762 19.8825)')),
('Sinnar',      'Sinnar',      'Nashik',      st_geogfromtext('POINT(73.9989 19.8450)')),
('Niphad',      'Niphad',      'Nashik',      st_geogfromtext('POINT(74.1104 20.0771)')),
('Yeola',       'Yeola',       'Nashik',      st_geogfromtext('POINT(74.4894 20.0424)')),
('Malegaon',    'Malegaon',    'Nashik',      st_geogfromtext('POINT(74.5288 20.5537)')),
('Phaltan',     'Phaltan',     'Satara',      st_geogfromtext('POINT(74.4321 17.9805)')),
('Karad',       'Karad',       'Satara',      st_geogfromtext('POINT(74.1854 17.2900)'))
on conflict do nothing;
