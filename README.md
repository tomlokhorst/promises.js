promises.js
===========

Experimental JavaScript library for futures/deferreds/delays/tasks/promises.

In the initial version there's no support yet for exceptions.

Example
-------

A very simple example. Prints '42' after two seconds.

    var p = Promise.create(function () { return 41 });
    var q = p.map(function (x) { return x + 1; })
             .delay(2000);
    
    q.onDone(function (x) { console.log(x) });

