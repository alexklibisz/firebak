# FireBak

Firebase backup and restore utility. Define the data you want to backup in your Firebase security rules. Backups and restore data incrementally (sharding requests) so as not to exceed Firebase request limits.

###Intended Use cases
- backing up Firebases that are too large to simply export the root file.
- backing up small to medium Firebases (anything up to the Bonfire plan which actually includes backups).
- running backups with minimal memory usage on a cheap cloud instance (e.g. AWS EC2 micro instance) and pushing the files to cloud storage (e.g. AWS S3).

###Fair warning: work in progress
This is a tool that I've built for a production-grade Firebase project that I'm on. That being said, it should still be considered a work-in-progress, and you should test it extensively for your use-case before committing to it. This is not in any way supported by Firebase. Obviously, I'm not responsible for any data loss that results from the use of this tool.

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

###Usage and Command Reference

####Defining Firebak rules

####Backup

####Restore

###Usage:

###TODO:

- improve the CLI (required options, usage instructions)
- unit testing
- sharding within `$variable` rules
