'use strict';
import ax from 'axios';
import Firebase from 'firebase';
import path from 'path';
import fs from 'fs';
import Promise from 'bluebird';
import Table from 'cli-table';

export default async function restore({
  all = false,
  collections = [],
  firebase = '',
  secret,
  source,
  overwrite
} = {}) {

  // Get ref and authenticate
  const
    ref = new Firebase(`https://${firebase}.firebaseio.com`),
    authData = await ref.authWithCustomToken(secret);

  // Some info to start
  const introTable = new Table();
  introTable.push({'date/time': new Date().toLocaleString() });
  console.info('\n >> Firebak: restore');
  console.info(introTable.toString());

  source = path.resolve('.', source);

  if (all) {
    // TODO: if all is true, get the names of all CSV files in
    // the passed source directory and push each one into
    // the collections array.
  }

  while (collections.length > 0) {
    const
      collection = collections.shift(),
      filename = `${source}/${collection}.csv`;
    console.log(` >> Restore starting: ${collection}`);
    await restoreFromCSV({ ref, filename, overwrite });
    console.log(` >> Restore complete: ${collection}\n`);
  }

  // Force exit because otherwise the Firebase
  // ref remains open and causes the program to hang
  ref.unauth();
  process.exit(0);
}

/**
 * Reads in a CSV file and uses the paths and values in the file
 * to set the corresponding paths and values in Firebase.
 *
 * By default it only sets values if no value can be found (null)
 * at its path. The override parameter can be passed to set the value
 * regardless.
 * @param  {[type]} {   filename      [description]
 * @param  {[type]} ref }             =             {} [description]
 * @return {[type]}     [description]
 */
export async function restoreFromCSV({ filename, ref, overwrite = false } = {}) {

  // Function checks if there is already a value at the given path.
  // If there is a value, it does nothing. If there is no value (null),
  // it sets a value at that path.
  async function setIfNull(path, value) {
    const existingValue = await ref.child(path).once('value').then(snap => snap.val());
    return (existingValue === null) ? await ref.child(path).set(value) : existingValue;
  }

  const
    converter = new (require("csvtojson").Converter)();
    fileContents = await new Promise((resolve, reject) => {
      converter.fromFile(filename , (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

  while(fileContents.length > 0) {
    const promises = fileContents.splice(0, 100).map(object => {
      const {path, value} = object;
      if (overwrite) {
        return ref.child(path).set(value)
      } else {
        return setIfNull(path, value);
      }
    });
    await Promise.all(promises);
  }

}
