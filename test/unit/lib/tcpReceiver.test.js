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

const should = require('should');
const net = require('net');
const async = require('async');
const runner = require('../../../lib/receiver');

const testPort = 7000;
const testHost = 'localhost';
const connections = [];

const sampleTask = require('./../../scripts/sampleTask');

function uniqid(prefix) {
  return (prefix || '') + (Math.random() * 16000000 >>> 0).toString();
}

function makeCopy(src) {
  const dest = {};
  for (const property in src) {
    if (src.hasOwnProperty(property)) {
      dest[property] = src[property];
    }
  }
  return dest;
}

function sendToRunner(tasks, flags, callback) {
  let done = false;

  if (!callback) {
    callback = flags;
    flags = {};
  }

  if (!flags || typeof flags !== 'object') {
    flags = { alreadyJson: flags };
  }

  if (!Array.isArray(tasks)) {
    tasks = [tasks];
  }

  const taskCount = tasks.length;

  const conn = net.connect({ host: testHost, port: testPort }, () => {
    let replyString = '';

    conn.on('error', (err) => {
      callback(err);
    });

    // we close our connection when done, so we always get a 'close' event
    conn.on('close', (hadError) => {
      if (!done && hadError) {
        callback(hadError);
      }
    });

    conn.on('data', (chunk) => {
      replyString += chunk.toString();
      const replies = replyString.split('\n');
      if (replies.length > taskCount) {
        for (let i = 0; i < taskCount; i++) {
          replies[i] = JSON.parse(replies[i]);
        }
      }

      // close the connection to not leak the file descriptor.  Ignore 'close' events.
      // FIXME:  closing the connection interferes with subsequent connections too ??
      conn.end();
      done = true;

      if (taskCount === 1) {
        callback(null, replies[0]);
      } else {
        callback(null, replies.slice(0, taskCount));
      }
    });

    if (flags.alreadyJson) {
      let batch = '';
      for (const task of tasks) {
        batch += task;
        if (task && task[task.length - 1] !== '\n') {
          batch += '\n';
        }
      }
      conn.write(batch);
    } else {
      let batch = '';
      for (const task of tasks) {
        batch += `${JSON.stringify(task)}\n`;
      }
      conn.write(batch);
    }
  });

  connections.push(conn);
}

function startReceiver(taskReceivedCallback, callback, options) {
  if (!taskReceivedCallback) {
    taskReceivedCallback = () => null;
  }

  if (!options) {
    options = {
      type: 'tcp'
    };
  }

  runner.start(options, taskReceivedCallback, () => {
    setTimeout(callback, 20);
  });
}

function stopReceiver(callback) {
  runner.stop(callback);
}

