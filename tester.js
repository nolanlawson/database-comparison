function createTester() {
  'use strict';

  var pouch = new PouchDB('pouch_test');
  var pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
  var lokiDB = new loki.Collection('loki_test', {indices: ['id']});
  var dexieDB = new Dexie('dexie_test');
  dexieDB.version(1).stores({docs: 'id'});
  dexieDB.open();
  var openIndexedDBReq;
  var webSQLDB;
  var localForageDB;
  var localForageWebSQLDB;
  if (typeof localforage !== 'undefined') {
    localForageDB = localforage.createInstance({
      name: 'test_localforage'
    });
    localForageWebSQLDB = localforage.createInstance({
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
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc._id = 'doc_' + i;
      return pouch.put(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    promise.then(done).catch(console.log.bind(console));
  }

  function pouchWebSQLTest(numDocs, done) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc._id = 'doc_' + i;
      return pouchWebSQL.put(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    promise.then(done).catch(console.log.bind(console));
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

  function idbTest(numDocs, done) {

    function onDBReady(db) {
      var txn = db.transaction('docs', 'readwrite');
      var oStore = txn.objectStore('docs');
      for (var i = 0; i < numDocs; i++) {
        var doc = createDoc();
        doc.id = 'doc_' + i;
        oStore.put(doc);
      }
      txn.oncomplete = done;
    }

    if (openIndexedDBReq) {
      // reuse the same event to avoid onblocked when deleting
      onDBReady(openIndexedDBReq.result);
    } else {
      var req = openIndexedDBReq = indexedDB.open('test_idb', 1);
      req.onsuccess = function (e) {
        var db = e.target.result;
        onDBReady(db);

      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        db.createObjectStore('docs', {keyPath: 'id'});
      }
    }
  }

  function webSQLTest(numDocs, done) {

    function onReady() {
      webSQLDB.transaction(function (txn) {
        for (var i = 0; i < numDocs; i++) {
          var id = 'doc_' + i;
          var doc = createDoc();
          txn.executeSql('insert or replace into docs (id, json) values (?, ?);', [
            id, JSON.stringify(doc)
          ]);
        }
      }, console.log.bind(console), done);
    }

    if (webSQLDB) {
      onReady();
    } else {
      webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
      webSQLDB.transaction(function (txn) {
        txn.executeSql('create table if not exists docs (id text unique, json text);');
      }, console.log.bind(console), onReady);
    }
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
      case 'idb':
        return idbTest;
      case 'webSQL':
        return webSQLTest;
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
      new Promise(function (resolve, reject) {
        if (typeof openDatabase === 'undefined') {
          return resolve();
        }
        var webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function (txn) {
          txn.executeSql('delete from docs;');
        }, resolve, resolve);
      }),
      new Promise(function (resolve, reject) {
        if (openIndexedDBReq) {
          openIndexedDBReq.result.close();
        }
        var req = indexedDB.deleteDatabase('test_idb');
        req.onsuccess = resolve;
        req.onerror = reject;
        req.onblocked = reject;
      }),
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