document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  var tester = createTester();
  var buttons = document.getElementsByTagName('button');
  var display = document.getElementById('display');
  var worker = new Worker('worker.js');

  function disableButtons(bool) {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = bool;
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

  function waitForUI(done) {
    display.getBoundingClientRect();
    requestAnimationFrame(function () {
      requestAnimationFrame(done);
    });
  }


  document.getElementById('insertButton').addEventListener('click', function () {
    disableButtons(true);
    var dbTypeChoice = getChoice('db');
    var numDocsChoice = getChoice('numDocs');
    var numDocs = parseInt(numDocsChoice.value, 10);
    var useWorker = getChoice('worker').value === 'true';
    display.innerHTML = 'Inserting ' + numDocs + ' docs using ' + dbTypeChoice.label + '...';

    function done(timeSpent) {
      display.innerHTML += "\nTook " + timeSpent + "ms";
      disableButtons(false);
    }

    waitForUI(function () {
      if (useWorker) {
        worker.addEventListener('message', function listener(e) {
          worker.removeEventListener('message', listener);
          done(e.data.timeSpent);
        });
        worker.postMessage({
          action: 'test',
          dbType: dbTypeChoice.value,
          numDocs: numDocs
        });
      } else {
        var fun = tester.getTest(dbTypeChoice.value);
        var startTime = Date.now();
        fun(numDocs, function () {
          var endTime = Date.now();
          var timeSpent = endTime - startTime;
          done(timeSpent);
        });
      }
    });
  });

  document.getElementById('deleteButton').addEventListener('click', function () {
    display.innerHTML = 'Deleting...';
    disableButtons(true);
    var useWorker = getChoice('worker').value === 'true';

    waitForUI(function () {

      function done() {
        disableButtons(false);
        display.innerHTML += '\nDone.';
      }

      if (useWorker) {
        worker.addEventListener('message', function listener(e) {
          worker.removeEventListener('message', listener);
          done();
        });
        worker.postMessage({
          action: 'cleanup'
        });
      } else {
        tester.cleanup(done);
      }
    });
  });
});