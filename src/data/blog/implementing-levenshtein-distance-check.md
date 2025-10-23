---
title: "Implementing Levenshtein Distance Check in Kotlin"
description: "Learn how to implement a recursive Levenshtein distance checker in Kotlin that determines if two words are within a specified edit distance."
pubDatetime: 2025-10-23T00:00:00.000Z
tags: ["kotlin", "algorithms", "Levenshtein"]
---

## Table of contents

## What is Levenshtein Distance?

Levenshtein distance (also known as edit distance) is a measure of the similarity between two strings. It represents the minimum number of single-character edits required to transform one string into another.

In this implementation, we're not calculating the exact distance, but rather checking if two words are within `D` Levenshtein distance from each other. This is useful for fuzzy matching, spell checking, and search functionality.

## Understanding the Operations

In Levenshtein distance calculation, we can perform three operations:

1. **Addition** - Add a character to the string
2. **Deletion** - Remove a character from the string
3. **Substitution** - Replace one character with another

Each operation increases the Levenshtein distance by 1.

## Implementation

We'll implement a function `levenshteinCheck` that checks if two words `word1` and `word2` are within `D` Levenshtein distance.

### Base Cases

First, let's handle the edge case when `D` is negative:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    return false
}
```

If `D` is negative, it's impossible for any two strings to be within that distance.

### Handling Empty Strings

Next, we need to handle cases where either `word1` or `word2` is empty:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    if (word1.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to delete all the remaining characters
         * of `word2`. Therefore `D` must be >= word2.length
         */
        return D >= word2.length
    }

    if (word2.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to add all the remaining characters of
         * `word1` into `word2`. Therefore `D` must be >= word1.length
         */
        return D >= word1.length
    }


    return false
}
```

- If `word1` is empty, we need to delete all characters from `word2` to match it
- If `word2` is empty, we need to add all characters from `word1` to match it

### Recursive Operations

Now let's implement the three main operations recursively:

#### 1. Deletion Operation

Delete the first character from `word2`:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    if (word1.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to delete all the remaining characters
         * of `word2`. Therefore `D` must be >= word2.length
         */
        return D >= word2.length
    }

    if (word2.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to add all the remaining characters of
         * `word1` into `word2`. Therefore `D` must be >= word1.length
         */
        return D >= word1.length
    }


    /**
     * Once we deleted firstCharacter from `word2`, we will have to two new words `word1` and `word2[1:]`
     * and if those words are within D-1 levenshtein distance then we know `word1` and `word2` is within
     * D levenshtein distance too
     */

    if (levenshteinCheck(word1, word2.substring(1), D - 1)) {
        return true
    }

    return false
}
```

#### 2. Addition Operation

Add the first character from `word1` to the start of `word2`:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    if (word1.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to delete all the remaining characters
         * of `word2`. Therefore `D` must be >= word2.length
         */
        return D >= word2.length
    }

    if (word2.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to add all the remaining characters of
         * `word1` into `word2`. Therefore `D` must be >= word1.length
         */
        return D >= word1.length
    }


    /**
     * Once we deleted firstCharacter from `word2`, we will have to two new words `word1` and `word2[1:]`
     * and if those words are within D-1 levenshtein distance then we know `word1` and `word2` is within
     * D levenshtein distance too
     */

    if (levenshteinCheck(word1, word2.substring(1), D - 1)) {
        return true
    }

    /**
     * Once we added the firstCharacter from `word1` to `word2`. We know `word1[0] == word2[0]`. Therefore,
     * if these two new words `word1[1:]` and `word2` are within `D - 1` Levenshtein distance. Then we
     * can be sure that `word1` and `word2` are also within `D` Levenshtein distance
     */

    if (levenshteinCheck(word1.substring(1), word2, D - 1)) {
        return true
    }

    return false
}
```

#### 3. Substitution Operation

