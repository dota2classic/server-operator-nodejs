import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { WinstonWrapper } from './util/logger';
import { ConfigService } from '@nestjs/config';
import configuration from './configuration';
import { Logger } from '@nestjs/common';
import { RmqOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';

async function bootstrap() {
  const config = new ConfigService(configuration());

  const app = await NestFactory.create(AppModule, {
    logger: new WinstonWrapper(
      config.get('fluentbit.host'),
      config.get('fluentbit.port'),
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
