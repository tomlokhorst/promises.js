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
  }

  promise.isDone = function ()
  {
    return isDone;
  }

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

      cb(value);
    }
  }

  this.promise = function ()
  {
    return promise;
  }

  this.toString = function ()
  {
    return "Deferred";
  }
}

// A promise is a value that may not be available yet.
// Use onDone to get called back when value is available.
function Promise()
{
}

