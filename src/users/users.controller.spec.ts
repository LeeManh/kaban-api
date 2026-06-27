import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findProfileById' | 'updateProfile' | 'changePassword'>
  >;

  beforeEach(async () => {
    usersService = {
      findProfileById: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return current user profile', async () => {
    const profile = {
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    usersService.findProfileById.mockResolvedValue(profile);

    await expect(controller.me('user-id')).resolves.toEqual(profile);
    expect(usersService.findProfileById).toHaveBeenCalledWith('user-id');
  });

  it('should update current user profile', async () => {
    const profile = {
      id: 'user-id',
      email: 'user@example.com',
      name: 'New Name',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    usersService.updateProfile.mockResolvedValue(profile);

    await expect(
      controller.updateMe('user-id', { name: 'New Name' }),
    ).resolves.toEqual(profile);

    expect(usersService.updateProfile).toHaveBeenCalledWith('user-id', {
      name: 'New Name',
    });
  });

  it('should change current user password', async () => {
    usersService.changePassword.mockResolvedValue({
      message: 'Đổi mật khẩu thành công',
    });

    await expect(
      controller.changePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({ message: 'Đổi mật khẩu thành công' });

    expect(usersService.changePassword).toHaveBeenCalledWith('user-id', {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    });
  });
});
