'use strict';
import ax from 'axios';
import {keys, zip, values} from 'lodash';
import fs from 'fs';
import Promise from 'bluebird';

/**
 * backup function
 * Creates the list of firebase collections if it wasn't passed or if the all argument was specified.
 * Creates the destination directory structure.
 * Loops over the collections and call collectionToJSONFile on each one.
 * @param  {[type]} {                         firebase         =             ''            [description]
 * @param  {[type]} secret      =             ''               [description]
 * @param  {[type]} collections =             []               [description]
 * @param  {[type]} all         =             false            [description]
 * @param  {[type]} destination =             `./backups/${new Date(         [description]
 * @return {[type]}             [description]
 */
export default async function backup({
  firebase = '',
  secret = '',
  collections = [],
  all = false,
  destination = `./backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getHours()}`
} = {}) {

  const backups = await getBackupsFromRules({ firebase, secret });

  // Create the destination directory if it doesn't exist.
  let dirs = destination.split('/'), currentDir = '';
  while(dirs.length > 0) {
    currentDir += dirs.shift() + '/'
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir);
  }

  while(backups.length > 0) {
    const backup = backups.shift();
    const filename = `${destination}/${backup.path}.csv`;
    await shardedBackupToFile({ path: backup.path, type: backup.type, secret, firebase, filename });
  }
}

// Flatten an object into a new object where each key
// is the path to the corresponding data in the first object.
// e.g. { a: { b: 1 } } becomes { 'a/b': 1 }
function flattenObject(object, path) {
  const flat = {};
  function visitChildren(innerObject, innerPath) {
    Object.keys(innerObject).forEach(key => {
      if(typeof innerObject[key] === 'object') {
        visitChildren(innerObject[key], `${innerPath}/${key}`);
      } else {
        flat[`${innerPath}/${key}`] = innerObject[key];
      }
    });
  }
  visitChildren(object, path);
  return flat;
}

async function shardedBackupToFile({ firebase, path, type, secret, filename }) {
  const limitToFirst = parseInt(type.split(':')[2]);
  let startAt = "";
  let count = limitToFirst;
  let store = {};

  // Function for appending the store object data to file
  function storeToFile() {
    const paths = Object.keys(store);
    const csvLines = paths.map(path => `"${path}", "${store[path]}"`);
    fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
    store = {};
  }

  // Write initial line to file (write not append is important)
  fs.writeFileSync(filename, '"path", "object"\n');

  while(count === limitToFirst) {
    const result = await ax.get(`https://${firebase}.firebaseio.com/${path}.json`, {
      params: {
        auth: secret,
        format: `export`,
        orderBy: `"$key"`,
        startAt: `"${startAt}"`,
        limitToFirst
      }
    });

    // Flatten each of the returned objects and store it in the store
    keys(result.data).forEach(key => {
      const flat = flattenObject(result.data[key], `${path}/${key}`);
      keys(flat).forEach(key => store[key] = flat[key]);
    });

    // If there are more than 200 objects stored, call storeToFile()
    if (keys(store).length > 200) storeToFile();

    // Update count and startAt for next loop
    count = keys(result.data).length;
    startAt = keys(result.data).sort().pop();

    // Log some output for info.
    console.log(path, count, startAt);
  }

  // Store the remainder
  storeToFile();

}

async function getBackupsFromRules({ firebase, secret }) {
  // Fetch the rules
  const rulesResult = await ax.get(`https://${firebase}.firebaseio.com/.settings/rules/.json`, {
    params: {
      auth: secret
    }
  });

  // Convert the rules to an array,
  // Remove any comments for each line,
  // Convert back to a string
  const rulesString = rulesResult.data.split('\n')
    .map(line => {
      if (line.indexOf('//') > -1) {
        line = line.slice(0, line.indexOf('//'));
      }
      if (line.indexOf('/*') > -1) {
        const head = line.slice(0, line.indexOf('/*'));
        const tail = line.slice(line.indexOf('*/') + 2, line.length);
        return head + tail;
      }
      return line.trim();
    })
    .join('');

  // Rules are now in parseable JSON format, convert rules to object
  const rulesObject = JSON.parse(rulesString);

  // Recursively visit all children in the object and
  // store any paths the have a "backup:..." key
  const backupPaths = [];
  function findBackups(object, path = '') {
    if(path.indexOf('backup:') > -1) backupPaths.push(path);
    const keys = Object.keys(object);
    keys.forEach(key => {
      if(typeof object[key] === 'object') {
        findBackups(object[key], `${path}/${key}`);
      }
    });
  }

  findBackups(rulesObject.rules);

  /* Sample backupPaths after calling findBackups():
    [ '/users/backup:shard:20',
    '/user-settings/backup:shard:20',
    '/courses/backup:shard:20',
    '/universities/backup:shard:20',
    '/rooms/backup:shard:10',
    '/room-messages/backup:shard:1' ] */

  // Return an array of objects with form { children: 'some/path/to/children', type: 'backup:shard:10' }
  return backupPaths.map(bp => {
    const split = bp.split('/');
    return {
      path: split.splice(0, Math.max(1, split.length - 1)).filter(c => c.length > 0).join('/'),
      type: split.pop()
    }
  });
}

export async function collectionToCSVFile({ firebase, collection, filename, secret } = {}) {

  console.log(`starting: ${collection}`);

  const nextPaths = [collection],
    params = {
      shallow: true,
      auth: secret,
      format: 'export'
    };

  let store = {}, totalPathsStored = 0, totalRequestTime = 0, totalPathsRequested = 0;

  // Function takes all store contents, convert them to CSV format, and write to file.
  function storeToFile() {
    const paths = Object.keys(store);
    const csvLines = paths.map(path => `"${path}", "${store[path]}"`);
    fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
    store = {};
  }

  // First line of the CSV
  fs.writeFileSync(filename, `"path", "value"`, 'utf8');

  while(nextPaths.length > 0) {
    console.log(collection, nextPaths.length);
    // Take the first 100 paths to make requests.
    // Create an array of requests and execute them.
    const paths = nextPaths.splice(0, 1200);
    const requests = paths.map(path => ax.get(`https://${firebase}.firebaseio.com/${path}.json`, { params }));
    const t = new Date().getTime();
    const results = await Promise.all(requests);
    totalPathsRequested += requests.length;
    totalRequestTime += (new Date().getTime() - t);
    console.log(totalRequestTime / 1000);

    // Iterate over the corresponding paths and requests
    // If the resulting data is an object, concatenate each of those keys onto its
    // corresponding path and push that onto nextPaths. Otherwise, it is a piece
    // of data that should be stored with its path.
    zip(paths, results).forEach(pair => {
      console.log(pair[1]);
      const path = pair[0], data = pair[1].data;
      if (typeof data === 'object') {
        keys(data).forEach(key => nextPaths.push(`${path}/${key}`));
      } else {
        store[path] = data;
        totalPathsStored += 1;
      }
    });

    // When the store contain more than a 1000 entries, empty it into a file.
    if (keys(store).length > 1000) {
      storeToFile();
    }
  }

  // Store the remaining data.
  storeToFile();

  console.log(`complete: ${collection}, paths requested: ${totalPathsRequested}, paths stored: ${totalPathsStored}, request time: ${totalRequestTime / 1000}`);

};
