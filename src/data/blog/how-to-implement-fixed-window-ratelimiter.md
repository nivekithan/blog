---
title: "How to implement fixed window Ratelimiter"
description: "We will be implementing a fixed window ratelimiter using typescript and redis."
pubDatetime: 2023-07-29T07:35:24.460Z
tags: ["how", "implement", "fixed"]
---

## Table of contents

- [What is fixed window Ratelimiter ?](#what-is-fixed-window-ratelimiter-)
- [Code](#code)
    - [Ratelimit indentifier](#ratelimit-indentifier)
    - [Generating redis key](#generating-redis-key)
    - [Performing ratelimit check](#performing-ratelimit-check)
- [Testing](#testing)


We will be implementing a fixed window ratelimiter using typescript and redis.

To get started, clone the template using the command.

```bash
npx degit "nivekithan/ratelimit#template" ratelimit
```

This will setup typescript (with esbuild) and install all dependencies we will need for this project.

Once you have cloned the project you can run

```bash
pnpm i # To install all dependencies
pnpm run dev 
```

If everything is working, it output `hello world`.

## What is fixed window Ratelimiter ?

In fixed window ratelimiter we will group fixed time intervals into one window and enforce number of requests allowed per window.

For example, if the time interval is `1 min` then we can group time from `00:00:00` to `00:01:00` to window `1` and group time from `00:01:00` to `00:02:00` to window `2`.

## Code

Create a new file `src/fixedWindow.ts` and create a `class` to store `redis` connection, `window`, `limit`

```typescript
// ./src/fixedWindow.ts
import { Redis } from "ioredis";

export class FixedWindowRatelimiter {
  #db: Redis;
  #window: number;
  #limit: number;

  constructor(redis: Redis, window: number, limit: number) {
    this.#db = redis;
    this.#window = window;
    this.#limit = limit;
  }
}
```

* `#db` - It stores the connection to `redis` server
    
* `#window` - It represents the time interval for each window. For example in `10 requests per 1 second`, the window is `1 second`.
    
* `#limit` - Total number of requests allowed per window. For example in `10 requests per 1 second`, the limit is `10`.
    

#### Ratelimit indentifier

In most cases application ratelimit against per `identifier`. This `identifier` could be `ip address` or `userId` or `geographic location`. That means statement `10 requests per 1 second` usually means `10 requests per 1 second per user` or `10 requests per 1 second per ip address`.

#### Generating redis key

`redis` is `key-value` store. We will be storing number of requests as `value` and we can have `windowId` (unique id representing a window) as `key`. But since our algorithm will also support ratelimit `identifier` the key should be a combination of `windowId` and `identifier`.

Create a new private function `#getKey`

```typescript
  #getKey(unqiueId: string) {
    const windowId = Math.floor(Date.now() / (this.#window * 1_000));
    const redisKey = `${windowId}:${unqiueId}`;
    return redisKey;
  }
```

The `uniqueId` is same as `identifier`.

1. We generate `windowId` using `Math.floor(Date.now() / (this.#window * 1_000));`
    
2. Then combine both `windowId` and `uniqueId` to create redis key which can be used to store number of requests
    

#### Performing ratelimit check

Create new function `check` with

```typescript
  async check(uniqueId: string) {
    const redisKey = this.#getKey(uniqueId);

    const [[incrError, incrRes]] = (await this.#db
      .multi()
      .incr(redisKey)
      .expire(redisKey, this.#window, "NX")
      .exec())!;

    if (incrError) {
      throw incrError;
    }

    const totalRequest = incrRes as number;
    const isRatelimitReached = totalRequest > this.#limit;

    return { isRatelimitReached, totalRequest };
  }
```

1. We will be generating `redis key` using the previously defined function `#getKey`
    
2. Redis supports command `multi` which allows you to apply multiple redis commands atomically.
    
3. We will be using `incr` command to increase the number of requests stored in `redisKey` by 1. If the key is new, then `redis` will set the value of `redisKey` to 0 and then apply `incr` command.
    
4. These `redisKeys` will not be used once the window has passed. Thus storing these keys forever only increases the storage of redis without any advantage. Therefore we will set an expiration time for these keys and once the time has passed. `redis` remove those keys automatically for us.
    
5. This can be done by using `expire` command, we set the expiration to be `window` and set the option to `NX`.
    
6. Setting option `NX` means the redis will set the expiration time to the key only if there is no previous expiration time on that key.
    
7. By checking the returned response from `incr` command we can know the total number of requests and by comparing it with the `limit` we can choose whether to accept the request or drop the request.
    

## Testing

To test the ratelimiter, initalize it on `src/index.ts` file

```typescript
import { Redis } from "ioredis";
import { FixedWindowRatelimiter } from "./fixedWindow";

const redis = new Redis(); // Connect to your redis instance

const fixedRatelimiter = new FixedWindowRatelimiter(redis, 60, 3); // 3 requests per 1 minute 

async function main() {
  const { isRatelimitReached, totalRequest } = await fixedRatelimiter.check("1");

  console.log({ isRatelimitReached, totalRequest });
  process.exit(0);
}

main();
```

> Make sure you have passed the correct connection information into `new Redis()` call and verify it has connected to the redis.

```bash
pnpm run dev
```

Then run this command multiple times to test the fixed window ratelimter.