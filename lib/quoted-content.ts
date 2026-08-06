import type { QuotedContent, RepostAttribution } from '@/types/quoted-content';

export function mapQuotedContent(value: any): QuotedContent | null {
  if (!value || (value.kind !== 'post' && value.kind !== 'article') || !value.id) return null;
  const available = value.available !== false;
  if (value.kind === 'post') {
    return {
      kind: 'post',
      id: String(value.id),
      available,
      authorId: value.author_id == null ? undefined : String(value.author_id),
      username: value.username == null ? undefined : String(value.username),
      avatarUrl: value.avatar_url ?? undefined,
      isDemo: !!value.is_demo,
      text: value.text ?? '',
      media: value.media ?? undefined,
      position: typeof value.position === 'number' ? value.position : null,
      createdAt: value.created_at ?? undefined,
    };
  }
  return {
    kind: 'article',
    id: String(value.id),
    available,
    title: value.title ?? '',
    source: value.source ?? '',
    media: value.media ?? undefined,
    url: value.url ?? undefined,
    politicalLean: typeof value.political_lean === 'number' ? value.political_lean : null,
    sourceLean: typeof value.source_lean === 'number' ? value.source_lean : null,
    publishedAt: value.published_at ?? undefined,
  };
}

export function quotedContentFromPost(post: any): QuotedContent {
  return {
    kind: 'post',
    id: String(post.id),
    available: true,
    authorId: String(post.user ?? post.user_id),
    username: post.username ?? '',
    avatarUrl: post.avatarUrl ?? post.avatar_url ?? undefined,
    isDemo: !!(post.isDemo ?? post.is_demo),
    text: post.text ?? post.content ?? '',
    media: post.media ?? post.media_url ?? undefined,
    position: typeof post.position === 'number' ? post.position : null,
    createdAt: post.timestamp ?? post.created_at,
  };
}

export function quotedContentFromArticle(article: any): QuotedContent {
  return {
    kind: 'article',
    id: String(article.id),
    available: true,
    title: article.title ?? '',
    source: article.source ?? '',
    media: article.media_thumbnail_url ?? article.media ?? undefined,
    url: article.url ?? undefined,
    politicalLean: typeof article.political_lean === 'number' ? article.political_lean : null,
    sourceLean: typeof article.source_lean === 'number' ? article.source_lean : null,
    publishedAt: article.published_at,
  };
}

export function mapRepostAttribution(value: any): RepostAttribution | null {
  if (!value?.reposted_by_user_id || !value?.reposted_by_username) return null;
  return {
    userId: String(value.reposted_by_user_id),
    username: String(value.reposted_by_username),
    avatarUrl: value.reposted_by_avatar_url ?? undefined,
    isDemo: !!value.reposted_by_is_demo,
    repostedAt: value.reposted_at ?? undefined,
  };
}
