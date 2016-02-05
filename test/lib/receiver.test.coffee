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
assert = require 'assert'
net = require 'net'
async = require 'async'
path = require 'path'
fs = require 'fs'
runner = require '../../lib/receiver'

testPort = 7000
testHost = 'localhost'

sampleTask = require './../scripts/sampleTask'

# generate a unique(ish) id starting with the optional prefix string
uniqid = (prefix) ->
  return (prefix || "") + (Math.random() * 16000000 >>> 0).toString(16)

# make a shallow copy of the src object
makeCopy = (src) ->
  dst = {}
  for key, value of src
    dst[key] = src[key]
  return dst

# send a newline terminated tcp request to bl-runner, and return the response
sendToRunner = (tasks, flags, callback) ->
  done = false

  if (!callback)
    callback = flags
    flags = {}

  if (!flags || typeof flags != 'object') then flags = {alreadyJson: flags}

  if (!Array.isArray(tasks))
    tasks = [tasks]
  taskCount = tasks.length

  conn = net.connect {host: testHost, port: testPort}, () ->
    conn.on 'error', (err) ->
      callback(err)

    conn.on 'close', (hadError) ->
# we close our connection when done, so we always get a 'close' event
# only report errors
      if (!done && hadError) then callback(hadError)

    replyString = ""
    conn.on 'data', (chunk) ->
      replyString += chunk.toString()
      replies = replyString.split("\n")
      if (replies.length > taskCount)
        for i in [0..taskCount-1]
          replies[i] = JSON.parse replies[i]
        # close the connection to not leak the file descriptor.  Ignore 'close' events
        # FIXME: closing the connection interferes with subsequent connections too ??
        conn.end()
        done = true
        if taskCount == 1
          callback null, replies[0]
        else
          callback null, replies.slice(0, taskCount)

    if (flags.alreadyJson)
      batch = ""
      for i, str of tasks
        batch += str
        if (str[str.length-1] != '\n') then batch += "\n"
      conn.write batch
    else
      batch = ""
      for i, obj of tasks
        batch += JSON.stringify(obj) + "\n"
      conn.write batch

startReceiver = (taskReceivedCallback, callback) ->
  unless taskReceivedCallback?
    taskReceivedCallback = () ->

  runner.start taskReceivedCallback, () ->
  setTimeout callback, 20

stopReceiver = () ->
  runner.stop()


describe "bl-runner", () ->

  afterEach (done) ->
    stopReceiver()
    done()

  makeTasks = (count) ->
    tasks = []
    for i in [1..count]
      id = uniqid()
      task = makeCopy(sampleTask)
      task.targetFunction = 'run'
      task.requestId = id
      task.response = makeCopy(task.response)
      task.response.headers = makeCopy(task.response.headers)
      task.response.headers['x-test-requestId'] = id
      #task.blScript = "function run(req, res, modules) { setTimeout(function() { res.body = {id: '#{id}'}; res.complete(201); return '#{id}'; }, 1); }"
      task.blScript = "function run(req, res, modules) { res.body = {id: '#{id}'}; res.complete(201); return '#{id}'; }"
      tasks.push task
    return tasks

  checkTaskReplies = (tasks, replies) ->
    ary = []
    for i, reply of replies
      ary.push reply
    for i, task of tasks
      assert(!!replies[task.taskId], "task #{task.taskId} was not replied to")

  it "should do a healthcheck" , (done) ->
    startReceiver null, () ->
      sendToRunner {"healthCheck":1}, (err, obj) ->
        if (err) then return done(err)
        obj.status = 'ready'
        done()

  it "should reject invalid json", (done) ->
    startReceiver null, () ->
      sendToRunner "invalid json", true, (err, obj) ->
        console.log err
        console.log obj
        if (err) then return done(err)
        obj.isError.should.eql true
        obj.debugMessage.should.containEql 'unable to parse'
        done()

  it "should invoke taskReceivedCallback on receiving a task", (done) ->
    task = {}

    taskReceivedCallback = (receivedTask, callback) ->
      (typeof receivedTask).should.eql 'object'
      receivedTask.taskId.should.eql task.taskId
      done()

    startReceiver taskReceivedCallback, () ->
      task = makeTasks(1)[0]
      id = task.response.headers['x-test-requestId']
      sendToRunner task, false, (err, obj) ->

  it "should send a response", (done) ->
    task = {}

    taskReceivedCallback = (receivedTask, callback) ->
      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->
      task = makeTasks(1)[0]
      id = task.response.headers['x-test-requestId']
      sendToRunner task, false, (err, obj) ->
        obj.taskId.should.eql task.taskId
        done()

  # some bugs only show the second time a task is run
  it "should run multiple tasks", (done) ->
    task = {}

    taskReceivedCallback = (receivedTask, callback) ->
      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->

      tasks = makeTasks(2)
      task1 = tasks[0]
      task2 = tasks[1]

      sendToRunner task1, (err, obj) ->
        if (err) then return done(err)
        obj.taskId = task1.taskId
        sendToRunner task2, (err, obj2) ->
          if (err) then return done(err)
          obj2.taskId = task2.taskId
          done()

  it "test parallel throughput", (done) ->
    task = {}

    taskReceivedCallback = (receivedTask, callback) ->
      callback null, receivedTask

    startReceiver taskReceivedCallback, () ->

      replies = {}
      tasks = makeTasks(50)

      t1 = Date.now()
      async.map(
        tasks,
        (task, cb) ->
          sendToRunner task, (err, ret) ->
            if (err) then cb(err)
            replies[ret.taskId] = ret
            cb()
      ,
        (err, ret) ->
          if (err) then return done(err)
          t2 = Date.now()
          # console.log("AR: #{tasks.length} in #{t2-t1} ms")
          # about 1.5,2-5ms,7ms per task singly (batch size 50,100-200,500); much slower once > 125 concurrent
          checkTaskReplies(tasks, replies)

          return done()
      )
      return

