#!/usr/bin/env node
// logmailer -- email logging tool                          ____  __ ____  __
// by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  |
// Available under the terms of the MIT license           ====\  \=====\  \====
// 2024                                                    |__|\____|__|\____|

import { parseArgs } from "node:util"
import { logmailer } from "../logmailer.mjs"
import { ConfigError } from "../lib/errors.mjs"

const args = parseArgs({
  allowPositionals: true,
  options: {
    conf: {
      type: "string",
      short: "c",
      default: "/etc/logmailer.yaml",
    },
    error: {
      type: "string",
      short: "e",
    },
    source: {
      type: "string",
      short: "s",
    },
    help: {
      type: "boolean",
      short: "h",
    },
    host: {
      type: "string",
    },
    server: {
      type: "string",
    },
    port: {
      type: "string",
    },
    secure: {
      type: "boolean",
    },
    user: {
      type: "string",
    },
    pass: {
      type: "string",
    },
    plus: {
      type: "boolean",
    },
    from: {
      type: "string",
    },
    to: {
      type: "string",
    },
    attach: {
      type: "string",
      short: "a",
      multiple: true,
      default: [],
    },
    document: {
      type: "string",
      short: "d",
      multiple: true,
      default: [],
    },
    both: {
      type: "string",
      short: "b",
      multiple: true,
      default: [],
    },
  },
})

try {
  const conf = await logmailer(args.values, args.positionals[0], args.positionals.slice(1).join(" "))
  console.log(`Sent mail: ${conf.from} -> ${conf.fullto} "${conf.fullsub}"`)
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(`Configuration error: ${e.message}`)
    process.exit(1)
  } else {
    throw e
  }
}
