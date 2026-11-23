// Entry for make.fun bounty "Post a GTA 6 meme on X" (gta6-meme-x-01).
//
// The entry itself is a post on X. This program's whole job is to hand
// the post's address to the house exactly as written: it reads
// POST.json at the repository root, checks that the address really is
// an X post address, and copies the file unchanged into the output
// directory. The house then reads the post from X and builds its
// dossier from what it finds there.
//
// Node 22, standard library only. No network. Running it twice writes
// the same bytes both times.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const POST_FILE = "POST.json";
// POST.json sits next to this script in the repository root. Resolve it
// from the script's own location, never from the process working
// directory: the house runs `node /bot/main.ts` from wherever it likes.
const POST_PATH = join(dirname(fileURLToPath(import.meta.url)), POST_FILE);

// An X post address: https://x.com/<handle>/status/<digits>
// (twitter.com works too). The id is digits only.
const POST_URL = /^https:\/\/(x\.com|twitter\.com)\/[^/]+\/status\/(\d+)$/;

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function readPostAddress(): string {
  if (!existsSync(POST_PATH)) {
    fail("POST.json is missing from the repository root");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(POST_PATH, "utf8"));
  } catch {
    fail("POST.json is not valid JSON");
  }
  const url = (parsed as { url?: unknown })?.url;
  if (typeof url !== "string" || !POST_URL.test(url)) {
    fail('POST.json must look like {"url": "https://x.com/<handle>/status/<id>"}');
  }
  return url;
}

function main(): void {
  const url = readPostAddress();
  // A placeholder id (all zeros) means the post has not been made yet;
  // refuse rather than deliver an address that cannot resolve.
  if (/\/status\/0+$/.test(url)) {
    fail("POST.json still holds a placeholder post id");
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, POST_FILE);
  copyFileSync(POST_PATH, target);
  // Read both files back and compare: the house must receive the post's
  // address byte for byte as it stands in the repository.
  if (!readFileSync(target).equals(readFileSync(POST_PATH))) {
    fail("the delivered POST.json differs from the repository's");
  }
  console.log(`delivered POST.json for ${url}`);
}

main();
