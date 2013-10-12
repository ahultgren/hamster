"use strict";

/*global it:true, describe:true*/
/*jshint expr:true*/
var chai = require('chai'),
    should = chai.should(),
    expect = chai.expect,
    hamster = require('../.');


/* Global instance
============================================================================= */

describe('global hamster instance', function () {
  var timeout = 500;

  this.timeout(2000);

  function fn (arg, callback) {
    setTimeout(callback.bind({}, arg + 1), timeout);
  }

  var test = hamster(fn);

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

describe('global sync hamster', function () {
  this.timeout(10000);

  function fn (arg1, arg2) {
    for(var i = 0; i < 1000000; i++) {
      Math.sqrt(i + arg1);
    }

    return arg1 + arg2;
  }

  var test = hamster.sync(fn),
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

describe('hamster update queue system', function () {
  var i = 0,
      arg = 'huqs';

  function fn (arg1, callback) {
    i++;
    setTimeout(callback.bind({}, arg1+1), 200);
  }

  var test = hamster(fn);

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

describe('lru', function () {
  var 
      rounds = 0,
      localCache = new hamster.Hamster({
        lru: 1,
        ttl: 0,
        async: false
      }),
      test = localCache(function (arg1) {
        rounds++;
        return arg1 + 1;
      });

  it('hamsters the first call', function () {
    test(1);
    test(1);
    rounds.should.equal(1);
  });

  it('kicks the first call when another one is made', function () {
    test(2);
    test(1);
    rounds.should.equal(3);
  });
});

describe('function with context', function () {
  function Class (arg1) {
    this.arg1 = arg1;
  }

  Class.prototype.fn = function(arg2, callback) {
    callback(this.arg1 + arg2);
  };

  var instance = new Class(10),
      test1 = hamster(instance.fn),
      test2 = hamster(instance.fn.bind(instance)),
      test3 = hamster(instance.fn).bind(instance);

  it('recieves the correct context with .call', function (next) {
    test1.call(instance, 5, function (result) {
      result.should.equal(15);
      next();
    });
  });

  it('receives the correct context with .bind on the fn', function (next) {
    test2(10, function (result) {
      result.should.equal(20);
      next();
    });
  });

  it('receives the correct context with .bind on the hamster', function (next) {
    test3(15, function (result) {
      result.should.equal(25);
      next();
    });
  });

  it('still has .original()', function () {
    test1.should.have.property('original').and.be.a('function');
  });
});

describe('a short ttl', function () {
  var cache = new hamster.Hamster({
        ttl: 10
      }),
      called = 0;

  function fn (arg1, callback) {
    called++;
    callback(arg1 + 1);
  }

  var test = cache(fn);

  it('clears the cache', function (next) {
    test(1, function () {
      called.should.equal(1);
    });

    test(1, function () {
      called.should.equal(1);

      setTimeout(test.bind(null, 1, function () {
        called.should.equal(2);
        next();
      }), 20);
    });
  });
});

describe('.clear()', function () {
  var cache = new hamster.Hamster({
        ttl: 100,
        async: false
      }),
      called = 0;

  function fn (arg1) {
    called++;
    return arg1 + 1;
  }

  var test = cache(fn);

  it('should work with a normal working cache', function (next) {
    test(1).should.equal(2);
    test(1).should.equal(2);
    called.should.equal(1);

    setTimeout(next, 60);
  });

  it('should not be cleared prematurely', function  () {
    test(1).should.equal(2);
    called.should.equal(1);
  });

  it('should clear cache when called', function (next) {
    test.clear(test.makeKey({
      0: 1
    }));

    test(1).should.equal(2);
    called.should.equal(2);

    setTimeout(next, 60);
  });

  it('should not double-clear', function () {
    test(1);
    called.should.equal(2);
  });

  it('should clear cache when called without params', function () {
    test.clear();
    test(1);
    called.should.equal(3);
  });

  it('on the hamster instance should clear all caches', function () {
    cache.clear();
    test(1);
    called.should.equal(4);
  });
});