describe('tcp receiver', () => {
  function makeTasks(count) {
    const tasks = [];

    for (let i = 0; i < count; i++) {
      const id = uniqid();
      const task = makeCopy(sampleTask);
      task.targetFunction = 'run';
      task.requestId = id;
      task.response = makeCopy(task.response);
      task.response.headers = makeCopy(task.response.headers);
      task.response.headers['x-test-requestid'] = id;
      task.blScript = "function run(req, res, modules) {res.body = {id: '#{id}'}; res.complete(201); return '#{id}';}";
      tasks.push(task);
    }

    return tasks;
  }

  function checkTaskReplies(tasks, replies) {
    for (const task of tasks) {
      should.exist(replies[task.taskId]);
    }
  }

  afterEach((done) => {
    while (connections.length > 0) {
      const conn = connections.pop();
      conn.end();
    }

    stopReceiver(done);
  });

  it('should reject invalid json', (done) => {
    startReceiver(null, () => {
      sendToRunner('invalid json', true, (err, obj) => {
        if (err) {
          return done(err);
        }
        obj.isError.should.be.true();
        obj.debugMessage.should.containEql('unable to parse');
        return done();
      });
    });
  });

  it('should handle an error, which is an instance of Error', (done) => {
    function onTask(err, callback) {
      callback(new Error('some error message'));
    }
    startReceiver(onTask, () => {
      const task = makeTasks(1)[0];
      sendToRunner(task, false, (err, obj) => {
        if (err) {
          return done(err);
        }
        obj.isError.should.be.true();
        obj.debugMessage.should.containEql('Unable to execute Flex method');
        obj.error.should.eql(new Error('some error message').toString());
        return done();
      });
    });
  });

  it('should handle an error, which is not an instance of Error', (done) => {
    function onTask(err, callback) {
      callback({ test: true });
    }
    startReceiver(onTask, () => {
      const task = makeTasks(1)[0];
      sendToRunner(task, false, (err, obj) => {
        if (err) {
          return done(err);
        }
        obj.isError.should.be.true();
        obj.debugMessage.should.containEql('Unable to execute Flex method');
        obj.error.should.deepEqual({ test: true });
        return done();
      });
    });
  });

  it('should handle an error, which is not serializable', (done) => {
    function onTask(err, callback) {
      callback({ test: this });
    }
    startReceiver(onTask, () => {
      const task = makeTasks(1)[0];
      sendToRunner(task, false, (err, obj) => {
        if (err) {
          return done(err);
        }
        obj.isError.should.be.true();
        obj.debugMessage.should.containEql('Unable to execute Flex method');
        obj.error.should.eql('Error argument not instance of Error and not stringifiable');
        return done();
      });
    });
  });

  it('should do a healthcheck', (done) => {
    startReceiver(null, () => {
      sendToRunner({ healthCheck: 1 }, (err, obj) => {
        if (err) {
          return done(err);
        }

        obj.status = 'ready';
        return done();
      });
    });
  });

  it('should not process a null task', (done) => {
    let processed = false;

    startReceiver(null, () => {
      sendToRunner(null, true, (err, obj) => {
        processed = true;
        done(err || new Error('Returned'));
      });

      setTimeout(() => {
        processed.should.eql(false);
        done();
      }, 500);
    });
  });

  it('should invoke taskReceivedCallback on receiving a task', (done) => {
    let task = {};

    function taskReceivedCallback(receivedTask) {
      receivedTask.should.be.an.Object();
      receivedTask.taskId.should.eql(task.taskId);
      done();
    }

    startReceiver(taskReceivedCallback, () => {
      task = makeTasks(1)[0];
      sendToRunner(task, false, () => null);
    });
  });

  it('should set query if legacy params passed', (done) => {
    let task = {};

    function taskReceivedCallback(receivedTask) {
      receivedTask.should.be.an.Object();
      receivedTask.taskId.should.eql(task.taskId);
      receivedTask.request.query.foo.should.eql('bar');
      done();
    }

    startReceiver(taskReceivedCallback, () => {
      task = makeTasks(1)[0];
      task.request.params.foo = 'bar';
      sendToRunner(task, false, () => null);
    });
  });

  it('should not set query if already present, even if legacy params passed', (done) => {
    let task = {};

    function taskReceivedCallback(receivedTask) {
      receivedTask.should.be.an.Object();
      receivedTask.taskId.should.eql(task.taskId);
      should.not.exist(receivedTask.request.query.foo);
      receivedTask.request.query.some.should.eql('value');
      done();
    }

    startReceiver(taskReceivedCallback, () => {
      task = makeTasks(1)[0];
      task.request.params.foo = 'bar';
      task.request.query = { some: 'value' };
      sendToRunner(task, false, () => null);
    });
  });

  it('should not set query if no request object is passed', (done) => {
    let task = {};

    function taskReceivedCallback(receivedTask) {
      receivedTask.should.be.an.Object();
      should.not.exist(receivedTask.request);
      done();
    }

    startReceiver(taskReceivedCallback, () => {
      task = {};
      sendToRunner(task, false, () => null);
    });
  });

  it('should send a response', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      const task = makeTasks(1)[0];
      sendToRunner(task, false, (err, obj) => {
        obj.taskId.should.eql(task.taskId);
        done();
      });
    });
  });

  it('should run multiple tasks', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      const tasks = makeTasks(2);
      const task1 = tasks[0];
      const task2 = tasks[1];

      sendToRunner(task1, (err, obj) => {
        if (err) {
          return done(err);
        }
        obj.taskId.should.eql(task1.taskId);
        return sendToRunner(task2, (err, obj2) => {
          if (err) {
            return done(err);
          }
          obj2.taskId.should.eql(task2.taskId);
          return done();
        });
      });
    });
  });

  it('test parallel throughput', (done) => {
    function taskReceivedCallback(receivedTask, callback) {
      callback(null, receivedTask);
    }

    startReceiver(taskReceivedCallback, () => {
      const replies = {};
      const tasks = makeTasks(50);

      async.map(
        tasks,
        (task, cb) => {
          sendToRunner(task, (err, ret) => {
            if (err) {
              return cb(err);
            }
            replies[ret.taskId] = ret;
            return cb();
          });
        },
        (err) => {
          if (err) {
            return done(err);
          }
          checkTaskReplies(tasks, replies);
          return done();
        }
      );
    });
  });
});
