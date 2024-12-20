import { getRunningSrcds, SrcdsProcess } from './processes';

export async function isServerRunning(url: string): Promise<boolean> {
  return getRunningServerInfo(url).then(Boolean);
}

export async function getRunningServerInfo(
  url: string,
): Promise<SrcdsProcess | undefined> {
  const processes = await getRunningSrcds();
  return processes.find((proc) => proc.match.url == url);
}
