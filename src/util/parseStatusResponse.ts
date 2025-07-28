export interface SrcdsPlayerMetric {
  userid: number;
  name: string;
  steam_id: string;
  connected: string;
  ping: number;
  loss: number;
  state: string;
  rate: number;
  adr: string;
}


export const parseStatusRow = (row: string): SrcdsPlayerMetric | undefined => {
  const sep = /(?:[^\s"]+|"[^"]*")+/g;
  let spaced = row.match(sep);

  // a bot
  if (spaced.length < 7) return undefined;

  const userId = Number(spaced[2])

  const usernameStart = row.indexOf('"')
  const usernameEnd = row.lastIndexOf('"')

  const username = row.slice(usernameStart + 1, usernameEnd).trim();

  const afterUsername = row.substring(usernameEnd);
  spaced = afterUsername.match(sep);


  return {
    userid: userId,
    name: username,
    steam_id: spaced[0].substring(5, spaced[0].length - 1),
    connected: spaced[1],
    ping: Number(spaced[2]),
    loss: Number(spaced[3]),
    state: spaced[4],
    rate: Number(spaced[5]),
    adr: spaced[6],
  };
};
export const parseStatusResponse = (raw: string): SrcdsPlayerMetric[] => {
  let parts = raw.split('\n');

  const indexOfTable = parts.findIndex(
    (row) =>
      row.trim() ===
      '# userid name uniqueid connected ping loss state rate adr',
  );
  parts = parts.slice(indexOfTable + 1);

  const statuses: SrcdsPlayerMetric[] = [];
  for (let part of parts) {
    if (part.trim() === '#end') break;
    const parsed = parseStatusRow(part);
    if (parsed) statuses.push(parsed);
  }

  return statuses;
};
