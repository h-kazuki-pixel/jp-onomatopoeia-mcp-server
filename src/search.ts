import type { CategoryId, OnomatopoeiaEntry, SearchHit } from "./types.js";
import { ENTRIES, categoryName } from "./data/index.js";

/** 分類の表示名 */
const TYPE_LABEL: Record<OnomatopoeiaEntry["type"], string> = {
  giongo: "擬音語 (giongo / sound of things)",
  giseigo: "擬声語 (giseigo / voices and cries)",
  gitaigo: "擬態語 (gitaigo / states and appearances)",
  gijougo: "擬情語 (gijougo / inner feelings)",
};

/**
 * 検索クエリを語に分割する。
 * 日本語は空白で区切られないため、空白区切りに加えて
 * クエリ全体もひとつの語として扱う。
 */
export function tokenize(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];
  const parts = normalized.split(/[\s、。,.]+/u).filter((p) => p.length > 0);
  const tokens = new Set<string>(parts);
  tokens.add(normalized);
  return [...tokens];
}

interface FieldWeight {
  readonly name: string;
  readonly weight: number;
  readonly value: (entry: OnomatopoeiaEntry) => string;
}

/** 重み付き検索対象フィールド。見出し語ほど高い配点にする */
const FIELDS: FieldWeight[] = [
  { name: "word", weight: 10, value: (e) => e.word },
  { name: "romaji", weight: 8, value: (e) => e.romaji },
  { name: "keywords", weight: 6, value: (e) => e.keywords.join(" ") },
  { name: "meaning_ja", weight: 4, value: (e) => e.meaning_ja },
  { name: "meaning_en", weight: 4, value: (e) => e.meaning_en },
  { name: "example_ja", weight: 2, value: (e) => e.example_ja },
  { name: "example_en", weight: 2, value: (e) => e.example_en },
  { name: "nuance", weight: 1, value: (e) => e.nuance },
];

function scoreEntry(entry: OnomatopoeiaEntry, tokens: string[]): { score: number; matched: string[] } {
  let score = 0;
  const matched = new Set<string>();

  for (const field of FIELDS) {
    const haystack = field.value(entry).toLowerCase();
    for (const token of tokens) {
      if (token.length === 0 || !haystack.includes(token)) continue;
      // 完全一致はさらに加点する
      const exact = haystack === token;
      score += field.weight * (exact ? 2 : 1) * Math.min(token.length, 4);
      matched.add(field.name);
    }
  }

  return { score, matched: [...matched] };
}

export interface SearchOptions {
  readonly query: string;
  readonly category?: CategoryId;
  readonly limit: number;
}

/** キーワード検索を実行する。スコアの高い順に返す */
export function searchEntries({ query, category, limit }: SearchOptions): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const pool = category ? ENTRIES.filter((e) => e.categories.includes(category)) : ENTRIES;
  const hits: SearchHit[] = [];

  for (const entry of pool) {
    const { score, matched } = scoreEntry(entry, tokens);
    if (score > 0) {
      hits.push({ ...entry, score, matched_on: matched });
    }
  }

  hits.sort((a, b) => (b.score - a.score) || a.word.localeCompare(b.word, "ja"));
  return hits.slice(0, limit);
}

/** 1件をMarkdownに整形する */
export function formatEntry(entry: OnomatopoeiaEntry): string {
  const cats = entry.categories.map(categoryName).join(" / ");
  return [
    `### ${entry.word} (${entry.romaji})`,
    `- 分類: ${TYPE_LABEL[entry.type]}`,
    `- カテゴリ: ${cats}`,
    `- 意味: ${entry.meaning_ja}`,
    `- Meaning: ${entry.meaning_en}`,
    `- 例文: ${entry.example_ja}`,
    `- Example: ${entry.example_en}`,
    `- ニュアンス: ${entry.nuance}`,
  ].join("\n");
}

/** 複数件をMarkdownに整形する */
export function formatEntries(entries: OnomatopoeiaEntry[], heading: string): string {
  if (entries.length === 0) return heading;
  return [heading, "", ...entries.map(formatEntry)].join("\n\n");
}

/** 一覧表示用の1行要約 */
export function formatSummaryLine(entry: OnomatopoeiaEntry): string {
  return `- **${entry.word}** (${entry.romaji}) — ${entry.meaning_ja} / ${entry.meaning_en}`;
}
