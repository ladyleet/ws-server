const Rx = require('rxjs/Rx');
const tickers = require('./tickers');

module.exports = function getSymbolStream(symbol) {
  const ticker = tickers.find(x => x.symbol === symbol);

  if (!ticker) {
    return Rx.Observable.of({ error: `unknown symbol ${symbol}` });
  }

  if (!ticker.stream) {
    const lastSale = Number(ticker.lastSale) || 100;
    const p = lastSale / 100; // 1%
    ticker.stream = Rx.Observable.timer(0, 1000)
      .scan((price, n) => Number(
        (price + p * Math.sin(n)).toFixed(2)
      ), lastSale || 100);
  }

  return ticker.stream;
};
