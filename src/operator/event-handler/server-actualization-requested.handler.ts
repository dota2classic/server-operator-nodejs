import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { getRunningSrcds } from 'src/util/processes';
import { ServerStatusEvent } from 'src/gateway/events/gs/server-status.event';
import { SrcdsService } from '../../srcds.service';

@EventsHandler(ServerActualizationRequestedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<ServerActualizationRequestedEvent>
{
  constructor(
    private readonly ebus: EventBus,
    private readonly srcdsService: SrcdsService,
  ) {}

  async handle(event: ServerActualizationRequestedEvent) {
    if (!this.srcdsService.getServer(event.url)) {
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
