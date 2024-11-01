const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });

const handle = app.getRequestHandler();

const URL = process.env.URL || `http://${hostname}:${port}`;

let clients = [];

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;
      if (pathname === "/api/websocket") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          let data = JSON.parse(body);
          clients.forEach((client) => {
            console.log("sending data to client");
            client.emit("update", data);
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
  });

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    clients.push(socket);
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(process.env.PORT || port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      onServerStart();
    });
});

const onServerStart = () => {
  //Initialize the webhook connections
  fetch(`${URL}/api/webhooks`);
};
