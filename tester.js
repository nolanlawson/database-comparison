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

  function regularObjectTest(numDocs) {
    var obj = {};
    for (var i = 0; i < numDocs; i++) {
      obj['doc_' + i] = createDoc();
    }
  }

  function localStorageTest(numDocs) {
    for (var i = 0; i < numDocs; i++) {
      localStorage['doc_' + i] = createDoc();
    }
  }

  function pouchTest(numDocs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc._id = 'doc_' + i;
      return pouch.put(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function pouchWebSQLTest(numDocs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc._id = 'doc_' + i;
      return pouchWebSQL.put(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function lokiTest(numDocs) {
    for (var i = 0; i < numDocs; i++) {
      var doc = createDoc();
      doc.id = 'doc_ ' + i;
      lokiDB.insert(doc);
    }
  }

  function localForageTest(numDocs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      return localForageDB.setItem('doc_' + i, doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function localForageWebSQLTest(numDocs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      return localForageWebSQLDB.setItem('doc_' + i, doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function dexieTest(numDocs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      var doc = createDoc();
      doc.id = 'doc_' + i;
      return dexieDB.docs.add(doc);
    }
    for (var i = 0; i < numDocs; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function idbTest(numDocs) {
    return Promise.resolve().then(function () {
      if (openIndexedDBReq) {
        // reuse the same event to avoid onblocked when deleting
        return openIndexedDBReq.result;
      }
      return new Promise(function (resolve, reject) {
        var req = openIndexedDBReq = indexedDB.open('test_idb', 1);
        req.onblocked = reject;
        req.onerror = reject;
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          db.createObjectStore('docs', {keyPath: 'id'});
        };
        req.onsuccess = function (e) {
          var db = e.target.result;
          resolve(db);
        };
      });
    }).then(function (db) {
      return new Promise(function (resolve, reject) {
        var txn = db.transaction('docs', 'readwrite');
        var oStore = txn.objectStore('docs');
        for (var i = 0; i < numDocs; i++) {
          var doc = createDoc();
          doc.id = 'doc_' + i;
          oStore.put(doc);
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
        txn.onblocked = reject;
      });
    });
  }

  function webSQLTest(numDocs) {
    return Promise.resolve().then(function () {
      if (webSQLDB) {
        return;
      }
      return new Promise(function (resolve, reject) {
        webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function (txn) {
          txn.executeSql(
            'create table if not exists docs (id text unique, json text);');
        }, reject, resolve);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        webSQLDB.transaction(function (txn) {
          for (var i = 0; i < numDocs; i++) {
            var id = 'doc_' + i;
            var doc = createDoc();
            txn.executeSql(
              'insert or replace into docs (id, json) values (?, ?);', [
                id, JSON.stringify(doc)
              ]);
          }
        }, reject, resolve);
      });
    });
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


  function cleanup() {
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

    return Promise.all(promises);
  }

  return {
    getTest: getTest,
    cleanup: cleanup
  }
}