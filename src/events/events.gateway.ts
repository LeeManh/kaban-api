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
import {
  APP_EVENT,
  SOCKET_EVENT,
  type CardMovedEvent,
} from './events.constants';

@WebSocketGateway({ cors: { origin: '*' } })
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

      (client.data as { userId?: string }).userId = payload.sub;
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
    const userId = (client.data as { userId?: string }).userId;
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

  @OnEvent(APP_EVENT.CARD_MOVED)
  handleCardMoved(payload: CardMovedEvent) {
    this.server
      .to(this.room(payload.boardId))
      .emit(SOCKET_EVENT.CARD_MOVED, payload);
  }

  private room(boardId: string) {
    return `board_${boardId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const q = client.handshake.query?.token;
    return typeof q === 'string' ? q : undefined;
  }
}
