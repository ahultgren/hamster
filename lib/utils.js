"use strict";

var disallowedProps = ['arguments', 'caller'];

// Extend stuff
exports.extend = function extend () {
  var objs = Array.prototype.slice.call(arguments),
      rootObj = objs.shift() || {};

  objs.forEach(function (obj) {
    if(obj) {
      Object.keys(obj).forEach(function (i) {
        rootObj[i] = obj[i];
      });
    }
  });

  return rootObj;
};

exports.cloneFn = function cloneFn (fn) {
  var args,
      strFn = fn.toString();

  // Extract argument names
  // Match first occurence of "(<anything but end-parenthesis>)",
  // split it on "," and use as args
  args = [Function].concat(strFn
    .match(/\(([^\)]*)\)/)[1]
    .trim()
    .split(/\s*,\s*/)
    .filter(Boolean));

  // Extract function body
  // Find first "{" and last "}" and grab everything inbetween
  args.push(strFn.substring(strFn.indexOf('{') + 1, strFn.lastIndexOf('}')));

  // Create and return the new function
  return new (Function.bind.apply(Function, args))();
};

exports.optionalCallback = function (callback /*, args*/) {
  var args = Array.prototype.slice.call(arguments, 1);

  if(callback) {
    callback.apply(null, args);
  }

  // If more than one argument, return last
  return args[args.length - 1];
};

exports.extendProto = function (target, source) {
  var props = Object.getOwnPropertyNames(source);

  props.forEach(function (prop) {
    if(disallowedProps.indexOf(prop) > -1) {
      return;
    }
    target[prop] = source[prop];
  });

  return target;
};
