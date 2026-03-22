# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

主要ITベンダー（OpenAI, Anthropic, Google等）のAI関連ニュースを日次で自動収集し、Gemini APIで要約してNotionデータベースに蓄積する自動化パイプライン。MCP (Model Context Protocol) の学習も兼ねた設計。

## Tech Stack

- **言語:** TypeScript (Node.js)
- **実行環境:** GitHub Actions (日次 Cron バッチ)
- **AI/LLM:** Gemini API（要約・重要度判定・キーワード抽出）
- **データストア:** Notion API
- **アーキテクチャ:** Notion連携部分をMCPサーバー/クライアントモデルとして実装

## Commands

> **Note:** プロジェクト初期段階のため、package.json が追加されたらここにビルド・テスト・リントのコマンドを記載すること。

想定コマンド（package.json 追加後に確認・更新すること）:
```bash
npm install          # 依存関係インストール
npm run build        # TypeScript コンパイル
npm run start        # メインパイプライン実行
npm test             # テスト実行
npm run lint         # リント
```

## Architecture

処理は3段階のパイプラインで構成される:

1. **Information Fetcher** (`src/fetcher/`) — RSSフィードや指定URLから24時間以内の記事を取得
2. **AI Summarizer** (`src/ai/`) — 取得記事をGemini APIに送り、`summary`・`importance`・`keywords` をJSON形式で抽出
3. **Notion MCP Client/Server** (`src/mcp/`) — 抽出データをNotion APIでDBに書き込む

エントリーポイントは `src/index.ts`（メインコントローラー）。GitHub Actions の設定は `.github/workflows/daily_sync.yml`。

## Notion Database Schema

| プロパティ | タイプ | 説明 |
|:---|:---|:---|
| Title | `title` | 記事タイトル |
| Date | `date` | 記事公開日または取得日 |
| Vendor | `select` | OpenAI / Google / Anthropic / Microsoft 等 |
| Importance | `select` | High / Medium / Low（Geminiが判定） |
| URL | `url` | 元記事リンク |
| Keywords | `multi_select` または `rich_text` | `#LLM #API` などのハッシュタグ形式 |
| ページ本文 | `page content` | Gemini生成の詳細要約（Markdown） |

## Gemini Prompt Design

Geminiには以下の役割・出力形式を指定する:
- **役割:** シニアソフトウェアエンジニア
- **タスク:** ITニュース記事から他エンジニアに有益な情報を抽出
- **出力:** JSON Schema形式で `summary`・`importance`・`keywords` の3フィールド

## Design Reference

詳細設計は [plans/design_doc.md](plans/design_doc.md) を参照。
