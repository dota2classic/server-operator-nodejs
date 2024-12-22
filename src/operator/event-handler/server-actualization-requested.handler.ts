import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { getRunningSrcds } from 'src/util/processes';
import { ServerStatusEvent } from 'src/gateway/events/gs/server-status.event';
import { AppService } from '../../app.service';

@EventsHandler(ServerActualizationRequestedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<ServerActualizationRequestedEvent>
{
  constructor(
    private readonly ebus: EventBus,
    private readonly appService: AppService,
  ) {}

  async handle(event: ServerActualizationRequestedEvent) {
    const server = this.appService.config[event.url];
    if (!server) {
      return;
    }

    const processes = await getRunningSrcds();
    const process = processes.find((proc) => proc.match.url == event.url);

    this.ebus.publish(
      new ServerStatusEvent(
        event.url,
        !!process,
        process?.match?.matchId,
        process?.match?.info,
      ),
    );
  }
}
