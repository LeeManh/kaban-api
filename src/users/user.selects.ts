import { StorageService } from '../storage/storage.service';
import { resolveStorageValue } from '../storage/storage-keys.util';

export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

export function resolveUserAvatar(
  avatar: string | null,
  storage: StorageService,
) {
  return resolveStorageValue(avatar, storage);
}

export async function withResolvedAvatar<T extends { avatar: string | null }>(
  user: T,
  storage: StorageService,
): Promise<T> {
  return { ...user, avatar: await resolveUserAvatar(user.avatar, storage) };
}
