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
  collections.forEach(collection => {
    const filename = `${destination}/${collection}.csv`;
    collectionToCSVFile({ firebase, collection, filename, secret });
  });

}

export async function collectionToCSVFile({ firebase, collection, filename, secret } = {}) {

  const nextPaths = [collection],
    params = {
      shallow: true,
      auth: secret,
      format: 'export'
    };

  let store = {};


  // Function takes all store contents, convert them to CSV format, and write to file.
  function storeToFile() {
    const paths = Object.keys(store);
    const csvLines = paths.map(path => `"${path}", "${store[path]}"`);
    fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
    store = {};
    console.log(`${collection}: storing ${csvLines.length} entries`);
  }

  // First line of the CSV
  fs.writeFileSync(filename, `"path", "value"`, 'utf8');

  while(nextPaths.length > 0) {
    console.log(nextPaths.length);
    // Take the first 100 paths to make requests.
    const paths = nextPaths.splice(0, 100);
    // Create an array of requests.
    const requests = paths.map(path => ax.get(`https://${firebase}.firebaseio.com/${path}.json`, { params }));
    // Execute the requests.
    const results = await Promise.all(requests);

    // Iterate over the corresponding paths and requests
    zip(paths, results).forEach(pair => {
      // Deconstruct the zipped pair
      const path = pair[0], data = pair[1].data;
      // Returned an error
      if (data instanceof Error) {
        store[path] = data.toString();
        console.error(data.toString());
      }
      // Returned an object, push each of the keys onto next paths
      else if (typeof data === 'object') {
        keys(data).forEach(key => nextPaths.push(`${path}/${key}`));
      }
      // Returned a JSON primitive (an actual value), store it.
      else {
        store[path] = data;
      }
    });

    // When the store contain more than a 1000 entries, empty it into a file.
    if (keys(store).length > 1000) {
      storeToFile();
    }
  }

  // Store the remaining entries.
  storeToFile();

};


// export async function collectionToCSVFileRecursive({ firebase, collection, filename, secret } = {}) {
//
//   let store = {};
//
//   fs.writeFileSync(filename, `"path", "value"`, 'utf8');
//
//   function storeToFile() {
//     const paths = Object.keys(store);
//     const csvLines = paths.map(path => `"${path}", "${store[path]}"`);
//     fs.appendFileSync(filename, csvLines.join('\n'), 'utf8');
//     store = {};
//   }
//
//   async function getPath({ path }) {
//     const result = await ax.get(`https://${firebase}.firebaseio.com/${path}.json`, {
//       params: {
//         shallow: true,
//         auth: secret,
//         format: 'export'
//       }
//     }),
//     {data} = result;
//
//     if (typeof data === 'object') {
//       const next = Object.keys(data).map(key => getPath({ path: `${path}/${key}`}));
//       await Promise.all(next);
//     } else {
//       console.log(path);
//       store[path] = data;
//     }
//
//     if (Object.keys(store).length > 100) {
//       storeToFile();
//     }
//
//   }
//
//   await getPath({ path: collection });
//   storeToFile();
//   console.log('done');
// };
//
//
// /**
//  * collectionToJSONFile function.
//  * Incrementally request data from firebase using firebase REST api.
//  * Requests 50 records at a time for the passed collection.
//  * Creates a JSON file "on the fly", appending the data to the file as
//  * records are fetched instead of storing everything in memory.
//  * @param  {[type]} {          firebase      [description]
//  * @param  {[type]} collection [description]
//  * @param  {[type]} filename   [description]
//  * @param  {[type]} secret     }             =             {} [description]
//  * @return {[type]}            [description]
//  */
// export async function collectionToJSONFile({ firebase, collection, filename, secret } = {}) {
//
//   const limitTo = 50;
//   let startAt = 0, length = limitTo, total = 0;
//
//   // Begin the JSON file
//   fs.writeFileSync(filename, '{', 'utf8');
//
//   while (length === limitTo) {
//
//     // Get data. orderBy, startAt, limitTo have to be passed inside of quotes.
//     const result = await ax.get(`https://${firebase}.firebaseio.com/${collection}.json`, {
//       params: {
//         format: 'export',
//         auth: secret,
//         orderBy: '"$key"',
//         startAt: `"${startAt}"`,
//         limitTo: `"${limitTo}"`
//       }
//     });
//
//     // Convert the result to a json key: {} pair and append to file.
//     const json = Object.keys(result.data).map(key => `"${key}": ${JSON.stringify(result.data[key])}`).join();
//     fs.appendFileSync(filename, json, 'utf8');
//
//     // Increment values for next loop.
//     length = Object.keys(result.data).length;
//     total += length;
//     startAt += limitTo;
//   }
//
//   // Close the JSON file
//   fs.appendFileSync(filename, '}', 'utf8');
//   console.log(collection, length);
// }
