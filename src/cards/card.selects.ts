import { StorageService } from '../storage/storage.service';

const CARD_STORAGE_KEY_PREFIX = 'cards/';

export function resolveCardCover(
  cover: string | null,
  storage: StorageService,
) {
  if (!cover) return Promise.resolve(null);
  if (cover.startsWith(CARD_STORAGE_KEY_PREFIX))
    return storage.getDownloadUrl(cover);
  return Promise.resolve(cover);
}

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

export async function resolveDescriptionImages(
  description: string | null,
  storage: StorageService,
): Promise<string | null> {
  if (!description) return description;

  const keys = [...description.matchAll(MARKDOWN_IMAGE_REGEX)]
    .map((match) => match[2])
    .filter((src) => src.startsWith(CARD_STORAGE_KEY_PREFIX));
  if (keys.length === 0) return description;

  const urlByKey = new Map(
    await Promise.all(
      [...new Set(keys)].map(
        async (key) => [key, await storage.getDownloadUrl(key)] as const,
      ),
    ),
  );

  return description.replace(
    MARKDOWN_IMAGE_REGEX,
    (full, alt: string, src: string) => {
      const resolved = urlByKey.get(src);
      return resolved ? `![${alt}](${resolved})` : full;
    },
  );
}

export const LABEL_SELECT = { select: { id: true, name: true, color: true } };
export const ASSIGNEE_SELECT = {
  select: { id: true, name: true, email: true },
};
export const COUNT_SELECT = { select: { comments: true, attachments: true } };
export const CHECKLIST_ITEMS_SELECT = {
  select: { items: { select: { isDone: true } } },
};

type CardWithChecklists = { checklists: { items: { isDone: boolean }[] }[] };

export function withChecklistProgress<T extends CardWithChecklists>(card: T) {
  const { checklists, ...rest } = card;
  const items = checklists.flatMap((c) => c.items);
  return {
    ...rest,
    checklistProgress: {
      done: items.filter((i) => i.isDone).length,
      total: items.length,
    },
  };
}
