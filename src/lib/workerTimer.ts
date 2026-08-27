export const createWorkerTimer = () => {
  const code = `
    let timerId = null;
    self.onmessage = function(e) {
      if (e.data.command === 'start') {
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
          self.postMessage('tick');
        }, e.data.interval || 1000);
      } else if (e.data.command === 'stop') {
        if (timerId) clearInterval(timerId);
        timerId = null;
      }
    };
  `;
  const blob = new Blob([code], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));
  return worker;
};
