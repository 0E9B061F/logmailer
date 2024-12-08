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
import { ConfigError } from "./lib/errors.mjs"
    
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
  attach: [],
  attachments: [],
  document: [],
  documents: [],
  both: [],
  boths: [],
  message: null,
}

const usage =()=> {
  console.log(here`
    logmailer [-c CONF] [-e ERR] [-s SRC] [-a PATH] [-d PATH] [-b PATH] SUBJECT [MESSAGE ...]
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
      --both / -b PATH
        Attach the file at PATH and embed its contents in the email body
      SUBJECT
        Email subject line
      MESSAGE
        A descriptive message attached to the log
    logmailer --help | -h
      Print this usage information and exit
  `)
}

const mkmsg =(m)=> {
  if (m) {
    return here`
      <div class="block">
        <h1 class="label">LOG</h1>
        <pre class="cell document">${m}</pre>
      </div>
    `
  } else return ""
}

const mkdocs =(docs)=> {
  docs = docs.map(doc=> {
    return here`
      <h2 class="label">${doc.filename}</h2>
      <pre class="cell document">${doc.content}</pre>
    `
  }).join("")
  if (docs) {
    return here`
      <div class="block">
        <h1 class="label">DOCUMENTS</h1>
        ${docs}
      </div>
    `
  } else return ""
}

const body =(conf)=> {
  const message = mkmsg(conf.message)
  const documents = mkdocs(conf.documents)
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
        h1 {
          font-size: 1.1rem;
        }
        h2 {
          font-size: 1rem;
          padding-left: 5px;
        }
        .label {
          background-color: #252525;
          color: #fefefe;
          margin: 0;
          width: fit-content;
          padding-right: 10px;
        }
        .block {
          background-color: #fafafa;
          border-color: #252525;
          border-style: solid;
          border-width: 0 0 0 10px;
        }
        .cell {
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
      ${message}
      ${documents}
      <div class="block">
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
      </div>
    </body>
    </html>
  `
}

const configure =async(conf, subject, message)=> {
  if (!conf) {
    throw new ConfigError("No configuration given.")
  }

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
    subject, message,
  }

  if (!conf.from) {
    throw new ConfigError("No address configured to send from.")
  }
  if (!conf.to) {
    throw new ConfigError("No address configured to send to.")
  }
  if (!conf.server) {
    throw new ConfigError("No mail server configured.")
  }
  if (!conf.port) {
    throw new ConfigError("No port number configured.")
  }
  if (!conf.user) {
    throw new ConfigError("No username configured.")
  }
  if (!conf.pass) {
    throw new ConfigError("No password configured.")
  }
  if (!conf.subject) {
    throw new ConfigError("No subject given.")
  }

  conf.error = parseInt(conf.error)
  if (isNaN(conf.error)) {
    throw new ConfigError("Invalid error level given.")
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
  if (!Array.isArray(conf.attachments)) conf.attach = [conf.attachments]
  if (!Array.isArray(conf.document)) conf.document = [conf.document]
  if (!Array.isArray(conf.documents)) conf.documents = [conf.documents]
  if (!Array.isArray(conf.both)) conf.both = [conf.both]
  if (!Array.isArray(conf.boths)) conf.boths = [conf.boths]

  for (let n = 0; n < conf.attach.length; n++) {
    const path = conf.attach[n]
    const filename = basename(path)
    const content = await readFile(path, {encoding: "utf-8"})
    conf.attachments.push({filename, content})
  }
  for (let n = 0; n < conf.document.length; n++) {
    const path = conf.document[n]
    const filename = basename(path)
    const content = await readFile(path, { encoding: "utf-8" })
    conf.documents.push({ filename, content })
  }
  for (let n = 0; n < conf.both.length; n++) {
    const path = conf.both[n]
    const filename = basename(path)
    const content = await readFile(path, { encoding: "utf-8" })
    conf.attachments.push({ filename, content })
    conf.documents.push({ filename, content })
  }
  for (let n = 0; n < conf.boths.length; n++) {
    conf.attachments.push(conf.boths[n])
    conf.documents.push(conf.boths[n])
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

export const logmailer =async(conf, subject, message)=> {
  conf = await configure(conf, subject, message)
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
  return conf
}
