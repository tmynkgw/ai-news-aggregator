import { GoogleGenAI, Type } from "@google/genai";
import { GeminiOutput, RawArticle, SummarizedArticle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const KEYWORD_ENUM = [
  "Development",
  "Architecture",
  "Security",
  "Business/Cost",
  "Research",
  "Product",
];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    translatedTitle: {
      type: Type.STRING,
      description: "元の英語タイトルを自然な日本語に翻訳したもの",
    },
    bulletPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "記事の要点を箇条書きで3〜6項目。各項目は1〜2文で簡潔に。必ず具体的な製品名・技術名・アップデート内容・数値（コスト削減率やパフォーマンス向上など）を含めること。「〜について書かれています」のようなメタな説明は禁止。",
    },
    userImpact: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "このニュースによって、ユーザー（開発者や企業）の業務や体験が具体的にどう変わるのか、何ができるようになるのかを2〜3つの箇条書きで出力。ポエムや一般的な予測ではなく、現場のエンジニアやユーザーの目線で『何が便利になるのか』『どう対応すべきか』を具体的に書くこと。",
    },
    diagram: {
      type: Type.STRING,
      description:
        "記事の構造や関係性を示すMermaid記法の図（アーキテクチャ・フロー・比較など視覚化に適した内容のみ生成。不要なら空文字を返す）",
    },
    keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        enum: KEYWORD_ENUM,
      },
      description: `記事の内容に最も合致するキーワードを次のリストから選択（複数可）: ${KEYWORD_ENUM.join(", ")}`,
    },
  },
  required: ["translatedTitle", "bulletPoints", "userImpact", "diagram", "keywords"],
};

const SYSTEM_PROMPT = `あなたはシニアソフトウェアエンジニアです。
提供されたITニュース記事を読み、他のエンジニアにとって有益な情報を構造化して抽出してください。
出力は必ずJSON形式で返してください。

【厳守事項】
- bulletPoints は具体的な製品名・技術名・数値・アップデート内容を必ず含めること。「〜について書かれています」「〜が注目されています」のような抽象的なメタ表現は絶対に使わないこと。
- userImpact はポエムや曖昧な将来予測を禁止する。「開発者がXXXを使って〇〇できるようになる」「既存の△△を□□に変更する必要がある」など、現場で即使える具体的な内容のみ書くこと。`;

const MAX_RETRIES = 3;

async function generateWithRetry(
  title: string,
  contents: string
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const waitMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`[AI] 記事 "${title}" の要約をリトライします (${attempt}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema,
        },
        contents,
      });
      return response.text ?? "{}";
    } catch (err) {
      lastError = err;
      const msg = String(err);
      // ネットワークエラーまたはレートリミット(429)のみリトライ
      if (!msg.includes("fetch failed") && !msg.includes("429")) {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function summarizeArticle(
  article: RawArticle
): Promise<SummarizedArticle> {
  const userPrompt = `以下の記事を分析し、エンジニア向けの構造化された情報を抽出してください。

タイトル: ${article.title}
URL: ${article.url}
内容: ${article.contentSnippet ?? "（本文なし）"}

【出力指示】
- translatedTitle: 元の英語タイトルを自然な日本語に翻訳して格納してください。
- bulletPoints: 記事の要点を3〜6項目で抽出してください。各項目に具体的な製品名・技術名・数値・変更内容を含めること。「〜について書かれています」などのメタな表現は禁止。
- userImpact: このニュースで開発者・企業が「何が使えるようになるか」「何を変更すべきか」を2〜3項目で具体的に書いてください。抽象的な展望やポエムは禁止。
- diagram: アーキテクチャ・フロー・比較など図解に適した内容があればMermaid記法で生成してください。不要なら空文字を返してください。
- keywords: 必ず指定されたリスト（${KEYWORD_ENUM.join(", ")}）の中から、記事の内容に最も合致するものを選択してください。`;

  const raw = await generateWithRetry(article.title, userPrompt);
  const parsed: GeminiOutput = JSON.parse(raw);

  return {
    ...article,
    translatedTitle: parsed.translatedTitle,
    bulletPoints: parsed.bulletPoints,
    userImpact: parsed.userImpact,
    diagram: parsed.diagram || undefined,
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
