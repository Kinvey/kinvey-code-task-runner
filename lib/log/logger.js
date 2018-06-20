// Copyright (c) 2018 Kinvey Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License. You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied. See the License for the specific language governing permissions and limitations under
// the License.

const fs = require('fs');

// Append log messages to local file
const logStream = fs.createWriteStream('output.log', { flags: 'a' });

function formatMsIsoTimestring(timestamp) {
  return new Date(timestamp).toISOString();
}

function writeLogEntry(type, msg) {
  logStream.write(`${formatMsIsoTimestring(Date.now())} [${type}] ${msg}\n`);
}

function debug(msg) {
  writeLogEntry('DEBUG', msg);
}

function info(msg) {
  writeLogEntry('INFO', msg);
}

function warning(msg) {
  writeLogEntry('WARN', msg);
}

function error(msg) {
  writeLogEntry('ERROR', msg);
}

function fatal(msg) {
  writeLogEntry('FATAL', msg);
}

exports.debug = debug;
exports.info = info;
exports.warning = warning;
exports.error = error;
exports.fatal = fatal;
