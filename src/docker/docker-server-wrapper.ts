import Dockerode from 'dockerode';

export class DockerServerWrapper {
  public static readonly SERVER_URL_LABEL = 'ru.dotaclassic-url';
  public static readonly MATCH_ID_LABEL = 'ru.dotaclassic-matchId';

  public readonly matchId: number;
  public readonly serverUrl: string;

  constructor(private readonly container: Dockerode.ContainerInfo) {
    this.matchId = parseInt(
      container.Labels[DockerServerWrapper.MATCH_ID_LABEL],
    );
    this.serverUrl = container.Labels[DockerServerWrapper.SERVER_URL_LABEL];
  }
}
