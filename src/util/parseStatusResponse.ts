export interface SrcdsPlayerMetric {
  userid: number;
  name: string;
  uniqueid: string;
  connected: string;
  ping: number;
  loss: number;
  state: string;
  rate: number;
  adr: string;
}

export const parseStatusRow = (row: string): SrcdsPlayerMetric | undefined => {
  const sep = /(?:[^\s"]+|"[^"]*")+/g;
  const spaced = row.match(sep);

  // a bot
  if (spaced.length === 5) return undefined;

  return {
    userid: Number(spaced[2]),
    name: spaced[3].replaceAll('"', ''),
    uniqueid: spaced[4],
    connected: spaced[5],
    ping: Number(spaced[6]),
    loss: Number(spaced[7]),
    state: spaced[8],
    rate: Number(spaced[9]),
    adr: spaced[10],
  };
};
export const parseStatusResponse = (raw: string): SrcdsPlayerMetric[] => {
  let parts = raw.split('\n');

  parts = parts.slice(10);

  const statuses: SrcdsPlayerMetric[] = [];
  for (let part of parts) {
    if (part.trim() === '#end') break;
    const parsed = parseStatusRow(part);
    if (parsed) statuses.push(parsed);
  }

  return statuses;
};
