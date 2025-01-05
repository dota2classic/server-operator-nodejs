import { parseStatusResponse, parseStatusRow } from './parseStatusResponse';

describe('parseStatusResponse', () => {
  it('should parse status row for human', () => {
    const some = parseStatusRow(
      '#  3 2 "Fosoroy через атос" [U:1:126880756] 28:53 87 0 active 80000 37.214.4.218:3560',
    );
    expect(some).toEqual({
      userid: 2,
      name: 'Fosoroy через атос',
      uniqueid: `[U:1:126880756]`,
      connected: '28:53',
      ping: 87,
      loss: 0,
      state: `active`,
      rate: 80000,
      adr: `37.214.4.218:3560`,
    });
  });

  it('should parse status row for bot', () => {
    const some = parseStatusRow(`# 9 "Gob Bot" BOT active`);

    expect(some).toEqual(undefined);
  });
  it('should parse 10 player game', () => {
    const raw = `>hostname: Dota 2
  version : 41/41 0 secure
  steamid : [A:1:2462798875:39265] (90240636901086235)
  udp/ip  :  0.0.0.0:27035 os(Linux) type(dedicated)
  sourcetv:  port 27040, delay 120.0s
  players : 10 humans, 1 bots (15 max) (not hibernating)
  edicts : 1045 used of 2048 max
  gamestate: DOTA_GAMERULES_STATE_GAME_IN_PROGRESS Times: Transition=409.17 Current=1729.80
  # userid name uniqueid connected ping loss state rate adr
  # 2 "SourceTV" BOT active
  #  3 2 "Fosoroy через атос" [U:1:126880756] 28:53 87 0 active 80000 37.214.4.218:3560
  #  4 3 "Mieke" [U:1:1229265018] 28:53 67 0 active 80000 37.204.59.79:58488
  #  5 4 "pos 5 няшка" [U:1:314583257] 28:53 118 0 active 80000 91.218.102.36:54605
  #  6 5 "♿ИГРАЮКАКМОГУ♿" [U:1:97698090] 28:53 116 0 active 80000 145.255.8.232:50127
  #  7 6 "V" [U:1:253323011] 28:52 78 0 active 80000 195.211.79.226:49909
  #  8 7 "GTX 750 TI 2GB" [U:1:1584469629] 28:50 67 0 active 80000 146.120.175.185:60153
  #  9 8 "чморфлинг" [U:1:116062527] 28:50 196 0 active 80000 212.14.207.81:38840
  # 10 9 "torbasow" [U:1:148928588] 27:58 102 0 active 80000 188.186.232.48:49533
  # 11 10 "zxc" [U:1:294916479] 27:52 122 0 active 80000 176.36.52.167:64062
  # 14 11 "ЕБАНОЕ УЁБИЩЕ" [U:1:1126848000] 18:48 105 0 active 80000 85.174.201.93:6092
  #end
  L 01/05/2025 - 14:39:56: rcon from "178.70.209.156:56047": command "status"
  `;

    expect(parseStatusResponse(raw)).toEqual([
      {
        userid: 2,
        name: 'Fosoroy через атос',
        uniqueid: `[U:1:126880756]`,
        connected: '28:53',
        ping: 87,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `37.214.4.218:3560`,
      },
      {
        userid: 3,
        name: 'Mieke',
        uniqueid: `[U:1:1229265018]`,
        connected: '28:53',
        ping: 67,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `37.204.59.79:58488`,
      },
      {
        userid: 4,
        name: 'pos 5 няшка',
        uniqueid: `[U:1:314583257]`,
        connected: '28:53',
        ping: 118,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `91.218.102.36:54605`,
      },
      {
        userid: 5,
        name: '♿ИГРАЮКАКМОГУ♿',
        uniqueid: `[U:1:97698090]`,
        connected: '28:53',
        ping: 116,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `145.255.8.232:50127`,
      },
      {
        userid: 6,
        name: 'V',
        uniqueid: `[U:1:253323011]`,
        connected: '28:52',
        ping: 78,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `195.211.79.226:49909`,
      },
      {
        userid: 7,
        name: 'GTX 750 TI 2GB',
        uniqueid: `[U:1:1584469629]`,
        connected: '28:50',
        ping: 67,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `146.120.175.185:60153`,
      },
      {
        userid: 8,
        name: 'чморфлинг',
        uniqueid: `[U:1:116062527]`,
        connected: '28:50',
        ping: 196,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `212.14.207.81:38840`,
      },
      {
        userid: 9,
        name: 'torbasow',
        uniqueid: `[U:1:148928588]`,
        connected: '27:58',
        ping: 102,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `188.186.232.48:49533`,
      },
      {
        userid: 10,
        name: 'zxc',
        uniqueid: `[U:1:294916479]`,
        connected: '27:52',
        ping: 122,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `176.36.52.167:64062`,
      },
      {
        userid: 11,
        name: 'ЕБАНОЕ УЁБИЩЕ',
        uniqueid: `[U:1:1126848000]`,
        connected: '18:48',
        ping: 105,
        loss: 0,
        state: `active`,
        rate: 80000,
        adr: `85.174.201.93:6092`,
      },
    ]);
  });
});
