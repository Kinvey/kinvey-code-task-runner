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

should = require 'should'
supertest = require 'supertest'
async = require 'async'
runner = require '../../lib/receiver'

TEST_URL = 'http://localhost:7777'
SERVICE_OBJECT_ROUTE = '/serviceObject'
HEALTHCHECK_ROUTE = '/healthcheck/'

startReceiver = (taskReceivedCallback, callback, options) ->
  unless taskReceivedCallback?
    taskReceivedCallback = () ->

  unless options?
    options =
      type: 'http'
      port: '7777'

  runner.start options, taskReceivedCallback, () ->
  setTimeout callback, 20

stopReceiver = () ->
  runner.stop()


describe "http receiver", () ->

  afterEach (done) ->
    stopReceiver()
    done()

  it "should do a healthcheck" , (done) ->
    startReceiver null, () ->
      supertest(TEST_URL)
      .get(HEALTHCHECK_ROUTE)
      .expect(200)
      .end((err, res) ->
        if err?
          throw err
        res.body.healthy.should.eql true
        done()
      )

  it "should invoke taskReceivedCallback on receiving a task", (done) ->

    taskReceivedCallback = (receivedTask, callback) ->
      (typeof receivedTask).should.eql 'object'
      receivedTask.taskType.should.eql 'dataLink'
      receivedTask.request.serviceObjectName.should.eql 'serviceObject'
      receivedTask.request.method.should.eql 'GET'
      receivedTask.response.statusCode = 200
      receivedTask.response.body = {}
      receivedTask.response.continue = false

      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->
      supertest(TEST_URL)
      .get(SERVICE_OBJECT_ROUTE)
      .expect(200)
      .end(done)

  it "should send a response", (done) ->
    taskReceivedCallback = (receivedTask, callback) ->
      (typeof receivedTask).should.eql 'object'
      receivedTask.taskType.should.eql 'dataLink'
      receivedTask.request.serviceObjectName.should.eql 'serviceObject'
      receivedTask.request.method.should.eql 'GET'
      receivedTask.response.statusCode = 200
      receivedTask.response.body = {foo: 'bar'}
      receivedTask.response.continue = false

      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->
      supertest(TEST_URL)
      .get(SERVICE_OBJECT_ROUTE)
      .expect(200)
      .end((err, res) ->
        res.body.foo.should.eql 'bar'
        res.statusCode.should.eql 200
        done()
      )

  # some bugs only show the second time a task is run
  it "should run multiple tasks", (done) ->
    taskReceivedCallback = (receivedTask, callback) ->
      (typeof receivedTask).should.eql 'object'
      receivedTask.taskType.should.eql 'dataLink'
      receivedTask.request.serviceObjectName.should.eql 'serviceObject'
      receivedTask.request.method.should.eql 'GET'
      receivedTask.response.statusCode = 200
      receivedTask.response.body = {foo: 'bar'}
      receivedTask.response.continue = false

      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->
      counter = 2

      supertest(TEST_URL)
      .get(SERVICE_OBJECT_ROUTE)
      .expect(200)
      .end((err, res) ->
        res.body.foo.should.eql 'bar'
        res.statusCode.should.eql 200
        counter--
      )

      supertest(TEST_URL)
      .get(SERVICE_OBJECT_ROUTE)
      .expect(200)
      .end((err, res) ->
        res.body.foo.should.eql 'bar'
        res.statusCode.should.eql 200
        counter--
      )

      setTimeout () ->
        counter.should.eql 0
        done()
      , 250