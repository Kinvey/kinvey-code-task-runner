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

const supertest = require('supertest');
const runner = require('../../../lib/receiver');
const should = require('should');
const bigBody = require('../../scripts/bigBody.json'); // 8.90 KB JSON

const TEST_URL = 'http://localhost:7777';
const SERVICE_OBJECT_ROUTE = '/serviceObject';
const HEALTHCHECK_ROUTE = '/healthcheck/';
const LOGIC_ROUTE = '/_flexFunctions/testHandler';
const DISCOVERY_ROUTE = '/_command/discover';
const AUTH_ROUTE = '/_auth/someAuthHandler';

describe('http receiver', () => {
  function startReceiver(taskReceivedCallback, callback, options) {
    if (!taskReceivedCallback) {
      taskReceivedCallback = () => {};
    }

    if (!options) {
      options = { type: 'http', port: '7777', requestBodyLimit: 10240 /* 10 KB */ };
    }

    runner.start(options, taskReceivedCallback, () => {
      setTimeout(callback, 20);
    });
  }

  function stopReceiver(callback) {
    runner.stop(callback);
  }

  afterEach((done) => {
    stopReceiver(done);
  });

  it('should do a healthcheck', (done) => {
    startReceiver(null, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(HEALTHCHECK_ROUTE)
        .end((err, res) => {
          if (err) {
            throw (err);
          }
          //noinspection JSUnresolvedVariable
          res.body.healthy.should.be.true();
          done();
        });
    });
  });

  it('should invoke taskReceivedCallback on receiving a task', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('data');
      receivedTask.request.serviceObjectName.should.eql('serviceObject');
      receivedTask.request.method.should.eql('GET');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should accept appMetadata header', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.appMetadata);
      receivedTask.appMetadata.should.not.be.empty();
      receivedTask.appMetadata.foo.should.eql('bar');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-App-Metadata', JSON.stringify({ foo: 'bar' }))
        .expect(200)
        .end(done);
    });
  });

  it('should contain appMetadata object even if appMetadata isn\'t passed', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.appMetadata);
      receivedTask.appMetadata.should.be.empty();
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should accept original request headers header', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.headers);
      receivedTask.request.headers.should.not.be.empty();
      receivedTask.request.headers.foo.should.eql('bar');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Original-Request-Headers', JSON.stringify({ foo: 'bar' }))
        .expect(200)
        .end(done);
    });
  });

  it('should contain request headers object even if request headers aren\'t passed', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.headers);
      receivedTask.request.headers.should.be.empty();
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should populate the environmentId', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.headers);
      receivedTask.appId.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Environment-Id', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should populate the environmentId', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.appId);
      receivedTask.appId.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Environment-Id', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should pass a blank environmentId if not passed', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.appId);
      receivedTask.appId.should.eql('');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should populate the authKey', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.authKey);
      receivedTask.authKey.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Auth-Key', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should not include the authKey property if it\'s not sent', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.not.exist(receivedTask.authKey);
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should populate the requestId', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.requestId);
      receivedTask.requestId.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Request-Id', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should set the requestId to an empty string if not present', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.requestId);
      receivedTask.requestId.should.eql('');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should populate the username', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.username);
      receivedTask.request.username.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Username', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should populate the response if sent as headers', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.username);
      receivedTask.response.status.should.eql('202');
      receivedTask.response.body.should.eql(JSON.stringify({ foo: 'bar' }));
      receivedTask.response.headers.should.eql(JSON.stringify({ someheader: 'somevalue' }));
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-Response-Status', 202)
        .set('X-Kinvey-Response-Body', JSON.stringify({ foo: 'bar' }))
        .set('X-Kinvey-Response-Headers', JSON.stringify({ someheader: 'somevalue' }))
        .expect(200)
        .end(done);
    });
  });

  it('should set the username to an empty string if not present', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.username);
      receivedTask.request.username.should.eql('');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should populate the tempObjectStore', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.tempObjectStore);
      receivedTask.request.tempObjectStore.foo.should.eql('bar');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(LOGIC_ROUTE)
        .send({ tempObjectStore: { foo: 'bar' }, body: {} })
        .expect(200)
        .end(done);
    });
  });

  it('should populate the userId', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.userId);
      receivedTask.request.userId.should.eql('abcd');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .set('X-Kinvey-User-Id', 'abcd')
        .expect(200)
        .end(done);
    });
  });

  it('should set the userId to an empty string if not present', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      should.exist(receivedTask.request.userId);
      receivedTask.request.userId.should.eql('');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = {};
      receivedTask.response.continue = false;
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end(done);
    });
  });

  it('should send a response', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('data');
      receivedTask.request.serviceObjectName.should.eql('serviceObject');
      receivedTask.request.method.should.eql('GET');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = { foo: 'bar' };
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end((err, res) => {
          res.body.foo.should.eql('bar');
          res.statusCode.should.eql(200);
          done();
        });
    });
  });

  it('should send a functions message', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('functions');
      receivedTask.taskName.should.eql('testHandler');
      receivedTask.hookType.should.eql('customEndpoint');
      receivedTask.request.objectName.should.eql('testObject');
      receivedTask.request.method.should.eql('POST');
      receivedTask.request.entityId.should.eql(5);
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = { foo: 'bar' };
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(LOGIC_ROUTE)
        .send({ objectName: 'testObject', entityId: 5 })
        .expect(200)
        .end((err, res) => {
          res.body.response.body.foo.should.eql('bar');
          res.body.response.statusCode.should.eql(200);
          res.statusCode.should.eql(200);
          done();
        });
    });
  });

  it('should populate the response', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.response.status.should.eql(202);
      receivedTask.response.body = { foo: 'bar' };
      receivedTask.response.headers.should.eql({ someheader: 'somevalue' });
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(LOGIC_ROUTE)
        .send({ objectName: 'testObject', entityId: 5, response: {
          status: 202,
          body: { foo: 'bar' },
          headers: { someheader: 'somevalue' }
        }
        })
        .end(done);
    });
  });

  it('should send a functions message with a big json body', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('functions');
      receivedTask.taskName.should.eql('testHandler');
      receivedTask.hookType.should.eql('customEndpoint');
      receivedTask.request.objectName.should.eql('testObject');
      receivedTask.request.method.should.eql('POST');
      receivedTask.request.entityId.should.eql(5);
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = { foo: 'bar' };
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(LOGIC_ROUTE)
        .send(bigBody)
        .expect(200)
        .end((err, res) => {
          res.body.response.body.foo.should.eql('bar');
          res.body.response.statusCode.should.eql(200);
          res.statusCode.should.eql(200);
          done();
        });
    });
  });

  it('should send a discover message', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('serviceDiscovery');

      receivedTask.discoveryObjects = {
        data: {
          foo: 'bar'
        },
        functions: {
          bar: 'foo'
        }
      };

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(DISCOVERY_ROUTE)
        .expect(200)
        .end((err, res) => {
          res.statusCode.should.eql(200);
          res.body.data.foo.should.eql('bar');
          res.body.functions.bar.should.eql('foo');
          done();
        });
    });
  });

  it('should send an auth task', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('auth');
      receivedTask.taskName.should.eql('someAuthHandler');
      should.exist(receivedTask.request.body.username);
      should.exist(receivedTask.request.body.password);
      should.exist(receivedTask.request.body.options);

      receivedTask.response = {
        body: {
          authenticated: true,
          token: 'qwerty1234'
        }
      };

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .post(AUTH_ROUTE)
        .send({ username: 'foo', password: 'bar', options: {} })
        .expect(200)
        .end((err, res) => {
          res.statusCode.should.eql(200);
          res.body.authenticated.should.be.true();
          res.body.token.should.eql('qwerty1234');
          done();
        });
    });
  });

  // some bugs only show up the second time a task is run
  it('should run multiple tasks', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('data');
      receivedTask.request.serviceObjectName.should.eql('serviceObject');
      receivedTask.request.method.should.eql('GET');
      receivedTask.response.statusCode = 200;
      receivedTask.response.body = { foo: 'bar' };
      receivedTask.response.continue = false;

      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      let counter = 2;
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end((err, res) => {
          res.body.foo.should.eql('bar');
          res.statusCode.should.eql(200);
          counter -= 1;
        });
      //noinspection JSCheckFunctionSignatures
      supertest(TEST_URL)
        .get(SERVICE_OBJECT_ROUTE)
        .expect(200)
        .end((err, res) => {
          res.body.foo.should.eql('bar');
          res.statusCode.should.eql(200);
          counter -= 1;
        });

      setTimeout(() => {
        counter.should.eql(0);
        done();
      }, 250);
    });
  });
});
