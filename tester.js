function createTester() {
  'use strict';

  var pouch = new PouchDB('pouch_test');
  var pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
  var lokiDB = new loki.Collection('loki_test', {indices: ['id']});
  var dexieDB = new Dexie('dexie_test');
  dexieDB.version(1).stores({ docs: 'id'});
  dexieDB.open();
  var localForageDB;
  var localForageWebSQLDB;
  if (typeof localforage !== 'undefined') {
    localForageDB = localforage.createInstance({
      name: 'test_localforage'
    });
    var localForageWebSQLDB = localforage.createInstance({
      name: 'test_localforage_websql',
      driver: localforage.WEBSQL
    });
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

  function getTest(db) {
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
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    var lokiDocuments = lokiDB.find();
    for (var i = 0; i < lokiDocuments.length; i++) {
      lokiDB.remove(lokiDocuments[i]);
    }

    var promises = [
      Promise.resolve().then(function () {
        if (typeof localforage !== 'undefined') {
          return localForageDB.clear();
        }
      }),
      Promise.resolve().then(function () {
        if (typeof openDatabase !== 'undefined' &&
            typeof localforage !== 'undefined') {
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

  return {
    getTest: getTest,
    cleanup: cleanup
  }
}