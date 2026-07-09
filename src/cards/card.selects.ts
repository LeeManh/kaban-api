import { StorageService } from '../storage/storage.service';
import { resolveMarkdownImages } from '../storage/markdown-images.util';

export const CARD_STORAGE_KEY_PREFIX = 'cards/';

export function resolveCardCover(
  cover: string | null,
  storage: StorageService,
) {
  if (!cover) return Promise.resolve(null);
  if (cover.startsWith(CARD_STORAGE_KEY_PREFIX))
    return storage.getDownloadUrl(cover);
  return Promise.resolve(cover);
}

export function resolveDescriptionImages(
  description: string | null,
  storage: StorageService,
) {
  return resolveMarkdownImages(description, storage, CARD_STORAGE_KEY_PREFIX);
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
