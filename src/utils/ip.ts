import * as http from 'http';
import * as websocket from 'websocket';

export function ipFromWebSocket(connection: websocket.connection, req: http.IncomingMessage): string {
  let ip = connection.remoteAddress || ((req.headers['x-forwarded-for'] as string) || '').split(/\s*,\s*/)[0];
  ip = ip.replace(/[^0-9\.]/gi, '');

  return ip;
}
