# FireBak

Firebase backup and restore utility. Define the data you want to backup in your Firebase security rules. Backups and restore data incrementally (sharding requests) so as not to exceed Firebase request limits.

***

###Intended Use cases
- backing up Firebases that are too large to simply export the root file.
- backing up small to medium Firebases (anything up to the Bonfire plan which actually includes backups).
- running backups with minimal memory usage on a cheap cloud instance (e.g. AWS EC2 micro instance) and pushing the files to cloud storage (e.g. AWS S3).

***
***

###Fair warning: work in progress
This is a tool that I've built for a production-grade Firebase project that I'm on. That being said, it should still be considered a work-in-progress, and you should test it extensively for your use-case before committing to it. This is not in any way supported by Firebase. Obviously, I'm not responsible for any data loss that results from the use of this tool.

***
***

###Getting Started

1. Install the `firebak` node module: `npm install firebak`.
2. Go to your firebase security settings in the firebase dashboard.
3. For any collection that you want to back up, define a rule `"firebak:shard:###": {}`. This rule is a no-op for the purposes of firebase, but it tells our scripts how many children should be requested at a time. For example, this `users` collection is backed up 100 objects at a time.
```
"users": {
  ".read": "auth != null",
  ".indexOn": ["email", "facebookId", "name"],
  "firebak:shard:100": {},
  "$userId": {
    ...
  }
},
```
3. Use the `firebak backup` and `firebak restore` commands to backup and restore your collections:  
> firebak backup --firebase [name of your firebase] --secret [your secret]  
> firebak restore --all --source /path/to/backups/directory --firebase [name of your firebase] --secret [your secret]

***
***

###Usage, Command Reference

####Terms
- Collection: a high-level ref containing multiple objects in Firebase.
- Rule: a rule defining some backup behavior in the Firebase rules just like `.validate`, `.read`, `.write` define security/validation.
- Path: the `/`-separated path used to access a child ref. e.g. `users/abc123/name` would access user abc123's name property.

***

####Strategy

Firebak requests only parts of each collection at once - also known as sharding. The motivation for this is two-fold:
1. fit under the firebase request size limit (200MB)
2. write/read to/from backup files incrementally instead of keeping all of our data in memory.

[Read more about how I came to this solution.](http://alexklibisz.roughdraft.io/3247dcba8c8d7936a0ce-creating-an-effective-firebase-backup-solution)

***

####Defining Firebak rules

Firebak uses empty rules in the Firebase rules to define how many items of a certain collection to request at once.

#####`"firebak:shard:n": {}`
Adding this rule within any collection will tell the firebak backup command to request *n* items at a time. For now this is the only rule and **it must be added to any collection you want to back up**.

Example:
```
"users": {
  ".read": "auth != null",
  ".indexOn": ["email", "facebookId", "name"],
  "firebak:shard:100": {},
  "$userId": {
    ...
  }
},
```

***

####Backup

> firebak backup [options] [collections...]

#####Parameters
- `collections`: the firebase collections you want to backup
- `-f, --firebase`: Firebase name (e.g. myfirebase, not https://myfirebase.firebaseio.com)
- `--secret`: Authentication secret for firebase. If not supplied, looks for env variable FIREBASE_SECRET.
- `-d, --destination`: The destination directory for your backups. By default backups are stored in `./backups/year/month/day/hour`.

#####Example

> firebak backup users messages --firebase studyloop-stage --secret abcdef123456 --destination ./my/backup/dir

***

####File storage and format

Firebak stores backups in a simple CSV format with two columns: `path` and `value`. The motivation here is to make restoring as simple as possible by defining an absolute path to your data values.

#####Example

Given the following JSON:

```
{
  "users": {
    "abc": {
      "name": "Jack",
      "friends": {
        "Jill": true
      }
    }
  }
}
```

the backup file would contain:

```
"path","value"
"users/abc/name","Jack"
"users/abc/friends/Jill":"true"
```

***

####Restore

> restore [options] [collections...]

#####Parameters
- `collections`: the firebase collections you want to backup
- `-f, --firebase`: Firebase name (e.g. myfirebase, not https://myfirebase.firebaseio.com)
- `--secret`: Authentication secret for firebase. If not supplied, looks for env variable FIREBASE_SECRET
- `-s, --source`: directory where the files being restored are located
- `-r, --rules`: restore rules from the rules.json file in the source directory
- `-o, --overwrite`: overwrite values at existing paths. By default, restoring only sets a value if that path does not exist.
- `-a, --all`: restore all paths in the source directory

#####Example

> restore --all --rules --overwrite --firebase studyloop-stage --source ./backups/2016/1/22/10

***

####Pushing backups to AWS S3
Backups can be pushed to AWS S3 or similar file hosting service. There is a script at `src/firebak-s3.sh` that does this.

> firebak-s3 \<backups directory e.g. ./backups\> \<s3 path e.g. s3://mybucket/some-dir/\>

This will find the most recently modified directory in the backups directory, tar that directory, and push it to s3. It assumes that you have the AWS CLI configured (`aws configure`) with a user that has S3 write permissions enabled. Note that the s3 path must end in a `/` to be considered a directory path, otherwise aws will treat it as a file path.

***
***

###TODO:

- improve the CLI (required options, usage instructions)
- unit testing
- sharding within `$variable` rules
- `tojson` command for converting the backup csv files back to JSON
- examples for sending slack notification following a backup
- examples for encrypting backup files
