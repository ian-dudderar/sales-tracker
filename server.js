const { createServer } = require("http");
const { parse } = require("url");

// const port = process.env.PORT || 3000;
const port = 80;
const dev = process.env.NODE_ENV !== "production";
const next = require("next");
const hostname = "localhost";
const app = next({ dev, hostname, port });

//WHY WONT ENV VARIABLE WORK HERE?
const URL = "http://localhost:3000";
const handle = app.getRequestHandler();

let clients = [];

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      if (pathname === "/api/websocket") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString(); // convert Buffer to string
        });
        req.on("end", () => {
          let data = JSON.parse(body);
          console.log(data); // Body data
          clients.forEach((client) => {
            client.send(data);
          });
        });
      } else {
        await handle(req, res, parsedUrl);
      }
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  })
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on `);
      onServerStart();
    });
});

const onServerStart = () => {
  const WebSocket = require("ws");
  const wss = new WebSocket.Server({ port: 80 });
  // fetch(`${process.env.LOCAL_URL}/api/webhooks`);

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    clients.push(ws);

    ws.on("message", (message) => {
      console.log(`Received: ${message}`);
      ws.send(`Server received: ${message}`);
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      clients = clients.filter((client) => client !== ws);
    });
  });
};
