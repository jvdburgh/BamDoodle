// WebSocket soak and smoke test for a running BamDoodle server (docs/decisions/0003-hosting.md).
//
//   node scripts/ws-soak.mjs --url ws://localhost:8080/ws --rooms 1 --minutes 0       # smoke: play a little, exit
//   node scripts/ws-soak.mjs --url wss://<host>/ws --rooms 20 --idle 3 --minutes 70   # soak: hold sockets open
//
// Every room gets 3 players (plus --screens host screens). Each room creates, joins, starts a round and draws one
// stroke, so the whole game path is exercised. Then every socket stays open for --minutes, pinging like the web client
// does (every 15 s). --idle adds rooms whose sockets never send anything after the round starts, to see whether a
// host cuts quiet connections.
// It reports connections, unexpected closes (with time and code) and ping round trips, and exits 1 on any failure.
// No dependencies: Node 22+ has WebSocket built in.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, index, all) => {
    if (arg.startsWith("--")) pairs.push([arg.slice(2), all[index + 1]?.startsWith("--") ? "true" : all[index + 1]]);
    return pairs;
  }, []),
);
const url = args.url ?? "ws://localhost:8080/ws";
const rooms = Number(args.rooms ?? 1);
const screensPerRoom = Number(args.screens ?? 0);
const idleRooms = Number(args.idle ?? 0);
const minutes = Number(args.minutes ?? 0);
const pingEveryMs = 15_000;
const stepTimeoutMs = 10_000;

const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;
const failures = [];
const roundTrips = [];
const sockets = [];
let finishing = false;

function fail(message) {
  failures.push(`${elapsed()} ${message}`);
  console.error(`FAIL ${elapsed()} ${message}`);
}

/** One connection with a queue of server messages and helpers to wait for one. */
function connect(label) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const client = { label, socket, you: null, inbox: [], waiters: [], pingSentAt: null, closed: false };
    socket.addEventListener("open", () => resolve(client));
    socket.addEventListener("error", () => reject(new Error(`${label}: could not connect to ${url}`)));
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "joined") client.you = message.you;
      if (message.type === "pong" && client.pingSentAt !== null) {
        roundTrips.push(Date.now() - client.pingSentAt);
        client.pingSentAt = null;
      }
      client.inbox.push(message);
      for (const waiter of [...client.waiters]) waiter();
    });
    socket.addEventListener("close", (event) => {
      client.closed = true;
      if (!finishing) fail(`${label} closed unexpectedly (code ${event.code}${event.reason ? `, ${event.reason}` : ""})`);
    });
    sockets.push(client);
  });
}

function send(client, message) {
  client.socket.send(JSON.stringify(message));
}

function expect(client, type) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const index = client.inbox.findIndex((message) => message.type === type || message.type === "rejected");
      if (index === -1) return false;
      const [message] = client.inbox.splice(index, 1);
      client.waiters = client.waiters.filter((waiter) => waiter !== check);
      clearTimeout(timer);
      if (message.type === "rejected") {
        reject(new Error(`${client.label}: rejected (${message.reason}) waiting for ${type}`));
      }
      else resolve(message);
      return true;
    };
    const timer = setTimeout(() => {
      client.waiters = client.waiters.filter((waiter) => waiter !== check);
      reject(new Error(`${client.label}: no ${type} within ${stepTimeoutMs / 1000}s`));
    }, stepTimeoutMs);
    if (!check()) client.waiters.push(check);
  });
}

async function playRoom(prefix) {
  const host = await connect(`${prefix}/host`);
  send(host, { type: "createRoom", name: "Host" });
  const joined = await expect(host, "joined");
  const code = joined.room.code;

  const players = [host];
  for (const name of ["Noor", "Jip"]) {
    const player = await connect(`${prefix}/${name}`);
    send(player, { type: "joinRoom", code, name, sessionToken: null });
    await expect(player, "joined");
    players.push(player);
  }
  for (let screen = 0; screen < screensPerRoom; screen++) {
    const watcher = await connect(`${prefix}/screen${screen}`);
    send(watcher, { type: "watchRoom", code });
    await expect(watcher, "joined");
  }

  send(host, { type: "startRound" });
  const starts = await Promise.all(players.map((player) => expect(player, "roundStarted")));
  const activeId = starts[0].round.activePlayerId;
  const drawer = players.find((player) => player.you === activeId);
  if (drawer) {
    send(drawer, { type: "beginStroke", colour: "#5651fb", size: "bold", points: [[0.2, 0.2, 0.5]] });
    send(drawer, { type: "extendStroke", points: [[0.6, 0.4, 0.5]] });
    send(drawer, { type: "endStroke" });
    await expect(host, "strokeEnded");
  } else {
    fail(`room ${code}: could not find the active player`);
  }
  console.log(`${elapsed()} room ${code}: ${players.length} players${screensPerRoom ? ` + ${screensPerRoom} screens` : ""}, round started, stroke drawn`);
}

async function main() {
  console.log(`soak ${url}: ${rooms} rooms + ${idleRooms} silent rooms, ${screensPerRoom} screens each, ${minutes} min`);
  const prefixes = [
    ...Array.from({ length: rooms }, (_, index) => `room${index}`),
    ...Array.from({ length: idleRooms }, (_, index) => `idle${index}`),
  ];
  for (const prefix of prefixes) {
    try {
      await playRoom(prefix);
    } catch (error) {
      fail(error.message);
    }
  }

  const deadline = started + minutes * 60_000;
  const pinger = setInterval(() => {
    for (const client of sockets) {
      if (client.closed || client.label.startsWith("idle")) continue;
      client.pingSentAt = Date.now();
      send(client, { type: "ping" });
    }
    const open = sockets.filter((client) => !client.closed).length;
    console.log(`${elapsed()} open sockets: ${open}/${sockets.length}`);
  }, pingEveryMs);
  while (Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 1_000));
  clearInterval(pinger);

  finishing = true;
  for (const client of sockets) client.socket.close(1000, "soak test done");

  const sorted = [...roundTrips].sort((a, b) => a - b);
  const at = (share) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))] ?? 0;
  console.log(`\n${sockets.length} sockets, ${failures.length} failures`);
  if (sorted.length) console.log(`ping round trip: p50 ${at(0.5)} ms, p95 ${at(0.95)} ms, max ${sorted.at(-1)} ms`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
