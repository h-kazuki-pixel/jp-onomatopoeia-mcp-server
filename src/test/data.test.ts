import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORIES,
  ENTRIES,
  categoryName,
  entriesByCategory,
  findEntry,
  isValidCategory,
} from "../data/index.js";

const VALID_TYPES = new Set(["giongo", "giseigo", "gitaigo", "gijougo"]);

test("辞書に十分な語数が収録されている", () => {
  assert.ok(ENTRIES.length >= 150, `語数が少なすぎます: ${ENTRIES.length}`);
});

test("見出し語に重複がない", () => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const e of ENTRIES) {
    if (seen.has(e.word)) duplicates.push(e.word);
    seen.add(e.word);
  }
  assert.deepEqual(duplicates, []);
});

test("ローマ字表記に重複がない", () => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const e of ENTRIES) {
    if (seen.has(e.romaji)) duplicates.push(e.romaji);
    seen.add(e.romaji);
  }
  assert.deepEqual(duplicates, []);
});

test("全ての語で必須フィールドが空でない", () => {
  for (const e of ENTRIES) {
    for (const key of [
      "word",
      "romaji",
      "meaning_ja",
      "meaning_en",
      "example_ja",
      "example_en",
      "nuance",
    ] as const) {
      assert.ok(e[key].trim().length > 0, `${e.word} の ${key} が空です`);
    }
  }
});

test("分類(type)が全て有効な値である", () => {
  for (const e of ENTRIES) {
    assert.ok(VALID_TYPES.has(e.type), `${e.word} の type が不正: ${e.type}`);
  }
});

test("全ての語が1つ以上の有効なカテゴリを持つ", () => {
  for (const e of ENTRIES) {
    assert.ok(e.categories.length > 0, `${e.word} にカテゴリがありません`);
    for (const c of e.categories) {
      assert.ok(isValidCategory(c), `${e.word} のカテゴリが不正: ${c}`);
    }
  }
});

test("ローマ字は半角英小文字とハイフンのみで構成される", () => {
  for (const e of ENTRIES) {
    assert.match(e.romaji, /^[a-z-]+$/u, `${e.word} のローマ字が不正: ${e.romaji}`);
  }
});

test("全ての語に検索用キーワードが3つ以上ある", () => {
  for (const e of ENTRIES) {
    assert.ok(e.keywords.length >= 3, `${e.word} のキーワードが不足しています`);
  }
});

test("全ての語に日本語キーワードと英語キーワードの両方がある", () => {
  const hasJa = /[ぁ-んァ-ヶ一-龠]/u;
  const hasEn = /^[a-z\s-]+$/u;
  for (const e of ENTRIES) {
    assert.ok(e.keywords.some((k) => hasJa.test(k)), `${e.word} に日本語キーワードがありません`);
    assert.ok(e.keywords.some((k) => hasEn.test(k)), `${e.word} に英語キーワードがありません`);
  }
});

test("例文に見出し語が含まれている(表記ゆれ確認)", () => {
  // 見出し語がそのまま例文に現れない語は、意図的な活用形のみ許容する
  const allowed = new Set(["こんこん", "からっと", "ぼんやり"]);
  for (const e of ENTRIES) {
    if (allowed.has(e.word)) continue;
    assert.ok(
      e.example_ja.includes(e.word),
      `${e.word} の例文に見出し語が含まれていません: ${e.example_ja}`,
    );
  }
});

test("全てのカテゴリに1語以上が属している", () => {
  for (const c of CATEGORIES) {
    assert.ok(entriesByCategory(c.id).length > 0, `カテゴリ ${c.id} が空です`);
  }
});

test("カテゴリIDに重複がない", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("findEntry は見出し語で検索できる", () => {
  const entry = findEntry("しんしん");
  assert.ok(entry);
  assert.equal(entry.romaji, "shinshin");
});

test("findEntry はローマ字で検索できる", () => {
  const entry = findEntry("dokidoki");
  assert.ok(entry);
  assert.equal(entry.word, "どきどき");
});

test("findEntry は大文字のローマ字でも検索できる", () => {
  const entry = findEntry("MOFUMOFU");
  assert.ok(entry);
  assert.equal(entry.word, "もふもふ");
});

test("findEntry は前後の空白を無視する", () => {
  const entry = findEntry("  わくわく  ");
  assert.ok(entry);
  assert.equal(entry.romaji, "wakuwaku");
});

test("findEntry は未収録語に undefined を返す", () => {
  assert.equal(findEntry("そんなことばはない"), undefined);
});

test("isValidCategory が不正なIDを弾く", () => {
  assert.equal(isValidCategory("taste"), true);
  assert.equal(isValidCategory("nonexistent"), false);
});

test("categoryName が日本語名を含む文字列を返す", () => {
  assert.match(categoryName("weather"), /天気/u);
});

test("entriesByCategory は該当カテゴリの語のみを返す", () => {
  const list = entriesByCategory("animal");
  assert.ok(list.length > 0);
  for (const e of list) {
    assert.ok(e.categories.includes("animal"));
  }
});

test("代表的な語が収録されている", () => {
  for (const word of ["しとしと", "わくわく", "もちもち", "てきぱき", "わんわん"]) {
    assert.ok(findEntry(word), `${word} が収録されていません`);
  }
});

test("説明文に機密情報らしき文字列が含まれない", () => {
  // 英単語としての "secret" は例文に現れうるため、
  // 認証情報らしい「形」(代入・接頭辞・長い16進文字列)のみを検出する
  const forbidden =
    /(api[_-]?key|passwd|(password|secret|token)\s*[:=]|bearer\s+[a-z0-9]|sk-[a-z0-9]{10,}|[a-f0-9]{32,})/iu;
  for (const e of ENTRIES) {
    const blob = [e.meaning_ja, e.meaning_en, e.example_ja, e.example_en, e.nuance].join(" ");
    assert.doesNotMatch(blob, forbidden, `${e.word} に不審な文字列があります`);
  }
});
