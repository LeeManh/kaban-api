import { randomUUID } from 'crypto';
import type { StorageService } from './storage.service';

const ATTACHMENT_PREFIX = 'attachments/';
const DESCRIPTION_IMAGE_PREFIX = 'descriptions/';
const COMMENT_IMAGE_PREFIX = 'comments/';
const BOARD_BACKGROUND_PREFIX = 'boards/';
const USER_AVATAR_PREFIX = 'users/';

const STORAGE_KEY_PREFIXES = [
  ATTACHMENT_PREFIX,
  DESCRIPTION_IMAGE_PREFIX,
  COMMENT_IMAGE_PREFIX,
  BOARD_BACKGROUND_PREFIX,
  USER_AVATAR_PREFIX,
];

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\w.-]+/g, '_');
}

function buildKey(prefix: string, filename: string): string {
  return `${prefix}${randomUUID()}-${sanitizeFilename(filename)}`;
}

export const StorageKeys = {
  attachment: (filename: string) => buildKey(ATTACHMENT_PREFIX, filename),
  descriptionImage: (filename: string) =>
    buildKey(DESCRIPTION_IMAGE_PREFIX, filename),
  commentImage: (filename: string) => buildKey(COMMENT_IMAGE_PREFIX, filename),
  boardBackground: (filename: string) =>
    buildKey(BOARD_BACKGROUND_PREFIX, filename),
  userAvatar: (userId: string, filename: string) =>
    `${USER_AVATAR_PREFIX}${userId}/${randomUUID()}-${sanitizeFilename(filename)}`,
};

export function isStorageKey(value: string): boolean {
  return STORAGE_KEY_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function resolveStorageValue(
  value: string | null,
  storage: StorageService,
): Promise<string | null> {
  if (!value) return Promise.resolve(null);
  if (isStorageKey(value)) return storage.getDownloadUrl(value);
  return Promise.resolve(value);
}
