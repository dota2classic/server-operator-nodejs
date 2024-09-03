import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'src/gateway/events/gs/kill-server-requested.event';
const { killPortProcess } = require('kill-port-process');

@EventsHandler(KillServerRequestedEvent)
export class KillServerRequestedEventHandler
  implements IEventHandler<ServerActualizationRequestedEvent> {

  constructor(private readonly ebus: EventBus) {

  }

  async handle(event: KillServerRequestedEvent) {
    const host = event.url.split(':')[0];
    const port = parseInt(event.url.split(':')[1]);

    killPortProcess(port);
  }



}