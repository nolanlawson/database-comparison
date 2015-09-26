document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  var buttons = document.getElementsByTagName('button');
  var display = document.getElementById('display');
  var pouch = new PouchDB('pouch_test');
  var pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
  var lokiDB = new loki.Collection('loki_test', {indices: ['id']});
  var dexieDB = new Dexie('dexie_test');
  dexieDB.version(1).stores({ docs: 'id'});
  dexieDB.open();
  var localForageDB = localforage.createInstance({
    name: 'test_localforage'
  });
  var localForageWebSQLDB = localforage.createInstance({
    name: 'test_localforage_websql',
    driver: localforage.WEBSQL
  });

  function disableButtons() {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
    }
  }

  function enableButtons() {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  }

  function getChoice(name) {
    var choices = document.getElementsByName(name);
    for (var i = 0; i < choices.length; i++) {
      var choice = choices[i];
      if (choice.checked) {
        var label = document.querySelector('label[for=' + choice.id + ']').innerHTML;
        return {value: choice.value, label: label};
      }
    }
  }

  function createDoc() {
    return {
      data: Math.random()
    };
  }

  function regularObjectTest(numDocs, done) {
    var obj = {};
    for (var i = 0; i < numDocs; i++) {
      obj['doc_' + i] = createDoc();
    }
    done();
  }

  function localStorageTest(numDocs, done) {
    for (var i = 0; i < numDocs; i++) {
      localStorage['doc_' + i] = createDoc();
    }
    done();
  }

  function pouchTest(numDocs, done) {
    var docs = [];
    for (var i = 0; i < numDocs; i++) {
      var doc = createDoc();
      doc._id = 'doc_ ' + i;
      docs.push(doc);
    }
    pouch.bulkDocs(docs).then(done).catch(console.log.bind(console));
  }

  function pouchWebSQLTest(numDocs, done) {
    var docs = [];
    for (var i = 0; i < numDocs; i++) {
      var doc = createDoc();
      doc._id = 'doc_ ' + i;
      docs.push(doc);
    }
    pouchWebSQL.bulkDocs(docs).then(done).catch(console.log.bind(console));
  }

  function lokiTest(numDocs, done) {
    for (var i = 0; i < numDocs; i++) {
      var doc = createDoc();
      doc.id = 'doc_ ' + i;
      lokiDB.insert(doc);
    }
    done();
  }

  function localForageTest(numDocs, done) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      return localForageDB.setItem('doc_' + i, doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    promise.then(done).catch(console.log.bind(console));
  }

  function localForageWebSQLTest(numDocs, done) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      return localForageWebSQLDB.setItem('doc_' + i, doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    promise.then(done).catch(console.log.bind(console));
  }

  function dexieTest(numDocs, done) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc.id = 'doc_' + i;
      return dexieDB.docs.add(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    promise.then(done).catch(console.log.bind(console));
  }

  function getTestFor(db) {
    switch (db) {
      case 'regularObject':
        return regularObjectTest;
      case 'localStorage':
        return localStorageTest;
      case 'pouch':
        return pouchTest;
      case 'pouchWebSQL':
        return pouchWebSQLTest;
      case 'loki':
        return lokiTest;
      case 'localForage':
        return localForageTest;
      case 'localForageWebSQL':
        return localForageWebSQLTest;
      case 'dexie':
        return dexieTest;
    }
  }

  function cleanup(done) {
    localStorage.clear();
    var lokiDocuments = lokiDB.find();
    for (var i = 0; i < lokiDocuments.length; i++) {
      lokiDB.remove(lokiDocuments[i]);
    }

    var promises = [
      localForageDB.clear(),
      Promise.resolve().then(function () {
        if (typeof openDatabase !== 'undefined') {
          return localForageWebSQLDB.clear();
        }
      }),
      dexieDB.delete().then(function () {
        dexieDB = new Dexie('dexie_test');
        dexieDB.version(1).stores({ docs: 'id'});
        dexieDB.open();
      }),
      pouch.destroy().then(function () {
        pouch = new PouchDB('pouch_test');
      }),
      Promise.resolve().then(function () {
        if (!pouchWebSQL.adapter) {
          return Promise.resolve();
        }
        return pouchWebSQL.destroy().then(function () {

          pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
        });
      })
    ];

    Promise.all(promises).then(done).catch(console.log.bind(console));
  }

  function waitForUI(done) {
    display.getBoundingClientRect();
    requestAnimationFrame(function () {
      requestAnimationFrame(done);
    });
  }


  document.getElementById('insertButton').addEventListener('click', function () {
    disableButtons();
    var dbTypeChoice = getChoice('db');
    var numDocsChoice = getChoice('numDocs');
    var numDocs = parseInt(numDocsChoice.value, 10);

    display.innerHTML = 'Inserting ' + numDocs + ' docs using ' + dbTypeChoice.label + '...';

    var fun = getTestFor(dbTypeChoice.value);

    waitForUI(function () {
      var startTime = Date.now();
      fun(numDocs, function () {
        waitForUI(function () {
          var endTime = Date.now();
          display.innerHTML += "\nTook " + (endTime - startTime) + "ms";
          enableButtons();
        });
      });
    });
  });

  document.getElementById('deleteButton').addEventListener('click', function () {
    display.innerHTML = 'Deleting...';
    disableButtons();
    waitForUI(function () {
      cleanup(function () {
        waitForUI(function () {
          enableButtons();
          display.innerHTML += '\nDone.';
        });
      });
    });
  });
});