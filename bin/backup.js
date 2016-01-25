'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _lodash = require('lodash');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _objectSizeof = require('object-sizeof');

var _objectSizeof2 = _interopRequireDefault(_objectSizeof);

var _cliTable = require('cli-table');

var _cliTable2 = _interopRequireDefault(_cliTable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Backup command function
 * Creates the list of firebase collections if it wasn't passed or if the all argument was specified.
 * Creates the destination directory structure.
 * Loops over the collections and call collectionToJSONFile on each one.
 * @param  {[spec]} {                         firebase         =             ''            [description]
 * @param  {[spec]} secret      =             ''               [description]
 * @param  {[spec]} collections =             []               [description]
 * @param  {[spec]} all         =             false            [description]
 * @param  {[spec]} destination =             `./backups/${new Date(         [description]
 * @return {[spec]}             [description]
 */

exports.default = function backup() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var _ref$firebase = _ref.firebase;
  var firebase = _ref$firebase === undefined ? '' : _ref$firebase;
  var _ref$secret = _ref.secret;
  var secret = _ref$secret === undefined ? '' : _ref$secret;
  var _ref$collections = _ref.collections;
  var collections = _ref$collections === undefined ? [] : _ref$collections;
  var _ref$destination = _ref.destination;
  var destination = _ref$destination === undefined ? './backups/' + new Date().getFullYear() + '.' + ('0' + (new Date().getMonth() + 1)).slice(-2) + '.' + ('0' + new Date().getDate()).slice(-2) + '.' + new Date().getHours() : _ref$destination;

  var maxRequestSize, totalRequestSize, totalObjects, totalDuration, backupRules, dirs, currentDir, introTable, _backup, filename, t1, result, t2, tableComplete, table;

  return regeneratorRuntime.async(function backup$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          maxRequestSize = 0, totalRequestSize = 0, totalObjects = 0, totalDuration = 0;

          // By default, use all of the backup rules that are found in the rules file.

          _context.next = 3;
          return regeneratorRuntime.awrap(getBackupRules({ firebase: firebase, secret: secret }));

        case 3:
          backupRules = _context.sent;

          // If collections are specified, keep only the backup
          // rules that match a collection name.
          if (collections.length > 0) {
            backupRules = backupRules.filter(function (b) {
              var matches = collections.filter(function (collection) {
                return collection === b.path;
              });
              if (matches.length > 0) return b;
            });
          }

          // Create the destination directory if it doesn't exist.
          destination = _path2.default.resolve('.', destination);
          dirs = destination.split('/'), currentDir = '';

          while (dirs.length > 0) {
            currentDir += dirs.shift() + '/';
            if (!_fs2.default.existsSync(currentDir)) _fs2.default.mkdirSync(currentDir);
          }

          introTable = new _cliTable2.default();

          introTable.push({ 'date/time': new Date().toLocaleString() });
          console.info('\n >> Firebak: Backup');
          console.info(introTable.toString());

          // Backup the rules
          console.info(' >> Backup starting: rules');
          _context.next = 15;
          return regeneratorRuntime.awrap(backupSecurityAndRules({ firebase: firebase, secret: secret, filename: destination + '/rules.json' }));

        case 15:
          console.info(' >> Backup complete: rules\n\n');

          // Loop through the backup rules using a while loop.
          // Take the first rule on each iteration.
          // Using a while loop so that the await keyword is respected.
          // A for-each loop would launch all of the shardedBackupToFile
          // functions concurrently.

        case 16:
          if (!(backupRules.length > 0)) {
            _context.next = 34;
            break;
          }

          _backup = backupRules.shift();

          console.info(' >> Backup starting: ' + _backup.path);

          filename = destination + '/' + _backup.path + '.csv';
          t1 = new Date().getTime();
          _context.next = 23;
          return regeneratorRuntime.awrap(shardedBackupToFile({ path: _backup.path, rule: _backup.rule, secret: secret, firebase: firebase, filename: filename }));

        case 23:
          result = _context.sent;
          t2 = new Date().getTime(), tableComplete = new _cliTable2.default();

          tableComplete.push({ 'file': filename }, { 'rule': _backup.rule }, { 'duration (sec)': (t2 - t1) / 1000 }, { 'max request size (mb)': result.maxRequestSize / 1000000 }, { 'total request size (mb)': result.totalRequestSize / 1000000 }, { 'total objects (not counting nested)': result.totalObjects });

          console.info(' >> Backup complete: ' + _backup.path);
          console.info(tableComplete.toString() + '\n\n');

          // Update aggregate sizes
          maxRequestSize = Math.max(maxRequestSize, result.maxRequestSize);
          totalRequestSize += result.totalRequestSize;
          totalObjects += result.totalObjects;
          totalDuration += (t2 - t1) / 1000;
          _context.next = 16;
          break;

        case 34:
          table = new _cliTable2.default();

          table.push({ 'total duration (sec)': totalDuration }, { 'max request size (mb)': maxRequestSize / 1000000 }, { 'total request size (mb)': totalRequestSize / 1000000 }, { 'total objects (not counting nested)': totalObjects });
          console.info(' >> Backup complete: all collections');
          console.info(table.toString());

        case 38:
        case 'end':
          return _context.stop();
      }
    }
  }, null, this);
};

function shardedBackupToFile(_ref2) {
  var _this = this;

  var firebase = _ref2.firebase;
  var path = _ref2.path;
  var rule = _ref2.rule;
  var secret = _ref2.secret;
  var filename = _ref2.filename;

  var limitToFirst, allKeys, store, startAt, count, maxRequestSize, totalRequestSize, storeToFile, _loop;

  return regeneratorRuntime.async(function shardedBackupToFile$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          storeToFile = function storeToFile() {
            var paths = (0, _lodash.keys)(store),

            // Important that there be no space
            csvLines = paths.map(function (path) {
              return '"' + path + '","' + store[path] + '"';
            });
            _fs2.default.appendFileSync(filename, csvLines.join('\n'), 'utf8');
            store = {};
          };

          // Define parameters for retrieving from the REST API
          // limitToFirst must be >= 2, otherwise it will retrieve the same data every time.
          limitToFirst = Math.max(parseInt(rule.split(':')[2]), 2), allKeys = {};
          store = {}, startAt = "", count = limitToFirst, maxRequestSize = 0, totalRequestSize = 0;

          // Function for appending the store object data to the CSV file
          // Writes each key in the store object as the first col and the value as the second col.
          // Then clear the store

          // Write initial line to file (must use write, not append)
          // Important that there be no space
          _fs2.default.writeFileSync(filename, '"path","value"\n', 'utf8');

          // Call the REST API until you receive fewer results than limitToFirst

          _loop = function _callee() {
            var result, dataKeys, requestSize;
            return regeneratorRuntime.async(function _callee$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return regeneratorRuntime.awrap(_axios2.default.get('https://' + firebase + '.firebaseio.com/' + path + '.json', {
                      params: {
                        auth: secret,
                        format: 'export',
                        orderBy: '"$key"',
                        startAt: '"' + startAt + '"',
                        limitToFirst: limitToFirst
                      }
                    }));

                  case 2:
                    result = _context2.sent;
                    dataKeys = (0, _lodash.keys)(result.data), requestSize = (0, _objectSizeof2.default)(result.data);

                    // Update bookkeeping stuff.

                    maxRequestSize = Math.max(maxRequestSize, requestSize);
                    totalRequestSize += requestSize;
                    dataKeys.forEach(function (key) {
                      return allKeys[key] = true;
                    });

                    // The returned objects are located in result.data.
                    // Flatten each of the returned objects and store it in the store
                    dataKeys.forEach(function (key) {
                      var flat = flattenObject(result.data[key], path + '/' + key);
                      (0, _lodash.keys)(flat).forEach(function (key) {
                        return store[key] = flat[key];
                      });
                    });

                    // If there are more than 200 objects stored, call storeToFile()
                    if ((0, _lodash.keys)(store).length > 200) storeToFile();

                    // Update count and startAt for next loop
                    count = dataKeys.length;
                    startAt = dataKeys.sort().pop();

                  case 11:
                  case 'end':
                    return _context2.stop();
                }
              }
            }, null, _this);
          };

        case 5:
          if (!(count === limitToFirst)) {
            _context3.next = 10;
            break;
          }

          _context3.next = 8;
          return regeneratorRuntime.awrap(_loop());

        case 8:
          _context3.next = 5;
          break;

        case 10:

          // Store the remainder and log some info
          storeToFile();

          // return the request sizes
          return _context3.abrupt('return', { maxRequestSize: maxRequestSize, totalRequestSize: totalRequestSize, totalObjects: (0, _lodash.keys)(allKeys).length });

        case 12:
        case 'end':
          return _context3.stop();
      }
    }
  }, null, this);
}

function backupSecurityAndRules(_ref3) {
  var firebase = _ref3.firebase;
  var secret = _ref3.secret;
  var filename = _ref3.filename;
  var rulesResult;
  return regeneratorRuntime.async(function backupSecurityAndRules$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(_axios2.default.get('https://' + firebase + '.firebaseio.com/.settings/rules/.json', {
            params: {
              auth: secret
            }
          }));

        case 2:
          rulesResult = _context4.sent;

          _fs2.default.writeFileSync(filename, JSON.stringify(rulesResult.data, null, 2), 'utf8');

        case 4:
        case 'end':
          return _context4.stop();
      }
    }
  }, null, this);
}

/**
 * Retrieves the security/validation rules for the specified firebase.
 * Looks for keys with string "firebak:", because these define backup rules.
 * Returns all of the paths that should be backed up.
 * @param  {[type]} {      firebase      [description]
 * @param  {[type]} secret }             [description]
 * @return {[type]}        [description]
 */
function getBackupRules(_ref4) {
  var firebase = _ref4.firebase;
  var secret = _ref4.secret;
  var rulesResult, rulesString, rulesObject, backupPaths, findBackupPaths;
  return regeneratorRuntime.async(function getBackupRules$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          findBackupPaths = function findBackupPaths(object) {
            var path = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

            if (path.indexOf('firebak:') > -1) {
              backupPaths.push(path);
            }
            (0, _lodash.keys)(object).forEach(function (key) {
              if (_typeof(object[key]) === 'object') {
                findBackupPaths(object[key], path + '/' + key);
              }
            });
          };

          _context5.next = 3;
          return regeneratorRuntime.awrap(_axios2.default.get('https://' + firebase + '.firebaseio.com/.settings/rules/.json', {
            params: {
              auth: secret
            }
          }));

        case 3:
          rulesResult = _context5.sent;

          // Convert the rules to an array, remove any comments per line,
          // and convert back to a string (JSON format).
          rulesString = rulesResult.data.split('\n').map(function (line) {
            if (line.indexOf('//') > -1) {
              line = line.slice(0, line.indexOf('//'));
            }
            if (line.indexOf('/*') > -1) {
              var head = line.slice(0, line.indexOf('/*')),
                  tail = line.slice(line.indexOf('*/') + 2, line.length);
              return head + tail;
            }
            return line;
          }).join('');

          // Rules are now in parseable JSON format, convert rules to an object

          rulesObject = JSON.parse(rulesString);

          // Recursively visit all paths in the rules object.
          // Push any paths containing 'firebak:' into the backupPaths array.
          // This is similar but not quite the same as flattenObject function.

          backupPaths = [];

          findBackupPaths(rulesObject.rules);

          /* Sample backupPaths after calling findBackupPaths():
            [ '/users/firebak:shard:20',
            '/user-settings/firebak:shard:20',
            '/courses/firebak:shard:20',
            '/universities/firebak:shard:20',
            '/rooms/firebak:shard:10',
            '/room-messages/firebak:shard:1' ] */

          // Return an array of objects with form { children: 'some/path/to/children', rule: 'firebak:shard:10' }
          return _context5.abrupt('return', backupPaths.map(function (bp) {
            var split = bp.split('/').filter(function (s) {
              return s.length > 0;
            });
            return {
              path: split.splice(0, Math.max(1, split.length - 1)).join('/'),
              rule: split.pop()
            };
          }));

        case 9:
        case 'end':
          return _context5.stop();
      }
    }
  }, null, this);
}

// Flatten a passed object into a return object where each key in the return object
// is the path to the corresponding data in the passed object.
// e.g. { a: { b: 1 } } becomes { 'a/b': 1 }
function flattenObject(object) {
  var path = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

  var flat = {};
  function visitChildren(innerObject, innerPath) {
    (0, _lodash.keys)(innerObject).forEach(function (key) {
      if (_typeof(innerObject[key]) === 'object') {
        visitChildren(innerObject[key], innerPath + '/' + key);
      } else {
        flat[innerPath + '/' + key] = innerObject[key];
      }
    });
  }
  visitChildren(object, path);
  return flat;
}