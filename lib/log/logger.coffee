# Copyright (c) 2016 Kinvey Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
# in compliance with the License. You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under the License
# is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
# or implied. See the License for the specific language governing permissions and limitations under
# the License.

fs = require('fs')
util = require('util')
config = require('config')

# Append log messages to local file
logStream = fs.createWriteStream('output.log', { flags: 'a' })

# format a millisecond unix timestamp as a decimal number
formatMsTimestamp = (timestamp) ->
  timestamp += ""
  return timestamp.slice(0, -3) + "." + timestamp.slice(-3)

formatMsIsoTimestring = (timestamp) ->
  return new Date(timestamp).toISOString()

# Debug logger
exports.DEBUG = (msg) ->
  timestamp = Date.now()
  logStream.write "#{formatMsIsoTimestring(timestamp)} #{formatMsTimestamp(timestamp)} [DEBUG] #{msg}\n"

# Info logger
exports.INFO = (msg) ->
  timestamp = Date.now()
  logStream.write "#{formatMsIsoTimestring(timestamp)} #{formatMsTimestamp(timestamp)} [INFO] #{msg}\n"

# Warning logger
exports.WARNING = (msg) ->
  timestamp = Date.now()
  logStream.write "#{formatMsIsoTimestring(timestamp)} #{formatMsTimestamp(timestamp)} [WARN] #{msg}\n"

# Error logger
exports.ERROR = (msg) ->
  timestamp = Date.now()
  logStream.write "#{formatMsIsoTimestring(timestamp)} #{formatMsTimestamp(timestamp)} [ERROR] #{msg}\n"

# Fatal logger
exports.FATAL = (msg) ->
  timestamp = Date.now()
  logStream.write "#{formatMsIsoTimestring(timestamp)} #{formatMsTimestamp(timestamp)} [FATAL] #{msg}\n"