import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerActualizationRequestedEvent } from 'src/gateway/events/gs/server-actualization-requested.event';
import { Rcon } from "rcon-client"
import { RCON_PASSWORD } from 'src/env';
import { executeRcon, executeRconUrl, isServerRunning } from 'src/util/rcon';
import { getRunningSrcds } from 'src/util/processes';
import { ServerSessionSyncEvent } from 'src/gateway/events/gs/server-session-sync.event';
import { ServerStatusEvent } from 'src/gateway/events/gs/server-status.event';

@EventsHandler(ServerActualizationRequestedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<ServerActualizationRequestedEvent> {

  constructor(private readonly ebus: EventBus) {

  }

  async handle(event: ServerActualizationRequestedEvent) {
    console.log("Actualization requested");
    const processes = await getRunningSrcds();
    const process = processes.find(proc => proc.match.url == event.url);


    this.ebus.publish(new ServerStatusEvent(event.url, !!process, process?.match?.matchId, process?.match?.info));
  }


}