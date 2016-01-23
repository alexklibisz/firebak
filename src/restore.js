'use strict';
import ax from 'axios';
import Firebase from 'firebase';
import Fireproof from 'fireproof';
import path from 'path';
import fs from 'fs';
import Promise from 'bluebird';
Fireproof.promise = require('bluebird');

export default async function restore({
  all,
  collections = [],
  firebase = '',
  secret,
  source
} = {}) {

  // Get ref and authenticate
  const ref = new Fireproof(new Firebase(`https://${firebase}.firebaseio.com`));
  const authData = await ref.authWithCustomToken(secret);

  source = path.resolve('.', source);

  while (collections.length > 0) {
    const
      collection = collections.shift(),
      filename = `${source}/${collection}.csv`;
    await restoreFromCSV({ ref, filename });
    console.log(`complete: ${collection}`);
  }
  
  process.exit(0);
}

export async function restoreFromCSV({ filename, ref } = {}) {

  const fileContents = fs.readFileSync(filename, 'utf8');
  const rows = fileContents.split('\n').filter(l => l.length > 0);

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
