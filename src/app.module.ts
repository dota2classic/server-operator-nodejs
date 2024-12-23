import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';
import { GameServerNotStartedHandler } from './operator/event-handler/server-actualization-requested.handler';
import { LaunchGameServerCommandHandler } from './operator/command/launch-game-server.handler';
import { ScheduleModule } from '@nestjs/schedule';
import { KillServerRequestedEventHandler } from './operator/event-handler/kill-server-requested.handler';
import { S3Module } from 'nestjs-s3';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuration';
import { ReplayService } from './replay.service';
import { RconService } from './rcon.service';
import { RunRconHandler } from './operator/command/run-rcon.handler';
import { SrcdsService } from './srcds.service';

const EventHandlers = [
  GameServerNotStartedHandler,
  LaunchGameServerCommandHandler,
  KillServerRequestedEventHandler,
  RunRconHandler,
];

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'RMQ',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'start_srcds_queue',
          queueOptions: {
            durable: true,
          },
          prefetchCount: 5,
        },
      },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'QueryCore',
        useFactory(config: ConfigService): RedisOptions {
          return {
            transport: Transport.REDIS,
            options: {
              host: config.get('redis.host'),
              password: config.get('redis.password'),
            },
          } satisfies RedisOptions;
        },
        inject: [ConfigService],
        imports: [],
      },
    ]),
    S3Module.forRootAsync({
      useFactory(config: ConfigService) {
        return {
          config: {
            credentials: {
              accessKeyId: config.get('s3.accessKeyId'),
              secretAccessKey: config.get('s3.accessKeySecret'),
            },
            // region: 'us-east-1',
            region: 'any',
            endpoint: config.get('s3.endpoint'),
            forcePathStyle: true,
          },
        };
      },
      inject: [ConfigService],
      imports: [],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ReplayService,
    RconService,
    SrcdsService,
    ...EventHandlers,
    // outerQuery(GameServerDiscoveredEvent, 'QueryCore', qCache()),
  ],
})
export class AppModule {}
