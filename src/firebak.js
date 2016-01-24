#!/usr/bin/env node
'use strict';
require('babel-polyfill');
Promise = require('bluebird');
Promise.onPossiblyUnhandledRejection(function (error) { console.error(JSON.stringify(error)); throw error; });
import program from 'commander';
import pkg from '../package.json';
import backup from './backup';
import restore from './restore';

program.version(pkg.version)
  // Options that apply to all commands
  .option('-f, --firebase <firebase>', 'All commands: Firebase name (e.g. myfirebase, not https://myfirebase.firebaseio.com)')
  .option('-sc, --secret <secret>', 'All commands: Authentication secret for firebase. If not supplied, looks for process.env.FIREBASE_SECRET')
  // Options that apply to only backup command
  .option('-d, --destination <destDir>', 'Backup: destination directory for storing backups.')
  // Options that apply to only restore command
  .option('-s, --source <sourceDir>', 'Restore: directory where the files being restored are located.')
  .option('-a, --all', 'Restore: restore all paths in the source directory.')
  .option('-r, --rules', 'Restore: restore rules from the rules.json file in the source directory.')
  .option('-o, --overwrite', 'Restore: overwrite values at an existing path. By default, restoring only sets a value if that path does not exist.');

// TODO: make firebase a required option
program.command('backup [collections...]')
  .description('backup a collection or all collections')
  .action((collections) => {
    try {
      backup({
        collections,
        destination: program.destination,
        firebase: program.firebase,
        secret: program.secret || process.env.FIREBASE_SECRET
      });
    } catch(error) {
      console.error('error!', error.toString());
    }
  });

program.command('restore [collections...]')
  .description('restore a collection')
  .action((collections) => {
    try {
      restore({
        all: program.all,
        collections,
        firebase: program.firebase,
        rules: program.rules,
        secret: program.secret || process.env.FIREBASE_SECRET,
        source: program.source,
        overwrite: program.overwrite
      });
    } catch(error) {
      console.error('error!', error.toString());
    }
  });

program.parse(process.argv)
