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
    const runningServers = await this.docker.getRunningGameServers();
    const server = runningServers.find(
      (server) => server.serverUrl === event.url,
    );
    if (!server) return;

    try {
      await this.docker.stopGameServer(server.matchId);
      this.logger.log(
        `Successfully stopped server for match id ${server.matchId} ${server.serverUrl}`,
      );
    } catch (e) {
      this.logger.error(
        `Error trying to stop container ${server.serverUrl} ${server.matchId}`,
        e,
      );
    }
  }
}
