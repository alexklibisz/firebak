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
    console.log(program.auth);
    console.log('restore');
  });

program.parse(process.argv)

// console.log(program);

// import ax from 'axios';
// import {keys, assign} from 'lodash';
// import fs from 'fs';
//
// const secret = process.env.FIREBASE_SECRET;
// const url = 'https://studyloop-stage.firebaseio.com';
//
//
// async function collectionToFile(collection, fileName) {
//   console.log(`${collection} started`);
//   fs.writeFileSync(fileName, '{', 'utf8');
//   let startAt = 0, limitTo = 50, length = limitTo;
//   while (length === limitTo) {
//     const res = await ax.get(`${url}/${collection}.json?auth=${secret}&orderBy="$key"&startAt="${startAt}"&limitTo="${limitTo}"`);
//     const items = keys(res.data).map(key => `"${key}": ${JSON.stringify(res.data[key])}`).join();
//     fs.appendFileSync(fileName, items, 'utf8');
//     length = keys(res.data).length;
//     startAt = startAt + limitTo;
//   }
//   fs.appendFileSync(fileName, '}', 'utf8');
//   console.log(`${collection} finished`);
// }
//
// async function main() {
//
//   const res = await ax.get(`${url}/.json?format=export&auth=${secret}&shallow=true`);
//   const collections = keys(res.data);
//
//   collections.forEach(async (collection) => collectionToFile(collection, `back-${collection}.json`));
//
// }
//
// main();
