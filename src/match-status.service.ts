import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { GameResultsEvent } from './gateway/events/gs/game-results.event';
import { PlayerAbandonedEvent } from './gateway/events/bans/player-abandoned.event';
import { MatchFailedEvent } from './gateway/events/match-failed.event';

@Injectable()
export class MatchStatusService {
  constructor(@Inject('RMQ') private readonly rmq: ClientProxy) {}

  public matchResults(gr: GameResultsEvent) {
    this.rmq.emit(GameResultsEvent.name, gr);
  }

  public matchFailed(e: MatchFailedEvent) {
    this.rmq.emit(MatchFailedEvent.name, e);
  }

  public playerAbandon(pa: PlayerAbandonedEvent) {
    this.rmq.emit(PlayerAbandonedEvent.name, pa);
  }
}
