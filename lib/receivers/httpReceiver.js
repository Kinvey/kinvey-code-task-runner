// Copyright (c) 2016 Kinvey Inc.
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

const express = require('express');
const bodyParser = require('body-parser');
const log = require('../log/logger');

module.exports = (() => {
  let server = null;
  let app = null;

  function healthCheck(req, res, next) {
    return res.status(200).json({healthy: true});
  }

  function generateBaseTask(req, res, next) {
    let appMetadata;

    try {
      appMetadata = JSON.parse(req.get('X-Kinvey-App-Metadata'));
    } catch (e) {
      appMetadata = {};
    }

    req.task = {
      appId: req.get('X-Kinvey-Environment-Id'),
      appMetadata,
      authKey: req.get('X-Auth-Key'),
      requestId: req.get('X-Kinvey-Request-Id'),
      method: req.method.toUpperCase(),
      taskType: 'dataLink',
      request: {
        method: req.method,
        headers: req.get('X-Kinvey-Original-Request-Headers'),
        username: req.get('X-Kinvey-Username'),
        userId: req.get('X-Kinvey-User-Id'),
        serviceObjectName: req.params.serviceObjectName,
      },
      response: {
        status: req.get('X-Kinvey-Response-Status') || 0,
        headers: req.get('X-Kinvey-Response-Headers') || {},
        body: req.get('X-Kinvey-Response-Body') || {}
      }
    };

    next();
  }

  function appendId(req, res, next) {
    if (req.params && req.params.id) {
      req.task.request.entityId = req.params.id;
    }
    next();
  }

  function appendQuery(req, res, next) {
    if (req.query && Object.keys(req.query).length > 0) {
      req.task.request.query = req.query;
    }

    next();
  }

  function appendCount(req, res, next) {
    req.task.endpoint = '_count';
    next();
  }

  function appendBody(req, res, next) {
    req.task.request.body = req.body;
    next();
  }

  function sendTask(req, res, next) {
    const taskReceivedCallback = app.get('taskReceivedCallback');
    taskReceivedCallback(req.task, (err, result) => {
      if (err) {
        try {
          err = JSON.parse(err);
        } catch (e) {
          // ignore
        }
        log.debug('Responding with error');
        log.error(err);
        res.set('X-Kinvey-Request-Continue', err.continue || true);

        if (err.headers) {
          res.set(err.headers);
        }

        return res.status(err.statusCode || 550).json(err.body);
      } else if (result) {
        try {
          result.response.body = JSON.parse(result.response.body);
        } catch (e) {
          // Ignore
          log.debug("Responding with success");
          log.debug(result);
        }

        if (result.headers) {
          res.set(result.headers);
        }

        if (typeof result.continue !== 'undefined' && result.continue !== null) {
          res.set('X-Kinvey-Request-Continue', result.continue);
        }

        return res.status(result.response.statusCode).json(result.response.body);
      } else {
        log.debug('Responding with error - no result or error');
        const err = {
          error: 'InternalError',
          description: 'BAd Request: An Internal Error occurred',
          debug: ''
        };

        log.error(err);
        return res.status(500).json(err);
      }
    });
  }

  function startServer(taskReceivedCallback, startedCallback, options) {
    app = express();

    app.set('taskReceivedCallback, taskReceivedCallback');
    app.use(bodyParser.json({limit: 4096}));
    app.use((req, res, next) => {
      req.task = {};
      next();
    });

    const router = express.Router();

    router.get('/healthcheck', healthCheck);

    router.get('/:serviceObjectName/_count', generateBaseTask, appendQuery, appendCount, sendTask);
    router.get('/:serviceObjectName/:id?', generateBaseTask, appendQuery, appendId, sendTask);
    router.post('/:serviceObjectName/', generateBaseTask, appendBody, sendTask);
    router.put('/:serviceObjectName/:id', generateBaseTask, appendId, appendBody, sendTask);
    router.delete('/:serviceObjectName/:id?', generateBaseTask, appendId, appendQuery, sendTask);

    app.use('/', router);

    options.host = options.host || 'localhost';
    options.port = options.port || 10001;

    server = app.listen(options.port, options.host, () => {
      console.log(`Service listening on ${options.port}`);
      startedCallback();
    });
  }

  function stop() {
    server.close();
  }

  return {
    startServer,
    stop
  };
})();