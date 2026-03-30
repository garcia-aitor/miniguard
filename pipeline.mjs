import { createInterface } from "readline";
import { Readable } from "stream";
import { writeFile, mkdir, copyFile } from "fs/promises";

const URL =
  "https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt";

function classifyLine(line) {
  if (line.trim() === "") return "empty";
  if (line.startsWith("!")) return "comment";
  if (line.includes("##")) return "cosmetic";
  if (line.startsWith("@@")) return "exception";
  return "network";
}

function extractSelector(line) {
  // "##.ad-banner" → ".ad-banner"
  // "example.com##.ad-banner" → null (tiene dominio, no es genérica)
  const idx = line.indexOf("##");
  const before = line.slice(0, idx);
  if (before.length > 0) return null; // tiene dominio específico
  return line.slice(idx + 2); // quitar el ##
}

const response = await fetch(URL);
const nodeStream = Readable.fromWeb(response.body);
const rl = createInterface({ input: nodeStream });

const networkRules = [];
const cosmeticRules = [];

for await (const line of rl) {
  const type = classifyLine(line);

  switch (type) {
    case "network":
    case "exception":
      networkRules.push(line.trim());
      break;
    case "cosmetic":
      const selector = extractSelector(line.trim());
      if (selector) cosmeticRules.push(selector);
      break;
  }
}

await mkdir("output", { recursive: true });
await writeFile(
  "output/network-rules.json",
  JSON.stringify(networkRules, null, 2),
);

await writeFile(
  "output/cosmetic_rules.json",
  JSON.stringify(cosmeticRules, null, 2),
);

console.log("=== MiniGuard Report ===");

console.log(`Network rules: ${networkRules.length}`);
console.log(`Cosmetic rules: ${cosmeticRules.length}`);

await copyFile("output/cosmetic_rules.json", "extension/cosmetic_rules.json");
console.log("Cosmetic rules copied to extension/");
