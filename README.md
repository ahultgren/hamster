# Hamster

_The ultimate Javascript cache module.  
Unobtrusive and failsafe caching of anything.  
Caches functions instead of data._


## But how?

```javascript
var hamster = require('hamster');

// Cache a function
var getData = hamster(aFunctionThatTakesLotsOfTime);

// Call the function like you normally would
getData('yeah', resultHandler);
```


## Advantages

* Simple straight-forward API
* No need to manage a cache object yourself
* Easy to implement, no need to rewrite _any_ function calls
* Promotes separation of concerns
* TTL-support, clear caches after a certain time
* LRU-support, pop the least recently updated cache when reaching a max number of cached results
* Pontentially supports _any_ cache storage (for example redis)


## TOC

* [Philosophy](#philosophy)
* [Installation](#installation)
* [API](#api)
  * [hamster](#hamster-1)
  * [hamster.Hamster](#hamster--new-hamsterhamsteroptions)
  * [hamster()](#cache--hamsterfn-options)
  * [hamster.sync()](#cache--hamstersync)
  * [hamster.async()](#cache--hamsterasync)
  * [cache()](#cache)
  * [cache.original()](#cacheoriginal)
* [Options](#options)
* [Examples](#examples)
* [Custom extensions](#custom-extensions)
* [Contribution](#contribution)
* [Todo](#todo)
* [License](#license)


## Philosophy

When you use cache a function using `hamster(fn)`, a function is returned. You
can use this function in exactly the same way as the original. No other part of
your code should ever have to think about that the function is cached.

Also the cached function itself should not and need not be modified with cache
in mind. The function should do what it does, callers should do what they do,
while Hamster automagically takes care of the cache.

**Note**

Do not use Hamster with functions that are based on side-effects. That is, if 
it modifies an argument object or doesn't return the result, or if the result 
varies depending on non-argument variables (eg global vars or properties on its 
object).

A typical example of this would be trying to cache an express/connect middleware 
directly. That won't work since a middleware just modifies an object, that also
is unique to every request. Instead, rewrite the function to only require what
arguments it needs. For example:

```javascript
// Do not:
app.use(hamster(getUserData));

// Do:
getUserData = hamster(function...);
app.use(function (req, res, next) {
  getUserData(req.params.id, function (err, result) {
    req.user = result;
  });
});
```


## Installation

`npm install hamster`


## API

#### `hamster`

A global instance of Hamster (see hamster() below).

#### `hamster = new hamster.Hamster(options)`

Creates a new instance of hamster with some setable options (see options below).

#### `cache = hamster(fn, options)`

An instance of Hamster, managing cached functions. Call it with a function to
create a cache for that function. Returns a function that should replace the
original function.

#### `cache = hamster.sync()`

A shorthand method for calling `hamster(fn, { async: false })`.

#### `cache = hamster.async()`

A shorthand method for calling `hamster(fn, { async: true })`.

#### `cache()`

Just use it as you would use the original function.

#### `cache.original()`

A reference to the original function, if you need to circumvent the cache.


## Options

```javascript
{
  async: true, // Set to false to enable caching synchronous functions
  ttl: 10000, // How long to wait before the cached result is cleared, in milliseconds
  maxSize: 50, // Max number of cached results, the least recently used will be dropped when exeeding this limit
  keys: [] // Possibility to create a new cache only for certain arguments/properties
}
```

_A note on options.keys._ Let's say you supply the entire req object but for
caching reasons the funciton is only interested in req.params.id. Then the
following would consider requests to be the same if anything but req.params.id
changes.

```javascript
// 0 for the first argument
cache = hamster(fn, { keys: ['0.params.id'] });
```


## Examples

### Cache an ajax request

```javascript
// Will only request a post from the server the first time
var getPost = hamster(function (id, callback) {
  $.ajax({
    url: '/posts/' + id,
    success: callback
  });
}, {
  ttl: 0
});

$('.toc a').on('click', function(e) {
  e.preventDefault();
  getPost($(this).attr('data-id'), function (data) {
    renderPost(data);
  });
});
```

### Cache a custom mongoose method

```javscript
postSchema.statics.getFull = hamster(function (id, callback) {
  this.findById(id).populate('author').exec(callback);
});

// ... used in routing like normal:
app.get('/:id', function (req, res) {
  postModel.getFull(req.params.id, function (post) {
    res.render('post', post);
  });
});
```

See the test folder for more examples.


## Custom extensions

Want to store the caches in redis or localStorage instead of in-memory? Go ahead
and implement .store, .hasCache, .getCache, .addTimeout, and possibly any other
methods on a cache instance. I will probably implement a neater api for this
later.


## Contribution

Create an issue first so I know what you're doing. Pull request to the develop
branch. Test everything.


## Todo

AKA implemented when/if needed.

* A way of expiring based on some other criteria than time. Eg number of calls
  or some external change. Probably in the form of a .expireWhen() option.
* A way to auto-update a cache instead of exipring. A must for very heavy work
  which not even one client can wait for.
* API for using custom storage mechanisms.


## License

**MIT**

Copyright (C) 2013 Andreas Hultgren
