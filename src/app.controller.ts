import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { LaunchGameServerCommand } from './gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerResponse } from './gateway/commands/LaunchGameServer/launch-game-server.response';
import { construct } from './gateway/util/construct';
import { ServerActualizationRequestedEvent } from './gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from './gateway/events/gs/kill-server-requested.event';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly cbus: CommandBus, private readonly ebus: EventBus) {}

  @MessagePattern(LaunchGameServerCommand.name)
  async LaunchGameServerCommand(
    query: LaunchGameServerCommand,
  ): Promise<LaunchGameServerResponse> {
    return this.cbus.execute(construct(LaunchGameServerCommand, query));
  }

  @MessagePattern(ServerActualizationRequestedEvent.name)
  async ServerActualizationRequestedEvent(
    query: ServerActualizationRequestedEvent,
  ) {
    return this.ebus.publish(construct(ServerActualizationRequestedEvent, query));
  }

  @MessagePattern(KillServerRequestedEvent.name)
  async KillServerRequestedEvent(
    query: KillServerRequestedEvent,
  ) {
    return this.ebus.publish(construct(KillServerRequestedEvent, query));
  }
}
