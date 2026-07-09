import { StorageService } from './storage.service';

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

export async function resolveMarkdownImages(
  text: string | null,
  storage: StorageService,
  keyPrefix: string,
): Promise<string | null> {
  if (!text) return text;

  const keys = [...text.matchAll(MARKDOWN_IMAGE_REGEX)]
    .map((match) => match[2])
    .filter((src) => src.startsWith(keyPrefix));
  if (keys.length === 0) return text;

  const urlByKey = new Map(
    await Promise.all(
      [...new Set(keys)].map(
        async (key) => [key, await storage.getDownloadUrl(key)] as const,
      ),
    ),
  );

  return text.replace(
    MARKDOWN_IMAGE_REGEX,
    (full, alt: string, src: string) => {
      const resolved = urlByKey.get(src);
      return resolved ? `![${alt}](${resolved})` : full;
    },
  );
}
