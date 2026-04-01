import { GoogleGenAI, Type } from "@google/genai";
import { GeminiOutput, RawArticle, SummarizedArticle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    bulletPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "記事の要点を箇条書きで3〜6項目。各項目は1〜2文で簡潔に。",
    },
    outlook: {
      type: Type.STRING,
      description: "この技術・発表が今後どう展開するかの予測・展望（150〜300文字）",
    },
    diagram: {
      type: Type.STRING,
      description:
        "記事の構造や関係性を示すMermaid記法の図（アーキテクチャ・フロー・比較など視覚化に適した内容のみ生成。不要なら空文字を返す）",
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
  required: ["bulletPoints", "outlook", "diagram", "importance", "keywords"],
};

const SYSTEM_PROMPT = `あなたはシニアソフトウェアエンジニアです。
提供されたITニュース記事を読み、他のエンジニアにとって有益な情報を構造化して抽出してください。
出力は必ずJSON形式で返してください。`;

export async function summarizeArticle(
  article: RawArticle
): Promise<SummarizedArticle> {
  const userPrompt = `以下の記事を分析し、エンジニア向けの構造化された情報を抽出してください。

タイトル: ${article.title}
URL: ${article.url}
内容: ${article.contentSnippet ?? "（本文なし）"}

要点を箇条書きで整理し、今後の技術的展望を予測してください。
アーキテクチャ・フロー・比較など図解に適した内容があればMermaid記法で生成してください。`;

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
    bulletPoints: parsed.bulletPoints,
    outlook: parsed.outlook,
    diagram: parsed.diagram || undefined,
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
