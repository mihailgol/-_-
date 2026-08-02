import { spawn } from "child_process";
import fs from "fs";

const out = fs.openSync("./localtunnel.log", "w");
spawn("npx", ["--yes", "localtunnel", "--port", "8000"], {
  shell: true,
  stdio: ["ignore", out, out]
});
