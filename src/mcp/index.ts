import { Client as NotionClient } from "@notionhq/client";
import { SummarizedArticle } from "../types";

const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID!;

// ---------------------------------------------------------------------------
// Notionデータベース新規作成
// ---------------------------------------------------------------------------
export async function createDatabase(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const title = `${today} - AI News`;

  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: title } }],
    properties: {
      Title: { title: {} },
      Vendor: {
        select: {
          options: [
            { name: "OpenAI", color: "green" },
            { name: "Anthropic", color: "orange" },
            { name: "Google", color: "blue" },
            { name: "Microsoft", color: "purple" },
            { name: "Meta", color: "pink" },
            { name: "Other", color: "default" },
          ],
        },
      },
      Date: { date: {} },
      Keywords: {
        multi_select: {
          options: [
            { name: "Development", color: "blue" },
            { name: "Architecture", color: "purple" },
            { name: "Security", color: "red" },
            { name: "Business/Cost", color: "yellow" },
            { name: "Research", color: "green" },
            { name: "Product", color: "pink" },
          ],
        },
      },
      URL: { url: {} },
    },
  });

  console.log(`[Notion] データベース作成: "${title}" (id: ${db.id})`);
  return db.id;
}

// ---------------------------------------------------------------------------
// 記事をNotionページとして保存
// ---------------------------------------------------------------------------
export async function saveToNotion(
  article: SummarizedArticle,
  databaseId: string
): Promise<void> {
  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: {
        title: [{ text: { content: article.translatedTitle } }],
      },
      Vendor: {
        select: { name: article.vendor },
      },
      Date: {
        date: { start: article.publishedAt.toISOString().split("T")[0] },
      },
      Keywords: {
        multi_select: article.keywords.map((k) => ({ name: k })),
      },
      URL: {
        url: article.url,
      },
    },
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "要約" } }],
        },
      },
      ...article.bulletPoints.map((point) => ({
        object: "block" as const,
        type: "bulleted_list_item" as const,
        bulleted_list_item: {
          rich_text: [{ type: "text" as const, text: { content: point } }],
        },
      })),
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "ユーザーへの影響・変化" } }],
        },
      },
      ...article.userImpact.map((impact) => ({
        object: "block" as const,
        type: "bulleted_list_item" as const,
        bulleted_list_item: {
          rich_text: [{ type: "text" as const, text: { content: impact } }],
        },
      })),
      ...(article.diagram
        ? [
            {
              object: "block" as const,
              type: "heading_2" as const,
              heading_2: {
                rich_text: [{ type: "text" as const, text: { content: "構成図" } }],
              },
            },
            {
              object: "block" as const,
              type: "code" as const,
              code: {
                language: "mermaid" as const,
                rich_text: [
                  { type: "text" as const, text: { content: article.diagram } },
                ],
              },
            },
          ]
        : []),
    ],
  });
}

export async function saveArticles(
  articles: SummarizedArticle[],
  databaseId: string
): Promise<void> {
  for (const article of articles) {
    try {
      await saveToNotion(article, databaseId);
      console.log(`[MCP/Notion] Saved: ${article.title}`);
    } catch (err) {
      console.error(`[MCP/Notion] Failed to save "${article.title}": ${err}`);
    }
  }
}
