const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });

//WHY WONT ENV VARIABLE WORK HERE?
const URL = "http://localhost:3000";
const handle = app.getRequestHandler();

let clients = [];

app.prepare().then(() => {
  console.log("URL: ", URL);
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
        // console.log(JSON.parse(req.body));
        // clients.forEach((client) => {
        //   client.send("HELLO FROM IAN");
        // });
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
      console.log(`> Ready on ${URL}`);
      onServerStart();
    });
});

const onServerStart = () => {
  const WebSocket = require("ws");
  const wss = new WebSocket.Server({ noServer: true });
  // fetch(`${URL}/api/webhooks`);

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    clients.push(ws);

    // ws.isAlive = true; dont know if we need this or nottt
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
