import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_URL } from './env';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { inspect } from 'util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

    elogger.log(
      // `${inspect(e)}`,
      e.constructor.name,
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
  console.log("Staretd")


}
bootstrap();
