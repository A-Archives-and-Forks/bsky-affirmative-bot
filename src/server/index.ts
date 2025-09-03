import http from 'http';
import { WebSocketServer } from 'ws';
import { BiorhythmManager } from "../biorhythm";
import { Logger } from "../logger"
import { botBiothythmManager } from '..';

export function startServer(bot: BiorhythmManager, logger: Logger) {
  const server = http.createServer((req, res) => {
    console.log(`[INFO][SERVER] Received request for: ${req.url}`);
    if (req.url === "/.well-known/atproto-did") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(process.env.BSKY_DID);
    } else if (req.url === "/image.png") {
      const imageBuffer = bot.generatedImage; // Access the generated image
      if (imageBuffer) {
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        });
        res.end(imageBuffer);
      } else {
        res.writeHead(404);
        res.end("Image not found");
      }
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

  const updateHandler = () => {
    const state = botBiothythmManager.getCurrentState();
    broadcast(state);
  };

  bot.on('statsChange', updateHandler);
  logger.on('statsChange', updateHandler);

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
