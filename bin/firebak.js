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

_commander2.default.version(_package2.default.version)
// Options that apply to all commands
.option('-f, --firebase <firebase>', 'All commands: Firebase name (e.g. myfirebase, not https://myfirebase.firebaseio.com)').option('-sc, --secret <secret>', 'All commands: Authentication secret for firebase. If not supplied, looks for process.env.FIREBASE_SECRET')
// Options that apply to only backup command
.option('-d, --destination <destDir>', 'Backup: destination directory for storing backups.')
// Options that apply to only restore command
.option('-s, --source <sourceDir>', 'Restore: directory where the files being restored are located.').option('-a, --all', 'Restore: restore all paths in the source directory.').option('-r, --rules', 'Restore: restore rules from the rules.json file in the source directory.').option('-o, --overwrite', 'Restore: overwrite values at an existing path. By default, restoring only sets a value if that path does not exist.');

// TODO: make firebase a required option
_commander2.default.command('backup [collections...]').description('backup a collection or all collections').action(function (collections) {
  try {
    (0, _backup2.default)({
      collections: collections,
      destination: _commander2.default.destination,
      firebase: _commander2.default.firebase,
      secret: _commander2.default.secret || process.env.FIREBASE_SECRET
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
      rules: _commander2.default.rules,
      secret: _commander2.default.secret || process.env.FIREBASE_SECRET,
      source: _commander2.default.source,
      overwrite: _commander2.default.overwrite
    });
  } catch (error) {
    console.error('error!', error.toString());
  }
});

_commander2.default.parse(process.argv);