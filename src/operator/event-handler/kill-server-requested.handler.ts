import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'src/gateway/events/gs/kill-server-requested.event';
import { Logger } from '@nestjs/common';
import { DockerService } from '../../docker/docker.service';

@EventsHandler(KillServerRequestedEvent)
export class KillServerRequestedEventHandler
  implements IEventHandler<ServerActualizationRequestedEvent>
{
  private readonly logger = new Logger(KillServerRequestedEventHandler.name);

  constructor(private readonly docker: DockerService) {}

  async handle(event: KillServerRequestedEvent) {
    throw 'Not implemented: kill server';
    // const servers = await this.docker.getRunningGameServers();
    // const proc = servers.find(it => it.match.url === event.url);
    // if(proc){
    //   process.kill(proc.pid);
    //   this.logger.log(`Killed running server: requested`, { pid: proc.pid, url: event.url });
    // } else {
    //   this.logger.warn(`Can't find server to kill`, { url: event.url });
    // }
  }
}
