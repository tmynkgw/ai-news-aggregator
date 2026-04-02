export type Vendor =
  | "OpenAI"
  | "Anthropic"
  | "Google"
  | "Microsoft"
  | "Meta"
  | "Other";

export type Keyword =
  | "Development"
  | "Architecture"
  | "Security"
  | "Business/Cost"
  | "Research"
  | "Product";

export interface RawArticle {
  title: string;
  url: string;
  publishedAt: Date;
  vendor: Vendor;
  contentSnippet?: string;
}

export interface SummarizedArticle extends RawArticle {
  translatedTitle: string;
  bulletPoints: string[];
  userImpact: string[];
  diagram?: string;
  keywords: Keyword[];
}

export interface GeminiOutput {
  translatedTitle: string;
  bulletPoints: string[];
  userImpact: string[];
  diagram?: string;
  keywords: Keyword[];
}
