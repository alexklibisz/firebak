'use strict';
import ax from 'axios';
import {keys, values} from 'lodash';
import fs from 'fs';
// import Promise from 'bluebird';
import path from 'path';

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
export default async function backup({
  firebase = '',
  secret = '',
  // collections = [],
  all = false,
  destination = `./backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getHours()}`
} = {}) {

  const backupSpecs = await getBackupSpecs({ firebase, secret });

  // Create the destination directory if it doesn't exist.
  destination = path.resolve('.', destination);
  let dirs = destination.split('/'), currentDir = '';
  while(dirs.length > 0) {
    currentDir += dirs.shift() + '/'
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir);
  }

  console.info(`storing backups in directory: ${destination}`);

  // Backup the rules
  await backupRules({ firebase, secret, filename: `${destination}/rules.json` });

  // Loop through the backup specs using a while loop.
  // Take the first spec on each iteration.
  // Using a while loop so that the await keyword is respected.
  // A for-each loop would launch all of the shardedBackupToFile
  // functions concurrently.
  while(backupSpecs.length > 0) {
    const
      backup = backupSpecs.shift(),
      filename = `${destination}/${backup.path}.csv`;
    await shardedBackupToFile({ path: backup.path, spec: backup.spec, secret, firebase, filename });
  }
}

async function shardedBackupToFile({ firebase, path, spec, secret, filename }) {
  // Define parameters for retrieving from the REST API
  // limitToFirst must be >= 2, otherwise it will retrieve the same data every time.
  const limitToFirst = Math.max(parseInt(spec.split(':')[2]), 2);
  let startAt = "", count = limitToFirst, store = {}, maxRequestSize = 0, totalRequestSize = 0;

  // Function for appending the store object data to the CSV file
  // Writes each key in the store object as the first col and the value as the second col.
  function storeToFile() {
    const paths = Object.keys(store);
    const csvLines = paths.map(path => `"${path}", "${store[path]}"`);
    fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
    store = {};
  }

  // Write initial line to file (must use write, not append)
  fs.writeFileSync(filename, '"path", "object"\n');

  // Call the REST API until you receive fewer results than limitToFirst
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

    // Update request sizes
    maxRequestSize = Math.max(maxRequestSize, parseInt(result.headers['content-length']));
    totalRequestSize += parseInt(result.headers['content-length']);

    // The returned objects are located in result.data.
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

    console.info(path, count, startAt);
  }

  // Store the remainder and log some info
  storeToFile();
  console.info(`complete: ${path}`);
  console.info(`max request size: ${maxRequestSize / 1000000} mb (${maxRequestSize} bytes)`);
  console.info(`total request size: ${totalRequestSize / 1000000} mb (${totalRequestSize} bytes)`);
  console.info('======');

}

async function backupRules({ firebase, secret, filename }) {
  const rulesResult = await ax.get(`https://${firebase}.firebaseio.com/.settings/rules/.json`, {
    params: {
      auth: secret
    }
  });
  fs.writeFileSync(filename, JSON.stringify(rulesResult.data, null, 2), 'utf8');
  console.info('complete: rules');
  console.info('======');
}

/**
 * Retrieves the security/validation rules for the specified firebase.
 * Looks for keys with string "backup:", because these define backup specs.
 * Returns all of the paths that should be backed up.
 * @param  {[type]} {      firebase      [description]
 * @param  {[type]} secret }             [description]
 * @return {[type]}        [description]
 */
async function getBackupSpecs({ firebase, secret }) {
  // Fetch the rules
  const rulesResult = await ax.get(`https://${firebase}.firebaseio.com/.settings/rules/.json`, {
    params: {
      auth: secret
    }
  });

  // Convert the rules to an array, remove any comments per line,
  // and convert back to a string (JSON format).
  const rulesString = rulesResult.data.split('\n')
    .map(line => {
      if (line.indexOf('//') > -1) {
        line = line.slice(0, line.indexOf('//'));
      }
      if (line.indexOf('/*') > -1) {
        const
          head = line.slice(0, line.indexOf('/*')),
          tail = line.slice(line.indexOf('*/') + 2, line.length);
        return head + tail;
      }
      return line.trim();
    })
    .join('');

  // Rules are now in parseable JSON format, convert rules to an object
  const rulesObject = JSON.parse(rulesString);

  // Recursively visit all paths in the rules object.
  // Push any paths containing 'backup:' into the backupPaths array.
  // This is similar but not quite the same as flattenObject function.
  const backupPaths = [];
  function findBackupPaths(object, path = '') {
    if(path.indexOf('backup:') > -1) {
      backupPaths.push(path);
    }
    Object.keys(object).forEach(key => {
      if(typeof object[key] === 'object') {
        findBackupPaths(object[key], `${path}/${key}`);
      }
    });
  }

  findBackupPaths(rulesObject.rules);

  /* Sample backupPaths after calling findBackupPaths():
    [ '/users/backup:shard:20',
    '/user-settings/backup:shard:20',
    '/courses/backup:shard:20',
    '/universities/backup:shard:20',
    '/rooms/backup:shard:10',
    '/room-messages/backup:shard:1' ] */

  // Return an array of objects with form { children: 'some/path/to/children', spec: 'backup:shard:10' }
  return backupPaths.map(bp => {
    const split = bp.split('/').filter(s => s.length > 0);
    return {
      path: split.splice(0, Math.max(1, split.length - 1)).join('/'),
      spec: split.pop()
    }
  });
}

// Flatten a passed object into a return object where each key in the return object
// is the path to the corresponding data in the passed object.
// e.g. { a: { b: 1 } } becomes { 'a/b': 1 }
function flattenObject(object, path = '') {
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
