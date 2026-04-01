export type Importance = "High" | "Medium" | "Low";

export type Vendor =
  | "OpenAI"
  | "Anthropic"
  | "Google"
  | "Microsoft"
  | "Meta"
  | "Other";

export interface RawArticle {
  title: string;
  url: string;
  publishedAt: Date;
  vendor: Vendor;
  contentSnippet?: string;
}

export interface SummarizedArticle extends RawArticle {
  summary: string;
  importance: Importance;
  keywords: string[];
}

export interface GeminiOutput {
  summary: string;
  importance: Importance;
  keywords: string[];
}
