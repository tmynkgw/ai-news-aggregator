/**
 * Notionデータベースの実際のプロパティ一覧を確認するデバッグスクリプト
 * 実行: npx ts-node src/scripts/check-notion-db.ts
 */
import "dotenv/config";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const db = await notion.databases.retrieve({
    database_id: process.env.NOTION_DATABASE_ID!,
  });

  console.log("=== Notionデータベース情報 ===");
  console.log(`DB名: ${(db as any).title?.[0]?.plain_text ?? "(不明)"}`);
  console.log("\n=== 現在のプロパティ一覧 ===");

  for (const [name, prop] of Object.entries(db.properties)) {
    console.log(`  "${name}" : ${(prop as any).type}`);
  }

  console.log("\n=== 必要なプロパティ（設計書より） ===");
  const required = [
    { name: "Title",      type: "title" },
    { name: "Date",       type: "date" },
    { name: "Vendor",     type: "select" },
    { name: "Importance", type: "select" },
    { name: "URL",        type: "url" },
    { name: "Keywords",   type: "rich_text" },
  ];
  for (const r of required) {
    const exists = Object.keys(db.properties).includes(r.name);
    console.log(`  "${r.name}" (${r.type}) : ${exists ? "✓ OK" : "✗ 未作成"}`);
  }
}

main().catch(console.error);
