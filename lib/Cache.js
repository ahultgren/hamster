"use strict";

var utils = require('./utils'),
    cloneFn = utils.cloneFn,
    extend = utils.extend,
    findBypath = require('findBypath'),
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
  return this.callhandler.apply(this, arguments);
}


exports.Cache = Cache = function Cache (fn, options) {
  this.caches = {};
  this.original = fn;
  this.options = options;

  // Use either async or sync callHandler
  this.callhandler = options.async && this.async || this.sync;
};

Cache.prototype.async = function() {
  var self = this,
      args = [].slice.call(arguments),
      callback = args.pop(),
      key = self.makeKey(args);

  if(self.hasCache(key)) {
    callback.apply(null, self.caches[key].result);
  }
  else {
    self.fetch(args, function () {
      self.store(key, arguments, function () {
        callback.apply(null, self.caches[key].result);
      });
    });
  }
};

Cache.prototype.sync = function() {
  var args = [].slice.call(arguments),
      key = this.makeKey(args),
      result;

  if(this.hasCache(key)) {
    return this.caches[key].result;
  }
  else {
    result = this.fetch(args);
    this.store(key, result);
    return result;
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
  return key in this.caches;
};

Cache.prototype.fetch = function(args, callback) {
  // Use callback if supplied
  args = callback && args.concat(callback) || args;

  //## If async, only fetch if not already being fetched
  return this.original.apply(null, args);
};

Cache.prototype.store = function(key, result, callback) {
  //## Support LRU
  this.caches[key] = {
    result: result
  };
  this.addTimeout(key);

  // Support callback, allows replacing this method with own store method
  if(callback) {
    callback();
  }
};

Cache.prototype.addTimeout = function(key) {
  if(this.options.ttl) {
    //## It's probably more memory-efficient to use some kind of central
    // timeout and a loop or something
    setTimeout(this.clear.bind(this, key), this.options.ttl);
  }
};

Cache.prototype.clear = function(key) {
  delete this.caches[key];
};
