"use strict";

/*global it:true, describe:true*/

var chai = require('chai'),
    should = chai.should(),
    expect = chai.expect,
    utils = require('../lib/utils');


/* extend
============================================================================= */

describe('utils.extend', function () {
  it('extends an object', function () {
    var data = {
      prop: 1
    };

    var test = utils.extend(data, { prop: 2, prop2: 2 });

    test.should.equal(data);
    test.prop.should.equal(2);
    test.prop2.should.equal(2);
  });

  it('extends undefined', function () {
    utils.extend(undefined, { prop: 1 }).prop.should.equal(1);
  });
});


/* cloneFn
============================================================================= */

describe('utils.cloneFn', function () {
  it('clones a function', function () {
    function fn (arg1, arg2) {
      return arg1 + arg2;
    }

    var test = utils.cloneFn(fn);

    test.should.not.equal(fn);
    test(1, 2).should.equal(fn(1, 2));
  });

  it('clones an argument-less function', function () {
    function fn () {
      return 1;
    }

    var test = utils.cloneFn(fn);

    test.should.not.equal(fn);
    test().should.equal(fn());
  });
});
