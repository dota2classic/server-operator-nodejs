import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, RedisOptions, Transport } from '@nestjs/microservices';
import { LaunchGameServerCommandHandler } from './operator/command/launch-game-server.handler';
import { ScheduleModule } from '@nestjs/schedule';
import { KillServerRequestedEventHandler } from './operator/event-handler/kill-server-requested.handler';
import { S3Module } from 'nestjs-s3';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuration';
import { ReplayService } from './replay.service';
import { RconService } from './rcon.service';
import { RunRconHandler } from './operator/command/run-rcon.handler';
import { MatchStatusService } from './match-status.service';
import { EventsController } from './events.controller';
import { MetricsService } from './metrics.service';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { CustomMetricsMiddleware } from './middleware/custom-metrics.middleware';
import { ReqLoggingInterceptor } from './middleware/req-logging.interceptor';
import * as Docker from 'dockerode';
import { DockerService } from './docker/docker.service';
// import { WinstonWrapper } from './util/logger';
import { WinstonWrapper } from '@dota2classic/nest_logger';
import { GameServerNotStartedHandler } from './operator/event-handler/server-actualization-requested.handler';
import { SrcdsMapper } from './mapper/srcds.mapper';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

const EventHandlers = [
  LaunchGameServerCommandHandler,
  KillServerRequestedEventHandler,
  GameServerNotStartedHandler,
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
    PrometheusModule.registerAsync({
      useFactory(config: ConfigService) {
        return {
          pushgateway: {
            url: config.get('pushgateway_url'),
          },
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'QueryCore',
        useFactory(config: ConfigService): RedisOptions {
          return {
            transport: Transport.REDIS,
            options: {
              host: config.get('redis.host'),
              password: config.get('redis.password'),
              reconnectOnError: () => true,
              connectTimeout: 3000,
              keepAlive: 1,
            },
          } satisfies RedisOptions;
        },
        inject: [ConfigService],
        imports: [],
      },
    ]),
    RabbitMQModule.forRootAsync({
      useFactory(config: ConfigService): RabbitMQConfig {
        return {
          exchanges: [
            {
              name: 'app.events',
              type: 'topic',
            },
          ],
          enableControllerDiscovery: true,
          uri: `amqp://${config.get('rabbitmq.user')}:${config.get('rabbitmq.password')}@${config.get('rabbitmq.host')}:${config.get('rabbitmq.port')}`,
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
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
  controllers: [AppController, EventsController],
  providers: [
    AppService,
    ReplayService,
    RconService,
    MatchStatusService,
    MetricsService,
    ReqLoggingInterceptor,
    DockerService,
    SrcdsMapper,
    {
      provide: 'Docker',
      useFactory() {
        return new Docker();
      },
    },
    {
      provide: 'SrcdsLogger',
      useFactory(config: ConfigService) {
        return new WinstonWrapper(
          config.get('fluentbit.host'),
          config.get('fluentbit.port'),
          'srcds',
          config.get('fluentbit.disabled'),
        );
      },
      inject: [ConfigService],
    },
    ...EventHandlers,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CustomMetricsMiddleware).forRoutes('');
  }
}
