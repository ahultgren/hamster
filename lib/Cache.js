"use strict";


/* Vars
============================================================================= */

var utils = require('./utils'),
    Queue = require('./Queue'),
    cloneFn = utils.cloneFn,
    extend = utils.extend,
    extendProto = utils.extendProto,
    optionalCallback = utils.optionalCallback,
    findByPath = require('findByPath'),
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
  var self = this,
      handler;

  self.original = fn;
  self.options = options;
  self.fetchQueue = new Queue();
  self.caches = new Reol({
    key: {}
  });
  self.timeouts = new Reol({
    key: {}
  });

  // Use either async or sync call handler, wrapped in a context preserving function
  handler = (function (handler) {
    return function () {
      return handler.call(self, this, arguments);
    };
  }(options.async && self.async || self.sync));

  // Extend call handler with self
  handler = extend(handler, self);
  handler.__proto__ = self.__proto__;

  // Keep the original function's prototype
  extendProto(handler.__proto__, fn.__proto__);

  return handler;
};


/* Public methods
============================================================================= */

/**
 * Cache.async()
 *
 * Internal call handler for asynchronous functions.
 *
 * @param context (Object) Context of the caller
 * @param arguments (Array|Arguments) Arguments of the caller
 *  @param callback (Function) The last of the arguments must be a callback
 * @callback (mixed) The result of the cached function
 */

Cache.prototype.async = function(context, originalArguments) {
  var self = this,
      args = [].slice.call(originalArguments),
      callback = args.pop(),
      key = self.makeKey(args);

  self.hasCache(key, function (has) {
    if(has) {
      self.getCache(key, callback.apply.bind(callback, null));
    }
    else {
      self.fetch(context, key, args, function (result) {
        callback.apply(null, result);
      });
    }
  });
};


/**
 * Cache.sync()
 *
 * Internal call handler for synchronous functions.
 *
 * @param context (Object) Context of the caller
 * @param arguments (Array|Arguments) Arguments of the caller
 * @return (mixed) The result of the cached function
 */

Cache.prototype.sync = function(context, args) {
  var key = this.makeKey(args);

  if(this.hasCache(key)) {
    return this.getCache(key);
  }
  else {
    return this.fetch(context, key, args);
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
    result = this.options.keys.map(function (path) {
      return findByPath(args, path);
    });
  }

  return JSON.stringify(result);
};


/**
 * Cache.hasCache()
 *
 * Checks if a cache is saved for a key
 *
 * @param key (String) The stringified arguments
 * @param [callback] (Function)
 * @return (Boolean) Whether it exists or not
 */

Cache.prototype.hasCache = function(key, callback) {
  return optionalCallback(callback, this.caches.findOne({ key: key }));
};


/**
 * Cache.getCache()
 *
 * Retrieve a cache saved for a certain key
 *
 * @param key (String) The stringified arguments
 * @param [callback] (Function)
 * @return (Array|Mixed) The result of the cached function
 */

Cache.prototype.getCache = function(key, callback) {
  var collection = this.caches.find({ key: key }),
      result = collection[0];

  // "touch" the cache (prevent it from being lru)
  collection.remove();
  this.caches.push(result);

  return optionalCallback(callback, result.result);
};


/**
 * Cache.fetch()
 *
 * Call the original function and update the cache
 *
 * @param context (Object|null) Callers original context
 * @param key (string) The stringified arguments
 * @param args (Array|Object) The arguments of the caller
 * @param [callback] (Function) Optional callback
 * @return (mixed) THe result of the original function
 */

Cache.prototype.fetch = function(context, key, args, callback) {
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
      that.original.apply(context, args.concat(done));
    }
  }
  else {
    // If sync, store and return result
    result = that.original.apply(context, args);
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
  return optionalCallback(callback, result);
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
    this.timeouts.push({
      key: key,
      timeout: setTimeout(this.clear.bind(this, key), this.options.ttl)
    });
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
  // Clear and remove any timeout
  var timeouts = key && this.timeouts.find({ key: key }) || this.timeouts,
      caches = key && this.caches.find({ key: key }) || this.caches,
      i;

  if(timeouts.length) {
    for(i = timeouts.length; i--;) {
      clearTimeout(timeouts[i].timeout);
    }

    timeouts.remove();
  }

  // Clear cache
  caches.remove();
};
