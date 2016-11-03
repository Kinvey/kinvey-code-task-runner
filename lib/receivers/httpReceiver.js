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

  function healthCheck(req, res, next) {
    return res.status(200).json({ healthy: true });
  }

  function mapPostToElements(req, res, next) {
    res.locals.body = req.body.body;
    res.locals.method = req.body.method;
    res.locals.query = req.body.query;
    res.locals.objectName = req.body.objectName;
    res.locals.id = req.body.id;
    next();
  }

  function generateBaseTask(req, res, next) {
    let appMetadata;
    let requestHeaders;
    const method = res.locals.method || req.method;

    try {
      appMetadata = JSON.parse(req.get('X-Kinvey-App-Metadata')) || {};
    } catch (e) {
      appMetadata = {};
    }

    try {
      requestHeaders = JSON.parse(req.get('X-Kinvey-Original-Request-Headers')) || {};
    } catch (e) {
      requestHeaders = {};
    }

    req.task = {
      appId: req.get('X-Kinvey-Environment-Id') || '',
      appMetadata,
      authKey: req.get('X-Auth-Key'),
      requestId: req.get('X-Kinvey-Request-Id') || '',
      method: method.toUpperCase(),
      request: {
        method,
        headers: requestHeaders,
        username: req.get('X-Kinvey-Username') || '',
        userId: req.get('X-Kinvey-User-Id') || ''
      },
      response: {
        status: req.get('X-Kinvey-Response-Status') || 0,
        headers: req.get('X-Kinvey-Response-Headers') || {},
        body: req.get('X-Kinvey-Response-Body') || {}
      }
    };
    next();
  }

  function addFunctionsTaskAttributes(req, res, next) {
    req.task.taskType = 'functions';
    req.task.request.objectName = res.locals.objectName || '';
    next();
  }

  function addDataTaskAttributes(req, res, next) {
    req.task.taskType = 'data';
    req.task.request.serviceObjectName = req.params.serviceObjectName;
    next();
  }

  function appendId(req, res, next) {
    if (req.params && req.params.id) {
      req.task.request.entityId = req.params.id;
    } else if (res.locals.id) {
      req.task.request.entityId = res.locals.id;
    }
    next();
  }

  function appendQuery(req, res, next) {
    if (req.query && Object.keys(req.query).length > 0) {
      req.task.request.query = req.query;
    } else if (res.locals.query && Object.keys(res.locals.query).length > 0) {
      req.task.request.query = res.locals.query;
    }
    next();
  }

  function appendCount(req, res, next) {
    req.task.endpoint = '_count';
    next();
  }

  function appendBody(req, res, next) {
    req.task.request.body = res.locals.body || req.body;
    next();
  }

  function sendTask(req, res, next) {
    const taskReceivedCallback = req.app.get('taskReceivedCallback');
    taskReceivedCallback(req.task, (err, result) => {
      if (err) {
        let errorResponse;
        try {
          errorResponse = JSON.parse(err);
        } catch (e) {
          errorResponse = err;
        }
        log.debug('Responding with error');
        log.error(errorResponse);
        res.set('X-Kinvey-Request-Continue', errorResponse.continue || true);

        if (errorResponse.headers) {
          res.set(errorResponse.headers);
        }

        return res.status(errorResponse.statusCode || 550).json(errorResponse.body);
      } else if (result) {
        try {
          result.response.body = JSON.parse(result.response.body);
        } catch (e) {
          // Ignore
          log.debug('Responding with success');
          log.debug(result);
        }

        if (result.headers) {
          res.set(result.headers);
        }

        if (typeof result.continue !== 'undefined' && result.continue !== null) {
          res.set('X-Kinvey-Request-Continue', result.continue);
        }

        return res.status(result.response.statusCode).json(result.response.body);
      }

      log.debug('Responding with error - no result or error');
      const errorResponse = {
        error: 'InternalError',
        description: 'Bad Request: An Internal Error occurred',
        debug: ''
      };

      log.error(errorResponse);
      return res.status(500).json(errorResponse);
    });
  }

  function discover(req, res, next) {
    req.task = {
      taskType: 'serviceDiscovery'
    };

    return res.status(200).json(req.task);
  }

  function checkIfFlexFunction(req, res, next) {
    if (req.params.serviceObjectName === '_flexFunctions' || req.params.serviceObjectName === '_command') {
      next('route');
    } else {
      next();
    }
  }

  function startServer(taskReceivedCallback, startedCallback, options) {
    const app = express();

    app.set('taskReceivedCallback', taskReceivedCallback);
    app.use(bodyParser.json({ limit: 4096 }));
    app.use((req, res, next) => {
      req.task = {};
      next();
    });

    const router = express.Router();

    // healthcheck endpoint
    router.get('/healthcheck', healthCheck);

    // FlexData routes
    router.get('/:serviceObjectName/_count', generateBaseTask, addDataTaskAttributes, appendQuery, appendCount, sendTask);
    router.get('/:serviceObjectName/:id?', generateBaseTask, addDataTaskAttributes, appendQuery, appendId, sendTask);
    router.post('/:serviceObjectName/', checkIfFlexFunction, generateBaseTask, addDataTaskAttributes, appendBody, sendTask);
    router.put('/:serviceObjectName/:id', generateBaseTask, addDataTaskAttributes, appendId, appendBody, sendTask);
    router.delete('/:serviceObjectName/:id?', generateBaseTask, addDataTaskAttributes, appendId, appendQuery, sendTask);

    // FlexFunctions route
    router.post('/_flexFunctions/:handlerName', mapPostToElements, generateBaseTask, addFunctionsTaskAttributes, appendQuery, appendId, appendBody, sendTask);

    router.post('/_command/discover', discover);

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
