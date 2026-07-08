export type Sentence = { fr: string; pt: string; theme?: string };
export type ThemeSentences = { theme: string; sentences: Sentence[] };

function parseSentenceList(data: unknown): Sentence[] {
  if (!Array.isArray(data)) throw new Error("Le JSON doit contenir un tableau de phrases");
  return data
    .filter((d): d is Record<string, unknown> => Boolean(d) && typeof d === "object")
    .filter((d) => typeof d.fr === "string" && typeof d.pt === "string")
    .map((d) => ({ fr: d.fr.trim(), pt: d.pt.trim() }));
}

function parseTextSentences(text: string): Sentence[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const sep = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ";";
      const [fr, pt] = line.split(sep).map((s) => s?.trim() ?? "");
      if (!fr || !pt) throw new Error(`Ligne invalide: ${line}`);
      return { fr, pt };
    });
}

function toThemeName(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function flattenThemeSentences(themes: ThemeSentences[]): Sentence[] {
  return themes.flatMap(({ theme, sentences }) =>
    sentences.map((sentence) => ({ ...sentence, theme: sentence.theme ?? theme }))
  );
}

export function mergeThemeSentences(themes: ThemeSentences[]): ThemeSentences[] {
  const map = new Map<string, ThemeSentences>();
  for (const themeGroup of themes) {
    const key = themeGroup.theme.trim() || "Général";
    const existing = map.get(key);
    if (existing) {
      existing.sentences.push(...themeGroup.sentences);
    } else {
      map.set(key, { theme: key, sentences: [...themeGroup.sentences] });
    }
  }
  return Array.from(map.values()).filter((group) => group.sentences.length > 0);
}

export const defaultThemes: ThemeSentences[] = [
  {
    theme: "Salutations",
    sentences: [
      { fr: "Bonjour, comment ça va ?", pt: "Olá, como você está?" },
      { fr: "Je suis ravi de te voir.", pt: "Estou muito feliz em te ver." },
      { fr: "Quel beau jour aujourd'hui !", pt: "Que dia bonito hoje!" },
    ],
  },
  {
    theme: "Voyage",
    sentences: [
      { fr: "Où se trouve la gare ?", pt: "Onde fica a estação de trem?" },
      { fr: "Je voudrais réserver une chambre.", pt: "Eu queria reservar um quarto." },
      { fr: "Quand part le prochain bus ?", pt: "Quando sai o próximo ônibus?" },
    ],
  },
  {
    theme: "Cuisine",
    sentences: [
      { fr: "Je voudrais un café, s'il vous plaît.", pt: "Eu queria um café, por favor." },
      { fr: "Cet endroit sert de très bons plats.", pt: "Este lugar serve pratos muito bons." },
      { fr: "Avez-vous des options végétariennes ?", pt: "Vocês têm opções vegetarianas?" },
    ],
  },
  {
    theme: "Shopping",
    sentences: [
      { fr: "Combien coûte cet article ?", pt: "Quanto custa este item?" },
      { fr: "Je cherche une taille plus grande.", pt: "Estou procurando um tamanho maior." },
      { fr: "Pouvez-vous m'aider à trouver ceci ?", pt: "Você pode me ajudar a encontrar isso?" },
    ],
  },
];

export const defaultSentences: Sentence[] = flattenThemeSentences(defaultThemes);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type WordDiff = { word: string; status: "ok" | "wrong" | "missing" | "extra" };

// Simple LCS-based diff between expected and actual tokens.
export function diffWords(expected: string, actual: string): {
  expected: WordDiff[];
  actual: WordDiff[];
  score: number;
} {
  const e = normalize(expected).split(" ").filter(Boolean);
  const a = normalize(actual).split(" ").filter(Boolean);
  const m = e.length, n = a.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = e[i - 1] === a[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const expectedDiff: WordDiff[] = [];
  const actualDiff: WordDiff[] = [];
  let i = m, j = n;
  const matchedE = new Array(m).fill(false);
  const matchedA = new Array(n).fill(false);
  while (i > 0 && j > 0) {
    if (e[i - 1] === a[j - 1]) {
      matchedE[i - 1] = true;
      matchedA[j - 1] = true;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  for (let k = 0; k < m; k++) {
    expectedDiff.push({ word: e[k], status: matchedE[k] ? "ok" : "missing" });
  }
  for (let k = 0; k < n; k++) {
    actualDiff.push({ word: a[k], status: matchedA[k] ? "ok" : "extra" });
  }
  const score = m === 0 ? 0 : Math.round((dp[m][n] / m) * 100);
  return { expected: expectedDiff, actual: actualDiff, score };
}

export function parseThemeSentencesFile(text: string, fallbackTheme = "Général"): ThemeSentences[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) {
      if (data.every((item) => item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).sentences))) {
        return data
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            theme: toThemeName(item.theme, fallbackTheme),
            sentences: parseSentenceList(item.sentences),
          }))
          .filter((group) => group.sentences.length > 0);
      }
      return [{ theme: fallbackTheme, sentences: parseSentenceList(data) }].filter((group) => group.sentences.length > 0);
    }

    if (data && typeof data === "object") {
      const maybeThemes = Array.isArray((data as Record<string, unknown>).themes)
        ? ((data as Record<string, unknown>).themes as unknown[])
        : [];
      if (maybeThemes.length) {
        return maybeThemes
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .map((item) => ({
            theme: toThemeName(item.theme, fallbackTheme),
            sentences: parseSentenceList(item.sentences),
          }))
          .filter((group) => group.sentences.length > 0);
      }
      return [{
        theme: toThemeName((data as Record<string, unknown>).theme, fallbackTheme),
        sentences: parseSentenceList((data as Record<string, unknown>).sentences),
      }].filter((group) => group.sentences.length > 0);
    }

    throw new Error("Le JSON n'est pas au bon format");
  }

  return [{ theme: fallbackTheme, sentences: parseTextSentences(trimmed) }].filter((group) => group.sentences.length > 0);
}

export async function loadThemeSentencesFromFiles(files: File[]): Promise<ThemeSentences[]> {
  const parsedThemes = await Promise.all(
    files.map(async (file) => {
      const text = await file.text();
      const fallbackTheme = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      return parseThemeSentencesFile(text, fallbackTheme || "Général");
    })
  );

  return mergeThemeSentences(parsedThemes.flat());
}
