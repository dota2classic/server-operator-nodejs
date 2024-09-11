import * as ps from "ps-node"
import { CommandLineConfig } from "src/operator/command/launch-game-server.handler";

export interface SrcdsProcess {
    port: number;
    pid: number;
    match: CommandLineConfig;
}

export async function getRunningSrcds(): Promise<SrcdsProcess[]> {

    const regex = process.platform === 'win32' ? '.*srcds\\.exe.*' : '.*srcds_linux.*';
    return new Promise((resolve, reject) => {
        ps.lookup({
            command: regex
        }, (err, list) => {
            if(err){
                reject([]);
                return;
            }
    
            const res:SrcdsProcess[] =  list.map((inf) => {

                const indexOfPort = inf.arguments.indexOf('-port');
                const indexOfMatchdata = inf.arguments.indexOf('-match')
                const port = parseInt(inf.arguments[indexOfPort + 1]);
                const pid = parseInt(inf.pid);

                if(inf.arguments[0] === '<defunct>'){
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
                        match: matchInfo
                    }
                }catch(e){
                    console.log(inf)
                    console.log("ERROR HERE!", e)
                    return null;
                }

            }).filter(Boolean);

            

            // console.log(list);
            resolve(res);
        })
    })


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