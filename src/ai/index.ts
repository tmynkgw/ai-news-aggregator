import { GoogleGenAI, Type } from "@google/genai";
import { GeminiOutput, RawArticle, SummarizedArticle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "技術者向けの詳細な要約（Markdown形式、200〜400文字程度）",
    },
    importance: {
      type: Type.STRING,
      enum: ["High", "Medium", "Low"],
      description: "エンジニアにとっての重要度",
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "検索用キーワード（#ハッシュタグ形式、3〜7個）",
    },
  },
  required: ["summary", "importance", "keywords"],
};

const SYSTEM_PROMPT = `あなたはシニアソフトウェアエンジニアです。
提供されたITニュース記事を読み、他のエンジニアにとって有益な情報を抽出してください。
出力は必ずJSON形式で返してください。`;

export async function summarizeArticle(
  article: RawArticle
): Promise<SummarizedArticle> {
  const userPrompt = `以下の記事を要約してください。

タイトル: ${article.title}
URL: ${article.url}
内容: ${article.contentSnippet ?? "（本文なし）"}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema,
    },
    contents: userPrompt,
  });

  const raw = response.text ?? "{}";
  const parsed: GeminiOutput = JSON.parse(raw);

  return {
    ...article,
    summary: parsed.summary,
    importance: parsed.importance,
    keywords: parsed.keywords,
  };
}

export async function summarizeArticles(
  articles: RawArticle[]
): Promise<SummarizedArticle[]> {
  const results: SummarizedArticle[] = [];
  for (const article of articles) {
    try {
      const summarized = await summarizeArticle(article);
      results.push(summarized);
      console.log(`[AI] Summarized: ${article.title}`);
    } catch (err) {
      console.error(`[AI] Failed to summarize "${article.title}": ${err}`);
    }
  }
  return results;
}
