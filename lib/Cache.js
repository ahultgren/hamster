"use strict";

var utils = require('./utils'),
    Queue = require('./Queue'),
    cloneFn = utils.cloneFn,
    extend = utils.extend,
    findBypath = require('findBypath'),
    Reol = require('reol'),
    Cache,
    Factory;


module.exports = exports = Factory = function Factory (fn, options) {
  var cache = new Cache(fn, options),
      handler = extend(callHandler.bind(cache), cache);

  /*jshint proto:true*/
  handler.__proto__ = cache.__proto__;

  return handler;
};


// Handles the calls which other code believes are to the real function
// Inherits prototype and properties of Cache
function callHandler () {
  /*jshint validthis:true */
  return this.callHandler.apply(this, arguments);
}


exports.Cache = Cache = function Cache (fn, options) {
  this.original = fn;
  this.options = options;
  this.fetchQueue = new Queue();
  this.caches = new Reol({
    key: {}
  });

  // Use either async or sync callHandler
  this.callHandler = options.async && this.async || this.sync;
};

Cache.prototype.async = function() {
  var self = this,
      args = [].slice.call(arguments),
      callback = args.pop(),
      key = self.makeKey(args);

  if(self.hasCache(key)) {
    callback.apply(null, this.getCache(key));
  }
  else {
    self.fetch(key, args, function (result) {
      callback.apply(null, result);
    });
  }
};

Cache.prototype.sync = function() {
  var args = [].slice.call(arguments),
      key = this.makeKey(args);

  if(this.hasCache(key)) {
    return this.getCache(key);
  }
  else {
    return this.fetch(key, args);
  }
};

Cache.prototype.makeKey = function(args) {
  var result = args;

  if(this.options.keys.length) {
    result = this.keys.map(function (path) {
      return findBypath(args, path);
    });
  }

  return JSON.stringify(result);
};

Cache.prototype.hasCache = function(key) {
  return this.caches.findOne({ key: key });
};

Cache.prototype.getCache = function(key) {
  return this.hasCache(key).result;
};

Cache.prototype.fetch = function(key, args, callback) {
  var that = this,
      result;

  if(callback) {
    // Only fetch if not already being fetched
    if(that.fetchQueue.isFetching(key)) {
      that.fetchQueue.wait(key, function (result) {
        callback(result);
      });
    }
    else {
      that.fetchQueue.startFetching(key);
      // Use callback as argument
      that.original.apply(null, args.concat(done));
    }
  }
  else {
    // If sync, store and return result
    result = that.original.apply(null, args);
    that.store(key, result);
    return result;
  }

  // This callback is used if async
  function done () {
    that.fetchQueue.stopFetching(key, arguments);
    that.store(key, arguments, callback);
  }
};

Cache.prototype.store = function(key, result, callback) {
  //## Support LRU

  this.caches.push({
    key: key,
    result: result
  });
  this.addTimeout(key);

  // Support callback, allows replacing this method with own store method
  if(callback) {
    callback(result);
  }

  return result;
};

Cache.prototype.addTimeout = function(key) {
  if(this.options.ttl) {
    //## It's probably more memory-efficient to use some kind of central
    // timeout and a loop or something
    setTimeout(this.clear.bind(this, key), this.options.ttl);
  }
};

Cache.prototype.clear = function(key) {
  this.caches.find({ key: key }).remove();
};
