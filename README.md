# Hamster

_The ultimate cache module.  
Completely unobtrusive and failsafe caching of anything.  
Cache functions instead of data._


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


## Usage examples

See the introduction for a basic example or the test folder for more advanced
examples.


## API

hamster(fn, options)

_more coming soon_


## Options

```javascript
{
  async: true, // Set to false to cache synchronous functions
  ttl: 10000, // How long before the cached result is cleared
  maxSize: 50, // Max number of cached results
  keys: [] // Possibility to create a new cache only for certain arguments/properties
}
```


## Custom extensions

Want to store the caches in redis instead of in-memory? Go ahead and implement
.store, .hasCache, .addTimeout, and possibly any other methods on a cache instance.
I will probably implement a neater api for this later.


## License

**MIT**

Copyright (C) 2013 Andreas Hultgren
