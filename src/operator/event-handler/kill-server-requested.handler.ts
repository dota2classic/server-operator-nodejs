import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'src/gateway/events/gs/kill-server-requested.event';
import { getRunningSrcds } from 'src/util/processes';
import { Logger } from '@nestjs/common';

@EventsHandler(KillServerRequestedEvent)
export class KillServerRequestedEventHandler
  implements IEventHandler<ServerActualizationRequestedEvent> {

  private readonly logger = new Logger(KillServerRequestedEventHandler.name);

  constructor() {

  }

  async handle(event: KillServerRequestedEvent) {

    const processes = await getRunningSrcds();
    const proc = processes.find(it => it.match.url === event.url);
    if(proc){
      process.kill(proc.pid);
      this.logger.log(`Killed running server: requested`, { pid: proc.pid, url: event.url });
    } else {
      this.logger.warn(`Can't find server to kill`, { url: event.url });
    }
  }



}
