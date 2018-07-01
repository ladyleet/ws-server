const server = require('http').createServer();
const express = require('express');
const WebSocketServer = require('ws').Server;
const cors = require('cors');

const app = express();
const PORT = 8080;

const wss = new WebSocketServer({ server });

app.use(cors());

const clients = new Map();
const connections = new Map();

setInterval(() => {
  updateClients();
}, 1000 / 60);


let cid = 0;
wss.on('connection', (ws) => {
  const clientId = cid++;
  connections.set(clientId, ws);
  clients.set(clientId, { x: 0, y: 0 });

  console.log(`client ${clientId} CONNECTED`);


  ws.on('close', () => {
    console.log(`client ${clientId} CLOSED`);
    clients.delete(clientId);
    connections.delete(clientId);
  });

  ws.on('error', (error) => {
    console.log(`client ${clientId} ERROR`);
    clients.delete(clientId);
    connections.delete(clientId);
  });

  ws.on('message', (msg) => {
    let payload;
    console.log(`client ${clientId} -> ${msg}`);

    try {
      payload = JSON.parse(msg);
    } catch (err) {
      console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
    }
    
    const { type, x, y } = payload;

    switch(type) {
      case 'UPDATE_POSITION':
        clients.set(clientId, { x, y });
        break;
      default:
    }
  });
});

function updateClients() {
  if (clients.keys.length <= 1) return;

  const allPositions = clients.keys.map(clientId => {
    const { x, y } = clients.get(clientId);
    return { clientId, x, y };
  });

  for (const clientId of connections.keys) {
    connections.get(clientId).send(JSON.stringify(
      allPositions.filter(p => p.clientId !== clientId)
    ));
  }
}

server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
