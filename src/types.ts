/**
 * オノマトペの分類
 * - giongo  (擬音語): 実際の音を模した語。「ざあざあ」「がちゃん」
 * - giseigo (擬声語): 人や動物の声を模した語。「わんわん」「げらげら」
 * - gitaigo (擬態語): 音のしない状態・様子を表す語。「きらきら」「そっと」
 * - gijougo (擬情語): 心の動きを表す語。「わくわく」「もやもや」
 */
export type OnomatopoeiaType = "giongo" | "giseigo" | "gitaigo" | "gijougo";

/** カテゴリID(意味領域) */
export type CategoryId =
  | "weather"
  | "water"
  | "sound"
  | "emotion"
  | "texture"
  | "taste"
  | "movement"
  | "light"
  | "body"
  | "manner"
  | "animal";

export interface Category {
  id: CategoryId;
  name_ja: string;
  name_en: string;
}

export interface OnomatopoeiaEntry {
  /** 見出し語(ひらがな/カタカナ) */
  word: string;
  /** ローマ字表記 */
  romaji: string;
  /** 分類 */
  type: OnomatopoeiaType;
  /** 意味領域(複数可) */
  categories: CategoryId[];
  /** 日本語の語義 */
  meaning_ja: string;
  /** 英語の語義 */
  meaning_en: string;
  /** 使用例(日本語) */
  example_ja: string;
  /** 使用例の英訳 */
  example_en: string;
  /** ニュアンス・使い分けの注意点 */
  nuance: string;
  /** 検索用キーワード(日英混在) */
  keywords: string[];
}

/** 検索結果 1件 */
export interface SearchHit extends OnomatopoeiaEntry {
  /** マッチの強さ(高いほど適合) */
  score: number;
  /** どのフィールドでマッチしたか */
  matched_on: string[];
}

/** 出力フォーマット */
export type ResponseFormat = "markdown" | "json";
