"use strict";

/*global it:true, describe:true*/
/*jshint expr:true*/
var chai = require('chai'),
    should = chai.should(),
    expect = chai.expect,
    cache = require('../.');


/* Global instance
============================================================================= */

describe('global cache instance', function () {
  var timeout = 500;

  this.timeout(2000);

  function fn (arg, callback) {
    setTimeout(callback.bind({}, arg + 1), timeout);
  }

  var test = cache(fn);

  it('is callable', function (next) {
    test(3, function (result) {
      result.should.equal(4);
      next();
    });
  });

  it('is faster on second call', function (next) {
    var done = false;

    test(3, function (result) {
      result.should.equal(4);
      done = true;
    });

    setTimeout(function () {
      expect(done).to.equal(true);
      next();
    }, timeout/2);
  });

  it('returns a correct result with new arguments', function (next) {
    var done = false;

    test(4, function (result) {
      result.should.equal(5);
      next();
    });
  });
});

describe('global sync cache', function () {
  this.timeout(10000);

  function fn (arg1, arg2) {
    for(var i = 0; i < 1000000; i++) {
      Math.sqrt(i + arg1);
    }

    return arg1 + arg2;
  }

  var test = cache.sync(fn),
      firstTime;

  it('is callable', function () {
    var time = process.hrtime();

    test(3, 4).should.equal(fn(3, 4));

    time = process.hrtime(time);
    firstTime = time[0] * 1e9 + time[1];
  });

  it('is faster on second call', function () {
    var time = process.hrtime();

    test(3, 4);

    time = process.hrtime(time);
    time = time[0] * 1e9 + time[1];
    expect(time).to.be.below(firstTime);
  });

  it('returns a correct result with new arguments', function () {
    test(3, 5).should.equal(8);
  });
});

describe('cache update queue system', function () {
  var i = 0,
      arg = 'cuqs';

  function fn (arg1, callback) {
    i++;
    setTimeout(callback.bind({}, arg1+1), 200);
  }

  var test = cache(fn);

  it('calls original only once for multiple calls', function (next) {
    var ii = 0;

    test(arg, done);
    test(arg, done);
    test(arg, done);

    function done (result) {
      // If it always equals the same, the original function hasn't been recalled
      i.should.equal(1);

      if(++ii === 3) {
        next();
      }
    }
  });

  it('still works even after the result has been fetched', function (next) {
    test(arg, function (result) {
      next();
    });
  });
});
