"use strict";

/**
 * The difference between a Hamster and a Cache is that the hamster manages
 * a group of cache objects, called like cache(fun), while the result of
 * afformentioned call is a cache object which caches the result of every
 * unique call.
 */


/* Vars
============================================================================= */

var utils = require('./utils'),
    extend = utils.extend,
    DEFAULTS = require('./defaults'),
    Cache = require('./Cache'),
    Hamster;


/* Class constructor
============================================================================= */

/**
 * Hamster(options)
 *
 * Create a new Hamster instance with optional default cache options. Manages
 * cached functions.
 *
 * @param options (object) Options
 * @return (Function&this) A Hamster instance extended on a function for
 *  creating caches.
 */

module.exports = exports = Hamster = function Hamster (options) {
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


/* Public methods
============================================================================= */


/**
 * Hamster()
 *
 * The "this" of a hamster instance is also callable! Creates a new cache for
 * the supplied function. See the Cache constructor.
 */

function handler (fn, options) {
  /*jshint validthis:true */

  var cache,
      // Extend default options
      settings = extend({}, this.options, options);

  cache = new Cache(fn, settings);
  this.caches.push(cache);
  return cache;
}


/**
 * Hamster.sync()
 *
 * The same as Hamster() but with { async: false } preset
 */

Hamster.prototype.sync = function(fn, options) {
  return this(fn, extend({ async: false }, options));
};


/**
 * Hamster.async()
 *
 * The same as Hamster() but with { async: true } preset
 */

Hamster.prototype.async = function(fn, options) {
  return this(fn, extend({ async: true }, options));
};
