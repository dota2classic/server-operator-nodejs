import { parseStatsResponse, SrcdsServerMetrics } from './parseStatsResponse';

describe('parseStatsResponse', () => {
  it('should parse running server', () => {
    const some = parseStatsResponse(
      `CPU   In    Out   Uptime  Users   FPS    Players\n31.01  2.00  4.00       3     0   59.94       9\nL 01/06/2025 - 00:03:30: rcon from \\"156.253.249.142:55454\\": command \\"stats\\"\n`,
    );

    console.log(some);
    expect(some).toMatchObject({
      cpu: 31.01,
      fps: 59.94,
      uptime: 3,
      in: 2.0,
      out: 4.0,
      players: 9,
    } satisfies Partial<SrcdsServerMetrics>);
  });
});
