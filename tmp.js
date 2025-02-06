const Rcon = require('rcon-srcds').default;

const r = new Rcon({
  host: 'localhost',
  port: 35627,
});

async function a() {
  await r.authenticate('undefined');
  console.log(await r.execute('stats'));
}

a();
