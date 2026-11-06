import { build } from "esbuild"
import { readFile } from "node:fs/promises"

const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
)
const targets = {
  openstreetmap: {
    entry: "src/openstreetmap/index.ts",
    output: "dist/OSM2CAI_Tools_OpenStreetMap.user.js",
    matches: ["https://www.openstreetmap.org/*", "https://openstreetmap.org/*"],
  },
  waymarkedtrails: {
    entry: "src/waymarkedtrails/index.ts",
    output: "dist/OSM2CAI_Tools_WaymarkedTrails.user.js",
    matches: ["https://hiking.waymarkedtrails.org/*"],
  },
}

const requestedTargets = process.argv.slice(2)
const targetNames = requestedTargets.length
  ? requestedTargets
  : Object.keys(targets)

for (const name of targetNames) {
  if (!(name in targets)) {
    throw new Error(`Target di build sconosciuto: ${name}`)
  }
}

await Promise.all(
  targetNames.map(async name => {
    const target = targets[name]
    const metadata = [
      "// ==UserScript==",
      "// @name         OSM2CAI Tools",
      "// @namespace    https://osm2cai.cai.it/",
      `// @version      ${version}`,
      "// @homepageURL  https://github.com/andrea-del-sarto/OSM2CAI_Tools",
      "// @description  Strumenti per consultare OSM2CAI e analizzare relazioni escursionistiche.",
      "// @author       andrea-del-sarto",
      "// @license      GPL-3.0-only",
      ...target.matches.map(match => `// @match        ${match}`),
      "// @grant        GM_xmlhttpRequest",
      "// @grant        GM_info",
      "// @grant        GM_openInTab",
      "// @grant        unsafeWindow",
      "// @connect      osm2cai.cai.it",
      "// @connect      api.openstreetmap.org",
      "// @run-at       document-start",
      "// ==/UserScript==",
      "// Copyright (C) 2026 andrea-del-sarto",
      "// SPDX-License-Identifier: GPL-3.0-only",
    ].join("\n")

    await build({
      entryPoints: [target.entry],
      outfile: target.output,
      bundle: true,
      format: "iife",
      target: "es2020",
      banner: { js: metadata },
      legalComments: "none",
    })
    console.log(`Creato ${target.output}`)
  }),
)
