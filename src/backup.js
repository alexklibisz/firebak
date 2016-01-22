'use strict';
import ax from 'axios';
import {keys, zip} from 'lodash';
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

  // Populate the collections array if it is not supplied or the all argument is true.
  if(collections.length === 0 && all) {
    const result = await ax.get(`https://${firebase}.firebaseio.com/.json`, {
      params: {
        format: 'export',
        auth: secret,
        shallow: true
      }
    });
    collections = Object.keys(result.data);
  }

  // Create the destination directory if it doesn't exist.
  let dirs = destination.split('/'), currentDir = '';
  while(dirs.length > 0) {
    currentDir += dirs.shift() + '/'
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir);
  }

  // Loop over the collections, creating a file for each one via collectionToJSONFile function.
  // Using a while loop to prevent multiple collectionToCSVFile functions from firing concurrently.
  while (collections.length > 0) {
    const collection = collections.pop();
    const filename = `${destination}/${collection}.csv`;
    await collectionToCSVFile({ firebase, collection, filename, secret });
  }
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
