const os = require("os");
const { spawn } = require("child_process");

function getLanAddresses() {
  const addresses = new Set();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.add(entry.address);
      }
    }
  }
  return [...addresses];
}

const port = process.env.PORT || "3000";
const addresses = getLanAddresses();

console.log("\nAIMurdle LAN server");
console.log(`Host dashboard: http://localhost:${port}/admin`);
if (addresses.length) {
  console.log("Share one of these URLs with devices on the same Wi-Fi:");
  addresses.forEach((address) => console.log(`  http://${address}:${port}`));
} else {
  console.log("No Wi-Fi/LAN IPv4 address detected. Connect this laptop to the local Wi-Fi and run this command again.");
}
console.log("\nNote: 127.0.0.1 only works on this laptop. Keep this terminal open while people play.\n");

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "0.0.0.0", "--port", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code || 0));
