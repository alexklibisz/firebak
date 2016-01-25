'use strict';
import ax from 'axios';
import {keys, values} from 'lodash';
import fs from 'fs';
import path from 'path';
import sizeof from 'object-sizeof';
import Table from 'cli-table';

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
  collections = [],
  destination = `./backups/${new Date().getFullYear()}.${('0' + (new Date().getMonth() + 1)).slice(-2)}.${('0' + new Date().getDate()).slice(-2)}.${new Date().getHours()}`
} = {}) {

  let maxRequestSize = 0, totalRequestSize = 0, totalObjects = 0, totalDuration = 0;

  // By default, use all of the backup rules that are found in the rules file.
  let backupRules = await getBackupRules({ firebase, secret });

  // If collections are specified, keep only the backup
  // rules that match a collection name.
  if (collections.length > 0) {
    backupRules = backupRules.filter(b => {
      const matches = collections.filter(collection => collection === b.path);
      if (matches.length > 0) return b;
    });
  }

  // Create the destination directory if it doesn't exist.
  destination = path.resolve('.', destination);
  let dirs = destination.split('/'), currentDir = '';
  while(dirs.length > 0) {
    currentDir += dirs.shift() + '/'
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir);
  }

  const introTable = new Table();
  introTable.push({'date/time': new Date().toLocaleString() });
  console.info('\n >> Firebak: Backup');
  console.info(introTable.toString());

  // Backup the rules
  console.info(' >> Backup starting: rules');
  await backupSecurityAndRules({ firebase, secret, filename: `${destination}/rules.json` });
  console.info(' >> Backup complete: rules\n\n');

  // Loop through the backup rules using a while loop.
  // Take the first rule on each iteration.
  // Using a while loop so that the await keyword is respected.
  // A for-each loop would launch all of the shardedBackupToFile
  // functions concurrently.
  while(backupRules.length > 0) {
    const backup = backupRules.shift();

    console.info(` >> Backup starting: ${backup.path}`);

    const
      filename = `${destination}/${backup.path}.csv`,
      t1 = new Date().getTime(),
      result = await shardedBackupToFile({ path: backup.path, rule: backup.rule, secret, firebase, filename });

    const t2 = new Date().getTime(),
      tableComplete = new Table();

    tableComplete.push(
      {'file': filename },
      {'rule': backup.rule },
      {'duration (sec)': (t2 - t1) / 1000 },
      {'max request size (mb)': result.maxRequestSize / 1000000},
      {'total request size (mb)': result.totalRequestSize / 1000000},
      {'total objects (not counting nested)': result.totalObjects}
    );

    console.info(` >> Backup complete: ${backup.path}`);
    console.info(tableComplete.toString() + '\n\n');

    // Update aggregate sizes
    maxRequestSize = Math.max(maxRequestSize, result.maxRequestSize);
    totalRequestSize += result.totalRequestSize;
    totalObjects += result.totalObjects;
    totalDuration += (t2 - t1) / 1000;
  }

  const table = new Table();
  table.push(
    {'total duration (sec)': totalDuration },
    {'max request size (mb)': maxRequestSize / 1000000 },
    {'total request size (mb)': totalRequestSize / 1000000 },
    { 'total objects (not counting nested)': totalObjects }
  );
  console.info(' >> Backup complete: all collections');
  console.info(table.toString());
}

async function shardedBackupToFile({ firebase, path, rule, secret, filename }) {
  // Define parameters for retrieving from the REST API
  // limitToFirst must be >= 2, otherwise it will retrieve the same data every time.
  const limitToFirst = Math.max(parseInt(rule.split(':')[2]), 2), allKeys = {};
  let
    store = {},
    startAt = "",
    count = limitToFirst,
    maxRequestSize = 0,
    totalRequestSize = 0;

  // Function for appending the store object data to the CSV file
  // Writes each key in the store object as the first col and the value as the second col.
  // Then clear the store
  function storeToFile() {
    const
      paths = keys(store),
      // Important that there be no space
      csvLines = paths.map(path => `"${path}","${store[path]}"`);
    fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
    store = {};
  }

  // Write initial line to file (must use write, not append)
  // Important that there be no space
  fs.writeFileSync(filename, '"path","value"\n', 'utf8');

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

    const
      dataKeys = keys(result.data),
      requestSize = sizeof(result.data);

    // Update bookkeeping stuff.
    maxRequestSize = Math.max(maxRequestSize, requestSize);
    totalRequestSize += requestSize;
    dataKeys.forEach(key => allKeys[key] = true);

    // The returned objects are located in result.data.
    // Flatten each of the returned objects and store it in the store
    dataKeys.forEach(key => {
      const flat = flattenObject(result.data[key], `${path}/${key}`);
      keys(flat).forEach(key => store[key] = flat[key]);
    });

    // If there are more than 200 objects stored, call storeToFile()
    if (keys(store).length > 200) storeToFile();

    // Update count and startAt for next loop
    count = dataKeys.length;
    startAt = dataKeys.sort().pop();
  }

  // Store the remainder and log some info
  storeToFile();

  // return the request sizes
  return { maxRequestSize, totalRequestSize, totalObjects: keys(allKeys).length };
}

async function backupSecurityAndRules({ firebase, secret, filename }) {
  const rulesResult = await ax.get(`https://${firebase}.firebaseio.com/.settings/rules/.json`, {
    params: {
      auth: secret
    }
  });
  fs.writeFileSync(filename, JSON.stringify(rulesResult.data, null, 2), 'utf8');
}

/**
 * Retrieves the security/validation rules for the specified firebase.
 * Looks for keys with string "firebak:", because these define backup rules.
 * Returns all of the paths that should be backed up.
 * @param  {[type]} {      firebase      [description]
 * @param  {[type]} secret }             [description]
 * @return {[type]}        [description]
 */
async function getBackupRules({ firebase, secret }) {
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
      return line;
    })
    .join('');

  // Rules are now in parseable JSON format, convert rules to an object
  const rulesObject = JSON.parse(rulesString);

  // Recursively visit all paths in the rules object.
  // Push any paths containing 'firebak:' into the backupPaths array.
  // This is similar but not quite the same as flattenObject function.
  const backupPaths = [];
  function findBackupPaths(object, path = '') {
    if(path.indexOf('firebak:') > -1) {
      backupPaths.push(path);
    }
    keys(object).forEach(key => {
      if(typeof object[key] === 'object') {
        findBackupPaths(object[key], `${path}/${key}`);
      }
    });
  }

  findBackupPaths(rulesObject.rules);

  /* Sample backupPaths after calling findBackupPaths():
    [ '/users/firebak:shard:20',
    '/user-settings/firebak:shard:20',
    '/courses/firebak:shard:20',
    '/universities/firebak:shard:20',
    '/rooms/firebak:shard:10',
    '/room-messages/firebak:shard:1' ] */

  // Return an array of objects with form { children: 'some/path/to/children', rule: 'firebak:shard:10' }
  return backupPaths.map(bp => {
    const split = bp.split('/').filter(s => s.length > 0);
    return {
      path: split.splice(0, Math.max(1, split.length - 1)).join('/'),
      rule: split.pop()
    }
  });
}

// Flatten a passed object into a return object where each key in the return object
// is the path to the corresponding data in the passed object.
// e.g. { a: { b: 1 } } becomes { 'a/b': 1 }
function flattenObject(object, path = '') {
  const flat = {};
  function visitChildren(innerObject, innerPath) {
    keys(innerObject).forEach(key => {
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
