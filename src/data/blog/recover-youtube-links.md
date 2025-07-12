---
title: "Recovering Mangled YouTube URLs: A Brute-Force Adventure"
description: "How to recover corrupted YouTube URLs using brute-force permutations and yt-dlp validation when a frontend bug lowercases video IDs"
pubDatetime: 2025-07-12T00:00:00Z
tags: ["youtube", "debugging", "data-recovery", "bash"]
featured: true
draft: false
---

## Table of contents

## Introduction

Have you ever dealt with a sneaky bug that corrupts data in ways that seem impossible to fix? That's exactly what happened to our team when a frontend glitch started lowercasing YouTube video URLs before they hit our API and database. What started as a valid link like `https://www.youtube.com/watch?v=urEaHW-emY4` ended up stored as `https://www.youtube.com/watch?v=ureahw-emy4`—completely broken. No logs, no traces, just invalid URLs pointing to non-existent videos.

But despair not! With a bit of clever brute-forcing and the right tools, we recovered the originals. In this post, I'll walk you through the problem, our "unless..." moment, and a practical script to fix it. Spoiler: It involves generating up to 2,048 permutations and validating them like a boss.

## The Problem: Lowercased YouTube URLs

YouTube video URLs typically look like one of these:

- `https://www.youtube.com/watch?v=urEaHW-emY4`
- `https://youtu.be/urEaHW-emY4`

The key part is the **video ID**—an 11-character string (yes, exactly 11 characters) made up of uppercase letters, lowercase letters, numbers, and special characters like hyphens and underscores (e.g., `urEaHW-emY4`).

Due to a frontend bug, these URLs were being lowercased (e.g., `ureahw-emy4`) before storage. Lowercasing breaks them because YouTube IDs are case-sensitive. A simple search or log dive? Nope— the transformation happened client-side, leaving no server-side evidence of the original.

## Brute Force to the Rescue

Here's where it gets fun (or masochistic, depending on your love for combinatorics). Since video IDs are fixed at 11 characters, and only alphabetic characters are case-sensitive, we can generate all possible case variations of the lowercased ID.

- **Worst-case scenario**: If all 11 characters are letters, there are \(2^{11} = 2048\) permutations (each letter can be upper or lower case).
- **Real-world average**: Most IDs mix letters, numbers, and symbols. Numbers and symbols aren't case-sensitive, so the actual number of permutations is often much lower—closer to a few hundred or less.
- **Strategy**:
  1. Extract the lowercased video ID from your stored URL.
  2. Generate all possible case combinations.
  3. Validate each one to find the real YouTube video.

This is feasible because 2048 is a tiny number for a computer. But how do we validate without false positives?

## Why Simple HTTP Requests Fail

You might think: "Just send a GET request and check the status code!" Nope. YouTube is a Single-Page Application (SPA), so:

- A valid URL like `https://www.youtube.com/watch?v=BxrUJ6nhZA4` returns HTTP 200 OK.
- An invalid one like `https://www.youtube.com/watch?v=BxrUJ6nhZa4` _also_ returns 200 OK, even if the UI shows a "Video unavailable" message.

SPAs route everything client-side, so the server always serves the app (200 OK) and lets JavaScript handle errors. Status codes are useless here.

## Validating with yt-dlp

Enter [yt-dlp](https://github.com/yt-dlp/yt-dlp), a powerful command-line tool for downloading YouTube videos (a fork of youtube-dl). We use it with `--skip-download` to check metadata without fetching the video.

- **Valid URL**:

  ```sh
  yt-dlp --skip-download --get-id https://www.youtube.com/watch?v=BxrUJ6nhZA4
  ```

  Output: `BxrUJ6nhZA4` (the video ID, confirming it's real).

- **Invalid URL**:
  ```sh
  yt-dlp --skip-download --get-id https://www.youtube.com/watch?v=BxrUJ6nhZa4
  ```
  Output: `ERROR: [youtube] BxrUJ6nhZa4: Video unavailable`.

Perfect! It reliably distinguishes valid from invalid without downloading anything. Install it via pip (`pip install yt-dlp`) or your package manager.

## Implementing the Brute-Force Script

Now, let's automate this. Below is an AI-generated Bash script (easy to run on most systems) that:

- Takes a lowercased video ID as input.
- Generates all case permutations (optimizing for non-letters).
- Validates each with yt-dlp in parallel for speed.
- Outputs valid URLs.

### Sample Bash Script

Save this as `recover_youtube.sh` and make it executable (`chmod +x recover_youtube.sh`). It requires `yt-dlp` and `parallel` (install via `sudo apt install parallel` on Ubuntu or similar).

```bash
#!/bin/bash

# Usage: ./recover_youtube.sh <lowercased_video_id>
# Example: ./recover_youtube.sh ureahw-emy4

if [ $# -ne 1 ]; then
  echo "Usage: $0 <lowercased_video_id>"
  exit 1
fi

LOWER_ID="$1"
ID_LENGTH=${#LOWER_ID}

if [ "$ID_LENGTH" -ne 11 ]; then
  echo "Error: Video ID must be exactly 11 characters."
  exit 1
fi

# Function to generate all case permutations
generate_permutations() {
  local str="$1"
  local prefix="$2"
  local index="$3"

  if [ "$index" -eq "${#str}" ]; then
    echo "$prefix"
    return
  fi

  local char="${str:$index:1}"
  local lower=$(echo "$char" | tr '[:upper:]' '[:lower:]')
  local upper=$(echo "$char" | tr '[:lower:]' '[:upper:]')

  if [[ "$char" =~ [a-zA-Z] ]]; then
    # Case-sensitive: recurse for both cases
    generate_permutations "$str" "$prefix$lower" "$((index+1))"
    generate_permutations "$str" "$prefix$upper" "$((index+1))"
  else
    # Not a letter: only one option
    generate_permutations "$str" "$prefix$char" "$((index+1))"
  fi
}

# Generate permutations
PERMS=$(generate_permutations "$LOWER_ID" "" 0)

# Function to validate a single ID
validate_id() {
  local vid_id="$1"
  local output
  output=$(yt-dlp --skip-download --get-id "https://www.youtube.com/watch?v=$vid_id" 2>&1)
  if [[ "$output" == "$vid_id" ]]; then
    echo "VALID: https://www.youtube.com/watch?v=$vid_id"
  fi
}

export -f validate_id

# Validate in parallel (adjust --jobs for your CPU)
echo "$PERMS" | parallel --jobs 4 validate_id {}

echo "Done! If multiple valids appear, manually verify thumbnails or metadata."
```

### How It Works

- **Permutation Generation**: Recursively builds case combos, skipping non-letters to minimize work.
- **Parallel Validation**: Uses GNU Parallel to check multiple URLs at once (throttle with `--jobs` to avoid rate-limiting).
- **Output**: Prints only valid URLs. Run it like `./recover_youtube.sh ureahw-emy4`.

**Tips and Caveats**:

- **Rate Limiting**: YouTube might throttle if you hammer too many requests. Add delays (`sleep 1`) if needed.
- **Edge Cases**: If the ID has no letters, there's only 1 permutation. If all letters, expect 2048 checks (takes ~10-20 minutes with parallelism).

## Conclusion

This brute-force hack turned a data disaster into a quick win. We recovered dozens of URLs without manual guesswork. It's a reminder that sometimes, the "dumb" solution is the smartest—especially when logs fail you.
