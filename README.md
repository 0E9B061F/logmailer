# :wood: **logmailer** v1.1.0

**logmailer** is a simple, configurable tool for logging to email. It can be used from the command line or as a Node.js library.

# Installation

`npm install @0e9b061f/logmailer`

You may want to install globally if you intent to use **logmailer** from the command line:

`npm install -g @0e9b061f/logmailer`

# CLI Usage

**logmailer** provides a `logmailer` executable. Run `logmailer -h` to see usage information:

```
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
```