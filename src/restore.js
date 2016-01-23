'use strict';
import ax from 'axios';
import Firebase from 'firebase';
import Fireproof from 'fireproof';
import path from 'path';
Fireproof.promise = require('bluebird');

export default async function restore({
  all,
  collections = [],
  firebase = '',
  secret,
  source
} = {}) {

  source = path.resolve('.', source);

  console.log(authData);

  while (collections.length > 0) {
    const collection = collections.shift();
    const filename = `${source}/${collection}.csv`;
  }

  // For each collection, read from the corresponding CSV file in the source directory.
  // For each path in the file, post the value to that path in Firebase.

}
//
// export aysnc function csvFileToJSON({
//   firebase, collection, secret, filename
// } = {}) {
//
//   // Get ref and authenticate
//   const ref = new Fireproof(new Firebase(`https://${firebase}.firebaseio.com`));
//   const authData = await ref.authWithCustomToken(secret);
//
//   // Stream the file in. For each path, check if the value exists.
//   // If it doesn't exist, set it.
//
//
//
// }
