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

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = (() => {
  let receiver;

  function start(options, taskReceivedCallback, receiverStartedCallback) {
    if (!taskReceivedCallback || !receiverStartedCallback) {
      const missingArgumentsError = new Error('Missing Arguments');
      missingArgumentsError.description = 'Cannot start Task Receiver - missing arguments';
      missingArgumentsError.debug = 'Missing arguments - initializing a task receiver requires a taskReceived callback '
        + 'function and a receiver started callback function.';
      throw missingArgumentsError;
    }

    if (typeof taskReceivedCallback !== 'function' || typeof receiverStartedCallback !== 'function') {
      const invalidArgumentTypeError = new Error('Invalid Argument Type');
      invalidArgumentTypeError.description = 'Cannot start Task Receiver - invalid arguments';
      invalidArgumentTypeError.debug = 'Invalid arguments - taskReceivedCallback and receiverStartedCallback '
        + 'must be functions.';
      throw invalidArgumentTypeError;
    }

    if (options && options.type === 'http') {
      receiver = require('./receivers/httpReceiver');
    } else {
      receiver = require('./receivers/tcpReceiver');
    }
    receiver.startServer(taskReceivedCallback, receiverStartedCallback, options);
  }

  function stop(callback) {
    receiver.stop(callback);
  }

  function _getApp() {
    return receiver._app || null;
  }

  return {
    start,
    stop,
    _getApp
  };
})();
