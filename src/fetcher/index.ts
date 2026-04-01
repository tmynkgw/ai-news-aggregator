import Parser from "rss-parser";
import { RawArticle, Vendor } from "../types";

const parser = new Parser();

const VENDOR_FEEDS: { vendor: Vendor; url: string }[] = [
  {
    vendor: "OpenAI",
    url: "https://openai.com/blog/rss.xml",
  },
  {
    vendor: "Google",
    url: "https://blog.google/technology/ai/rss/",
  },
  {
    vendor: "Microsoft",
    url: "https://blogs.microsoft.com/ai/feed/",
  },
  {
    // Meta Engineering Blog（ai.meta.com にはRSSフィードが存在しない）
    vendor: "Meta",
    url: "https://engineering.fb.com/feed/",
  },
];

// HOURS_LOOKBACK 環境変数で変更可能（デフォルト24時間）
// テスト時は HOURS_LOOKBACK=168 (7日間) などで実行
const hoursLookback = Number(process.env.HOURS_LOOKBACK ?? 24);
const LOOKBACK_MS = hoursLookback * 60 * 60 * 1000;

// MAX_ARTICLES: 処理する記事の最大件数（Gemini APIのトークン節約用）
const maxArticles = process.env.MAX_ARTICLES
  ? Number(process.env.MAX_ARTICLES)
  : undefined;

export async function fetchRecentArticles(): Promise<RawArticle[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_MS);
  console.log(
    `[Fetcher] 取得対象: 過去 ${hoursLookback} 時間以内 (${cutoff.toISOString()} 以降)`
  );
  const articles: RawArticle[] = [];

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
          contentSnippet: item.contentSnippet ?? item.content ?? undefined,
        });
      }
      console.log(
        `[Fetcher] ${vendor}: ${feed.items.length} 件中 ${recent.length} 件が対象`
      );
    } catch (err) {
      console.error(`[Fetcher] Failed to fetch ${vendor} feed: ${err}`);
    }
  }

  if (maxArticles !== undefined && articles.length > maxArticles) {
    console.log(`[Fetcher] MAX_ARTICLES=${maxArticles} のため ${articles.length} 件から絞り込み`);
    return articles.slice(0, maxArticles);
  }
  return articles;
}
