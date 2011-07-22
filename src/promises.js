/*!
 * promises.js
 *
 * Copyright (c) 2011, Tom Lokhorst
 * Released under BSD licence, see LICENSE file.
 */

;

// A deferred is a value that can be resolved at a later time.
// The value can be observed via the promise object
function Deferred(onDone)
{
  onDone = onDone || function () {};
  if (typeof onDone !== "function")
    throw new Error("First argument is not a function");

  var value = undefined;
  var isDone = false;
  var doneCallbacks = [];
  var promise = new Promise();

  promise.onDone = function (cb)
  {
    if (typeof cb !== "function")
      throw new Error("Callback is not a function");

    doneCallbacks.push(cb);

    var stop = onDone() || function () {};

    var l = new Listener();
    l.stop = function ()
    {
      if (!doneCallbacks) return;

      var ix = doneCallbacks.indexOf(cb);
      if (ix > -1)
        doneCallbacks.splice(ix, 1);

      stop();
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

      var timeoutId = setTimeout(function ()
      {
        try
        {
          cb(value);
        }
        catch (_)
        {
          // ignore exception, to be consistent with original onDone
        }
      }, 0);

      var l = new Listener();
      l.stop = function ()
      {
        clearTimeout(timeoutId);
      };
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

// Listener objects are returned by onDone and allow listeners to Promises to
// stop listening.
function Listener()
{
}

Promise.map = function (f, pa) // (a -> b) -> Promise a -> Promise b
{
  if (typeof f !== "function")
    throw new Error("First argument is not a function");

  if (!(pa instanceof Promise))
    throw new Error("Second argument is not a Promise");

  var d = new Deferred(function ()
  {
    var l = pa.onDone(function (val)
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

    return function ()
    {
      l.stop();
    };
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
  if (!(pp instanceof Promise))
    throw new Error("First argument is not a Promise");

  var d = new Deferred(function ()
  {
    var l2;
    var l1 = pp.onDone(function (pa)
    {
      l2 = pa.onDone(d.done);
    });

    return function ()
    {
      l1.stop();
      if (l2)
        l2.stop();
    }
  });

  var p = d.promise();
  p.toString = function ()
  {
    return pp.toString() + ".flatten()";
  };

  return d.promise();
};

Promise.create = function (f) // (() -> a) -> Promise a
{
  var d = new Deferred(function ()
  {
    var timeoutId = setTimeout(function ()
    {
      var x;
      try
      {
        x = f();
      }
      catch (_)
      {
        // Promises don't have support for exceptions, yet
        return;
      }

      d.done(x);
    }, 0);

    return function ()
    {
      clearTimeout(timeoutId);
    }
  });

  var p = d.promise();
  p.toString = function ()
  {
    return "Promise.create(f)";
  };

  return p;
};

Promise.wait = function (ms) // Int -> Promise ()
{
  var d = new Deferred();
  setTimeout(function ()
  {
    d.done();
  }, ms);

  var p = d.promise();
  p.toString = function ()
  {
    return "Promise.wait(ms)";
  };

  return p;
};

Promise.delay = function (ms, pa) // Int -> Promise a -> Promise a
{
  var d = new Deferred(function ()
  {
    var l = pa.onDone(function (val)
    {
      setTimeout(function ()
      {
        d.done(val);
      }, ms);
    });

    return function ()
    {
      l.stop();
    };
  });

  var p = d.promise();
  p.toString = function ()
  {
    return pa.toString() + ".delay(ms)";
  };

  return p;
};

Promise.any = function (ps) // [Promise a] -> Promise a
{
  var d = new Deferred(function ()
  {
    var listeners = [];
    var f = function (val)
    {
      for (var i = 0, l = listeners.length; i < l; i++)
        listeners[i].stop();

      d.done(val);
    };

    for (var i = 0, l = ps.length; i < l; i++)
      listeners[i] = ps[i].onDone(f);

    return function ()
    {
      for (var i = 0, l = listeners.length; i < l; i++)
        listeners[i].stop();
    }
  });

  var p = d.promise();
  p.toString = function ()
  {
    return "Promise.any(...)";
  };

  return p;
}

Promise.all = function (ps) // [Promise a] -> Promise [a]
{
  var d = new Deferred(function ()
  {
    var vals = [];
    var nrDone = 0;

    var listeners = [];
    var f = function (ix, val)
    {
      vals[ix] = val;
      nrDone++;

      if (ps.length == nrDone)
        d.done(vals);
    };

    for (var i = 0, l = ps.length; i < l; i++)
      listeners[i] = ps[i].onDone(f.bind(null, i));

    return function ()
    {
      for (var i = 0, l = listeners.length; i < l; i++)
        listeners[i].stop();
    }
  });

  var p = d.promise();
  p.toString = function ()
  {
    return "Promise.any(...)";
  };

  return p;
}

// For convenience, functions as methods
Promise.prototype = {
  map: function (f)
  {
    return Promise.map(f, this);
  },

  flatten: function ()
  {
    return Promise.flatten(this);
  },

  delay: function (ms)
  {
    return Promise.delay(ms, this);
  }
};
