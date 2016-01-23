'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.restoreFromCSV = restoreFromCSV;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _firebase = require('firebase');

var _firebase2 = _interopRequireDefault(_firebase);

var _fireproof = require('fireproof');

var _fireproof2 = _interopRequireDefault(_fireproof);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_fireproof2.default.promise = require('bluebird');

exports.default = function restore() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var all = _ref.all;
  var _ref$collections = _ref.collections;
  var collections = _ref$collections === undefined ? [] : _ref$collections;
  var _ref$firebase = _ref.firebase;
  var firebase = _ref$firebase === undefined ? '' : _ref$firebase;
  var secret = _ref.secret;
  var source = _ref.source;
  var override = _ref.override;
  var ref, authData, collection, filename;
  return regeneratorRuntime.async(function restore$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:

          // Get ref and authenticate
          ref = new _fireproof2.default(new _firebase2.default('https://' + firebase + '.firebaseio.com'));
          _context.next = 3;
          return regeneratorRuntime.awrap(ref.authWithCustomToken(secret));

        case 3:
          authData = _context.sent;

          source = _path2.default.resolve('.', source);

          // if(all) {
          //   collections = await ax.get(``)
          // }

        case 5:
          if (!(collections.length > 0)) {
            _context.next = 12;
            break;
          }

          collection = collections.shift(), filename = source + '/' + collection + '.csv';
          _context.next = 9;
          return regeneratorRuntime.awrap(restoreFromCSV({ ref: ref, filename: filename }));

        case 9:
          console.log('complete: ' + collection);
          _context.next = 5;
          break;

        case 12:

          process.exit(0);

        case 13:
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
  var _ref2$override = _ref2.override;
  var override = _ref2$override === undefined ? false : _ref2$override;
  var fileContents, rows, restoreRows, promises;
  return regeneratorRuntime.async(function restoreFromCSV$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          fileContents = _fs2.default.readFileSync(filename, 'utf8'), rows = fileContents.split('\n').filter(function (l) {
            return l.length > 0;
          });

        case 1:
          if (!(rows.length > 0)) {
            _context2.next = 7;
            break;
          }

          restoreRows = rows.splice(0, 100), promises = restoreRows.map(function (row) {
            var path = row.split(', ')[0].replace(/"/g, ""),
                value = row.split(', ')[1].replace(/"/g, "");
            return ref.child(path).set(value);
          });
          _context2.next = 5;
          return regeneratorRuntime.awrap(_bluebird2.default.all(promises));

        case 5:
          _context2.next = 1;
          break;

        case 7:
        case 'end':
          return _context2.stop();
      }
    }
  }, null, this);
}