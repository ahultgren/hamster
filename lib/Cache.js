"use strict";


/* Vars
============================================================================= */

var utils = require('./utils'),
    Queue = require('./Queue'),
    cloneFn = utils.cloneFn,
    extend = utils.extend,
    findBypath = require('findBypath'),
    Reol = require('reol'),
    Cache;


/* Class constructor
============================================================================= */

/**
 * Cache
 *
 * Create a new cached function with optional options (though most times sensible
 * defaults are set through a Hamster instance).
 *
 * @param fn (Function) The function to cache
 * @param [options] (Object) Any settings
 * @return (Function&Cache) A cache function/object. Should replace your own 
 * function
 */

module.exports = exports = Cache = function Cache (fn, options) {
  /*jshint proto:true*/
  var handler;

  this.original = fn;
  this.options = options;
  this.fetchQueue = new Queue();
  this.caches = new Reol({
    key: {}
  });

  // Use either async or sync callHandler
  handler = (options.async && this.async || this.sync).bind(this);

  // Extend callHandler with this
  handler = extend(handler, this);
  handler.__proto__ = this.__proto__;

  return handler;
};


/* Public methods
============================================================================= */

/**
 * Cache.async()
 *
 * Internal call handler for asynchronous functions.
 *
 * @param [...] (mixed) Arguments to the cached function
 * @param callback (Function) Callback
 * @callback (mixed) The result of the cached function
 */

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


/**
 * Cache.sync()
 *
 * Internal call handler for synchronous functions.
 *
 * @param [...] (mixed) Arguments to the cached function
 * @return (mixed) The result of the cached function
 */

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


/**
 * Cache.makeKey()
 *
 * Generates a string from caller arguments to be able to distinguish between
 * unique (or not) calls. Uses Cache.keys, if set, to filter out only relevant
 * properties.
 *
 * @param args (Array|Object) Arguments to stringify
 * @return (String) Stringified arguments
 */

Cache.prototype.makeKey = function(args) {
  var result = args;

  if(this.options.keys.length) {
    result = this.keys.map(function (path) {
      return findBypath(args, path);
    });
  }

  return JSON.stringify(result);
};


/**
 * Cache.hasCache()
 *
 * Checks if a cache is saved for a key
 *
 * @param key (String) The key
 * @return (Boolean) Whether it exists or not
 */

Cache.prototype.hasCache = function(key) {
  return this.caches.findOne({ key: key });
};


/**
 * Cache.getCache()
 *
 * Retrieve a cache saved for a certain key
 *
 * @param key (String) The key
 * @return (Array|Mixed) The result of the cached function
 */

Cache.prototype.getCache = function(key) {
  var collection = this.caches.find({ key: key }),
      result = collection[0];

  // "touch" the cache (prevent it from being lru)
  collection.remove();
  this.caches.push(result);

  return result.result;
};


/**
 * Cache.fetch()
 *
 * Call the original function and update the cache
 *
 * @param key (string) The stringified arguments
 * @param args (Array|Object) The arguments of the caller
 * @param [callback] (Function) Optional callback
 * @return (mixed) THe result of the original function
 */

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


/**
 * Cache.store()
 *
 * Saves the result of the original function in the cache
 *
 * @param key (String) The stringified arguments
 * @param result (mixed) The result of the original function
 * @param callback (String) Optional callback
 * @return (mixed) The same inputted result
 */

Cache.prototype.store = function(key, result, callback) {
  // Kick LRU (Least Recently Updated)
  if(this.options.lru && this.caches.length >= this.options.lru) {
    this.caches.shift();
  }

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


/**
 * Cache.addTimeout()
 *
 * Mark a cache for clearing when TTL has expired
 *
 * @param key (String) The stringified arguments
 */

Cache.prototype.addTimeout = function(key) {
  if(this.options.ttl) {
    //## It's probably more memory-efficient to use some kind of central
    // timeout and a loop or something
    setTimeout(this.clear.bind(this, key), this.options.ttl);
  }
};


/**
 * Cache.clear()
 *
 * Removes a cached result
 *
 * @param key (String) The stringified arguments
 */

Cache.prototype.clear = function(key) {
  this.caches.find({ key: key }).remove();
};
