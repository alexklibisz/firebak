#!/bin/bash
set -e

usage="usage: firebak-s3 <backup directory name> <s3 path>"
if [ "$#" -ne 2 ]; then echo "$usage"; exit; fi

s3_path="$2"
backup_dir="$1"
tar_dir="tarred"

#Get the most recent sub-directory in the backups directory.
most_recent_backup=$(ls backups -t --group-directories-first | head -n 1)

#Tar the directory. Tar file name is same as the directory name.
mkdir -p "$tar_dir"
tar -zcvf "$tar_dir"/"$most_recent_backup".tar.gz "$backup_dir"/"$most_recent_backup"

# Push the directory to s3
aws s3 cp "$tar_dir"/"$most_recent_backup".tar.gz "$s3_path"
