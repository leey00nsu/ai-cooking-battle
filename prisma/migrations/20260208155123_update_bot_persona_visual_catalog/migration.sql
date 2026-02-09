INSERT INTO "bot_persona" ("personaKey", "displayName", "stylePrompt", "styleGroup", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'bot_triple_silhouette',
    '트리플 실루엣',
    'extreme precision plating, razor-straight alignment, pristine white tableware, controlled minimalist composition, studio crisp lighting',
    'precision_minimal',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_napoli_darkness',
    '나폴리 다크니스',
    'moody italian vintage kitchen, deep shadows, glossy olive-oil highlights, rustic ceramic plate, dramatic cinematic contrast',
    'italian_moody',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_kitchen_madness',
    '키친 매드니스',
    'flame-burst wok-pan action, sparks and dynamic smoke trails, rough textured plating, high-energy motion scene, hot orange highlights',
    'fire_action',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_bibim_royal',
    '비빔 로열',
    'geometric bibimbap arrangement, vivid multi-color vegetables, glossy gochujang swirl, top-down composition, clean radial symmetry',
    'korean_color_geometry',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_yakitori_king',
    '야키토리 제왕',
    'charcoal-grilled skewers, red ember glow, rising smoke, lacquered sauce sheen, night-stall atmosphere with strong depth',
    'charcoal_grill',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_dimsum_empress',
    '딤섬의 여제',
    'elegant dim sum spread, delicate dumpling skin folds, abundant steam clouds, saturated chinese color accents, luxury banquet mood',
    'dimsum_craft',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_kaiseki_prince',
    '가이세키 프린스',
    'ultra-minimal kaiseki plating, soft neutral palette, precise negative space, refined seasonal garnish, calm zen composition',
    'japanese_minimal',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_crazy_technician',
    '크레이지 테크니션',
    'molecular gastronomy visuals, aromatic foam, transparent gel spheres, unexpected textures, futuristic plating with controlled chaos',
    'molecular_experimental',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_organic_maestro',
    '오가닉 마에스트로',
    'forest-foraged herbs and edible flowers, organic earthy tones, natural asymmetry, handcrafted ceramic plate, fresh morning light',
    'organic_naturalist',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_sauce_alchemist',
    '소스의 마법사',
    'artistic sauce brush strokes, layered color gradients on plate, high-detail glossy textures, contemporary fine-dining presentation',
    'sauce_artistry',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("personaKey") DO UPDATE
SET
  "displayName" = EXCLUDED."displayName",
  "stylePrompt" = EXCLUDED."stylePrompt",
  "styleGroup" = EXCLUDED."styleGroup",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "bot_persona"
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "personaKey" NOT IN (
  'bot_triple_silhouette',
  'bot_napoli_darkness',
  'bot_kitchen_madness',
  'bot_bibim_royal',
  'bot_yakitori_king',
  'bot_dimsum_empress',
  'bot_kaiseki_prince',
  'bot_crazy_technician',
  'bot_organic_maestro',
  'bot_sauce_alchemist'
);
