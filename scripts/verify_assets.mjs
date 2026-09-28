import http from "http";

async function checkUrl(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on("error", () => resolve(false));
  });
}

async function main() {
  const samples = [
    "http://localhost:1420/dog/cream/walk/walk_0.png",
    "http://localhost:1420/dog/cream/walk/walk_7.png",
    "http://localhost:1420/dog/cream/idle/idle_0.png",
    "http://localhost:1420/dog/cream/idle/idle_4.png",
    "http://localhost:1420/dog/cream/jump/jump_4.png",
    "http://localhost:1420/dog/cream/roll/roll_3.png",
    "http://localhost:1420/dog/cream/sleep/sleep_0.png",
    "http://localhost:1420/dog/cream/wake/wake_3.png",
    "http://localhost:1420/dog/white/walk/walk_0.png",
    "http://localhost:1420/dog/white/jump/jump_4.png",
    "http://localhost:1420/dog/black/walk/walk_0.png",
    "http://localhost:1420/dog/black/roll/roll_3.png",
  ];

  let passed = 0;
  for (const u of samples) {
    const ok = await checkUrl(u);
    console.log((ok ? "✓ " : "✗ ") + u);
    if (ok) passed++;
  }
  console.log(`\nSample check: ${passed}/${samples.length} passed.`);
}
main();