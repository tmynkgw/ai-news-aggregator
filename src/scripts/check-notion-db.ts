/**
 * Notion新規DBをテスト作成して、スキーマを確認するスクリプト
 * 実行: npx ts-node src/scripts/check-notion-db.ts
 *
 * NOTION_PARENT_PAGE_ID の親ページ配下にテスト用DBを1件作成します。
 */
import "dotenv/config";
import { createDatabase } from "../mcp";

async function main() {
  console.log("=== Notion DB 新規作成テスト ===\n");

  const dbId = await createDatabase();
  console.log(`\n✓ 作成成功: DB ID = ${dbId}`);
  console.log(
    "\nNotionで確認し、不要であれば手動で削除してください。"
  );
}

main().catch(console.error);
