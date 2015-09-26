importScripts(
  'node_modules/lie/dist/lie.polyfill.min.js',
  'node_modules/dexie/dist/latest/Dexie.min.js',
  'node_modules/pouchdb/dist/pouchdb.min.js',
  'node_modules/lokijs/build/lokijs.min.js',
  'tester.js'
);

var tester = createTester();

self.addEventListener('message', function (e) {
  var dbType = e.data.dbType;
  var numDocs = e.data.numDocs;
  var action = e.data.action;

  if (action === 'cleanup') {
    tester.cleanup(function () {
      self.postMessage({
        done: true
      });
    });
  } else {
    var test = tester.getTest(dbType);
    var startTime = Date.now();
    test(numDocs, function () {
      var endTime = Date.now();
      var timeSpent = endTime - startTime;
      self.postMessage({
        timeSpent: timeSpent
      });
    });
  }

});