import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { WinstonWrapper } from './util/logger';
import { ConfigService } from '@nestjs/config';
import configuration from './configuration';
import { Logger } from '@nestjs/common';
import { RmqOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';
import { Dota_Map } from './gateway/shared-types/dota-map';
import { Dota_GameMode } from './gateway/shared-types/dota-game-mode';
import { DotaTeam } from './gateway/shared-types/dota-team';
import { Dota2Version } from './gateway/shared-types/dota2version';
import { CommandLineConfig } from './operator/command/launch-game-server.handler';

const a: CommandLineConfig = {
  url: '123',
  matchId: 123,
  info: {
    mode: 7,
    map: Dota_Map.DOTA,
    gameMode: Dota_GameMode.ALLPICK,
    roomId: 'roomid',
    players: [
      {
        playerId: { value: '1272156935' },
        team: DotaTeam.RADIANT,
        name: 'Player #1',
        partyId: 'party1',
      },
      {
        playerId: { value: '1272156930' },
        team: DotaTeam.RADIANT,
        name: 'Player #2',
        partyId: 'party2',
      },
    ],
    version: Dota2Version.Dota_684,
    averageMMR: 0,
  },
};

async function bootstrap() {
  console.log(JSON.stringify(a));
  const config = new ConfigService(configuration());

  const app = await NestFactory.create(AppModule, {
    logger: new WinstonWrapper(
      config.get('fluentbit.host'),
      config.get('fluentbit.port'),
      config.get('fluentbit.application'),
      config.get('fluentbit.disabled'),
    ),
  });

  app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        {
          hostname: config.get<string>('rabbitmq.host'),
          port: config.get<number>('rabbitmq.port'),
          protocol: 'amqp',
          username: config.get<string>('rabbitmq.user'),
          password: config.get<string>('rabbitmq.password'),
        },
      ],
      queue: config.get<string>('rabbitmq.gameserver_commands'),
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: `redis://${config.get('redis.host')}:6379`,
      host: config.get('redis.host'),
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: config.get('redis.password'),
    },
  });

  await app.listen(7777);
  await app.startAllMicroservices();

  new Logger('ServerOperator').log('Server operator launched.');
}
bootstrap();