Substitute `word2[0]` with `word1[0]`:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    if (word1.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to delete all the remaining characters
         * of `word2`. Therefore `D` must be >= word2.length
         */
        return D >= word2.length
    }

    if (word2.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to add all the remaining characters of
         * `word1` into `word2`. Therefore `D` must be >= word1.length
         */
        return D >= word1.length
    }


    /**
     * Once we deleted firstCharacter from `word2`, we will have to two new words `word1` and `word2[1:]`
     * and if those words are within D-1 levenshtein distance then we know `word1` and `word2` is within
     * D levenshtein distance too
     */

    if (levenshteinCheck(word1, word2.substring(1), D - 1)) {
        return true
    }

    /**
     * Once we added the firstCharacter from `word1` to `word2`. We know `word1[0] == word2[0]`. Therefore,
     * if these two new words `word1[1:]` and `word2` are within `D - 1` Levenshtein distance. Then we
     * can be sure that `word1` and `word2` are also within `D` Levenshtein distance
     */

    if (levenshteinCheck(word1.substring(1), word2, D - 1)) {
        return true
    }

    /**
     * Once we substituted `word2[0]` with `word1[0]`, we know `word1[0] == word2[0]`. Therefore, if these
     * two need words `word1[1:]` and `word2[1:]` are within `D - 1` Levenshtein distance. Then we can
     * be sure that `word1` and `word2` also within `D` Levenshtein distance
     */
    if (levenshteinCheck(word1.substring(1), word2.substring(1), D - 1)) {
        return true
    }


    return false
}
```

### Hanlding Matching Characters

If the first characters of both words already match, we don't need to perform any operation:

```kotlin
/**
 * Checks if the two words `word1` and `word2` are within
 * levenshteinDistance of D
 */
fun levenshteinCheck(word1: String, word2: String, D: Int): Boolean {
    if (D < 0) {
        return false
    }

    if (word1.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to delete all the remaining characters
         * of `word2`. Therefore `D` must be >= word2.length
         */
        return D >= word2.length
    }

    if (word2.length == 0) {
        /**
         * This means to convert `word2` to `word1` we will have to add all the remaining characters of
         * `word1` into `word2`. Therefore `D` must be >= word1.length
         */
        return D >= word1.length
    }


    /**
     * Once we deleted firstCharacter from `word2`, we will have to two new words `word1` and `word2[1:]`
     * and if those words are within D-1 levenshtein distance then we know `word1` and `word2` is within
     * D levenshtein distance too
     */

    if (levenshteinCheck(word1, word2.substring(1), D - 1)) {
        return true
    }

    /**
     * Once we added the firstCharacter from `word1` to `word2`. We know `word1[0] == word2[0]`. Therefore,
     * if these two new words `word1[1:]` and `word2` are within `D - 1` Levenshtein distance. Then we
     * can be sure that `word1` and `word2` are also within `D` Levenshtein distance
     */

    if (levenshteinCheck(word1.substring(1), word2, D - 1)) {
        return true
    }

    /**
     * Once we substituted `word2[0]` with `word1[0]`, we know `word1[0] == word2[0]`. Therefore, if these
     * two need words `word1[1:]` and `word2[1:]` are within `D - 1` Levenshtein distance. Then we can
     * be sure that `word1` and `word2` also within `D` Levenshtein distance
     */
    if (levenshteinCheck(word1.substring(1), word2.substring(1), D - 1)) {
        return true
    }


    /**
     * In case word1[0] == word2[0], then we can skip the first character from both words and check if
     * two new words `word1[1:]` and `word2[1:]` is within `D` Levenshtein distance. If yes, then we can
     * be sure that `word1` and `word2` also will be within `D` Levenshtein distance
     */

    if (word1[0] == word2[0]) {
        if (levenshteinCheck(word1.substring(1), word2.substring(1), D)) {
            return true
        }
    }

    return false
}
```

Note that in this case, we don't decrement `D` because no edit operation was performed.

And that's it, we can definately optimise the code further but this blog post does not cover it.
