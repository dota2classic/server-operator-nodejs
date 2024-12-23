import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import { Dota2Version } from './gateway/shared-types/dota2version';
import { ClientProxy, ClientRMQ } from '@nestjs/microservices';
import { ServerStatusEvent } from './gateway/events/gs/server-status.event';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';
import * as http from 'http';
import { PlayerConnectedEvent } from './gateway/events/srcds/player-connected.event';
import { SrcdsServerStartedEvent } from './gateway/events/srcds-server-started.event';

export interface ServerConfiguration {
  path: string;
  port: number;
  url: string;
  version: Dota2Version;
}

@Injectable()
export class AppService
  implements OnApplicationShutdown, OnApplicationBootstrap
{
  private pingServer: http.Server;

  private logger = new Logger(AppService.name);
  constructor(
    private readonly ebus: EventBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
    @Inject('RMQ') private readonly rmq: ClientRMQ,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [
      GameServerDiscoveredEvent,
      ServerStatusEvent,
      LiveMatchUpdateEvent,
      MatchFailedEvent,
      GameResultsEvent,
      PlayerAbandonedEvent,
      PlayerConnectedEvent,
      SrcdsServerStartedEvent,
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe((t) => this.redisEventQueue.emit(t.constructor.name, t));

    // await new Promise(resolve => setTimeout(resolve, 1000));

    await this.rmq.connect();

    console.log('Before:');

    return;

    // console.log(some);
  }

  onApplicationShutdown(signal?: string): any {
    return new Promise((resolve, reject) => this.pingServer.close(resolve));
  }
}
