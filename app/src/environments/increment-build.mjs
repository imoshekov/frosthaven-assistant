// src/environments/increment-build.mjs
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const filePath   = join(__dirname, "version.ts");

// You can keep major fixed and use the run number as "minor"
const major = 1;
const baseMinor = 24;          // your starting version

// If run locally, GITHUB_RUN_NUMBER will be undefined, so fall back to 0
const runNumber = process.env.GITHUB_RUN_NUMBER
  ? Number(process.env.GITHUB_RUN_NUMBER)
  : 0;

const newContent = `
export const VERSION_MAJOR = ${major};
export const VERSION_MINOR = ${runNumber};
export const VERSION_LABEL = 'v${major}.${runNumber}';
`;

writeFileSync(filePath, newContent, "utf8");

console.log(`✅ Building v${major}.${runNumber}`);
