import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { ServerStatusEvent } from 'src/gateway/events/gs/server-status.event';
import { ConfigService } from '@nestjs/config';
import { DockerService } from '../../docker/docker.service';
import { Logger } from '@nestjs/common';

@EventsHandler(ServerActualizationRequestedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<ServerActualizationRequestedEvent>
{
  private logger = new Logger(GameServerNotStartedHandler.name);

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

    this.logger.log('Sending event that server is dead');
    // Server not running, close it
    this.ebus.publish(new ServerStatusEvent(event.url, false));
  }
}
