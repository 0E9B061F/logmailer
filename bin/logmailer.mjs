// logmailer -- email logging tool                          ____  __ ____  __
// by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  |
// Available under the terms of the MIT license           ====\  \=====\  \====
// 2024                                                    |__|\____|__|\____|

import { parseArgs } from "node:util"
import { logmailer } from "../logmailer.mjs"

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
  },
})

logmailer(args.values, ...args.positionals)
