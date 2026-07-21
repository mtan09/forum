const IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|webp)$/i;

// Defensive counterpart to the API's ingestion validation. It prevents a
// malformed source value from becoming a native image request if older or
// externally-written article data reaches the app.
export function getDisplayableArticleMedia(
  candidate: string | null | undefined,
  articleUrl: string
): string | null {
  const value = candidate?.trim();
  if (!value) return null;

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
