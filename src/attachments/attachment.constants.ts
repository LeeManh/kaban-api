export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MIME = [
  // Ảnh
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Tài liệu
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain', // .txt
  'application/zip', // .zip
] as const;

export const ATTACHMENTS_QUEUE = 'attachments';

export const ATTACHMENT_JOB = {
  DELETE_OBJECT: 'delete-object',
} as const;
