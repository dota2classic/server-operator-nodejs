import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { FLUENTBIT_HOST, REDIS_HOST, REDIS_PASSWORD, REDIS_URL } from './env';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { inspect } from 'util';
import { GameServerDiscoveredEvent } from './gateway/events/game-server-discovered.event';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { LiveMatchUpdateEvent } from './gateway/events/gs/live-match-update.event';
import { WinstonWrapper } from './util/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonWrapper(FLUENTBIT_HOST),
  });

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: REDIS_URL(),
      host: REDIS_HOST(),
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: REDIS_PASSWORD(),
    },
  })


  const ebus = app.get(EventBus);
  const cbus = app.get(CommandBus);
  const qbus = app.get(QueryBus);

  const clogger = new Logger('CommandLogger');
  const elogger = new Logger('EventLogger');
  const qlogger = new Logger('QueryLogger');

  ebus.subscribe(e => {
    if(e.constructor.name === GameServerDiscoveredEvent.name) return;
    if(e.constructor.name === ServerActualizationRequestedEvent.name) return;
    if(e.constructor.name === LiveMatchUpdateEvent.name) return;

    elogger.log(
      `${inspect(e)}`
    );
  })


  cbus.subscribe(e => {
    clogger.log(`${inspect(e)}, ${e.constructor.name}`);
  })

  qbus.subscribe(e => {
    qlogger.log(e.constructor.name);
  })

  await app.listen(7777);
  await app.startAllMicroservices();

  console.log('Started');

}
bootstrap();
