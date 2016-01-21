'use strict';
Promise = require('bluebird');
Promise.onPossiblyUnhandledRejection(function (error) { throw error; });
import program from 'commander';
import pkg from '../package.json';
import backup from './backup';
import restore from './restore';

program.version(pkg.version)
  .option('-f, --firebase <firebase>', 'Firebase against which the program executes. Same as firebase CLI.')
  .option('-a, --all', 'Backup all collections.')
  .option('-s, --source <sourceDir>', 'Source JSON file for restoring a collection.')
  .option('-d, --destination <destDir>', 'Destination directory for storing backups.')
  .option('--secret <auth>', 'Authentication secret for firebase. If not supplied, looks for process.env.FIREBASE_SECRET');

// TODO: make firebase a required option

program.command('backup [collections...]')
  .description('backup a collection or all collections')
  .action((collections) => {
    try {
      backup({
        all: program.all,
        collections,
        destination: program.destination,
        firebase: program.firebase,
        secret: program.secret
      });
    } catch(error) {
      console.error(error);
    }
  });

program.command('restore')
  .description('restore a collection')
  .action((cmd) => {
    console.log('TODO :)');
  });

program.parse(process.argv)
