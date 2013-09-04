"use strict";


/**
 * Queue
 *
 * Keep track of which caches are being updated and provide an api for 
 *
 * @param paramName (type) Description
 * @return (type) Description
 */

var EventEmitter = require('events').EventEmitter,
    Queue;


module.exports = exports = Queue = function Queue () {
  this.queued = {};
  this.events = new EventEmitter();
};

Queue.prototype.isFetching = function(key) {
  return key in this.queued;
};

Queue.prototype.startFetching = function(key) {
  this.queued[key] = true;
  return true;
};

Queue.prototype.stopFetching = function(key, result) {
  delete this.queued[key];
  return this.events.emit(key, result);
};

Queue.prototype.wait = function(key, callback) {
  return this.events.once(key, callback);
};
