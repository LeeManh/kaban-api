import { Inject, Logger } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/types/jwt-payload.type';
import { jwtConfig } from 'src/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { APP_EVENT, SOCKET_EVENT } from './events.constants';
import type {
  AttachmentAddedEvent,
  BoardMemberRemovedEvent,
  CardAssigneeChangedEvent,
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardUpdatedEvent,
  ChecklistItemToggledEvent,
  CommentAddedEvent,
  LabelCreatedEvent,
  LabelDeletedEvent,
  LabelUpdatedEvent,
  ListCreatedEvent,
  ListDeletedEvent,
  ListMovedEvent,
  ListUpdatedEvent,
  NotificationCreatedEvent,
  UserLoggedOutEvent,
} from './events.types';

type SocketData = { userId?: string; jti?: string };

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
    private readonly blacklist: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('missing token');

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.jwtCfg.accessSecret,
      });

      if (payload.jti && (await this.blacklist.isBlacklisted(payload.jti)))
        throw new Error('token revoked');

      (client.data as SocketData).userId = payload.sub;
      (client.data as SocketData).jti = payload.jti;
      await client.join(this.userRoom(payload.sub));
      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);
    } catch {
      this.logger.warn(`Rejected socket ${client.id}: auth failed`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENT.JOIN_BOARD)
  async joinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId?: string },
  ) {
    const userId = (client.data as SocketData).userId;
    const boardId = data?.boardId;
    if (!userId || !boardId) return { ok: false, error: 'invalid_payload' };

    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { userId: true },
    });
    if (!member) return { ok: false, error: 'forbidden' };

    await client.join(this.room(boardId));
    this.logger.log(`Socket ${client.id} joined ${this.room(boardId)}`);
    return { ok: true };
  }

  @SubscribeMessage(SOCKET_EVENT.LEAVE_BOARD)
  leaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId?: string },
  ) {
    const boardId = data?.boardId;
    if (boardId) void client.leave(this.room(boardId));
    return { ok: true };
  }

  @OnEvent(APP_EVENT.CARD_CREATED)
  handleCardCreated(payload: CardCreatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.CARD_CREATED, payload);
  }

  @OnEvent(APP_EVENT.CARD_UPDATED)
  handleCardUpdated(payload: CardUpdatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.CARD_UPDATED, payload);
  }

  @OnEvent(APP_EVENT.CARD_MOVED)
  handleCardMoved(payload: CardMovedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.CARD_MOVED, payload);
  }

  @OnEvent(APP_EVENT.CARD_DELETED)
  handleCardDeleted(payload: CardDeletedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.CARD_DELETED, payload);
  }

  @OnEvent(APP_EVENT.LIST_CREATED)
  handleListCreated(payload: ListCreatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LIST_CREATED, payload);
  }

  @OnEvent(APP_EVENT.LIST_UPDATED)
  handleListUpdated(payload: ListUpdatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LIST_UPDATED, payload);
  }

  @OnEvent(APP_EVENT.LIST_MOVED)
  handleListMoved(payload: ListMovedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LIST_MOVED, payload);
  }

  @OnEvent(APP_EVENT.LIST_DELETED)
  handleListDeleted(payload: ListDeletedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LIST_DELETED, payload);
  }

  @OnEvent(APP_EVENT.COMMENT_ADDED)
  handleCommentAdded(payload: CommentAddedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.COMMENT_ADDED, payload);
  }

  @OnEvent(APP_EVENT.CHECKLIST_ITEM_TOGGLED)
  handleChecklistItemToggled(payload: ChecklistItemToggledEvent) {
    this.broadcast(
      payload.boardId,
      SOCKET_EVENT.CHECKLIST_ITEM_TOGGLED,
      payload,
    );
  }

  @OnEvent(APP_EVENT.CARD_ASSIGNEE_CHANGED)
  handleCardAssigneeChanged(payload: CardAssigneeChangedEvent) {
    this.broadcast(
      payload.boardId,
      SOCKET_EVENT.CARD_ASSIGNEE_CHANGED,
      payload,
    );
  }

  @OnEvent(APP_EVENT.LABEL_CREATED)
  handleLabelCreated(payload: LabelCreatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LABEL_CREATED, payload);
  }

  @OnEvent(APP_EVENT.LABEL_UPDATED)
  handleLabelUpdated(payload: LabelUpdatedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LABEL_UPDATED, payload);
  }

  @OnEvent(APP_EVENT.LABEL_DELETED)
  handleLabelDeleted(payload: LabelDeletedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.LABEL_DELETED, payload);
  }

  @OnEvent(APP_EVENT.NOTIFICATION_CREATED)
  handleNotificationCreated(payload: NotificationCreatedEvent) {
    this.server
      .to(this.userRoom(payload.notification.userId))
      .emit(SOCKET_EVENT.NOTIFICATION_CREATED, payload.notification);
  }

  @OnEvent(APP_EVENT.ATTACHMENT_ADDED)
  handleAttachmentAdded(payload: AttachmentAddedEvent) {
    this.broadcast(payload.boardId, SOCKET_EVENT.ATTACHMENT_ADDED, payload);
  }

  @OnEvent(APP_EVENT.USER_LOGGED_OUT)
  async handleUserLoggedOut(payload: UserLoggedOutEvent) {
    const sockets = await this.server
      .in(this.userRoom(payload.userId))
      .fetchSockets();
    for (const socket of sockets) {
      const data = socket.data as SocketData;
      if (!payload.jti || data.jti === payload.jti) {
        socket.disconnect(true);
      }
    }
  }

  @OnEvent(APP_EVENT.BOARD_MEMBER_REMOVED)
  async handleBoardMemberRemoved(payload: BoardMemberRemovedEvent) {
    const sockets = await this.server
      .in(this.room(payload.boardId))
      .fetchSockets();
    for (const socket of sockets) {
      const data = socket.data as SocketData;
      if (data.userId === payload.userId) {
        socket.leave(this.room(payload.boardId));
        socket.emit(SOCKET_EVENT.BOARD_MEMBER_REMOVED, {
          boardId: payload.boardId,
        });
      }
    }
  }

  private broadcast(boardId: string, event: string, payload: unknown) {
    this.server.to(this.room(boardId)).emit(event, payload);
  }

  private room(boardId: string) {
    return `board_${boardId}`;
  }

  private userRoom(userId: string) {
    return `user_${userId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const q = client.handshake.query?.token;
    return typeof q === 'string' ? q : undefined;
  }
}
