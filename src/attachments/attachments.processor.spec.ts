import { Job } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { ATTACHMENT_JOB } from './attachment.constants';
import { AttachmentsProcessor } from './attachments.processor';

describe('AttachmentsProcessor', () => {
  let processor: AttachmentsProcessor;
  let storage: jest.Mocked<Pick<StorageService, 'deleteObject'>>;

  beforeEach(() => {
    storage = { deleteObject: jest.fn() };
    processor = new AttachmentsProcessor(storage as unknown as StorageService);
  });

  const job = (name: string, data: { key: string }) =>
    ({ name, data }) as Job<{ key: string }>;

  it('deletes the object in storage for a delete-object job', async () => {
    await processor.process(
      job(ATTACHMENT_JOB.DELETE_OBJECT, { key: 'attachments/file.png' }),
    );

    expect(storage.deleteObject).toHaveBeenCalledWith('attachments/file.png');
  });

  it('does nothing for an unknown job name', async () => {
    await processor.process(job('unknown-job', { key: 'attachments/x.png' }));

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
