const server = require('http').createServer();
const express = require('express');
const WebSocketServer = require('ws').Server;
const cors = require('cors');
const { interval, fromEvent, EMPTY, merge  } = require('rxjs');
const { map, scan, tap, catchError, takeUntil, filter, repeat, mergeMap } = require('rxjs/operators');
const app = express();
const PORT = 8080;

const wss = new WebSocketServer({ server });

/**
 * Gets a single stream of fake data
 */
const fakeData = () => interval(1000/60).pipe(
  scan(position => ({
    x: position.x + (Math.random() * 5) - 2.5, 
    y: position.y + (Math.random() * 5) - 2.5,
  }), {
    x: Math.round(Math.random() * 180),
    y: Math.round(Math.random() * 450),
  })
);

app.use(cors());

let cid = 0;
let uid = 0;

wss.on('connection', (ws) => {
  // get a unique client id
  const clientId = cid++;
  console.log(`client ${clientId} CONNECTED`);

  // An observable of all messages from the client, parsed into an object
  const messages = fromEvent(ws, 'message').pipe(
    tap((msg) => {
      console.log(`client ${clientId} -> ${msg.data}`);
    }),
    map(msg => JSON.parse(msg.data)),
    catchError(err => {
      console.error(`ERROR: client ${clientId} - ${err.message}`);
      return EMPTY;
    }),
    repeat(),
  );

  // for every message from the client
  messages.pipe(
    // if it has type === 'REQUEST_KEN_HEAD'
    map( x => JSON.parse(x)),
    filter(data => data.type === 'REQUEST_KEN_HEAD'),
    // make a new observable and flatten into this one
    mergeMap(() => {
      // unique stream id
      const id = uid++;
      // of fake data
      return fakeData().pipe(
        // but add a unique stream id to it so the clients can unsub later
        map(({ x, y }) => ({ x, y, id })),
        // let the stream run until the client sends a message with type === 'unsub'
        // and the unique stream id
        takeUntil(messages.pipe(filter(data => data.type === 'unsub' && data.id === id )))
      );
    }),
    // finally, if the client errors or closes, stop the stream
    takeUntil(
      merge(
        // closes
        fromEvent(ws, 'close').pipe(
          tap(() => console.log(`CLOSED: ${clientId}`))
        ),
        // errors
        fromEvent(ws, 'error').pipe(
          tap(err => console.log(`ERROR: ${clientId} - ${err.toString()}`))
        ),
      )
    )
  )
  // at this point we have an observable of messages to send to the client
  .subscribe(data => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });
});

server.listen(PORT, () => console.log(`server listening on port ${PORT}`));
server.on('request', app);
