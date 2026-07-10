import type {
  Card,
  ChecklistItem,
  Comment,
  Label,
  List,
  Notification,
} from 'generated/prisma/client';

export interface CardCreatedEvent {
  boardId: string;
  card: Card;
  actorId: string;
}

export interface CardUpdatedEvent {
  boardId: string;
  card: Card;
  actorId: string;
}

export interface CardMovedEvent {
  boardId: string;
  cardId: string;
  listId: string;
  order: number;
  actorId: string;
}

export interface CardDeletedEvent {
  boardId: string;
  cardId: string;
  listId: string;
  actorId: string;
}

export interface ListCreatedEvent {
  boardId: string;
  list: List;
  actorId: string;
}

export interface ListUpdatedEvent {
  boardId: string;
  list: List;
  actorId: string;
}

export interface ListMovedEvent {
  boardId: string;
  listId: string;
  order: number;
  actorId: string;
}

export interface ListDeletedEvent {
  boardId: string;
  listId: string;
  actorId: string;
}

// Kèm author để client hiển thị ngay, khỏi fetch thêm.
export interface CommentAddedEvent {
  boardId: string;
  comment: Comment & {
    author: { id: string; name: string | null; email: string };
  };
  actorId: string;
}

export interface ChecklistItemToggledEvent {
  boardId: string;
  item: ChecklistItem;
  actorId: string;
}

export interface CardAssigneeChangedEvent {
  boardId: string;
  cardId: string;
  userId: string;
  action: 'assigned' | 'unassigned';
  actorId: string;
}

export interface LabelCreatedEvent {
  boardId: string;
  label: Label;
  actorId: string;
}

export interface LabelUpdatedEvent {
  boardId: string;
  label: Label;
  actorId: string;
}

export interface LabelDeletedEvent {
  boardId: string;
  labelId: string;
  actorId: string;
}

export interface NotificationCreatedEvent {
  notification: Notification;
}

export interface AttachmentAddedEvent {
  boardId: string;
  cardId: string;
  filename: string;
  actorId: string;
}
