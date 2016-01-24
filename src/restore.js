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
  override
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
    await restoreFromCSV({ ref, filename });
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
export async function restoreFromCSV({ filename, ref, override = false } = {}) {

  const
    fileContents = fs.readFileSync(filename, 'utf8'),
    rows = fileContents.split('\n').filter(l => l.length > 0);

  while(rows.length > 0) {
    const
      restoreRows = rows.splice(0, 100),
      promises = restoreRows.map(row => {
        const
          path = row.split(', ')[0].replace(/"/g,""),
          value = row.split(', ')[1].replace(/"/g,"");
        return ref.child(path).set(value);
      });
    await Promise.all(promises);
  }

}
