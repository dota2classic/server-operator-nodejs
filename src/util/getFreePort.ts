import * as net from 'net';

export async function getFreePort(): Promise<number> {
  return new Promise<number>((res) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close((err) => res(port));
    });
  });
}
