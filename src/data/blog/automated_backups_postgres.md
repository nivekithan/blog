---
title: "Automated postgres backups using pgBackRest"
description: "A complete guide on setting up automated backups using pgBackRest on Ubuntu 24.04 VPS for hobby use"
pubDatetime: 2025-06-29T13:14:28Z
tags: ["postgresql", "database"]
featured: true
draft: false
---

All commands are run in Ubuntu 24.04 (Noble) version with postgresql 17 installed. Your system must also have postgresql apt repository setup.

Before setting up pgBackRest you must have a `postgresql` database cluster running. Following commands assumes you have configured your database based on my previous blog [Setting up PostgreSQL on a VPS](https://nivekithan.com/posts/setup_postgres_vps/)

## Table of contents

## Installing `pgBackRest`

```sh
sudo apt install pgbackrest
```

You can verify the installation by

```sh
pgbackrest --version
```

### Configuring the `pgBackRest`

Before configuring the `pgBackRest` let's change the our current user to `postgres`

```sh
su - postgres
```

`pgBackRest` needs to know the where the `data directory` of `postgresql` is located. You can get path of this directory by running the command

```sh
pg_lsclusters
```

The output will contain a "Data directory" column specifying its path:

```sh
postgres@my-pg:~$ pg_lsclusters
Ver Cluster Port Status Owner    Data directory              Log file
17  main    5432 online postgres /var/lib/postgresql/17/main /var/log/postgresql/postgresql-17-main.log
```

The configuration of `pgBackRest` is stored in the `/etc/pgbackrest.conf` file.

Let's open that file using any file editor and the replace the content with

```
[main]
pg1-path=/var/lib/postgresql/17/main
```

`[main]` is called a `stanza`. Each `stanza` contains configuration options like where data directory is located, how it should be backed up and where it should be backed up.

## Creating `pgBackRest` repository

A `repository` is where the `pgBackRest` will store it's backup. It can be configured to same machine as `postgresql` server or some other machine or even `s3`.

We will be configuring `pgBackRest` to use `s3` .

Add these lines to the `/etc/pgbackrest.conf` file

```txt
[global]
start-fast=y
repo1-type=s3
repo1-path=/backup
repo1-s3-region=<region>
repo1-s3-bucket=<bucket_nmae>
repo1-s3-key=<access_key>
repo1-s3-key-secret=<access_key_secret>
repo1-s3-endpoint=<s3_endpoint>
```

## Enable archiving on `postgreSQL`

Backing up `postgresql` requires `WAL` archiving to be enabled. For that we have to modify the `postgresql.conf` file and enable `WAL` archiving

To get the path of `postgresql.conf` file run

```sh
psql -t -P format=unaligned -c 'SHOW config_file;'
```

Let's edit the `postgresql.conf` file and set these options

```
archive_command = 'pgbackrest --stanza=main archive-push %p'
archive_mode = on
max_wal_senders = 3
wal_level = replica
```

These options requires the `postgresql` cluster restart to take effect.

```sh
# Must be ran as "root" user
sudo systemctl restart postgresql@17-main.service
```

## Retention policy

We don't need to keep our backups indefinitely. In my case I only want to keep two full backups of the database.

So we configure the `/etc/pgbackrest.conf` file and these lines to the `[global]` section

```
[global]
# existing lines...
repo1-retention-full=2
```

## Initialising the `pgBackRest` stanza

The configuration of `pgBackRest` is complete. Before we start taking backup we have to initialise the stanza.

```sh
pgbackrest --stanza=main --log-level-console=info stanza-create
```

If everything is configured properly you should see a new directory on `s3 bucket` with name `backup` which contains two more directory `archive` and `backup`

To better verification we can run

```sh
pgbackrest --stanza=main --log-level-console=info check
```

You should see output similar to

```
2025-06-29 11:36:00.660 P00   INFO: check command end: completed successfully (10152ms)
```

## Taking a backup

To take backup manually

```sh
pgbackrest --stanza=main --log-level-console=info backup
```

The first backup is always an "full backup".

There are three types of backups

1. Full backups
2. Differential backups
3. Incremental backups

#### Full backups

They take backup of all the files in your `postgresql` cluster.

They are huge in size or takes more time to take.

#### Differential backups

They take backup of only the files which has been changed from the last `full backup`

#### Incremental backups

They take backups of only the files which has been changed from the last `full backup` or `differential` backup

## Automated backups

Right now we are taking backups manually, we want to change it so that backups will taken automatically.

This can be done using `cron`

Let's open the cron editor

```sh
crontab -e
```

And insert this content

```
30 06 * * 0 pgbackrest --type=full --stanza=main backup
30 06 * * 1-6 pgbackrest --type=diff --stanza=main backup
```

This set's up two cron jobs which

1. Takes `full` database backup on every Sunday on 06:30 AM
2. Takes `diff` database backup of every other day on 06:30 AM

## Simulating data corruption

We will restore the backups from our s3 bucket when there is data corruption or hard failure.

To simulate the data corruption we are going to delete files from `postgresql` data directory

First let's stop `postgresql` cluster

```sh
# as root user
# let's stop the postgresql cluster before deleting it
sudo systemctl stop postgresql@17-main.service
```

Then let's delete the `pg_wal`

```sh
# as postgres user
rm -rf /var/lib/postgresql/17/main/pg_wal/
```

Now if we try to start the postgresql cluster again we get an error

```sh
# as root user
sudo systemctl start postgresql@17-main.service
```

```
Job for postgresql@17-main.service failed because the service did not take the steps required by its unit configuration.
```

If we look into the log

```sh
# as root user
sudo systemctl status postgresql@17-main.service
```

we can see that `postgresql` has crashed because `pg_wal` is not available

```sh
× postgresql@17-main.service - PostgreSQL Cluster 17-main
     Loaded: loaded (/usr/lib/systemd/system/postgresql@.service; enabled-runtime; preset: enabled)
     Active: failed (Result: protocol) since Sun 2025-06-29 12:50:56 UTC; 4s ago
   Duration: 1h 22min 48.710s
    Process: 39076 ExecStart=/usr/bin/pg_ctlcluster --skip-systemctl-redirect 17-main start (code=exited, status=1/>
        CPU: 129ms

Jun 29 12:50:56 my-pg postgresql@17-main[39076]: 2025-06-29 12:50:56.179 UTC [39084] LOG:  database system was shut>
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: 2025-06-29 12:50:56.179 UTC [39084] FATAL:  required WAL directory>
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: 2025-06-29 12:50:56.182 UTC [39081] LOG:  startup process (PID 390>
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: 2025-06-29 12:50:56.182 UTC [39081] LOG:  aborting startup due to >
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: 2025-06-29 12:50:56.183 UTC [39081] LOG:  database system is shut >
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: pg_ctl: could not start server
Jun 29 12:50:56 my-pg postgresql@17-main[39076]: Examine the log output.
Jun 29 12:50:56 my-pg systemd[1]: postgresql@17-main.service: Can't open PID file /run/postgresql/17-main.pid (yet?>
Jun 29 12:50:56 my-pg systemd[1]: postgresql@17-main.service: Failed with result 'protocol'.
Jun 29 12:50:56 my-pg systemd[1]: Failed to start postgresql@17-main.service - PostgreSQL Cluster 17-main.
```

## Restoring from backup

To restore from backup

1. We have to delete all the old files from the data directory

```sh
find /var/lib/postgresql/17/main -mindepth 1 -delete
```

2. Run restore command from `pgBackRest

```sh
pgbackrest --stanza=main --log-level-console=detail restore
```

If the restore completed successfully, you can see the output similar to

```sh
2025-06-29 13:08:34.859 P00 DETAIL: sync path '/var/lib/postgresql/17/main/global'
2025-06-29 13:08:34.874 P00   INFO: restore size = 29.4MB, file total = 1261
2025-06-29 13:08:34.875 P00 DETAIL: statistics: {"http.client":{"total":1},"http.request":{"total":4},"http.session":{"total":1},"socket.client":{"total":1},"socket.retry":{"total":1},"socket.session":{"total":1},"tls.client":{"total":1},"tls.session":{"total":1}}
2025-06-29 13:08:34.875 P00   INFO: restore command end: completed successfully (658489ms)
```

Now we can start the `postgres` cluster again without any issue

```sh
# as root user
sudo systemctl start postgresql@17-main.service
```

You can verify it by running

```sh
sudo systemctl status postgresql@17-main.service
● postgresql@17-main.service - PostgreSQL Cluster 17-main
     Loaded: loaded (/usr/lib/systemd/system/postgresql@.service; enabled-runtime; preset: enabled)
     Active: active (running) since Sun 2025-06-29 13:10:10 UTC; 10s ago
    Process: 39199 ExecStart=/usr/bin/pg_ctlcluster --skip-systemctl-redirect 17-main start (code=exited, status=0/>
   Main PID: 39205 (postgres)
      Tasks: 7 (limit: 2318)
     Memory: 68.8M (peak: 74.1M)
        CPU: 1.285s
     CGroup: /system.slice/system-postgresql.slice/postgresql@17-main.service
             ├─39205 /usr/lib/postgresql/17/bin/postgres -D /var/lib/postgresql/17/main -c config_file=/etc/postgre>
             ├─39206 "postgres: 17/main: checkpointer "
             ├─39207 "postgres: 17/main: background writer "
             ├─39236 "postgres: 17/main: walwriter "
             ├─39237 "postgres: 17/main: autovacuum launcher "
             ├─39238 "postgres: 17/main: archiver last was 00000002.history"
             └─39240 "postgres: 17/main: logical replication launcher "

Jun 29 13:10:01 my-pg systemd[1]: Starting postgresql@17-main.service - PostgreSQL Cluster 17-main...
Jun 29 13:10:10 my-pg systemd[1]: Started postgresql@17-main.service - PostgreSQL Cluster 17-main.
```
