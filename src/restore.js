'use strict';
import ax from 'axios';
import Firebase from 'firebase';
import Fireproof from 'fireproof';
Fireproof.promise = require('bluebird');

export default async function restore({
  all,
  collections = [],
  Firebase = '',
  secret,
  source
} = {}) {

  const ref = new Fireproof(new Firebase(`https://${Firebase}.Firebaseio.com`));

  // Authenticate
  const authData = await ref.authWithCustomToken(secret);

  console.log(authData);

  // For each collection, read from the corresponding CSV file in the source directory.
  // For each path in the file, post the value to that path in Firebase.

}
