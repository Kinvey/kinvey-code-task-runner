# Copyright (c) 2015, Kinvey, Inc. All rights reserved.
#
# This software is licensed to you under the Kinvey terms of service located at
# http://www.kinvey.com/terms-of-use. By downloading, accessing and/or using this
# software, you hereby accept such terms of service  (and any agreement referenced
# therein) and agree that you have read, understand and agree to be bound by such
# terms of service and are of legal age to agree to such terms with Kinvey.
#
# This software contains valuable confidential and proprietary information of
# KINVEY, INC and is subject to applicable licensing agreements.
# Unauthorized reproduction, transmission or distribution of this file and its
# contents is a violation of applicable laws.

receiver = require './receivers/tcpReceiver'

process.env.NODE_ENV or= 'development'

exports.start = (taskReceivedCallback, receiverStartedCallback) ->
  unless taskReceivedCallback? and receiverStartedCallback?
    missingArgumentsError = new Error 'Missing Arguments'
    missingArgumentsError.description = 'Cannot start Task Receiver - missing arguments'
    missingArgumentsError.debug = 'Missing arguments - initializing a task receiver requires a taskReceived callback function and a receiver started callback function.'
    throw missingArgumentsError

  if typeof taskReceivedCallback isnt 'function' or typeof receiverStartedCallback isnt 'function'
    invalidArgumentTypeError = new Error 'Invalid Argument Type'
    invalidArgumentTypeError.description = 'Cannot start Task Receiver - invalid arguments'
    invalidArgumentTypeError.debug = 'Invalid arguments - taskReceivedCallback and receiverStartedCallback must be functions.'

  receiver.startServer taskReceivedCallback, receiverStartedCallback

exports.stop = () ->
  receiver.stop()
