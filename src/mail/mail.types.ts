export interface CardAssignedData {
  to: string;
  cardTitle: string;
}

export interface DueReminderData {
  cardId: string;
}

export interface SendEmailData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface PasswordResetData {
  to: string;
  resetUrl: string;
}
