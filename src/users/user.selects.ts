import { StorageService } from '../storage/storage.service';

export const USER_AVATAR_KEY_PREFIX = 'users/';

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
  if (!avatar) return Promise.resolve(null);
  if (avatar.startsWith(USER_AVATAR_KEY_PREFIX))
    return storage.getDownloadUrl(avatar);
  return Promise.resolve(avatar);
}

export async function withResolvedAvatar<T extends { avatar: string | null }>(
  user: T,
  storage: StorageService,
): Promise<T> {
  return { ...user, avatar: await resolveUserAvatar(user.avatar, storage) };
}
