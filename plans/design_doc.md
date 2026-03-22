# AI News Aggregator & Summarizer 構築設計書

## 1. プロジェクト概要
主要ITベンダー（OpenAI, Anthropic, Google等）の最新AI関連ニュースを日次で自動収集し、Gemini APIを用いて技術者向けに要約。その結果をNotionデータベースに蓄積する自動化パイプライン。
また、本プロジェクトは次世代AIアーキテクチャである「MCP (Model Context Protocol)」の学習も兼ねており、Notionへの書き込みなどのコンポーネントをMCPサーバーとして切り出す（またはその概念を取り入れた）設計とする。

## 2. 技術スタック
- **言語:** TypeScript (Node.js環境)
- **実行環境:** GitHub Actions (Cronによる日次バッチ実行)
- **AI/LLM:** Gemini API (要約・重要度判定・タグ抽出用)
- **データストア:** Notion API
- **コーディング支援:** Claude Code (自律型AIエージェント)
- **アーキテクチャ:** 一部機能をMCPサーバー/クライアントモデルとして実装

## 3. システムアーキテクチャと処理フロー
本システムは、GitHub Actions上で以下のフローを日次で実行する。

1. **Information Fetcher (情報収集)**
   - 各ベンダーの公式ブログRSSや指定URLから、最新記事（24時間以内）を取得する。
2. **AI Summarizer (要約とメタデータ抽出)**
   - 取得した記事テキストをGemini APIに送信し、プロンプトにて「技術者向けの要約（Markdown）」「重要度」「検索用キーワード（#ハッシュタグ形式）」を出力させる。
3. **Notion MCP Client/Server (データ蓄積)**
   - 抽出したデータをNotion APIを介して指定のデータベースに書き込む。

## 4. Notion データベース設計 (スキーマ)
| プロパティ名 | タイプ | 説明 |
| :--- | :--- | :--- |
| Title (タイトル) | `title` | 記事のタイトル |
| Date (日付) | `date` | 記事の公開日（または取得日） |
| Vendor (ベンダー) | `select` | OpenAI, Google, Anthropic, Microsoft など |
| Importance (重要度) | `select` | High, Medium, Low (Geminiが判定) |
| URL (元URL) | `url` | ニュース元記事のリンク |
| Keywords (キーワード) | `multi_select` または `rich_text` | `#LLM #API #Gemini` などのハッシュタグ |
| ページ本文 | `page content` | Geminiが生成した詳細な要約（Markdown形式） |

## 5. 期待するGeminiのプロンプト設計（方針）
- 役割: あなたはシニアソフトウェアエンジニアです。
- タスク: 提供されたITニュース記事を読み、他のエンジニアにとって有益な情報を抽出してください。
- 出力フォーマット（JSON Schemaを活用）: `summary`, `importance`, `keywords` の3点。

## 6. ディレクトリ構成（想定）
```text
.
├── .github/
│   └── workflows/
│       └── daily_sync.yml     # GitHub Actions設定
├── plans/
│   └── design_doc.md          # プロジェクト全体設計書（本ファイル）
├── src/
│   ├── index.ts               # メインコントローラー（エントリーポイント）
│   ├── fetcher/               # 情報収集モジュール
│   ├── ai/                    # Gemini API連携モジュール
│   └── mcp/                   # Notion連携 MCPサーバー/クライアントモジュール
├── package.json
├── tsconfig.json
└── README.md