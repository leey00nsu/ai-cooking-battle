const DEFAULT_PICK_COUNT = 5;
const DEFAULT_MAX_PER_STYLE_GROUP = 2;

export type BotPersonaCandidate = {
  personaKey: string;
  styleGroup: string;
  isActive?: boolean | null;
};

export type SelectDailyPersonasInput = {
  dayKey: string;
  personas: BotPersonaCandidate[];
  pickCount?: number;
  maxPerStyleGroup?: number;
  random?: () => number;
};

export type DailyPersonaSelection = {
  selected: BotPersonaCandidate[];
  fallback: BotPersonaCandidate[];
};

function normalizeCandidates(personas: BotPersonaCandidate[]) {
  const unique = new Set<string>();
  const normalized: BotPersonaCandidate[] = [];

  for (const candidate of personas) {
    const personaKey = candidate.personaKey.toString().trim();
    const styleGroup = candidate.styleGroup.toString().trim();

    if (!personaKey || !styleGroup || candidate.isActive === false || unique.has(personaKey)) {
      continue;
    }

    unique.add(personaKey);
    normalized.push({ personaKey, styleGroup, isActive: true });
  }

  return normalized;
}

function normalizeRandomValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 0.999999;
  }
  return value;
}

function randomShuffle(candidates: BotPersonaCandidate[], random: () => number) {
  const shuffled = [...candidates];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const unit = normalizeRandomValue(random());
    const target = Math.floor(unit * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function buildSelectionFromOrdered(args: {
  ordered: BotPersonaCandidate[];
  pickCount: number;
  maxPerStyleGroup: number;
}) {
  const { ordered, pickCount, maxPerStyleGroup } = args;
  const selected: BotPersonaCandidate[] = [];
  const selectedKeys = new Set<string>();
  const groupCounts = new Map<string, number>();

  for (const candidate of ordered) {
    if (selected.length >= pickCount) {
      break;
    }
    const count = groupCounts.get(candidate.styleGroup) ?? 0;
    if (count >= maxPerStyleGroup) {
      continue;
    }
    selected.push(candidate);
    selectedKeys.add(candidate.personaKey);
    groupCounts.set(candidate.styleGroup, count + 1);
  }

  if (selected.length < pickCount) {
    for (const candidate of ordered) {
      if (selected.length >= pickCount) {
        break;
      }
      if (selectedKeys.has(candidate.personaKey)) {
        continue;
      }
      selected.push(candidate);
      selectedKeys.add(candidate.personaKey);
    }
  }

  const fallback = ordered.filter((candidate) => !selectedKeys.has(candidate.personaKey));

  return { selected, fallback };
}

export function selectDailyPersonas(args: SelectDailyPersonasInput): DailyPersonaSelection {
  const pickCount = Math.max(1, Math.floor(args.pickCount ?? DEFAULT_PICK_COUNT));
  const maxPerStyleGroup = Math.max(
    1,
    Math.floor(args.maxPerStyleGroup ?? DEFAULT_MAX_PER_STYLE_GROUP),
  );
  const random = args.random ?? Math.random;

  const activeCandidates = normalizeCandidates(args.personas);
  if (activeCandidates.length === 0) {
    return { selected: [], fallback: [] };
  }

  const ordered = randomShuffle(activeCandidates, random);
  return buildSelectionFromOrdered({
    ordered,
    pickCount,
    maxPerStyleGroup,
  });
}
