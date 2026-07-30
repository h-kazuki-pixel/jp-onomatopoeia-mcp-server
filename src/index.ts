#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import type { CategoryId, OnomatopoeiaEntry } from "./types.js";
import {
  CATEGORIES,
  ENTRIES,
  entriesByCategory,
  findEntry,
  isValidCategory,
} from "./data/index.js";
import { formatEntries, formatEntry, formatSummaryLine, searchEntries } from "./search.js";

const SERVER_NAME = "jp-onomatopoeia-mcp-server";
const SERVER_VERSION = "1.0.0";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const TYPE_IDS = ["giongo", "giseigo", "gitaigo", "gijougo"] as const;

/** 構造化出力で返す1件分の形 */
const entryOutputShape = {
  word: z.string(),
  romaji: z.string(),
  type: z.string(),
  categories: z.array(z.string()),
  meaning_ja: z.string(),
  meaning_en: z.string(),
  example_ja: z.string(),
  example_en: z.string(),
  nuance: z.string(),
};

type EntryOutput = {
  word: string;
  romaji: string;
  type: string;
  categories: string[];
  meaning_ja: string;
  meaning_en: string;
  example_ja: string;
  example_en: string;
  nuance: string;
};

function toOutput(entry: OnomatopoeiaEntry): EntryOutput {
  return {
    word: entry.word,
    romaji: entry.romaji,
    type: entry.type,
    categories: [...entry.categories],
    meaning_ja: entry.meaning_ja,
    meaning_en: entry.meaning_en,
    example_ja: entry.example_ja,
    example_en: entry.example_en,
    nuance: entry.nuance,
  };
}

export const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// ---------------------------------------------------------------------------
// 1. 検索
// ---------------------------------------------------------------------------
server.registerTool(
  "jp_search_onomatopoeia",
  {
    title: "Search Japanese onomatopoeia",
    description: `場面や意味から日本語のオノマトペ(擬音語・擬態語)を検索する。日本語でも英語でも検索できる。

Search Japanese onomatopoeia by scene, meaning, or keyword. Queries may be in Japanese or English.

Args:
  - query (string): 探したい場面や意味。例: "雨が静かに降る", "snow falling silently", "tired"
  - category (string, optional): カテゴリで絞り込む。jp_list_onomatopoeia_categories で一覧を取得できる
  - limit (number): 返す件数の上限 1-20 (default: 5)

Returns:
  {
    "query": string,
    "count": number,
    "results": [ { "word", "romaji", "type", "categories", "meaning_ja", "meaning_en", "example_ja", "example_en", "nuance" } ],
    "message": string  // 該当なしの場合の案内
  }

Examples:
  - "雨が静かに降る様子は?" -> query="雨 静か 降る"
  - "How do I say the sound of heavy rain?" -> query="heavy rain"
  - Don't use when: 特定の語の意味だけを知りたい場合は jp_explain_onomatopoeia を使う`,
    inputSchema: {
      query: z
        .string()
        .min(1, "query は1文字以上で指定してください")
        .max(200, "query は200文字以内で指定してください")
        .describe("探したい場面・意味・キーワード(日本語または英語)"),
      category: z
        .enum(CATEGORY_IDS)
        .optional()
        .describe("カテゴリで絞り込む場合に指定する"),
      limit: z.number().int().min(1).max(20).default(5).describe("返す件数の上限"),
    },
    outputSchema: {
      query: z.string(),
      count: z.number(),
      results: z.array(z.object(entryOutputShape)),
      message: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ query, category, limit }) => {
    const hits = searchEntries({ query, category, limit });
    const message =
      hits.length > 0
        ? ""
        : `「${query}」に該当するオノマトペは見つかりませんでした。より一般的な語(例: 雨・笑う・疲れる・rain・laugh)で試すか、jp_list_onomatopoeia_categories でカテゴリ一覧を確認してください。`;

    const output = {
      query,
      count: hits.length,
      results: hits.map(toOutput),
      message,
    };

    const text =
      hits.length > 0
        ? formatEntries(hits, `「${query}」の検索結果: ${hits.length}件`)
        : message;

    return { content: [{ type: "text" as const, text }], structuredContent: output };
  },
);

