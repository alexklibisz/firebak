#!/usr/bin/env node

'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

var _backup = require('./backup');

var _backup2 = _interopRequireDefault(_backup);

var _restore = require('./restore');

var _restore2 = _interopRequireDefault(_restore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-polyfill');
Promise = require('bluebird');
Promise.onPossiblyUnhandledRejection(function (error) {
  console.error(JSON.stringify(error));throw error;
});

_commander2.default.version(_package2.default.version).option('-f, --firebase <firebase>', 'Firebase against which the program executes. Same as firebase CLI.').option('-a, --all', 'Backup all collections.').option('-s, --source <sourceDir>', 'Source JSON file for restoring a collection.').option('-d, --destination <destDir>', 'Destination directory for storing backups.').option('--secret <auth>', 'Authentication secret for firebase. If not supplied, looks for process.env.FIREBASE_SECRET');

// TODO: make firebase a required option
_commander2.default.command('backup [collections...]').description('backup a collection or all collections').action(function (collections) {
  try {
    (0, _backup2.default)({
      all: _commander2.default.all,
      collections: collections,
      destination: _commander2.default.destination,
      firebase: _commander2.default.firebase,
      secret: _commander2.default.secret
    });
  } catch (error) {
    console.error('error!', error.toString());
  }
});

_commander2.default.command('restore [collections...]').description('restore a collection').action(function (collections) {
  try {
    (0, _restore2.default)({
      all: _commander2.default.all,
      collections: collections,
      firebase: _commander2.default.firebase,
      secret: _commander2.default.secret,
      source: _commander2.default.source
    });
  } catch (error) {
    console.error('error!', error.toString());
  }
});

_commander2.default.parse(process.argv);