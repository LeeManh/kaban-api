export const APP_EVENT = {
  CARD_MOVED: 'card.moved',
} as const;

export const SOCKET_EVENT = {
  JOIN_BOARD: 'joinBoard',
  LEAVE_BOARD: 'leaveBoard',
  CARD_MOVED: 'cardMoved',
} as const;

export interface CardMovedEvent {
  boardId: string;
  cardId: string;
  listId: string;
  order: number;
  actorId: string;
}