// ---------------------------------------------------------------------------
// 2. 語の解説
// ---------------------------------------------------------------------------
server.registerTool(
  "jp_explain_onomatopoeia",
  {
    title: "Explain a Japanese onomatopoeia",
    description: `特定のオノマトペの意味・分類・例文・使い分けのニュアンスを解説する。

Explain the meaning, category, example sentence, and nuance of a specific Japanese onomatopoeia.

Args:
  - word (string): 見出し語またはローマ字。例: "しんしん", "shinshin"

Returns:
  {
    "found": boolean,
    "entry": { "word", "romaji", "type", "categories", "meaning_ja", "meaning_en", "example_ja", "example_en", "nuance" } | null,
    "message": string
  }

Examples:
  - 「もふもふってどういう意味?」 -> word="もふもふ"
  - "What does dokidoki mean?" -> word="dokidoki"

Error Handling:
  - 収録されていない語の場合は found=false を返し、jp_search_onomatopoeia の利用を案内する`,
    inputSchema: {
      word: z
        .string()
        .min(1, "word は1文字以上で指定してください")
        .max(50, "word は50文字以内で指定してください")
        .describe("解説したいオノマトペ(ひらがな・カタカナ・ローマ字)"),
    },
    outputSchema: {
      found: z.boolean(),
      entry: z.object(entryOutputShape).nullable(),
      message: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ word }) => {
    const entry = findEntry(word);

    if (!entry) {
      const message = `「${word}」は辞書に収録されていません。jp_search_onomatopoeia で意味や場面から検索すると、近い語が見つかる場合があります。`;
      return {
        content: [{ type: "text" as const, text: message }],
        structuredContent: { found: false, entry: null, message },
      };
    }

    return {
      content: [{ type: "text" as const, text: formatEntry(entry) }],
      structuredContent: { found: true, entry: toOutput(entry), message: "" },
    };
  },
);

