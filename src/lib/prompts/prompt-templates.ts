import templates from "./prompt-templates.json";

type PromptTemplates = typeof templates;

function renderTemplateLines(lines: string[], variables: Record<string, string>) {
  return lines.map((line) => {
    let rendered = line;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replaceAll(`{{${key}}}`, value);
    }
    return rendered;
  });
}

export const promptTemplates = templates as PromptTemplates;

export function getOpenAiPromptValidationInstructions(variables: {
  PROMPT_VALIDATION_CATEGORIES_JSON: string;
}) {
  return renderTemplateLines(promptTemplates.openai.promptValidation.instructions, variables).join(
    "\n",
  );
}

export function getOpenAiImageSafetyInstructions() {
  return promptTemplates.openai.imageSafety.instructions.join("\n");
}

export function getOpenAiDayThemeInstructions(variables: { RECENT_THEMES_KO_JSON: string }) {
  return renderTemplateLines(promptTemplates.openai.dayTheme.instructions, variables).join("\n");
}

export function getPlatedDishSuffixEn() {
  return promptTemplates.generation.platedDishSuffixEn;
}

export function getDayThemeImagePrefixEn() {
  return promptTemplates.generation.dayThemeImagePrefixEn;
}
