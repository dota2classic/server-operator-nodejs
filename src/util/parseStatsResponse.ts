export interface SrcdsServerMetrics {
  cpu: number;
  in: number;
  out: number;
  uptime: number;
  users: number;
  fps: number;
  players: number;
}

export const parseStatsResponse = (statsRaw: string): SrcdsServerMetrics => {
  let stats = statsRaw.split(/\r?\n/);
  stats.pop();
  stats.shift();
  stats = stats[0].trim().split(/\s+/);

  return {
    cpu: Number(stats[0]),
    in: Number(stats[1]),
    out: Number(stats[2]),
    uptime: Number(stats[3]),
    users: Number(stats[4]),
    fps: Number(stats[5]),
    players: Number(stats[6]),
  };
};
