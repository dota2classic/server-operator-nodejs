import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { WinstonWrapper } from './util/logger';
import { ConfigService } from '@nestjs/config';
import configuration from './configuration';

async function bootstrap() {
  const config = new ConfigService(configuration());

  const app = await NestFactory.create(AppModule, {
    logger: new WinstonWrapper(config.get('fluentbit.host')),
  });

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: `redis://${config.get(''redis.host'}:6379`,
      host: config.get(''redis.host',
      password: config.get(''redis.password',
    },
  });

  const ebus = app.get(EventBus);
  const cbus = app.get(CommandBus);
  const qbus = app.get(QueryBus);

  const clogger = new Logger('CommandLogger');
  const elogger = new Logger('EventLogger');
  const qlogger = new Logger('QueryLogger');

  ebus.subscribe((e) => {
    if (e.constructor.name === GameServerDiscoveredEvent.name) return;
    if (e.constructor.name === ServerActualizationRequestedEvent.name) return;
    if (e.constructor.name === LiveMatchUpdateEvent.name) return;

    elogger.log(`${inspect(e)}`);
  });

  cbus.subscribe((e) => {
    clogger.log(`${inspect(e)}, ${e.constructor.name}`);
  });

  qbus.subscribe((e) => {
    qlogger.log(e.constructor.name);
  });

  await app.listen(7777);
  await app.startAllMicroservices();

  console.log('Started');
}
bootstrap();
