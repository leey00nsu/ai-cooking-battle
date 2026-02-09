INSERT INTO "bot_persona" ("personaKey", "displayName", "stylePrompt", "styleGroup", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'bot_triple_silhouette',
    '트리플 실루엣',
    'ultra-precise plating, razor-sharp alignment, spotless fine-dining discipline, highly controlled composition',
    'fine_dining',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_napoli_darkness',
    '나폴리 다크니스',
    'dark italian vintage kitchen mood, dramatic olive oil gloss, moody cinematic lighting, rich rustic texture',
    'italian_vintage',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_kitchen_madness',
    '키친 매드니스',
    'flaming pan action, dynamic smoke trails, aggressive heat, rough but intentional plating, kinetic energy',
    'high_heat',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_ree_innovator',
    '리 이노베이터',
    'east-west fusion narrative, philosophical plating concept, experimental form factor, modern gastronomy storytelling',
    'fusion_experimental',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_imokase_legend',
    '이모카세 레전드',
    'abundant korean table setting, hearty comfort food, rustic earthenware steam, warm homestyle atmosphere',
    'korean_hearty',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_schoolmeal_queen',
    '급식의 여왕',
    'large-portion home meal aesthetics, glossy family-style dishes, tidy tray arrangement, practical abundance',
    'korean_hearty',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_manga_recipe',
    '만화책 레시피',
    '2D comic-book food rendering, pop-art palette, graphic outlines, playful exaggerated visual effects',
    'stylized_pop',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_dimsum_empress',
    '딤섬의 여제',
    'luxurious steam-rich dim sum scene, delicate dumpling skin details, vivid chinese color accents',
    'dimsum_craft',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_one_two_finish',
    '원투 피니시',
    'mastery of fundamentals, perfectly seared protein surface, clean and efficient plating, no unnecessary garnish',
    'fine_dining',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'bot_wok_master',
    '철가방 웍마스터',
    'wok-fired ingredient toss, speed-driven motion blur, strong flame burst, intense street-kitchen rhythm',
    'high_heat',
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
