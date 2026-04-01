import "dotenv/config";
import { fetchRecentArticles } from "./fetcher";
import { summarizeArticles } from "./ai";
import { saveArticles } from "./mcp";

async function main(): Promise<void> {
  console.log("=== AI News Aggregator 開始 ===");

  // Step 1: 記事収集
  console.log("\n[Step 1] RSSフィードから記事を収集中...");
  const rawArticles = await fetchRecentArticles();
  console.log(`→ ${rawArticles.length} 件の記事を取得`);

  if (rawArticles.length === 0) {
    console.log("新しい記事がありませんでした。終了します。");
    return;
  }

  // Step 2: Gemini APIで要約
  console.log("\n[Step 2] Gemini APIで要約中...");
  const summarized = await summarizeArticles(rawArticles);
  console.log(`→ ${summarized.length} 件の要約完了`);

  // Step 3: Notionに保存
  console.log("\n[Step 3] Notionデータベースに保存中...");
  await saveArticles(summarized);
  console.log(`→ ${summarized.length} 件を保存完了`);

  console.log("\n=== 完了 ===");
}

main().catch((err) => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
