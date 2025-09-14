import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const filePath   = join(__dirname, "version.ts");

const src = readFileSync(filePath, "utf8");

// extract numbers
const majorMatch = src.match(/VERSION_MAJOR\s*=\s*(\d+)/);
const minorMatch = src.match(/VERSION_MINOR\s*=\s*(\d+)/);

if (!majorMatch || !minorMatch) {
  throw new Error("Could not parse VERSION_MAJOR or VERSION_MINOR in version.ts");
}

const major = Number(majorMatch[1]);
const minor = Number(minorMatch[1]) + 1;

const newContent =
`export const VERSION_MAJOR = ${major};
export const VERSION_MINOR = ${minor};
`;

writeFileSync(filePath, newContent, "utf8");

console.log(`✅ Building v${major}.${minor}`);
