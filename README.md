# jp-onomatopoeia-mcp-server

[![CI](https://github.com/h-kazuki-pixel/jp-onomatopoeia-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/h-kazuki-pixel/jp-onomatopoeia-mcp-server/actions/workflows/ci.yml)

日本語のオノマトペ(擬音語・擬態語)を **場面から引ける** MCPサーバーです。
「雨が静かに降る様子」と伝えるだけで「しとしと」が返り、意味・例文・使い分けのニュアンスまで日本語と英語で説明します。

**161語収録 / 完全オフライン / APIキー不要**

> Search Japanese onomatopoeia by scene or feeling, not by spelling.
> Ask for "snow falling silently" and get しんしん, with nuance explained in both Japanese and English.
> 161 entries, fully offline, no API key required.

---

## なぜ作ったか

日本語のオノマトペは、辞書を引こうにも **綴りが分からないと引けない** という問題があります。
「雨が激しく降る音」を表す語を探したいのに、「ざあざあ」を知らなければ検索できません。

このサーバーは、その順序を逆にします。**意味や場面を投げれば、語のほうが出てくる**ようにしました。

日本語学習者、翻訳者、小説・漫画を書く人、そして「あの感じを表す言葉、なんだっけ」となった日本語話者のための道具です。

---

## 特徴

- **場面から引ける** — 「雪が静かに降る」「tired」のような自然文で検索できます
- **日英どちらでも検索可能** — 見出し語・ローマ字・意味・例文・キーワードを横断して探します
- **ニュアンスまで解説** — 「きらきら」と「ぎらぎら」の違いのような、辞書だけでは掴みにくい語感を収録
- **言語学的な分類つき** — 擬音語 / 擬声語 / 擬態語 / 擬情語 の4分類で絞り込めます
- **完全オフライン** — 外部APIを一切呼びません。APIキーもネットワーク接続も不要です

---

## 収録内容

161語を11カテゴリに分類しています。

| カテゴリID | 内容 | 語数 |
|---|---|---|
| `weather` | 天気・気候 | 20 |
| `water` | 水・液体 | 9 |
| `sound` | 物音・声 | 28 |
| `emotion` | 感情・心情 | 41 |
| `texture` | 触感・質感 | 24 |
| `taste` | 味・食感 | 23 |
| `movement` | 動き・歩き方 | 28 |
| `light` | 光・輝き | 6 |
| `body` | 体調・痛み・眠り | 29 |
| `manner` | 様子・態度・仕事ぶり | 47 |
| `animal` | 動物の鳴き声 | 10 |

※ 1つの語が複数カテゴリに属するため、合計は161を超えます。

---

## セットアップ

### 1. 取得してビルドする

```bash
git clone https://github.com/h-kazuki-pixel/jp-onomatopoeia-mcp-server.git
cd jp-onomatopoeia-mcp-server
npm install
npm run build
```

### 2. Claude Desktop に登録する

設定ファイルを開きます。

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

以下を追記します(パスはご自身の環境に合わせてください)。

```json
{
  "mcpServers": {
    "jp-onomatopoeia": {
      "command": "node",
      "args": ["/path/to/jp-onomatopoeia-mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Claude Desktop を再起動する

再起動後、ツールアイコンに `jp-onomatopoeia` が表示されれば完了です。

---

## 使い方

Claudeに普通に話しかけるだけです。

```
雪が音もなく降り続く様子を表すオノマトペは?
→ しんしん (shinshin) — 雪が音もなく静かに降り積もるさま
```

```
「きらきら」と「ぎらぎら」ってどう違うの?
→ 一字違いだが評価は正反対。きらきらは美しい輝き、
   ぎらぎらは不快なほどの強い光や、むき出しの欲望を表す
```

```
What's the Japanese word for the sound of heavy rain?
→ ざあざあ (zaazaa) — the sound of heavy, pouring rain
```

```
食感のオノマトペを一覧で見せて
→ もちもち / さくさく / しゃきしゃき / ぷりぷり ... (23語)
```

```
今日のオノマトペを1つ教えて
→ ランダムに1語を、意味・例文・ニュアンスつきで返します
```

---

## ツール一覧

| ツール名 | できること | 主な引数 |
|---|---|---|
| `jp_search_onomatopoeia` | 場面・意味・キーワードから検索(日英対応) | `query`, `category`, `limit` |
| `jp_explain_onomatopoeia` | 特定の語の意味・例文・ニュアンスを解説 | `word` |
| `jp_list_onomatopoeia_categories` | カテゴリ一覧と各語数を取得 | なし |
| `jp_browse_onomatopoeia` | カテゴリ・分類で絞り込んで一覧表示 | `category`, `type`, `limit`, `offset` |
| `jp_random_onomatopoeia` | ランダムに抽出(クイズ・今日の一語向け) | `count`, `category` |

### 分類(type)について

| 値 | 日本語 | 説明 |
|---|---|---|
| `giongo` | 擬音語 | 物が立てる音。「ざあざあ」「がちゃん」 |
| `giseigo` | 擬声語 | 人や動物の声。「わんわん」「げらげら」 |
| `gitaigo` | 擬態語 | 音のない状態や様子。「きらきら」「そっと」 |
| `gijougo` | 擬情語 | 心の動き。「わくわく」「もやもや」 |

---

## 開発

```bash
npm run build   # TypeScriptをビルド
npm test        # ビルドしてテストを実行(61件)
npm start       # サーバーを起動(stdio)
```

### テスト内容

- 辞書データの整合性(重複・必須項目・カテゴリの妥当性・例文と見出し語の一致など)
- 検索ロジック(日英クエリ、スコア順、カテゴリ絞り込み、該当なしの扱い)
- MCPサーバーの統合テスト(ツール登録、構造化出力、入力バリデーション)

---

## 収録語について

見出し語・語義・例文・ニュアンス解説はすべて本リポジトリのために書き起こしたものです。
既存の辞書データベースからの転載は含みません。

語義やニュアンスの記述に誤り・違和感があれば、Issue や Pull Request で教えていただけると助かります。
収録語の追加提案も歓迎します。

---

## ライセンス

MIT License — 詳細は [LICENSE](./LICENSE) を参照してください。
