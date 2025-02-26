import Dockerode from 'dockerode';
import { MatchmakingMode } from '../gateway/shared-types/matchmaking-mode';

export class DockerServerWrapper {
  public static readonly SERVER_URL_LABEL = 'ru.dotaclassic-url';
  public static readonly MATCH_ID_LABEL = 'ru.dotaclassic-matchId';
  public static readonly LOBBY_TYPE_LABEL = 'ru.dotaclassic-lobbyType';

  public readonly matchId: number;
  public readonly serverUrl: string;
  public readonly lobbyType: MatchmakingMode;

  constructor(public readonly container: Dockerode.ContainerInfo) {
    this.matchId = parseInt(
      container.Labels[DockerServerWrapper.MATCH_ID_LABEL],
    );
    this.serverUrl = container.Labels[DockerServerWrapper.SERVER_URL_LABEL];
    this.lobbyType = Number(
      container.Labels[DockerServerWrapper.LOBBY_TYPE_LABEL],
    );
  }
}
