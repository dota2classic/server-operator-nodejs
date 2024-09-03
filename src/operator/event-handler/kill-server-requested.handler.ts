import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'src/gateway/events/gs/kill-server-requested.event';
import { getRunningSrcds } from 'src/util/processes';

@EventsHandler(KillServerRequestedEvent)
export class KillServerRequestedEventHandler
  implements IEventHandler<ServerActualizationRequestedEvent> {

  constructor(private readonly ebus: EventBus) {

  }

  async handle(event: KillServerRequestedEvent) {
    const host = event.url.split(':')[0];
    const port = parseInt(event.url.split(':')[1]);

    const processes = await getRunningSrcds();
    const proc = processes.find(it => it.match.url === event.url);;
    if(proc){
      process.kill(proc.pid);
    }
  }



}