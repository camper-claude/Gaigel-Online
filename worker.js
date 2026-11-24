// Gaigel online: ein Durable Object pro Raum-Code leitet Nachrichten zwischen 2 Spielern weiter.
export class Room {
  constructor() { this.s = [null, null]; }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket noetig', { status: 426 });
    const slot = new URL(req.url).searchParams.get('role') === '1' ? 1 : 0;
    const [client, srv] = Object.values(new WebSocketPair());
    srv.accept();
    const err = (m) => { srv.send(JSON.stringify({ t: 'err', m })); srv.close(); };
    if (this.s[slot]) err('Der Code isch scho vergeba.');
    else if (slot === 1 && !this.s[0]) err('Koi Spiel mit dem Code.');
    else {
      this.s[slot] = srv;
      srv.addEventListener('message', (e) => { const o = this.s[1 - slot]; if (o) o.send(e.data); });
      const bye = () => {
        if (this.s[slot] !== srv) return;
        this.s[slot] = null;
        const o = this.s[1 - slot]; if (o) o.send('{"t":"left"}');
      };
      srv.addEventListener('close', bye);
      srv.addEventListener('error', bye);
      if (this.s[0] && this.s[1]) for (const x of this.s) x.send('{"t":"ready"}');
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === '/ws') {
      const code = (u.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      if (code.length !== 4) return new Response('Code?', { status: 400 });
      return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};
