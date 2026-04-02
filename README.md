# AI News Aggregator

主要ITベンダー（OpenAI, Anthropic, Google 等）のAI関連ニュースを週次で自動収集し、Gemini API で要約して Notion データベースに蓄積する自動化パイプライン。

## 機能概要

- RSSフィードから各ベンダーの最新記事を取得
- Gemini API でエンジニア向けの要約・キーワード抽出・ユーザーへの影響分析を生成
- Notion データベースに構造化して保存
- GitHub Actions で毎週月曜日 JST 9:00 に自動実行

## ローカル実行

```bash
# 依存関係インストール
npm install

# .env ファイルを作成
cp .env.example .env
# .env を編集して各種 API キーを設定

# TypeScript を直接実行（ビルド不要）
npm run start:ts

# またはビルドしてから実行
npm run build
npm start
```

## GitHub Actions で動かすための準備

GitHub Actions で自動実行するには、リポジトリの **[Settings] > [Secrets and variables] > [Actions]** に以下の Secrets を登録してください。

| Secret 名 | 説明 |
|:---|:---|
| `GEMINI_API_KEY` | Gemini API のキー（Google AI Studio で発行） |
| `NOTION_API_KEY` | Notion Integration のトークン（Notion の設定画面で発行） |
| `NOTION_PARENT_PAGE_ID` | 新規 DB を作成する親ページの ID（Notion ページ URL 末尾の 32 文字） |
| `ENABLED_VENDORS` | 取得対象ベンダー（例: `OpenAI,Google,Microsoft,Meta,Anthropic`） |
| `FEED_URL_OPENAI` | OpenAI ブログの RSS フィード URL |
| `FEED_URL_GOOGLE` | Google AI ブログの RSS フィード URL |
| `FEED_URL_MICROSOFT` | Microsoft AI ブログの RSS フィード URL |
| `FEED_URL_META` | Meta Engineering ブログの RSS フィード URL |
| `FEED_URL_ANTHROPIC` | Anthropic リリースノートの取得 URL（Jina Reader 経由） |

> **Note:** `HOURS_LOOKBACK` は Workflow 内で `168`（7日間）に直接指定済みのため、Secret 登録は不要です。

### Notion Integration のセットアップ

1. [Notion Integrations](https://www.notion.so/my-integrations) で新規 Integration を作成
2. 発行されたトークンを `NOTION_API_KEY` に登録
3. 親ページを開き、右上メニューから **Connections > 作成した Integration** を追加
4. ページ URL（`https://www.notion.so/.../<PAGE_ID>`）の末尾 32 文字を `NOTION_PARENT_PAGE_ID` に登録

## アーキテクチャ

```
GitHub Actions (週次 Cron)
  └─ src/index.ts
       ├─ src/fetcher/   — RSS フィードから記事取得
       ├─ src/ai/        — Gemini API で要約・分析
       └─ src/mcp/       — Notion API で DB 保存
```

## 技術スタック

- **言語:** TypeScript (Node.js)
- **AI/LLM:** Gemini API (`gemini-2.5-flash`)
- **データストア:** Notion API
- **実行環境:** GitHub Actions
