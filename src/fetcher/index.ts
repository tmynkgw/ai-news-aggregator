import Parser from "rss-parser";
import { RawArticle, Vendor } from "../types";

const parser = new Parser();

// ENABLED_VENDORS から動的に VENDOR_FEEDS を構築
// 未設定の場合は全ベンダーを対象とする
const VENDOR_FEED_URL_MAP: Record<string, string | undefined> = {
  OpenAI: process.env.FEED_URL_OPENAI,
  Google: process.env.FEED_URL_GOOGLE,
  Microsoft: process.env.FEED_URL_MICROSOFT,
  Meta: process.env.FEED_URL_META,
  Anthropic: process.env.FEED_URL_ANTHROPIC,
};

const enabledVendors = (
  process.env.ENABLED_VENDORS ?? "OpenAI,Google,Microsoft,Meta,Anthropic"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const VENDOR_FEEDS: { vendor: Vendor; url: string }[] = [];

for (const vendorName of enabledVendors) {
  const url = VENDOR_FEED_URL_MAP[vendorName];
  if (!url) {
    console.warn(`[Fetcher] ${vendorName}: FEED_URL_${vendorName.toUpperCase()} が未設定のためスキップします`);
    continue;
  }
  if (vendorName !== "Anthropic") {
    VENDOR_FEEDS.push({ vendor: vendorName as Vendor, url });
  }
}

// Anthropic の Jina Reader URL（ENABLED_VENDORS に含まれ、かつ URL が設定されている場合のみ）
const anthropicUrl: string | null =
  enabledVendors.includes("Anthropic")
    ? (VENDOR_FEED_URL_MAP["Anthropic"] ?? null)
    : null;

// Gemini API へ渡す contentSnippet の最大文字数
const MAX_SNIPPET_LENGTH = 3000;

// HTMLタグ除去 + 連続空白の正規化 + 最大文字数切り捨て
function sanitizeSnippet(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const stripped = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (stripped.length === 0) return undefined;
  return stripped.length > MAX_SNIPPET_LENGTH
    ? stripped.substring(0, MAX_SNIPPET_LENGTH) + "...（以下略）"
    : stripped;
}

// HOURS_LOOKBACK 環境変数で変更可能（デフォルト24時間）
// テスト時は HOURS_LOOKBACK=168 (7日間) などで実行
const hoursLookback = Number(process.env.HOURS_LOOKBACK ?? 24);
const LOOKBACK_MS = hoursLookback * 60 * 60 * 1000;

// MAX_ARTICLES: 処理する記事の最大件数（Gemini APIのトークン節約用）
const maxArticles = process.env.MAX_ARTICLES
  ? Number(process.env.MAX_ARTICLES)
  : undefined;

// ---------------------------------------------------------------------------
// Jina Reader 経由で Anthropic のリリースノートを取得
// ---------------------------------------------------------------------------
async function fetchAnthropicArticles(url: string, cutoff: Date): Promise<RawArticle[]> {
  const response = await fetch(url, {
    headers: { Accept: "text/plain" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const text = await response.text();

  // "## YYYY-MM-DD: タイトル" または "## タイトル\nDate: ..." 形式の見出しでセクション分割
  // 見出し行: ## または ### から始まる行
  const sectionPattern = /^#{2,3}\s+(.+)$/gm;
  const articles: RawArticle[] = [];
  const baseUrl = "https://docs.anthropic.com/en/release-notes";

  const headingMatches: { title: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionPattern.exec(text)) !== null) {
    headingMatches.push({ title: m[1].trim(), index: m.index });
  }

  for (let i = 0; i < headingMatches.length; i++) {
    const { title, index } = headingMatches[i];
    const nextIndex =
      i + 1 < headingMatches.length ? headingMatches[i + 1].index : text.length;
    const sectionBody = text.slice(index, nextIndex).trim();

    // セクション内から日付を探す（YYYY-MM-DD / Month DD, YYYY 形式）
    const isoDateMatch = title.match(/(\d{4}-\d{2}-\d{2})/);
    const longDateMatch = sectionBody.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/
    );
    const publishedAt = isoDateMatch
      ? new Date(isoDateMatch[1])
      : longDateMatch
      ? new Date(longDateMatch[0])
      : new Date();

    if (publishedAt < cutoff) continue;

    // タイトルから日付プレフィックスを除去して整形
    const cleanTitle = title.replace(/^\d{4}-\d{2}-\d{2}[:\s]*/, "").trim() || title;

    const rawSnippet = sectionBody.replace(/^#{2,3}\s.+\n/, "").trim();
    const contentSnippet = sanitizeSnippet(rawSnippet);

    articles.push({
      title: cleanTitle,
      url: baseUrl,
      publishedAt,
      vendor: "Anthropic",
      contentSnippet,
    });
  }

  return articles;
}

export async function fetchRecentArticles(): Promise<RawArticle[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_MS);
  console.log(
    `[Fetcher] 取得対象: 過去 ${hoursLookback} 時間以内 (${cutoff.toISOString()} 以降)`
  );
  const articles: RawArticle[] = [];

  // RSS フィード取得（OpenAI / Google / Microsoft / Meta）
  for (const { vendor, url } of VENDOR_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      const recent = feed.items.filter((item) => {
        const publishedAt = item.pubDate ? new Date(item.pubDate) : null;
        return publishedAt && publishedAt >= cutoff;
      });

      for (const item of recent) {
        articles.push({
          title: item.title ?? "(no title)",
          url: item.link ?? "",
          publishedAt: new Date(item.pubDate!),
          vendor,
          contentSnippet: sanitizeSnippet(item.contentSnippet ?? item.content),
        });
      }
      console.log(
        `[Fetcher] ${vendor}: ${feed.items.length} 件中 ${recent.length} 件が対象`
      );
    } catch (err) {
      console.error(`[Fetcher] Failed to fetch ${vendor} feed: ${err}`);
    }
  }

  // Jina Reader 経由で Anthropic ニュースを取得
  if (anthropicUrl) {
    try {
      const anthropicArticles = await fetchAnthropicArticles(anthropicUrl, cutoff);
      articles.push(...anthropicArticles);
      console.log(`[Fetcher] Anthropic (Jina Reader): ${anthropicArticles.length} 件が対象`);
    } catch (err) {
      console.error(`[Fetcher] Failed to fetch Anthropic via Jina Reader: ${err}`);
    }
  }

  if (maxArticles !== undefined && articles.length > maxArticles) {
    console.log(`[Fetcher] MAX_ARTICLES=${maxArticles} のため ${articles.length} 件から絞り込み`);
    return articles.slice(0, maxArticles);
  }
  return articles;
}
