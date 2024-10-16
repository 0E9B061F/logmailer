// logmailer -- email logging tool                          ____  __ ____  __
// by 0E9B061F <0E9B061F@protonmail.com>                   |    \|  |    \|  |
// Available under the terms of the MIT license           ====\  \=====\  \====
// 2024                                                    |__|\____|__|\____|

import here from "heretag"
import YAML from "yaml"
import nodemailer from "nodemailer"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { platform, hostname } from "node:os"
import { join, basename, dirname } from "node:path"
import { DateTime } from "luxon"
import { fileURLToPath } from 'node:url'
    
const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgpath = join(__dirname, "package.json")

const pkgdata = await readFile(pkgpath, {encoding: "utf-8"})
const pkg = JSON.parse(pkgdata)

const levels = [["TESTING", "TEST"], ["DEBUG", "DBG"], ["OK"], ["WARNING", "WRN"], ["ERROR", "ERR"]]

const defaults = {
  secure: true,
  error: 0,
  source: "CLI",
  host: hostname(),
}

const usage =()=> {
  console.log(here`
    logmailer [-c CONF] [-e ERR] [-s SRC] [-a PATH] SUBJECT [DOCUMENT ...]
      --conf / -c CONF
        Path to the config file
      --error / -e ERR
        Integere error level
      --source / -s SRC
        Source of this log (the program that generated it)
      --attach / -a PATH
        Attach the file at PATH to the email
      --document / -d PATH
        Read the file at path and embed its contents in the email body
      SUBJECT
        Email subject line
      DOCUMENT
        Log contents. Each document given will be embeddded separately in the email body
    logmailer --help | -h
      Print this usage information and exit
  `)
}

const body =(conf)=> {
  console.log(conf.documents)
  const text = conf.documents.map(d=> {
    return here`
      <pre class="cell document">${d}</pre>
    `
  }).join("")
  return here`
    <!doctype html>
    <html>
    <head>
      <style type="text/css">
        body {
          background-color: #fefefe;
          margin: 5px;
          font-size: 1rem;
        }
        .label {
          background-color: #252525;
          color: #fefefe;
          margin: 0;
          font-size: 1.1rem;
          width: fit-content;
          padding: 0 0.5rem 0 0;
          border-width: 0 0 0 10px;
          border-color: #252525;
          border-style: solid;
        }
        .cell {
          background-color: #fafafa;
          border-color: #252525;
          border-style: solid;
          width: fit-content;
          padding: 0.5rem 1rem;
          margin: 0 0 5px 0;
        }
        .document {
          border-width: 0 0 0 10px;
        }
        .metadata {
          color: #252525;
          border-width: 0 0 0 10px;
        }
        .metadata th {
          text-align: left;
          padding-right: 0.75rem;
          font-weight: bold;
        }
        .metadata td {
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1 class="label">TEXT</h1>
      ${text}
      <h1 class="label">METADATA</h1>
      <table class="cell metadata">
        <tr>
          <th scope="row">LOGMAILER</th>
          <td>${conf.version}</td>
        </tr>
        <tr>
          <th scope="row">HOST</th>
          <td>${conf.host}</td>
        </tr>
        <tr>
          <th scope="row">SOURCE</th>
          <td>${conf.source}</td>
        </tr>
        <tr>
          <th scope="row">ERROR</th>
          <td>${conf.errorname}</td>
        </tr>
        <tr>
          <th scope="row">DATE</th>
          <td>${conf.date}</td>
        </tr>
       </table>
    </body>
    </html>
  `
}

const configure =async(conf, ...args)=> {
  let rc = {}
  if (existsSync(conf.conf)) {
    const data = await readFile(conf.conf, {encoding: "utf-8"})
    rc = YAML.parse(data) 
  }
  conf = {
    ...defaults,
    ...rc,
    ...conf,
    date: DateTime.now().toISO(),
    plat: platform(),
    version: pkg.version,
    subject: args[0],
    documents: args.slice(1),
  }

  if (!conf.from) {
    console.error("no email configured to send from")
    process.exit(1)
  }
  if (!conf.to) {
    console.error("no email configured to send to")
    process.exit(1)
  }
  if (!conf.server) {
    console.error("no mail server configured")
    process.exit(1)
  }
  if (!conf.port) {
    console.error("no port number configured")
    process.exit(1)
  }
  if (!conf.user) {
    console.error("no user configured")
    process.exit(1)
  }
  if (!conf.pass) {
    console.error("no password configured")
    process.exit(1)
  }
  if (!conf.subject) {
    console.error("no subject given")
    process.exit(1)
  }

  try {
  conf.error = parseInt(conf.error)
  } catch (e) {
    console.error("invalid error level given")
    process.exit(1)
  }

  conf.error = Math.min(2, Math.max(-2, conf.error))

  conf.level = levels[conf.error + 2][0]
  conf.errorname = `${conf.error}:${conf.level}`
  conf.label = levels[conf.error + 2][1] || ""

  const sublab = conf.label ? ` ${conf.label}` : ""
  const subsrc = conf.source.toLowerCase() == "system" ? "" : ` ${conf.source}`

  conf.fullsub = `${conf.host}${subsrc}${sublab}: ${conf.subject}`
  conf.fullfrom = `"${conf.host}${subsrc}" <${conf.from}>`
  conf.fullto = conf.to
  if (conf.plus) {
    const parts = conf.to.split("@")
    parts[0] = `${parts[0]}+log+${conf.host}+${conf.source}`
    conf.fullto = parts.join("@")
  }

  if (!Array.isArray(conf.attach)) conf.attach = [conf.attach]
  if (!Array.isArray(conf.document)) conf.document = [conf.document]
  if (!Array.isArray(conf.documents)) conf.documents = [conf.documents]

  conf.attachments = []

  for (let n = 0; n < conf.attach.length; n++) {
    const path = conf.attach[n]
    const filename = basename(path)
    const content = await readFile(path, {encoding: "utf-8"})
    conf.attachments.push({filename, content})
  }

  for (let n = 0; n < conf.document.length; n++) {
    const data = await readFile(conf.document[n], {encoding: "utf-8"})
    conf.documents.push(data)
  }

  conf.metadata = {
    version: conf.version,
    host: conf.host,
    source: conf.source,
    error: conf.error,
    level: conf.level,
    date: conf.date,
    subject: conf.subject,
    text: conf.text,
  }

  return conf
}

export const logmailer =async(conf, subject, ...docs)=> {
  conf = await configure(conf, subject, ...docs)
  const mailer = nodemailer.createTransport({
    host: conf.server,
    port: conf.port,
    secure: conf.secure,
    auth: {
      user: conf.user,
      pass: conf.pass,
    },
  })
  const html = body(conf)
  const out = await mailer.sendMail({
    from: conf.fullfrom,
    to: conf.fullto,
    subject: conf.fullsub,
    text: conf.text,
    html,
    attachments: [
      {filename: "metadata.json", content: JSON.stringify(conf.metadata)},
      ...conf.attachments,
    ],
  })
  console.log(`Sent mail: ${conf.from} -> ${conf.fullto} "${conf.fullsub}"`)
}
