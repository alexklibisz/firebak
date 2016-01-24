'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.restoreFromCSV = restoreFromCSV;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function restore() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref$all = _ref.all;
  var all = _ref$all === undefined ? false : _ref$all;
  var _ref$collections = _ref.collections;
  var collections = _ref$collections === undefined ? [] : _ref$collections;
  var _ref$firebase = _ref.firebase;
  var firebase = _ref$firebase === undefined ? '' : _ref$firebase;
  var _ref$rules = _ref.rules;
  var rules = _ref$rules === undefined ? false : _ref$rules;
  var secret = _ref.secret;
  var source = _ref.source;
  var overwrite = _ref.overwrite;

  var ref, authData, introTable, dir, _rules, collection, filename;

  return regeneratorRuntime.async(function restore$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          ref = new _firebase2.default('https://' + firebase + '.firebaseio.com');
          _context.next = 3;
          return regeneratorRuntime.awrap(ref.authWithCustomToken(secret));

        case 3:
          authData = _context.sent;

          // Some info to start
          introTable = new _cliTable2.default();

          introTable.push({ 'date/time': new Date().toLocaleString() });
          console.info('\n >> Firebak: restore');
          console.info(introTable.toString());

          source = _path2.default.resolve('.', source);

          // If the all argument is true, map each of the csv files
          // in the source directory to a collection.
          // e.g. user.csv becomes the users collection.
          if (all) {
            dir = _fs2.default.readdirSync(source);

            collections = dir.filter(function (f) {
              return f.endsWith('.csv');
            }).map(function (f) {
              return f.split('.').shift();
            });
          }

          // Restore rules

          if (!rules) {
            _context.next = 16;
            break;
          }

          console.info(' >> Restore starting: rules');
          _rules = require(source + '/rules.json');
          _context.next = 15;
          return regeneratorRuntime.awrap(_axios2.default.put('https://' + firebase + '.firebaseio.com/.settings/rules/.json', _rules, {
            params: {
              auth: secret
            }
          }));

        case 15:
          console.info(' >> Restore complete: rules');

        case 16:
          if (!(collections.length > 0)) {
            _context.next = 24;
            break;
          }

          collection = collections.shift(), filename = source + '/' + collection + '.csv';

          console.log(' >> Restore starting: ' + collection);
          _context.next = 21;
          return regeneratorRuntime.awrap(restoreFromCSV({ ref: ref, filename: filename, overwrite: overwrite }));

        case 21:
          console.log(' >> Restore complete: ' + collection + '\n');
          _context.next = 16;
          break;

        case 24:

          // Force exit because otherwise the Firebase
          // ref remains open and causes the program to hang
          ref.unauth();
          process.exit(0);

        case 26:
        case 'end':
          return _context.stop();
      }
    }
  }, null, this);
};

/**
 * Reads in a CSV file and uses the paths and values in the file
 * to set the corresponding paths and values in Firebase.
 *
 * By default it only sets values if no value can be found (null)
 * at its path. The override parameter can be passed to set the value
 * regardless.
 * @param  {[type]} {   filename      [description]
 * @param  {[type]} ref }             =             {} [description]
 * @return {[type]}     [description]
 */

function restoreFromCSV() {
  var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var filename = _ref2.filename;
  var ref = _ref2.ref;
  var _ref2$overwrite = _ref2.overwrite;
  var overwrite = _ref2$overwrite === undefined ? false : _ref2$overwrite;
  var setIfNull, converter, fileContents, promises;
  return regeneratorRuntime.async(function restoreFromCSV$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          setIfNull = function setIfNull(path, value) {
            var existingValue;
            return regeneratorRuntime.async(function setIfNull$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(ref.child(path).once('value').then(function (snap) {
                      return snap.val();
                    }));

                  case 2:
                    existingValue = _context2.sent;

                    if (!(existingValue === null)) {
                      _context2.next = 9;
                      break;
                    }

                    _context2.next = 6;
                    return regeneratorRuntime.awrap(ref.child(path).set(value));

                  case 6:
                    return _context2.abrupt('return', _context2.sent);

                  case 9:
                    return _context2.abrupt('return', existingValue);

                  case 10:
                  case 'end':
                    return _context2.stop();
                }
              }
            }, null, this);
          };

          // Function checks if there is already a value at the given path.
          // If there is a value, it does nothing. If there is no value (null),
          // it sets a value at that path.

          converter = new (require("csvtojson").Converter)();
          _context3.next = 4;
          return regeneratorRuntime.awrap(new _bluebird2.default(function (resolve, reject) {
            converter.fromFile(filename, function (error, result) {
              if (error) reject(error);else resolve(result);
            });
          }));

        case 4:
          fileContents = _context3.sent;

        case 5:
          if (!(fileContents.length > 0)) {
            _context3.next = 11;
            break;
          }

          promises = fileContents.splice(0, 100).map(function (object) {
            var path = object.path;
            var value = object.value;

            if (overwrite) {
              return ref.child(path).set(value);
            } else {
              return setIfNull(path, value);
            }
          });
          _context3.next = 9;
          return regeneratorRuntime.awrap(_bluebird2.default.all(promises));

        case 9:
          _context3.next = 5;
          break;

        case 11:
        case 'end':
          return _context3.stop();
      }
    }
  }, null, this);
}