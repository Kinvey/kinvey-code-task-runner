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

/**
 * Sample task for runner test
 */

module.exports =
{
  taskId: 'TestTaskId',
  appId: 'kid_TestKid',
  appMetadata: {
    _id: 'kid_TestKid',
    appsecret: 'foo',
    mastersecret: 'bar',
    pushService: {
      android: {},
      serviceMetadata: {},
      hasAgreedToTOS: false,
      whenTOSAgreed: null
    },
    blFlags: { privilegedBL: [Object] },
    restrictions: { bl: [Object] },
    API_version: 2,
    name: 'BLTest2',
    platform: 'android'
  },
  targetFunction: 'onRequest',
  //blScript: 'function onRequest(request, response, modules){\n  modules.collectionAccess.collection(\'user\').find({}, function(err, result) {\n    response.body=result;\n    response.complete();\n    \n    for (var i = 0; i < 1000000; i++){modules.consoleLog(i);}\n    foo.bar();\n\n  });\n}',
  blScript: 'function onRequest(req, res, modules) {\n  res.body = {a:1,b:2};\n  console.log("onRequest ran");\n}',
  requestId: '0a0efafb80844feea4c9c96b96e899e0',
  collectionName: 'test',
  hookType: 'customEndpoint',
  request: {
    method: 'POST',
    headers: {
      host: 'localhost:7007',
      connection: 'keep-alive',
      'content-length': '0',
      'x-kinvey-responsewrapper': 'true',
      origin: 'http://localhost:8888',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36',
      accept: '*/*',
      authorization: 'Basic a2lkX1RQMUo5RVY3Mko6YzM5YWQ0Nzc3MWRhNDBmNGEwYzNiNGQxMmY5Y2ZjOTk=',
      'x-kinvey-include-headers-in-response': 'Connection;Content-Length;Content-Type;Date;Location;X-Kinvey-API-Version;X-Kinvey-Request-Id;X-Powered-By;Server',
      'x-kinvey-api-version': '2',
      referer: 'http://localhost:8888/apps/bltest2-kid_TP1J9EV72J/addons/api-console',
      'accept-encoding': 'gzip,deflate,sdch',
      'accept-language': 'en-US,en;q=0.8'
    },
    body: {},
    params: {},
    username: 'kid_TestKid',
    collectionName: 'test',
    tempObjectStore: {}
  },
  response: {
    status: 200,
    headers: {
      'x-powered-by': 'Express',
      'x-kinvey-request-id': '0a0efafb80844feea4c9c96b96e899e0',
      'access-control-allow-origin': 'http://localhost:8888',
      'access-control-allow-credentials': 'true',
      'access-control-expose-headers': 'Location',
      'access-control-allow-methods': 'POST',
      'x-kinvey-api-version': 2
    },
    body: {}
  },
  applicationId: 'a066bc8db2c84939a16e230ce372a231'
};
