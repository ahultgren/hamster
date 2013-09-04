"use strict";

/**
 * The difference between a Manager and cache is that the manager manages
 * a group of cache objects, called like cache(fun), while the result of
 * afformentioned call is a cache object which caches the result of every
 * unique call.
 */


var utils = require('./utils'),
    extend = utils.extend,
    DEFAULTS = require('./defaults'),
    Cache = require('./Cache'),
    Manager;


module.exports = exports = Manager = function Manager (options) {
  var cache;

  // Extend default options
  this.options = extend({}, DEFAULTS, options);
  this.caches = [];

  // Extend handler with self
  /*jshint proto:true*/
  cache = extend(handler.bind(this), this);
  cache.__proto__ = this.__proto__;

  return cache;
};

function handler (fun, options) {
  /*jshint validthis:true */

  var cache,
      // Extend default options
      settings = extend({}, this.options, options);

  cache = new Cache(fun, settings);
  this.caches.push(cache);
  return cache;
}


Manager.prototype.sync = function(fn, options) {
  return this(fn, extend({ async: false }, options));
};

Manager.prototype.async = function(fn, options) {
  return this(fn, extend({ async: true }, options));
};
