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
  bulletPoints: string[];
  outlook: string;
  diagram?: string;
  importance: Importance;
  keywords: string[];
}

export interface GeminiOutput {
  bulletPoints: string[];
  outlook: string;
  diagram?: string;
  importance: Importance;
  keywords: string[];
}
