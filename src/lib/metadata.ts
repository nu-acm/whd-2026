export const SITE_URL = 'https://whd.nuacmw.kz';

/** Keep search results and social previews consistent when a page overrides its copy. */
export function pageMetadata(title: string, description: string) {
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ];
}
