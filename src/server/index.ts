import http from 'http';
import { WebSocketServer } from 'ws';
import { BiorhythmManager, botBiothythmManager } from "../biorhythm";

export function startServer(bot: BiorhythmManager) {
  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK"); // 短い固定レスポンスで良い
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({ server, path: "/ws" });

  // Biorhythm更新時に全クライアントに送信
  const broadcast = (data: any) => {
    const json = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === 1) { // OPEN
        client.send(json);
      }
    }
  };

  bot.on('statsChange', () => {
    const state = botBiothythmManager.getCurrentState();
    broadcast(state);
  });

  // WebSocket接続
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    if (origin !== 'https://suibari.com') {
      console.log(`[WARN] Blocked WS connection from origin: ${origin}`);
      ws.close();
      return;
    }

    console.log(`[INFO] WS client connected from origin: ${origin}`);
    const state = botBiothythmManager.getCurrentState();
    ws.send(JSON.stringify(state));

    // 受信処理不要のため on('message') はなし
  });

  server.listen(process.env.NODE_PORT, () => {
    console.log(`🟢 WS server listening on port ${process.env.NODE_PORT}`);
  });
}
