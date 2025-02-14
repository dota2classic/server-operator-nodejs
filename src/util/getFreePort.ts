import * as net from 'net';

const isPortFree = async (port: number) => {
  return new Promise<boolean>((res) => {
    const server = net.createServer();
    server.once('error', function (err: { code?: string }) {
      if (err.code === 'EADDRINUSE') {
        // port is currently in use
        res(false);
      }
    });

    server.once('listening', function () {
      // close the server if listening doesn't fail
      server.close();
      res(true);
    });

    server.listen(port);
  });
};

export async function getFreePort(): Promise<number> {
  for (let port = 27025; port < 29000; port += 10) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  console.warn('Had to fallback to random free port');
  return new Promise<number>((res) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close((err) => res(port));
    });
  });
}
