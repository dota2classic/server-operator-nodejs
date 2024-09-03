import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_URL } from './env';
import { outerQuery } from 'src/gateway/util/outerQuery';
import { QueryCache } from 'src/rcache';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { GameServerNotStartedHandler } from './operator/event-handler/server-actualization-requested.handler';
import { LaunchGameServerCommandHandler } from './operator/command/launch-game-server.handler';
import { ScheduleModule } from '@nestjs/schedule';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import { KillServerRequestedEventHandler } from './operator/event-handler/kill-server-requested.handler';



const EventHandlers = [
  GameServerNotStartedHandler,
  LaunchGameServerCommandHandler,
  KillServerRequestedEventHandler
]

export function qCache<T, B>() {
  return new QueryCache<T, B>({
    url: REDIS_URL(),
    password: REDIS_PASSWORD(),
    ttl: 10,
  });
}

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          url: REDIS_URL(),
          host: REDIS_HOST(),
          retryAttempts: Infinity,
          retryDelay: 5000,
          password: REDIS_PASSWORD(),
        },
      },
    ] as any),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ...EventHandlers,
    // outerQuery(GameServerDiscoveredEvent, 'QueryCore', qCache()),
  ],
})
export class AppModule {}
