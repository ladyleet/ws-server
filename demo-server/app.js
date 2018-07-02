const server = require('http').createServer();
const express = require('express');
const WebSocketServer = require('ws').Server;
const cors = require('cors');
const { interval } = require('rxjs');
const { map, scan } = require('rxjs/operators');
const app = express();
const PORT = 8080;

const wss = new WebSocketServer({ server });
const fakeData = interval(1000/60).pipe(
  scan((positions) => positions.map(position => ({
    x: position.x + (Math.random() * 5) - 2.5, 
    y: position.y + (Math.random() * 5) - 2.5,
  })), Array.from({length: 10}, () => ({
    x: Math.round(Math.random() * 180),
    y: Math.round(Math.random() * 450),
  })))
);

app.use(cors());

let cid = 0;
wss.on('connection', (ws) => {
  const clientId = cid++;
  console.log(`client ${clientId} CONNECTED`);
  
  const subscription = fakeData.subscribe(position => {
    if(ws.readyState === 1)
    ws.send(JSON.stringify(position))}
  );

  ws.on('close', () => {
    console.log(`client ${clientId} CLOSED`);
    subscription.unsubscribe();
  });

  ws.on('error', (error) => {
    console.log(`client ${clientId} ERROR`);
    subscription.unsubscribe();
  });

  ws.on('message', (msg) => {
    let payload;
    console.log(`client ${clientId} -> ${msg}`);

    try {
      payload = JSON.parse(msg);
    } catch (err) {
      console.error(`ERROR: client ${clientId} - unable to parse message "${msg}"`);
    }    
  });
});

server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
