import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client as NotionClient } from "@notionhq/client";
import { SummarizedArticle } from "../types";

// ---------------------------------------------------------------------------
// Notion直接書き込みクライアント（MCPサーバーが未起動の場合のフォールバック）
// ---------------------------------------------------------------------------
const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export async function saveToNotion(article: SummarizedArticle): Promise<void> {
  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Title: {
        title: [{ text: { content: article.title } }],
      },
      Date: {
        date: { start: article.publishedAt.toISOString().split("T")[0] },
      },
      Vendor: {
        select: { name: article.vendor },
      },
      Importance: {
        select: { name: article.importance },
      },
      URL: {
        url: article.url,
      },
      Keywords: {
        multi_select: article.keywords.map((k) => ({
          name: k.startsWith("#") ? k.slice(1) : k,
        })),
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
          rich_text: [{ type: "text", text: { content: "今後の展望・予想" } }],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: article.outlook } }],
        },
      },
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
  articles: SummarizedArticle[]
): Promise<void> {
  for (const article of articles) {
    try {
      await saveToNotion(article);
      console.log(`[MCP/Notion] Saved: ${article.title}`);
    } catch (err) {
      console.error(`[MCP/Notion] Failed to save "${article.title}": ${err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// MCPクライアント（将来的にMCPサーバー経由で操作する場合に使用）
// ---------------------------------------------------------------------------
export async function createMcpClient(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/mcp/server.js"],
  });
  const client = new Client({ name: "ai-news-aggregator", version: "0.1.0" });
  await client.connect(transport);
  return client;
}
