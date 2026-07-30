import { test } from "node:test";
import assert from "node:assert/strict";

import { formatEntries, formatEntry, formatSummaryLine, searchEntries, tokenize } from "../search.js";
import { findEntry } from "../data/index.js";

test("tokenize は空白で語を分割する", () => {
  const tokens = tokenize("雨 静か");
  assert.ok(tokens.includes("雨"));
  assert.ok(tokens.includes("静か"));
});

test("tokenize はクエリ全体もトークンに含める", () => {
  assert.ok(tokenize("heavy rain").includes("heavy rain"));
});

test("tokenize は英語を小文字化する", () => {
  assert.ok(tokenize("Heavy Rain").includes("heavy"));
});

test("tokenize は空文字に空配列を返す", () => {
  assert.deepEqual(tokenize("   "), []);
});

test("tokenize は読点・句読点でも分割する", () => {
  const tokens = tokenize("雨、静か。");
  assert.ok(tokens.includes("雨"));
  assert.ok(tokens.includes("静か"));
});

test("日本語クエリで適切な語が1位になる(雪 静か)", () => {
  const hits = searchEntries({ query: "雪 静か", limit: 5 });
  assert.ok(hits.length > 0);
  assert.equal(hits[0]?.word, "しんしん");
});

test("英語クエリで検索できる(pouring rain)", () => {
  const hits = searchEntries({ query: "pouring rain", limit: 5 });
  assert.ok(hits.some((h) => h.word === "ざあざあ"));
});

test("英語クエリで検索できる(exhausted)", () => {
  const hits = searchEntries({ query: "exhausted", limit: 5 });
  assert.ok(hits.some((h) => h.word === "へとへと" || h.word === "くたくた"));
});

test("見出し語そのもので検索すると1位に来る", () => {
  const hits = searchEntries({ query: "もちもち", limit: 3 });
  assert.equal(hits[0]?.word, "もちもち");
});

test("ローマ字で検索できる", () => {
  const hits = searchEntries({ query: "tekipaki", limit: 3 });
  assert.equal(hits[0]?.word, "てきぱき");
});

test("意味からの検索ができる(緊張)", () => {
  const hits = searchEntries({ query: "緊張", limit: 10 });
  assert.ok(hits.some((h) => h.word === "どきどき"));
});

test("食感の検索ができる(crispy)", () => {
  const hits = searchEntries({ query: "crispy", limit: 10 });
  assert.ok(hits.some((h) => h.word === "かりかり" || h.word === "さくさく"));
});

test("limit で件数が制限される", () => {
  const hits = searchEntries({ query: "雨", limit: 2 });
  assert.ok(hits.length <= 2);
});

test("category で絞り込みが効く", () => {
  const hits = searchEntries({ query: "光", category: "light", limit: 10 });
  assert.ok(hits.length > 0);
  for (const h of hits) {
    assert.ok(h.categories.includes("light"));
  }
});

test("category 指定で対象外の語が除外される", () => {
  const hits = searchEntries({ query: "雨", category: "taste", limit: 10 });
  for (const h of hits) {
    assert.ok(h.categories.includes("taste"));
  }
});

test("該当なしの場合は空配列を返す", () => {
  const hits = searchEntries({ query: "zzzzqqqxxx", limit: 5 });
  assert.deepEqual(hits, []);
});

test("空クエリは空配列を返す", () => {
  assert.deepEqual(searchEntries({ query: "   ", limit: 5 }), []);
});

test("スコアは降順に並ぶ", () => {
  const hits = searchEntries({ query: "雨 降る", limit: 10 });
  for (let i = 1; i < hits.length; i += 1) {
    assert.ok((hits[i - 1]?.score ?? 0) >= (hits[i]?.score ?? 0));
  }
});

test("検索結果には matched_on が含まれる", () => {
  const hits = searchEntries({ query: "しんしん", limit: 1 });
  assert.ok((hits[0]?.matched_on.length ?? 0) > 0);
});

test("formatEntry に主要フィールドが含まれる", () => {
  const entry = findEntry("わくわく");
  assert.ok(entry);
  const text = formatEntry(entry);
  assert.match(text, /わくわく/u);
  assert.match(text, /wakuwaku/u);
  assert.match(text, /擬情語/u);
  assert.match(text, /Meaning:/u);
  assert.match(text, /ニュアンス:/u);
});

test("formatEntries は見出しと本文を結合する", () => {
  const entry = findEntry("ぐっすり");
  assert.ok(entry);
  const text = formatEntries([entry], "テスト見出し");
  assert.match(text, /テスト見出し/u);
  assert.match(text, /ぐっすり/u);
});

test("formatEntries は空配列で見出しのみを返す", () => {
  assert.equal(formatEntries([], "見出しのみ"), "見出しのみ");
});

test("formatSummaryLine は1行で語義を返す", () => {
  const entry = findEntry("そっと");
  assert.ok(entry);
  const line = formatSummaryLine(entry);
  assert.match(line, /^- \*\*そっと\*\*/u);
  assert.equal(line.includes("\n"), false);
});
