import type { Category, CategoryId, OnomatopoeiaEntry } from "../types.js";
import { NATURE_ENTRIES } from "./nature.js";
import { SOUND_ENTRIES } from "./sound.js";
import { EMOTION_ENTRIES } from "./emotion.js";
import { SENSE_ENTRIES } from "./sense.js";
import { MOVEMENT_ENTRIES } from "./movement.js";

/** 全カテゴリの定義 */
export const CATEGORIES: Category[] = [
  { id: "weather", name_ja: "天気・気候", name_en: "Weather and climate" },
  { id: "water", name_ja: "水・液体", name_en: "Water and liquids" },
  { id: "sound", name_ja: "物音・声", name_en: "Sounds and voices" },
  { id: "emotion", name_ja: "感情・心情", name_en: "Emotions and feelings" },
  { id: "texture", name_ja: "触感・質感", name_en: "Texture and feel" },
  { id: "taste", name_ja: "味・食感", name_en: "Taste and mouthfeel" },
  { id: "movement", name_ja: "動き・歩き方", name_en: "Movement and gait" },
  { id: "light", name_ja: "光・輝き", name_en: "Light and shine" },
  { id: "body", name_ja: "体調・痛み・眠り", name_en: "Body, pain and sleep" },
  { id: "manner", name_ja: "様子・態度・仕事ぶり", name_en: "Manner, attitude and work style" },
  { id: "animal", name_ja: "動物の鳴き声", name_en: "Animal cries" },
];

/** 全見出し語(重複なし) */
export const ENTRIES: OnomatopoeiaEntry[] = [
  ...NATURE_ENTRIES,
  ...SOUND_ENTRIES,
  ...EMOTION_ENTRIES,
  ...SENSE_ENTRIES,
  ...MOVEMENT_ENTRIES,
];

const ENTRY_INDEX = new Map<string, OnomatopoeiaEntry>();
for (const entry of ENTRIES) {
  ENTRY_INDEX.set(entry.word, entry);
  ENTRY_INDEX.set(entry.romaji.toLowerCase(), entry);
}

/** 見出し語またはローマ字から1件を取得する */
export function findEntry(word: string): OnomatopoeiaEntry | undefined {
  const key = word.trim();
  return ENTRY_INDEX.get(key) ?? ENTRY_INDEX.get(key.toLowerCase());
}

/** カテゴリIDが有効かを判定する */
export function isValidCategory(id: string): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id);
}

/** カテゴリIDから表示名を取得する */
export function categoryName(id: CategoryId): string {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? `${found.name_ja} (${found.id})` : id;
}

/** カテゴリに属する語を取得する */
export function entriesByCategory(id: CategoryId): OnomatopoeiaEntry[] {
  return ENTRIES.filter((e) => e.categories.includes(id));
}