// ---------------------------------------------------------------------------
// 3. カテゴリ一覧
// ---------------------------------------------------------------------------
server.registerTool(
  "jp_list_onomatopoeia_categories",
  {
    title: "List onomatopoeia categories",
    description: `収録カテゴリの一覧と、各カテゴリの語数を返す。

List all available categories with the number of entries in each.

Args: なし

Returns:
  {
    "total_entries": number,
    "categories": [ { "id", "name_ja", "name_en", "count" } ]
  }

Examples:
  - 「どんな種類のオノマトペが入ってる?」 -> 引数なしで呼び出す`,
    inputSchema: {},
    outputSchema: {
      total_entries: z.number(),
      categories: z.array(
        z.object({
          id: z.string(),
          name_ja: z.string(),
          name_en: z.string(),
          count: z.number(),
        }),
      ),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    const categories = CATEGORIES.map((c) => ({
      id: c.id,
      name_ja: c.name_ja,
      name_en: c.name_en,
      count: entriesByCategory(c.id).length,
    }));

    const text = [
      `収録語数: ${ENTRIES.length}語 / カテゴリ数: ${categories.length}`,
      "",
      ...categories.map((c) => `- \`${c.id}\` ${c.name_ja} (${c.name_en}) — ${c.count}語`),
    ].join("\n");

    return {
      content: [{ type: "text" as const, text }],
      structuredContent: { total_entries: ENTRIES.length, categories },
    };
  },
);

// ---------------------------------------------------------------------------
// 4. カテゴリ・分類での一覧取得
// ---------------------------------------------------------------------------
server.registerTool(
  "jp_browse_onomatopoeia",
  {
    title: "Browse onomatopoeia by category",
    description: `カテゴリや分類(擬音語・擬態語など)で絞り込んで一覧を取得する。

Browse onomatopoeia filtered by category and/or linguistic type, with pagination.

Args:
  - category (string, optional): カテゴリID。jp_list_onomatopoeia_categories で確認できる
  - type (string, optional): 'giongo'(擬音語) | 'giseigo'(擬声語) | 'gitaigo'(擬態語) | 'gijougo'(擬情語)
  - limit (number): 返す件数 1-50 (default: 20)
  - offset (number): 読み飛ばす件数 (default: 0)

Returns:
  {
    "total": number, "count": number, "offset": number, "has_more": boolean,
    "results": [ { ...entry } ], "message": string
  }

Examples:
  - 「食感のオノマトペを一覧で見せて」 -> category="taste"
  - 「擬情語だけ見たい」 -> type="gijougo"`,
    inputSchema: {
      category: z.enum(CATEGORY_IDS).optional().describe("カテゴリIDで絞り込む"),
      type: z.enum(TYPE_IDS).optional().describe("言語学的な分類で絞り込む"),
      limit: z.number().int().min(1).max(50).default(20).describe("返す件数"),
      offset: z.number().int().min(0).default(0).describe("読み飛ばす件数"),
    },
    outputSchema: {
      total: z.number(),
      count: z.number(),
      offset: z.number(),
      has_more: z.boolean(),
      results: z.array(z.object(entryOutputShape)),
      message: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ category, type, limit, offset }) => {
    let pool = ENTRIES;
    if (category && isValidCategory(category)) pool = pool.filter((e) => e.categories.includes(category));
    if (type) pool = pool.filter((e) => e.type === type);

    const page = pool.slice(offset, offset + limit);
    const hasMore = offset + page.length < pool.length;
    const message =
      pool.length === 0 ? "条件に一致するオノマトペはありませんでした。条件を緩めて再度お試しください。" : "";

    const label = [category ? `category=${category}` : null, type ? `type=${type}` : null]
      .filter(Boolean)
      .join(", ");
    const heading = `${label || "全件"}: ${pool.length}語中 ${offset + 1}〜${offset + page.length}件`;

    const text =
      page.length > 0 ? [heading, "", ...page.map(formatSummaryLine)].join("\n") : message;

    return {
      content: [{ type: "text" as const, text }],
      structuredContent: {
        total: pool.length,
        count: page.length,
        offset,
        has_more: hasMore,
        results: page.map(toOutput),
        message,
      },
    };
  },
);

// ---------------------------------------------------------------------------
// 5. ランダム取得(学習・遊び用)
// ---------------------------------------------------------------------------
server.registerTool(
  "jp_random_onomatopoeia",
  {
    title: "Get random onomatopoeia",
    description: `ランダムにオノマトペを取り出す。日本語学習のクイズや「今日の一語」に使える。

Pick random onomatopoeia entries. Useful for daily-word features and quizzes.

Args:
  - count (number): 取り出す件数 1-10 (default: 1)
  - category (string, optional): カテゴリで絞り込む

Returns:
  { "count": number, "results": [ { ...entry } ], "message": string }

Examples:
  - 「今日のオノマトペを1つ教えて」 -> count=1
  - 「食感の語で3問クイズを作って」 -> count=3, category="taste"`,
    inputSchema: {
      count: z.number().int().min(1).max(10).default(1).describe("取り出す件数"),
      category: z.enum(CATEGORY_IDS).optional().describe("カテゴリで絞り込む"),
    },
    outputSchema: {
      count: z.number(),
      results: z.array(z.object(entryOutputShape)),
      message: z.string(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async ({ count, category }) => {
    const pool = category ? entriesByCategory(category) : ENTRIES;

    if (pool.length === 0) {
      const message = "指定のカテゴリに語が見つかりませんでした。";
      return {
        content: [{ type: "text" as const, text: message }],
        structuredContent: { count: 0, results: [], message },
      };
    }

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = shuffled[i] as OnomatopoeiaEntry;
      shuffled[i] = shuffled[j] as OnomatopoeiaEntry;
      shuffled[j] = tmp;
    }
    const picked = shuffled.slice(0, Math.min(count, shuffled.length));

    return {
      content: [{ type: "text" as const, text: formatEntries(picked, `ランダム抽出: ${picked.length}件`) }],
      structuredContent: { count: picked.length, results: picked.map(toOutput), message: "" },
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio (${ENTRIES.length} entries)`);
}

const isDirectRun = process.argv[1] !== undefined && process.argv[1].endsWith("index.js");
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
