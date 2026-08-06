const DEFAULT_PUBLIC_WEB_URL = 'https://forumeveryside.com';

function resolvePublicWebUrl(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  return (configured || DEFAULT_PUBLIC_WEB_URL).replace(/\/+$/, '');
}

export const PUBLIC_WEB_URL = resolvePublicWebUrl();

export function publicPostUrl(postId: string): string {
  return `${PUBLIC_WEB_URL}/post/${encodeURIComponent(postId)}`;
}

export function publicArticleUrl(articleId: string): string {
  return `${PUBLIC_WEB_URL}/article/${encodeURIComponent(articleId)}`;
}
