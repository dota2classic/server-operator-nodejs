import * as find from 'find-process';
import { CommandLineConfig } from 'src/operator/command/launch-game-server.handler';

export interface SrcdsProcess {
    port: number;
    pid: number;
    match: CommandLineConfig;
}

interface ProcessWrapper {
    pid: number;
    arguments: string[];
}


const checkProcess = (inf: ProcessWrapper): SrcdsProcess | null => {

    const indexOfPort = inf.arguments.indexOf('-port');
    const indexOfMatchdata = inf.arguments.indexOf('-match');
    const port = parseInt(inf.arguments[indexOfPort + 1]);
    const pid = inf.pid;

    if (inf.arguments[0] === '<defunct>') {
        // we need to kill this process
        process.kill(pid);
        console.warn('Killed orphaned srcds server on pid ' + pid);
        return null;
    }

    try {
        const matchInfo = JSON.parse(atob(inf.arguments[indexOfMatchdata + 1]));
        return {
            pid,
            port,
            match: matchInfo,
        };
    } catch (e) {
        console.log(inf);
        console.log('ERROR HERE!', e);
        return null;
    }

};

export async function getRunningSrcds(): Promise<SrcdsProcess[]> {

    // const regex = process.platform === 'win32' ? '.*srcds\\.exe.*' : '.*srcds_linux.*';
    const regex = process.platform === 'win32' ? 'srcds.exe' : 'srcds_linux';

    const result: SrcdsProcess[] = await find('name', regex, false)
      .then(function(list) {
          const r: (SrcdsProcess | null)[] = list.map(proc => {
              const args = proc.cmd.split(/\s+/g);

              return checkProcess({
                  pid: proc.pid,
                  arguments: args,
              });
          })


          return r.filter(Boolean);
      })

    return result;

    // const cmd = (() => {
    //   switch (process.platform) {
    //     case 'win32': return `tasklist`
    //     case 'darwin': return `ps -ax | grep ${processName}`
    //     case 'linux': return `ps -A`
    //     default: return false
    //   }
    // })()

    // if( ! cmd ) {
    //   return false;
    // }

    // return new Promise((resolve, reject) => {
    //   require('child_process').exec(cmd, (err: Error | null, stdout: string, stderr: string) => {
    //     if (err) reject(err);

    //     console.log(stdout)
    //     resolve(stdout.toLowerCase().indexOf(processName.toLowerCase()) > -1)
    //   })
    // })
  }
