import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { ServerStatusEvent } from 'src/gateway/events/gs/server-status.event';
import { ConfigService } from '@nestjs/config';
import { DockerService } from '../../docker/docker.service';

@EventsHandler(ServerActualizationRequestedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<ServerActualizationRequestedEvent>
{
  constructor(
    private readonly ebus: EventBus,
    private readonly config: ConfigService,
    private readonly docker: DockerService,
  ) {}

  async handle(event: ServerActualizationRequestedEvent) {
    const host = event.url.split(':')[0];
    if (this.config.get('srcds.host') !== host) return;

    const running = await this.docker.getRunningGameServers();

    const container = running.find((t) => t.serverUrl === event.url);

    // All good
    if (container) return;

    // Server not running, close it
    this.ebus.publish(
      new ServerStatusEvent(event.url, false, undefined, undefined),
    );
  }
}
