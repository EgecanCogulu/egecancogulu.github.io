---
title: 'Double Round Robin Simulation'
date: 2024-11-11
permalink: /posts/2024/12/round-robin/
tags:
  - Simulation
  - Double Round Robin
  - Elo System
  - Chess
---

In chess, round-robin tournaments are the standard format for determining the strongest players. Unlike elimination brackets, every participant plays against every other participant, giving a more complete picture of relative skill.

A notable example is the Candidates Tournament, where the world's top players compete in a double round-robin to earn a shot at the World Chess Championship.

The format has real strengths, but also some well-known criticisms:

1. **Potential for draws**: In later rounds, when standings are largely settled, players may agree to quick draws, especially when the result won't affect their position. These "grandmaster draws" can drain competitiveness from the final rounds.

2. **Uneven motivation**: Players out of contention may lose focus, while leaders may shift to conservative play. Both affect the quality of the games.

3. **Tiebreak ambiguity**: Ties are common, and resolving them through secondary criteria (Sonneborn-Berger scores, head-to-head results) often feels arbitrary compared to a direct playoff.

4. **Pairing order effects**: The order games are played can matter. A player who faces weaker or demotivated opponents in the final rounds may have a structural advantage unrelated to skill.

Despite these issues, the format remains popular because it gives every player equal opportunity and produces a standings table that reflects overall performance rather than a single bad day.

But how predictive are Elo ratings in this setting? To find out, I simulated a double round-robin tournament with eight of the world's top-rated players, using Elo ratings to model win probabilities for each game. The rest of this post covers the simulation setup and what the results show.
