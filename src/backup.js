'use strict';
import ax from 'axios';
import {keys} from 'lodash';
import fs from 'fs';

export default async function backup({
  firebase = '',
  secret = '',
  collections = [],
  all = false,
  destination = `./backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getHours()}`
} = {}) {

  // Populate the collections array if it is not supplied or the all argument is true.
  if(collections.length === 0 && all) {
    collections = keys((await ax.get(`https://${firebase}.firebaseio.com/.json?format=export&shallow=true&auth=${secret}`)).data);
  }

  // Create the destination directory if it doesn't exist.
  let dirs = destination.split('/'), currentDir = '';
  while(dirs.length > 0) {
    currentDir += dirs.shift() + '/'
    if (!fs.existsSync(currentDir)) fs.mkdirSync(currentDir);
  }

  // Loop over the collections, creating a file for each one via collectionToFile function.
  collections.forEach(collection => {
    const filename = `${destination}/${collection}.json`;
    collectionToFile({ firebase, collection, filename, secret });
  });

}

export async function collectionToFile({ firebase, collection, filename, secret } = {}) {

  const limitTo = 50,
    baseURL = `https://${firebase}.firebaseio.com/${collection}.json?format=export&auth=${secret}&orderBy="$key"`;
  let startAt = 0, length = limitTo, total = 0;

  // Begin the JSON file
  fs.writeFileSync(filename, '{', 'utf8');

  while (length === limitTo) {

    // Get data. orderBy, startAt, limitTo have to be passed inside of quotes.
    const result = await ax.get(`https://${firebase}.firebaseio.com/${collection}.json`, {
      params: {
        format: 'export',
        auth: secret,
        orderBy: '"$key"',
        startAt: `"${startAt}"`,
        limitTo: `"${limitTo}"`
      }
    });

    // Convert the result to a json key: {} pair and append to file.
    const json = keys(result.data).map(key => `"${key}": ${JSON.stringify(result.data[key])}`).join();
    fs.appendFileSync(filename, json, 'utf8');

    // Increment values for next loop.
    length = keys(result.data).length;
    total += length;
    startAt += limitTo;
  }

  // Close the JSON file
  fs.appendFileSync(filename, '}', 'utf8');
  console.log(collection, length);
}
