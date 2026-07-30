const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;
const NON_IMAGE_EXTENSION =
  /\.(?:m3u8|m4a|m4v|mov|mp3|mp4|mpeg|mpg|ogg|ogv|wav|webm)(?:$|[?#])/i;

// The restored API returns the article's direct image URL. Keep validation
// deliberately narrow: reject actual audio/video assets and malformed
// article-path values, but do not require the retired rights-mode flags.
export function getDisplayableArticleMedia(
  candidate: string | null | undefined,
  articleUrl: string,
  _imageMode?: 'none' | 'remote_no_cache' | 'managed_thumbnail' | 'licensed_cache' | null
): string | null {
  const value = candidate?.trim();
  if (!value || NON_IMAGE_EXTENSION.test(value)) return null;

  try {
    const image = new URL(value, articleUrl);
    if (image.protocol !== 'http:' && image.protocol !== 'https:') return null;

    const article = new URL(articleUrl);
    const articlePath = article.pathname.replace(/\/+$/, '');
    const imagePath = image.pathname.replace(/\/+$/, '');
    const looksLikeImage = IMAGE_EXTENSION.test(imagePath);

    if (
      image.origin === article.origin &&
      articlePath &&
      (imagePath === articlePath || imagePath.startsWith(`${articlePath}/`)) &&
      !looksLikeImage
    ) {
      return null;
    }

    return image.href;
  } catch {
    return null;
  }
}

export function getArticleImageCachePolicy(
  _imageMode?: 'none' | 'remote_no_cache' | 'managed_thumbnail' | 'licensed_cache' | null
): 'none' | 'memory-disk' {
  return 'memory-disk';
}
