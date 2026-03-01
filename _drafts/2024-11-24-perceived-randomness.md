---
title: 'The Counter-Intuitiveness of "Random"'
date: 2024-11-24
permalink: /posts/2024/11/randomness/
published: false
tags:
  - Probability
  - Randomness
---

What does "random" actually look like? Most people have a confident answer: scattered, spread out, no obvious patterns. But true randomness looks nothing like that. It clusters, repeats, and surprises in ways our intuitions don't expect.

This post walks through three examples.

## Random Points Don't Spread Out

If you were asked to place 250 dots randomly on a blank square, you'd probably try to spread them out. No obvious rows or columns, but no big gaps or obvious clumps either. Something like the left panel below.

The right panel shows 250 points drawn from a true uniform distribution.

<iframe src="https://egecancogulu.github.io/images/random_points.html" style="width: 100%; height: 530px; border: none;"></iframe>

The difference is immediate. True random points cluster. There are regions with several overlapping dots and large empty patches right next to them. This is exactly what randomness produces.

The intuition failure here is subtle. When people try to make something "look random," they avoid clumps. But avoiding clumps is itself a constraint. True randomness has no such preference for uniformity.

The point density in each panel is color-coded: darker means more crowded. The human intuition panel is nearly uniform. The true random panel has clear hot spots.

## Coin Flips Don't Alternate

Imagine flipping a fair coin 100 times and writing down what you think the results look like. Most people write something that alternates fairly often (THTHTHTHHTHTH) with maybe an occasional run of two or three. Long runs of five, six, or seven feel too unlikely to write down.

In 100 fair coin flips, the expected longest run of heads (or tails) is around 6 or 7. Seeing seven heads in a row somewhere in 100 flips is more likely than not.

The visualization below compares a truly random sequence of 100 flips against a human-like sequence (generated with a 70% chance of switching at each step, mimicking how people fake randomness). Toggle between them and look at the run length distributions on the right.

<iframe src="https://egecancogulu.github.io/images/coin_runs.html" style="width: 100%; height: 510px; border: none;"></iframe>

The human-like sequence has almost no runs longer than 3. The true random sequence has several, including one of length 7. The distribution chart makes this concrete: the human version is heavily skewed toward short runs, while the true random version spreads across lengths the way probability theory predicts.

This is the gambler's fallacy. After seeing four heads in a row, the next flip feels like it should be tails. Each flip is independent, and the coin has no memory of what came before.

## Shuffle That Feels Random Isn't

Spotify's original shuffle was truly random. Users complained it was broken. Songs by the same artist kept playing back to back, and the same song sometimes came up twice in an hour. All expected outputs of a uniform random process.

Spotify eventually replaced it with a smarter algorithm that spaces artists out deliberately. The result is less random but feels more random because it matches expectations.

The visualization below shows 40 songs from 5 artists. Both rows contain the same songs: one in a true random order, the other in a smart shuffle.

<iframe src="https://egecancogulu.github.io/images/playlist_shuffle.html" style="width: 100%; height: 340px; border: none;"></iframe>

The true random row has 7 cases where the same artist plays back to back. The smart shuffle has none. The smart shuffle looks right to us. The true random one looks like something went wrong.

Neither judgment is really about randomness. It is about whether the output matches what we expect randomness to look like — which, as these three examples show, is usually wrong.
