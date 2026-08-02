import { spawn } from "child_process";
import fs from "fs";

const outFd = fs.openSync("./tunnel_status.log", "w");

console.log("Launching ExamHub Server...");
spawn("node", ["server/index.js"], { stdio: ["ignore", outFd, outFd] });

setTimeout(() => {
  console.log("Launching Cloudflare Tunnel...");
  spawn("npx", ["-y", "cloudflared", "tunnel", "--protocol", "http2", "--http-host-header", "localhost", "--url", "http://127.0.0.1:8000"], {
    shell: true,
    stdio: ["ignore", outFd, outFd]
  });
}, 1500);
