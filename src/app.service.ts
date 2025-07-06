import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import { ClientProxy } from '@nestjs/microservices';
import { ServerStatusEvent } from './gateway/events/gs/server-status.event';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import * as http from 'http';
import { PlayerConnectedEvent } from './gateway/events/srcds/player-connected.event';
import { SrcdsServerStartedEvent } from './gateway/events/srcds-server-started.event';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';

@Injectable()
export class AppService
  implements OnApplicationShutdown, OnApplicationBootstrap
{
  private pingServer: http.Server;

  private logger = new Logger(AppService.name);
  constructor(
    private readonly ebus: EventBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [
      GameServerDiscoveredEvent,
      ServerStatusEvent,
      LiveMatchUpdateEvent,
      PlayerConnectedEvent,
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe((t) => this.redisEventQueue.emit(t.constructor.name, t));

    this.ebus
      .pipe(
        ofType<any, any>(
          SrcdsServerStartedEvent,
          GameResultsEvent,
          MatchFailedEvent,
          PlayerAbandonedEvent,
        ),
      )
      .subscribe((t) =>
        this.amqpConnection
          .publish('srcds_exchange', t.constructor.name, t)
          .then(() =>
            this.logger.log(`Published RMQ message ${t.constructor.name}`),
          ),
      );
  }

  onApplicationShutdown(signal?: string): any {
    return new Promise((resolve, reject) => this.pingServer.close(resolve));
  }
}
