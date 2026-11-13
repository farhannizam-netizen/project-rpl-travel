const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const staticSource = path.join(projectRoot, "kurmatravel", "static");
const legacyPagesSource = path.join(projectRoot, "kurmatravel");
const outputDirectory = path.join(projectRoot, "frontend", "dist");
const legacyPagesOutput = path.join(outputDirectory, "legacy-pages");
const faviconSource = path.join(projectRoot, "kurmatravel", "favicon.png");

for (const source of [staticSource, legacyPagesSource]) {
  if (!fs.existsSync(source)) {
    throw new Error(`Static asset source not found: ${source}`);
  }
}

fs.cpSync(staticSource, path.join(outputDirectory, "static"), { recursive: true });
fs.copyFileSync(faviconSource, path.join(outputDirectory, "favicon.png"));
fs.mkdirSync(legacyPagesOutput, { recursive: true });

for (const entry of fs.readdirSync(legacyPagesSource, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".html")) {
    fs.copyFileSync(
      path.join(legacyPagesSource, entry.name),
      path.join(legacyPagesOutput, entry.name),
    );
  }
}
