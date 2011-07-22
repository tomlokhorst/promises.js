/*!
 * promises.js
 *
 * Copyright (c) 2011, Tom Lokhorst
 * Released under BSD licence, see LICENSE file.
 */

;

// A deferred is a value that can be resolved at a later time.
// The value can be observed via the promise object
function Deferred()
{
  var value = undefined;
  var isDone = false;
  var doneCallbacks = [];
  var promise = new Promise();

  promise.onDone = function (cb)
  {
    if (typeof cb !== "function")
      throw new Error("Callback is not a function");

    doneCallbacks.push(cb);

    var l = new Listener()
    l.stop = function ()
    {
      if (!doneCallbacks) return;

      var ix = doneCallbacks.indexOf(cb);
      if (ix > -1)
        doneCallbacks.splice(ix, 1);
    }
    l.toString = function ()
    {
      return "Listener to [" + promise.toString() + "]";
    };

    return l;
  };

  promise.isDone = function ()
  {
    return isDone;
  };

  this.done = function (val)
  {
    if (isDone)
      throw new Error("Deferred is already done");

    value = val;
    isDone = true;

    for (var i = 0, l = doneCallbacks.length; i < l; i++)
    {
      try
      {
        doneCallbacks[i](value);
      }
      catch (_)
      {
        // ignore exception, other callbacks might still have to be called
      }
    }

    // these can be GC'ed now
    doneCallbacks = null;

    // now that value is available, callbacks can be called immediately
    promise.onDone = function (cb)
    {
      if (typeof cb !== "function")
        throw new Error("Callback is not a function");

      try
      {
        cb(value);
      }
      catch (_)
      {
        // ignore exception, to be consistent with original onDone
      }

      var l = new Listener();
      l.stop = function () {} // already called back
      l.toString = function ()
      {
        return "Listener to [" + promise.toString() + "]";
      };

      return l;
    };
  };

  this.promise = function ()
  {
    return promise;
  };

  this.toString = function ()
  {
    return "Deferred";
  };
}

// A promise is a value that may not be available yet.
// Use onDone to get called back when value is available.
function Promise()
{
  this.toString = function ()
  {
    return "Promise";
  };
}

Promise.map = function (f, pa) // (a -> b) -> Promise a -> Promise b
{
  if (typeof f !== "function")
    throw new Error("First argument is not a function");

  if (!(pa instanceof Promise))
    throw new Error("Second argument is not a Promise");

  var d = new Deferred();

  pa.onDone(function (val)
  {
    var x;
    try
    {
      x = f(val);
    }
    catch (_)
    {
      // Promises don't have support for exceptions, yet
      return;
    }

    d.done(x);
  });

  var p = d.promise();
  p.toString = function ()
  {
    return pa.toString() + ".map(f)";
  };

  return p;
};

Promise.flatten = function (pp) // Promise (Promise a) -> Promise a
{
  if (!(pa instanceof Promise))
    throw new Error("First argument is not a Promise");

  var d = new Deferred();

  pp.onDone(function (pa)
  {
    pa.onDone(d.done);
  });

  var p = d.promise();
  p.toString = function ()
  {
    return pp.toString() + ".flatten()";
  };

  return d.promise();
};

// For convenience, functions as methods
Promise.prototype = {
  map: function (f)
  {
    return Promise.map(f, this);
  },

  flatten: function ()
  {
    return Promise.flatten(this);
  }
};

// Listener objects are returned by onDone and allow listeners to Promises to
// stop listening.
function Listener()
{
}

