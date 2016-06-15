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

express = require 'express'
bodyParser = require 'body-parser'
log = require '../log/logger'
server = null
app = null

healthCheck = (req, res, next) ->
  return res.status(200).json({ healthy: true })

generateBaseTask = (req, res, next) ->
  try
    appMetadata = JSON.parse(req. get 'X-Kinvey-App-Metadata')
  catch e
    appMetadata = {}

  req.task =
    # this is actually the environment ID; leftover (for now) for backward compatibility
    appId: req.get 'X-Kinvey-Environment-Id'
    appMetadata: appMetadata
    authKey: req.get 'X-Auth-Key'
    requestId: req.get 'X-Kinvey-Request-Id'
    method: req.method.toUpperCase()
    taskType: 'dataLink'
    request:
      method: req.method
      headers: req.get 'X-Kinvey-Original-Request-Headers'
      username: req.get 'X-Kinvey-Username'
      userId: req.get 'X-Kinvey-User-Id'
      serviceObjectName: req.params.serviceObjectName
    response:
      status: req.get 'X-Kinvey-Response-Status' ? 0
      headers: req.get 'X-Kinvey-Response-Headers' ? {}
      body: req.get 'X-Kinvey-Response-Body' or {}

  next()

appendId = (req, res, next) ->
  if req.params?.id?
    req.task.request.entityId = req.params.id
  next()

appendQuery = (req, res, next) ->
  if req.query? and Object.keys(req.query).length > 0
    req.task.request.query = req.query
  next()

appendCount = (req, res, next) ->
  req.task.endpoint = '_count'
  next()

appendBody = (req, res, next) ->
  req.task.request.body = req.body
  next()

sendTask = (req, res, next) ->
  taskReceivedCallback = app.get 'taskReceivedCallback'

  taskReceivedCallback req.task, (err, result) ->

    if err?
      try
        err = JSON.parse err
      catch
        #Ignore

      log.DEBUG "Responding with error"
      log.ERROR err

      statusCode = err.statusCode ? 550
      requestContinue = err.continue ? true

      res.set 'X-Kinvey-Request-Continue', requestContinue
      if err.headers?
        res.set err.headers

      return res.sendStatus(statusCode).json(err.body)

    else if result?
      try
        result.response.body = JSON.parse result.response.body
      catch
        # Ignore

      log.DEBUG "Responding with success"
      log.DEBUG result

      if result.headers?
        res.set result.headers
      if result.continue?
        res.set 'X-Kinvey-Request-Continue', result.continue
      return res.status(result.response.statusCode).json(result.response.body)

    else
      log.DEBUG "Responding with error - no result or error"
      log.DEBUG
      err =
        error: 'InternalError'
        description: 'Bad Request: An Internal Error occurred'
        debug: ''

      return res.sendStatus(500).json(err)

exports.startServer = (taskReceivedCallback, startedCallback, options) ->
  app = express()

  app.set 'taskReceivedCallback', taskReceivedCallback

  app.use bodyParser.json({ limit: 4096 })

  app.use (req, res, next) ->
    req.task = {}
    next()

  router = express.Router()

  # helper methods
  router.get '/healthcheck', healthCheck

  router.get '/:serviceObjectName/_count', generateBaseTask, appendQuery, appendCount, sendTask
  router.get '/:serviceObjectName/:id?', generateBaseTask, appendQuery, appendId, sendTask
  router.post '/:serviceObjectName/', generateBaseTask, appendBody, sendTask
  router.put '/:serviceObjectName/:id', generateBaseTask, appendId, appendBody, sendTask
  router.delete '/:serviceObjectName/:id?', generateBaseTask, appendId, appendQuery, sendTask

  app.use '/', router

  options.host ?= 'localhost'
  options.port ?= 10001

  server = app.listen options.port, options.host, () ->
    console.log "Service listening on #{options.port}"
    startedCallback()

exports.stop = () ->
  server.close()