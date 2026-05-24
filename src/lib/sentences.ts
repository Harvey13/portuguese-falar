export type Sentence = { fr: string; pt: string };

export const defaultSentences: Sentence[] = [
  { fr: "Je suis très heureux de te revoir.", pt: "Estou muito feliz de te ver de novo." },
  { fr: "Ça fait très longtemps qu'on ne s'est pas vus.", pt: "Faz muito tempo que a gente não se encontra." },
  { fr: "Je m'appelle Elvée.", pt: "O meu nome é Elvée." },
  { fr: "Je suis très heureux d'être ici avec toi.", pt: "Eu estou muito feliz em estar aqui com você." },
  { fr: "J'espère qu'on aura un excellent déjeuner ensemble.", pt: "Espero que a gente tenha um ótimo almoço juntos." },
  { fr: "Comment vas-tu vraiment ?", pt: "Como você está de verdade?" },
  { fr: "Je suis très heureux d'être ici avec vous.", pt: "Estou muito feliz de estar aqui com você." },
  { fr: "J'adore être avec toi.", pt: "Adoro estar com você." },
  { fr: "Tu es très spécial pour moi.", pt: "Você é muito especial pra mim." },
];

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

// Parse uploaded sentences file. Supports JSON array [{fr, pt}] or lines "fr | pt".
export function parseSentencesFile(text: string): Sentence[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) throw new Error("JSON must be an array");
    return data
      .filter((d) => d && typeof d.fr === "string" && typeof d.pt === "string")
      .map((d) => ({ fr: d.fr.trim(), pt: d.pt.trim() }));
  }
  return trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const sep = l.includes("|") ? "|" : l.includes("\t") ? "\t" : ";";
      const [fr, pt] = l.split(sep).map((s) => s?.trim() ?? "");
      if (!fr || !pt) throw new Error(`Ligne invalide: ${l}`);
      return { fr, pt };
    });
}
