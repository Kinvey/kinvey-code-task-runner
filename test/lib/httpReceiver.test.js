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

const supertest = require('supertest');
const runner = require('../../lib/receiver');

const TEST_URL = 'http://localhost:7777';
const SERVICE_OBJECT_ROUTE = '/serviceObject';
const HEALTHCHECK_ROUTE = '/healthcheck/';

describe('http receiver', () => {
  function startReceiver(taskReceivedCallback, callback, options) {
    if (!taskReceivedCallback) {
      taskReceivedCallback = () => {};
    }

    if (!options) {
      options = { type: 'http', port: '7777' };
    }

    runner.start(options, taskReceivedCallback, () => {
      setTimeout(callback, 20);
    });
  }

  function stopReceiver() {
    runner.stop();
  }
  afterEach((done) => {
    stopReceiver();
    done();
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
      receivedTask.taskType.should.eql('dataLink');
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

  it('should send a response', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('dataLink');
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

  // some bugs only show up the second time a task is run
  it('should run multiple tasks', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      receivedTask.should.be.an.Object();
      receivedTask.taskType.should.eql('dataLink');
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
