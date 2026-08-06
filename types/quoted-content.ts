export type QuotedPostContent = {
  kind: 'post';
  id: string;
  available: boolean;
  authorId?: string;
  username?: string;
  avatarUrl?: string;
  isDemo?: boolean;
  text?: string;
  media?: string;
  position?: number | null;
  createdAt?: string;
};

export type QuotedArticleContent = {
  kind: 'article';
  id: string;
  available: boolean;
  title?: string;
  source?: string;
  media?: string;
  url?: string;
  politicalLean?: number | null;
  sourceLean?: number | null;
  publishedAt?: string;
};

export type QuotedContent = QuotedPostContent | QuotedArticleContent;

export type RepostAttribution = {
  userId: string;
  username: string;
  avatarUrl?: string;
  isDemo?: boolean;
  repostedAt?: string;
};
