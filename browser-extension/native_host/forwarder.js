const net = require('net');

const client = net.connect({ port: 42123, host: '127.0.0.1' }, () => {
  // Read length-prefixed messages from Chrome stdin
  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read(4)) !== null) {
      const len = chunk.readUInt32LE(0);
      const msgBuf = process.stdin.read(len);
      if (msgBuf) {
        // Forward as JSON line to FocusDog local IPC
        client.write(msgBuf.toString('utf8') + '\n');
      }
    }
  });
});

  // Forward incoming commands from FocusDog bridge to browser via stdout
  client.on("data", (buf) => {
    const lines = buf.toString("utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const msgBuf = Buffer.from(trimmed, "utf8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(msgBuf.length, 0);
      process.stdout.write(lenBuf);
      process.stdout.write(msgBuf);
    }
  });

  client.on('error', () => {
  // Desktop app might not be running yet
  process.exit(0);
});

client.on('close', () => {
  process.exit(0);
});
