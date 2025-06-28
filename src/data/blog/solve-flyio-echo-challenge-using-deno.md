---
title: "Solve Fly.io echo challenge using Deno"
description: "We will be solving the Echo challenge from [fly.io](http://fly.io) using Deno. I am assuming you have already installed [maelstrom](https://github.com/jepsen-io/maelstrom) and set it up properly."
pubDatetime: 2023-06-17T07:14:27.674Z
tags: ["solve", "flyio", "echo"]
---

## Table of contents

    - [Echo challenge](#echo-challenge)
    - [Solution](#solution)
- [Running maelstrom test](#running-maelstrom-test)


We will be solving the Echo challenge from [fly.io](http://fly.io) using Deno. I am assuming you have already installed [maelstrom](https://github.com/jepsen-io/maelstrom) and set it up properly.

#### Echo challenge

Echo challenge is considered as a "getting started" guide of `maelstrom`. So this challenge is quite easy to solve.

`Maelstrom` will send an `echo` message to your node that looks like

```json
{
    "src" : "c1",
    "dest" : "n1",
    "body" : {
        "type" : "echo",
        "msg_id" : 1,
        "echo" : "Please echo 35"
    }
}
```

In response to it, our node has to reply with `echo_ok` message that looks like

```json
{
  "src": "n1",
  "dest": "c1",
  "body": {
    "type": "echo_ok",
    "msg_id": 1,
    "in_reply_to": 1,
    "echo": "Please echo 35"
  }
}
```

#### Solution

According to the [protocol of maelstrom](https://github.com/jepsen-io/maelstrom/blob/main/doc/protocol.md#initialization) at the start of every test `maelstrom` sends a single `init` message to every node which looks like

```json
{
  "src": "c1",
  "dest": "n1",
  "body": {
    "type": "init",
    "msg_id": 1,
    "node_id": "n3",
    "node_ids": ["n1", "n2"]
  }
}
```

In response to it, we have to reply with `init_ok` message that looks like this

```json
{
  "src": "n1",
  "dest": "c1",
  "body": {
    "type": "init_ok",
    "in_reply_to": 1
  }
}
```

Combining both of these requests our solution should

1. Handle `init` message and reply with `init_ok` message
    
2. Handle `echo` message and reply with `echo_ok` message
    

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1686985391526/e4bfd74b-57d7-4a07-8a07-29acd6204c41.png align="center")

Let's create a new folder `~/echo-challenge` and in that folder let's create a new file `index.ts`.

`Maelstrom` sends input messages in `json` format to `stdin` with each message separated with `newline` character. To parse these message line by line we will be using the [readline package](https://deno.land/x/readline@v1.1.0). So let's import it and read each line from `stdin`

```ts
import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";

const stdin = Deno.stdin;
for await (const encodedLine of readline(stdin)) {
  const line = new TextDecoder().decode(encodedLine);
  const inputMessage = JSON.parse(line);
}
```

`inputMessage` in our code has type `any`, since our solution will be small and simple it's perfectly okay to continue writing code with `inputMessage` type as `any`. But I like all my variables to be fully typed.

`inputMessage` can be of two messages either `init` or `echo`. There are two methods we can use to add type information to `inputMessage`.

1. We create `typescript` types for each type of message (`init` and `echo`). Then cast `inputMessage` as `union` of both of these messages. Like
    

```ts
const inputMessage = JSON.parse(line) as InitInputMessage | EchoInputMessage;
```

1. Another method is to use [zod package](https://deno.land/x/zod@v3.21.4) to create a `InputMessageSchema` which is `union` of `InitInputMessageSchema` and `EchoInputMessageSchema` and then parse `inputMessage` using `InputMessageSchema` like
    

```ts
const InputMessageSchema = z.union([
  InitInputMessageSchema,
  EchoInputMessageSchema,
]);
const inputMessage = InputMessageSchema.parse(JSON.parse(line));
```

I prefer second method since it also does runtime validation.

So let's write a schema for `InitInputMessageSchema`, `EchoInputMessageScheam` and `InputMessageSchema`

```ts
import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";
import z from "https://deno.land/x/zod@v3.21.4/index.ts";

const InitInputMessageSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: z.object({
    type: z.literal("init"),
    msg_id: z.number(),
    node_id: z.string(),
    node_ids: z.array(z.string()),
  }),
});

const EchoInputMessageSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: z.object({
    type: z.literal("echo"),
    msg_id: z.number(),
    echo: z.string(),
  }),
});

const InputMessagesSchema = z.union([
  InitInputMessageSchema,
  EchoInputMessageSchema,
]);


const stdin = Deno.stdin;
...
...
...
```

Then we can use `InputMessagesSchema` to validate and add `type` information to `inputMessage` variable

```ts
...
...

const InputMessagesSchema = z.union([
  InitInputMessageSchema,
  EchoInputMessageSchema,
]);

const stdin = Deno.stdin;
for await (const encodedLine of readline(stdin)) {
  const line = new TextDecoder().decode(encodedLine);
  const inputMessage = InputMessagesSchema.parse(JSON.parse(line));
}
```

Now we have to handle each case of `init` and `echo` message by replying with proper `init_ok` and `echo_ok` message.

For a `node` to reply in `maelstrom` all it has to do is print each message in `JSON` format to `stdout` separated by `newline` character. So let's do that

```ts
for await (const encodedLine of readline(stdin)) {
  const line = new TextDecoder().decode(encodedLine);
  const inputMessage = InputMessagesSchema.parse(JSON.parse(line));

  if (inputMessage.body.type === "init") {
    console.log(
      JSON.stringify({
        src: inputMessage.dest,
        dest: inputMessage.src,
        body: { type: "init_ok", in_reply_to: inputMessage.body.msg_id },
      })
    );
  } else if (inputMessage.body.type === "echo") {
    console.log(
      JSON.stringify({
        src: inputMessage.dest,
        dest: inputMessage.src,
        body: {
          type: "echo_ok",
          echo: inputMessage.body.echo,
          in_reply_to: inputMessage.body.msg_id,
        },
      })
    );
  }
}
```

## Running maelstrom test

To run `maelstrom` test we can use the command

```bash
./maelstrom test -w echo --bin ~/echo-challenge/index.ts --node-count 1 --time-limit 10
```

But running this command right now will throw an error. This is because we have not set `bang` for `index.ts` to specify that this file has to run using `Deno` and we have to set correct execution permission for `~/echo-challenge/index.` file too.

So first let's set `bang` for `index.ts` file

```ts
#!/usr/bin/env -S deno run

import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";
import z from "https://deno.land/x/zod@v3.21.4/index.ts";
```

Here is the whole code for `~/echo-challenge/index.ts` file.

```ts

#!/usr/bin/env -S deno run

import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";
import z from "https://deno.land/x/zod@v3.21.4/index.ts";

const InitInputMessageSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: z.object({
    type: z.literal("init"),
    msg_id: z.number(),
    node_id: z.string(),
    node_ids: z.array(z.string()),
  }),
});

const EchoInputMessageSchema = z.object({
  src: z.string(),
  dest: z.string(),
  body: z.object({
    type: z.literal("echo"),
    msg_id: z.number(),
    echo: z.string(),
  }),
});

const InputMessagesSchema = z.union([
  InitInputMessageSchema,
  EchoInputMessageSchema,
]);

const stdin = Deno.stdin;
for await (const encodedLine of readline(stdin)) {
  const line = new TextDecoder().decode(encodedLine);
  const inputMessage = InputMessagesSchema.parse(JSON.parse(line));

  if (inputMessage.body.type === "init") {
    console.log(
      JSON.stringify({
        src: inputMessage.dest,
        dest: inputMessage.src,
        body: { type: "init_ok", in_reply_to: inputMessage.body.msg_id },
      })
    );
  } else if (inputMessage.body.type === "echo") {
    console.log(
      JSON.stringify({
        src: inputMessage.dest,
        dest: inputMessage.src,
        body: {
          type: "echo_ok",
          echo: inputMessage.body.echo,
          in_reply_to: inputMessage.body.msg_id,
        },
      })
    );
  }
}
```

Then to set execution permission for `~/echo-challenge/index.ts`. If you are using `linux/mac-os` use this command. If you are using `Windows` please refer internet to figure out how to do that because I have no idea how to do this in `Windows` (I don't even know whether it is needed to do this in `Windows` or not)

```sh
chmod +x ~/echo-challenge/index.ts
```

Now if you execute the command

```sh
./maelstrom test -w echo --bin ~/echo-challenge/index.ts --node-count 1 --time-limit 10
```

You should see tons of logs and a last message which says

```txt
Everything looks good! ヽ(‘ー`)ノ
```

If you got this congrats you have solved `echo challenge` successfully. If you are getting errors make sure you have followed all the steps properly and still it is not resolved write a comment or send me a message. I will help to the best of my abilities.