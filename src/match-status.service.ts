import { Injectable } from '@nestjs/common';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';
import { PlayerNotLoadedEvent } from './gateway/events/bans/player-not-loaded.event';
import { EventBus } from '@nestjs/cqrs';

@Injectable()
export class MatchStatusService {
  constructor(private readonly ebus: EventBus) {}

  public matchResults(gr: GameResultsEvent) {
    this.ebus.publish(gr);
  }

  public matchFailed(e: MatchFailedEvent) {
    this.ebus.publish(e);
  }

  public playerAbandon(pa: PlayerAbandonedEvent) {
    this.ebus.publish(pa);
  }

  public playerNotLoaded(pa: PlayerNotLoadedEvent) {
    this.ebus.publish(pa);
  }
}
