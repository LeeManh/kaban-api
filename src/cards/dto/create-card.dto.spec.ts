import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CardPriority } from 'generated/prisma/enums';
import { CreateCardDto } from './create-card.dto';

describe('CreateCardDto', () => {
  const validateDto = (payload: object) =>
    validate(plainToInstance(CreateCardDto, payload));

  it('passes with only the required title', async () => {
    const errors = await validateDto({ title: 'Fix login bug' });

    expect(errors).toHaveLength(0);
  });

  it('passes with all optional fields set correctly', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      description: 'Investigate token refresh failure',
      priority: CardPriority.HIGH,
      dueDate: '2026-08-20T00:00:00.000Z',
      reminderOffsetMinutes: 30,
      cover: 'https://example.com/cover.png',
      addToTop: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a missing title', async () => {
    const errors = await validateDto({});

    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an empty title', async () => {
    const errors = await validateDto({ title: '' });

    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a title longer than 255 characters', async () => {
    const errors = await validateDto({ title: 'a'.repeat(256) });

    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects an invalid priority', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      priority: 'NOT_A_PRIORITY',
    });

    expect(errors.some((e) => e.property === 'priority')).toBe(true);
  });

  it('rejects a non-ISO8601 dueDate', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      dueDate: 'next monday',
    });

    expect(errors.some((e) => e.property === 'dueDate')).toBe(true);
  });

  it('rejects a negative reminderOffsetMinutes', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      reminderOffsetMinutes: -5,
    });

    expect(errors.some((e) => e.property === 'reminderOffsetMinutes')).toBe(
      true,
    );
  });

  it('rejects a cover longer than 500 characters', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      cover: 'a'.repeat(501),
    });

    expect(errors.some((e) => e.property === 'cover')).toBe(true);
  });

  it('rejects a non-boolean addToTop', async () => {
    const errors = await validateDto({
      title: 'Fix login bug',
      addToTop: 'yes',
    });

    expect(errors.some((e) => e.property === 'addToTop')).toBe(true);
  });
});
