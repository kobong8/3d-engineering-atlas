import { copyFileSync, mkdirSync } from "node:fs";

const destination = new URL("../assets/vendor/", import.meta.url);
mkdirSync(destination, { recursive: true });
for (const file of ["babylon.js", "license.md", "NOTICE.md"]) {
  copyFileSync(new URL(`../node_modules/babylonjs/${file}`, import.meta.url), new URL(file, destination));
}
