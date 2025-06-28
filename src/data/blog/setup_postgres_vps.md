---
title: "Setting up PostgreSQL on a VPS"
description: "A complete guide to installing, configuring, and securing PostgreSQL on Ubuntu 24.04 VPS for production use"
pubDatetime: 2025-06-28T12:00:00Z
tags: ["postgresql", "database"]
featured: true
draft: false
---

# Setting up PostgreSQL on a VPS

This guide walks you through installing and configuring PostgreSQL on a Ubuntu 24.04 (Noble) VPS, including setting up users, databases, and secure remote connections.

## Table of contents

<!-- the rest of the post -->

## Removing old PostgreSQL installation

```sh
sudo apt-get --purge remove postgresql postgresql-*
```

[SOURCE](https://askubuntu.com/questions/32730/how-to-remove-postgres-from-my-installation)

Removing the `postgres` user (optional)

```sh
sudo deluser --remove-home --remove-all-files postgres
```

## Installation

Install the `postgresql-common` package first:

```sh
sudo apt install -y postgresql-common
```

Then, use it to set up the APT repository:

```sh
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
```

Then, install the version of PostgreSQL you want:

```sh
sudo apt install postgresql-client-17 postgresql-17
```

You can replace `17` with any other version of PostgreSQL you want to install.

[SOURCE](https://askubuntu.com/questions/32730/how-to-remove-postgres-from-my-installation)

## Changing to the `postgres` user

Running the PostgreSQL installation will create its own user called "postgres."

You can verify it by running the command:

```sh
getent passwd | grep postgres
```

It should output this:

```
postgres:x:109:113:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
561ea82e-1e95-43c8-bd63-b37eb7362813
```

To change from our current user `root` to `postgres`, we will run this command:

```sh
su - postgres
```

All other commands are assumed to be run under the `postgres` user.

### Verifying the PostgreSQL data directory

PostgreSQL stores all its database data under a single directory called the "data directory." This data directory is already initialized when we installed PostgreSQL.

So, we don't have to follow the steps mentioned in the [official PostgreSQL documentation](https://www.postgresql.org/docs/current/creating-cluster.html) and can instead skip them.

To verify whether the data directory has already been initialized, run this command:

```sh
pg_lsclusters
```

The output will contain a "Data directory" column specifying its path:

```
postgres@my-pg:~$ pg_lsclusters
Ver Cluster Port Status Owner    Data directory              Log file
17  main    5432 online postgres /var/lib/postgresql/17/main /var/log/postgresql/postgresql-17-main.log
```

### Verifying the PostgreSQL server has started

Just like the PostgreSQL data directory, installing PostgreSQL has already started the server. We don't have to start it manually.

So, we can skip this step of the [official PostgreSQL documentation](https://www.postgresql.org/docs/current/server-start.html) too.

To verify whether the PostgreSQL server has started:

```sh
pg_lsclusters
```

The output will contain a "Status" column specifying whether it's online or not, and its port:

```
postgres@my-pg:~$ pg_lsclusters
Ver Cluster Port Status Owner    Data directory              Log file
17  main    5432 online postgres /var/lib/postgresql/17/main /var/log/postgresql/postgresql-17-main.log
```

## Creating a new user for an app

To create a new user for an app:

```sh
createuser <user_name> -P
```

Example command:

```sh
createuser app -P
```

Then enter the password for your user:

```
561ea82e-1e95-43c8-bd63-b37eb75374858
```

## Creating a new database for an app

To create a new database:

```sh
createdb -O <role_name> <db_name>
```

Example:

```sh
createdb -O app app
```

[SOURCE](https://www.postgresql.org/docs/17/manage-ag-createdb.html)

## Connecting to our database

Let's connect to our newly created database with the newly created user:

```sh
psql -d app -U app
```

You will see this error:

```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  Peer authentication failed for user "app"
```

This is because we have not allowed the user "app" to connect to the database through the local network.

To allow this, we will have to modify our `pg_hba.conf` file.

To get the path of that file:

```sh
psql -t -P format=unaligned -c 'show hba_file';
```

[SOURCE](https://askubuntu.com/questions/256534/how-do-i-find-the-path-to-pg-hba-conf-from-the-shell)

The path might look like this:

```
/etc/postgresql/17/main/pg_hba.conf
```

### Resetting `pg_hba.conf`

Open the `pg_hba.conf` file using a text editor like `vim` or `nano`. Then, replace the entire file with:

```
# DO NOT DISABLE!
# If you change this first entry you will need to make sure that the
# database superuser can access the database using some other method.
# Noninteractive access to all databases is required during automatic
# maintenance (custom daily cronjobs, replication, and similar tasks).
#
# Database administrative login by Unix domain socket
local   all             postgres                                peer

# TYPE  DATABASE        USER            ADDRESS                 METHOD
```

The line:

```
local   all             postgres                                peer
```

allows your OS user named `postgres` to connect to any database without a password.

So, we can connect to the `app` database by:

```sh
psql -d app
```

But `postgres` is a superuser; it can create new databases or delete databases too. We want to connect to the `app` database with the user `app` so that we can only modify the `app` database.

To add that, let's add this line at the end of the `pg_hba.conf` file:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Allow connections to any database by a user with the same name as long as they are using `scram-sha-256` authentication

local     sameuser     all                                      scram-sha-256
```

Running:

```sh
psql -d app -U app
```

Gives the same error as last time:

```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  Peer authentication failed for user "app"
```

This is because PostgreSQL reads the `pg_hba.conf` once during server startup. So, for new changes to take place, we have to notify PostgreSQL that the configuration has changed.

To do this:

```sh
psql -t -P format=unaligned -c 'SELECT pg_reload_conf();'
```

Now we can connect to our `app` database with user `app` by:

```
psql -d app -U app
```

It will ask for a password; enter the password you originally set while creating the user.

## Connecting through the internet

> **⚠️ Security Warning**: Exposing PostgreSQL directly to the internet can be a security risk. Consider using SSH tunneling, VPN, or restricting access to specific IP addresses instead of allowing connections from anywhere. Only proceed if you understand the security implications.

If you are running PostgreSQL on a VPS, you would like to connect to it by its IP address.

For that, first, we have to allow the PostgreSQL port `5432` to be accessible from the internet.

1.  Exit the `postgres` user and connect as the `root` user:

    ```sh
    exit
    ```

2.  Enable `ufw` (uncomplicated firewall):

    ```sh
    ufw enable
    ```

3.  Allow connections to your SSH service:

    ```sh
    ufw allow ssh
    ```

4.  Allow connections to your PostgreSQL service:

    ```
    ufw allow postgres
    ```

### Connecting to the `app` database through the internet

> All of the below commands assume the VPS containing the PostgreSQL instance is available from the `pg.com` domain. Replace `pg.com` with your own domain.

If we try to connect to our PostgreSQL instance through the internet:

```sh
psql -h pg.com -U app -d app
```

You will get an error:

```
psql: error: connection to server at "pg.com" (<ip_address>), port 5432 failed: Connection refused
        Is the server running on that host and accepting TCP/IP connections?
```

Telling that there is no server at that address.

This is because we have configured our PostgreSQL only to accept connections from the `local` network. To allow it to listen through the internet, we have to add this line to our `pg_hba.conf` file:

```
host      sameuser     all                all                    scram-sha-256
```

Remember to notify PostgreSQL about the changed `pg_hba.conf` file using:

```
psql -t -P format=unaligned -c 'SELECT pg_reload_conf();'
```

Run this command as the `postgres` user.

### Listening to the internet

Even now, if we try the command, we still get the same error.

```sh
psql -h pg.com -U app -d app
```

This is because even though we have configured PostgreSQL to allow connections through the internet, our PostgreSQL is still not listening for connections from the internet.

To do this, we have to find the `postgresql.conf` file.

```
psql -t -P format=unaligned -c 'SHOW config_file;'
```

You will get the path of the file:

```
/etc/postgresql/17/main/postgresql.conf
```

Let's open the `postgresql.conf` file through any text editor and find the line which mentions:

```
#listen_addresses = 'localhost'         # what IP address(es) to listen on;
```

Update this to:

```
listen_addresses = '*'
```

This tells the server to listen to both localhost and remote networks.

Now, for this configuration change to take place, we have to restart the `postgresql` service.

```sh
sudo systemctl restart postgresql@17-main.service
```

That's it!

Now the PostgreSQL server can be connected through the internet by running:

```sh
psql -d app -h pg.com
```

and entering the password.
