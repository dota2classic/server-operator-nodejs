// import { Rcon } from "rcon-client";
// import { RCON_PASSWORD } from "src/env";
// import { getRunningSrcds } from "./processes";
//
// export function executeRcon(host: string, port: number, command: string, timeout: number = 500): Promise<string> {
//     return new Promise(async (resolve ,reject) => {
//         setTimeout(() => {
//             reject(new Error("Timeout"))
//         }, timeout);
//
//         const rcon = await Rcon.connect({
//             host: host, port: port, password: RCON_PASSWORD(), timeout
//         });
//         const response = await rcon.send(command)
//         await rcon.end()
//         resolve(response);
//     })
// }
//
// export async function executeRconUrl(url: string, command: string, timeout: number = 500){
//     const host = url.split(':')[0];
//     const port = parseInt(url.split(':')[1]);
//     return executeRcon(host, port, command, timeout);
// }

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
