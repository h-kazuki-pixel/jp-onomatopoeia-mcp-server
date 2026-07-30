import { test } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { server } from "../index.js";

async function connect(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  return (await client.callTool({ name, arguments: args })) as ToolResult;
}

test("ツールが5つ登録されている", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "jp_browse_onomatopoeia",
    "jp_explain_onomatopoeia",
    "jp_list_onomatopoeia_categories",
    "jp_random_onomatopoeia",
    "jp_search_onomatopoeia",
  ]);
  await client.close();
});

test("全ツールに説明文が設定されている", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  for (const tool of tools) {
    assert.ok((tool.description ?? "").length > 50, `${tool.name} の説明が短すぎます`);
  }
  await client.close();
});

test("jp_search_onomatopoeia が検索結果を返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_search_onomatopoeia", { query: "雪 静か", limit: 3 });
  const sc = res.structuredContent as { count: number; results: Array<{ word: string }> };
  assert.ok(sc.count > 0);
  assert.equal(sc.results[0]?.word, "しんしん");
  assert.match(res.content?.[0]?.text ?? "", /しんしん/u);
  await client.close();
});

test("jp_search_onomatopoeia が該当なしを丁寧に返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_search_onomatopoeia", { query: "qqqzzzxxx" });
  const sc = res.structuredContent as { count: number; message: string };
  assert.equal(sc.count, 0);
  assert.ok(sc.message.length > 0);
  await client.close();
});

test("jp_search_onomatopoeia がカテゴリ絞り込みに対応する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_search_onomatopoeia", {
    query: "温かい",
    category: "taste",
    limit: 5,
  });
  const sc = res.structuredContent as { results: Array<{ categories: string[] }> };
  for (const r of sc.results) {
    assert.ok(r.categories.includes("taste"));
  }
  await client.close();
});

test("jp_search_onomatopoeia が不正なカテゴリを拒否する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_search_onomatopoeia", {
    query: "雨",
    category: "invalid_category",
  });
  assert.equal(res.isError, true);
  await client.close();
});

test("jp_explain_onomatopoeia が語を解説する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_explain_onomatopoeia", { word: "もふもふ" });
  const sc = res.structuredContent as { found: boolean; entry: { romaji: string } | null };
  assert.equal(sc.found, true);
  assert.equal(sc.entry?.romaji, "mofumofu");
  await client.close();
});

test("jp_explain_onomatopoeia がローマ字入力に対応する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_explain_onomatopoeia", { word: "shinshin" });
  const sc = res.structuredContent as { found: boolean; entry: { word: string } | null };
  assert.equal(sc.entry?.word, "しんしん");
  await client.close();
});

test("jp_explain_onomatopoeia が未収録語に案内を返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_explain_onomatopoeia", { word: "ぴよぴよぴよぴよ" });
  const sc = res.structuredContent as { found: boolean; entry: null; message: string };
  assert.equal(sc.found, false);
  assert.equal(sc.entry, null);
  assert.match(sc.message, /jp_search_onomatopoeia/u);
  await client.close();
});

test("jp_list_onomatopoeia_categories が全カテゴリを返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_list_onomatopoeia_categories", {});
  const sc = res.structuredContent as {
    total_entries: number;
    categories: Array<{ id: string; count: number }>;
  };
  assert.equal(sc.categories.length, 11);
  assert.ok(sc.total_entries >= 150);
  for (const c of sc.categories) {
    assert.ok(c.count > 0, `${c.id} が0件です`);
  }
  await client.close();
});

test("jp_browse_onomatopoeia がカテゴリで一覧を返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_browse_onomatopoeia", { category: "animal", limit: 50 });
  const sc = res.structuredContent as {
    total: number;
    results: Array<{ categories: string[] }>;
  };
  assert.ok(sc.total > 0);
  for (const r of sc.results) {
    assert.ok(r.categories.includes("animal"));
  }
  await client.close();
});

test("jp_browse_onomatopoeia が分類で絞り込める", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_browse_onomatopoeia", { type: "gijougo", limit: 50 });
  const sc = res.structuredContent as { results: Array<{ type: string }> };
  assert.ok(sc.results.length > 0);
  for (const r of sc.results) {
    assert.equal(r.type, "gijougo");
  }
  await client.close();
});

test("jp_browse_onomatopoeia のページングが機能する", async () => {
  const client = await connect();
  const first = await callTool(client, "jp_browse_onomatopoeia", { limit: 5, offset: 0 });
  const second = await callTool(client, "jp_browse_onomatopoeia", { limit: 5, offset: 5 });
  const a = first.structuredContent as { results: Array<{ word: string }>; has_more: boolean };
  const b = second.structuredContent as { results: Array<{ word: string }> };
  assert.equal(a.results.length, 5);
  assert.equal(a.has_more, true);
  assert.notEqual(a.results[0]?.word, b.results[0]?.word);
  await client.close();
});

test("jp_random_onomatopoeia が指定件数を返す", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_random_onomatopoeia", { count: 3 });
  const sc = res.structuredContent as { count: number; results: Array<{ word: string }> };
  assert.equal(sc.count, 3);
  assert.equal(new Set(sc.results.map((r) => r.word)).size, 3);
  await client.close();
});

test("jp_random_onomatopoeia がカテゴリ指定に対応する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_random_onomatopoeia", { count: 2, category: "weather" });
  const sc = res.structuredContent as { results: Array<{ categories: string[] }> };
  for (const r of sc.results) {
    assert.ok(r.categories.includes("weather"));
  }
  await client.close();
});

test("jp_random_onomatopoeia が上限を超える件数を拒否する", async () => {
  const client = await connect();
  const res = await callTool(client, "jp_random_onomatopoeia", { count: 99 });
  assert.equal(res.isError, true);
  await client.close();
});
