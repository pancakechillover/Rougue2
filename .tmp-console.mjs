const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = await (await fetch('http://127.0.0.1:9250/json/list')).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
await new Promise((r) => (ws.onopen = r));
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
    logs.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    logs.push(`EXCEPTION: ${d.text} ${d.exception?.description?.slice(0, 400) || ''}`);
  }
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send('Runtime.enable');
await send('Page.enable');
await send('Page.reload', { ignoreCache: true });
await sleep(8000);
console.log('=== console errors/exceptions ===');
for (const l of logs.slice(0, 6)) console.log(l.slice(0, 200));

const probe = async (expr) => {
  const r = await Promise.race([
    send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }),
    sleep(6000).then(() => ({ timeout: true })),
  ]);
  if (r.timeout) return 'TIMEOUT (module hung)';
  if (r.result?.exceptionDetails) return 'REJECT: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text).slice(0, 150);
  return JSON.stringify(r.result?.result?.value);
};

console.log('probe react:', await probe(`import('react').then(m => 'ok ' + typeof m.StrictMode).catch(e => 'ERR ' + e.message)`));
console.log('probe main:', await probe(`import('/src/main.tsx').then(() => 'ok').catch(e => 'ERR ' + e.message)`));
console.log('probe App:', await probe(`import('/src/App.tsx').then(() => 'ok').catch(e => 'ERR ' + e.message)`));
console.log('probe CompactTimer:', await probe(`import('/src/components/dashboard/CompactTimer.tsx').then(() => 'ok').catch(e => 'ERR ' + e.message)`));
console.log('probe store:', await probe(`import('/src/lib/timerStore.ts').then(() => 'ok').catch(e => 'ERR ' + e.message)`));
const r = await send('Runtime.evaluate', { expression: `({rootLen: (document.getElementById('root')||{innerHTML:''}).innerHTML.length})`, returnByValue: true });
console.log('rootLen:', r.result?.result?.value?.rootLen);
ws.close();ws.close();
