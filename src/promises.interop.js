/*!
 * promises.interop.js
 *
 * Copyright (c) 2011, Tom Lokhorst
 * Released under BSD licence, see LICENSE file.
 */

;

Promise.create = function (f) // (() -> a) -> Promise a
{
  var d = new Deferred();

  setTimeout(function ()
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

