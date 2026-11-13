const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const staticSource = path.join(projectRoot, "kurmatravel", "static");
const outputDirectory = path.join(projectRoot, "frontend", "dist");
const faviconSource = path.join(projectRoot, "kurmatravel", "favicon.png");

if (!fs.existsSync(staticSource)) {
  throw new Error(`Static asset directory not found: ${staticSource}`);
}

fs.cpSync(staticSource, path.join(outputDirectory, "static"), { recursive: true });
fs.copyFileSync(faviconSource, path.join(outputDirectory, "favicon.png"));
