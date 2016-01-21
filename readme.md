# FireSafe

Firebase to JSON backup and restore. Incrementally downloads your firebase collections via the Firebase REST API and stores them as JSON files.

This is very much a work in progress.

###Usage:

> node src backup [collections... | --all] --firebase my-firebase --secret <My firebase secret>

This will store your a JSON file per collection in `./backups/year/month/day/hour`.

###Example:

download all collections from `myfirebaseapp.firebaseio.com`.

> node src backup --all --firebase studyloop-stage --secret abcdefg123456

###Some TODOs:

- improve the CLI (required options, usage instructions)
- implement restore function (should read files incrementally and POST each individual record).
- unit tests (will probably use two separate firebases, populate the first, backup and restore to second, then compare)
