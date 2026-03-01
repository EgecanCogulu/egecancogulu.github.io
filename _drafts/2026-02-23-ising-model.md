---
title: 'The Ising Model: Phase Transitions and Critical Phenomena'
date: 2026-02-23
permalink: /posts/2026/02/ising-model/
tags:
  - Ising Model
  - Phase Transitions
  - Statistical Mechanics
  - Monte Carlo Simulation
  - Critical Phenomena

---

## Introduction

The **Ising model** is one of the most studied models in statistical mechanics. It consists of spins on a lattice, each pointing either "up" or "down", and despite this simplicity, produces spontaneous magnetization, long-range correlations, and sharp phase transitions.

Originally proposed by Wilhelm Lenz in 1920 and solved exactly in one dimension by Ernst Ising in 1925, it has since become a standard model for collective phenomena in magnetic materials, social systems, and biological networks. The central idea is that simple microscopic rules (each spin interacts only with its nearest neighbors) can give rise to **large-scale order from disorder**.

## Theory

### The Hamiltonian

The Ising model describes a collection of binary spins $$\sigma_i \in \\{-1, +1\\}$$ on a lattice (typically 2D in our simulations). The energy of a configuration is given by the Hamiltonian:

$$H = -J \sum_{\langle i,j \rangle} \sigma_i \sigma_j - h \sum_i \sigma_i$$

where:
- $$J$$ is the **coupling strength** between neighboring spins
- $$\langle i,j \rangle$$ denotes the sum over pairs of nearest neighbors
- $$h$$ is an external magnetic field
- The first term represents spin-spin interactions
- The second term represents the interaction with an external field

For simplicity, we typically set $$h = 0$$ (no external field) and focus on the competition between:
1. **Entropy**: which tends to disorder spins (favored at high temperature)
2. **Energy**: which tends to align spins (favored at low temperature)

### Boltzmann Distribution and Thermal Equilibrium

At thermal equilibrium, the probability of observing a configuration $$\{\sigma\}$$ is given by the Boltzmann distribution:

$$P(\{\sigma\}) = \frac{1}{Z} e^{-\beta H(\{\sigma\})}$$

where:
- $$\beta = \frac{1}{k_B T}$$ is the inverse temperature (in units where Boltzmann's constant $$k_B = 1$$)
- $$Z = \sum_{\{\sigma\}} e^{-\beta H(\{\sigma\})}$$ is the partition function (sum over all possible configurations)

### Magnetization

The **magnetization** per spin is defined as:

$$m = \frac{1}{N} \left| \sum_i \sigma_i \right|$$

where $$N$$ is the total number of spins. Below the critical temperature, the system exhibits **spontaneous magnetization**, meaning that even without an external field, the spins preferentially align in one direction, leading to $$m > 0$$. Above the critical temperature, thermal fluctuations dominate and $$m \approx 0$$.

### The Critical Temperature

In two dimensions, the **exact critical temperature** for the Ising model was determined by Lars Onsager in 1944:

$$T_c = \frac{2J}{k_B \ln(1 + \sqrt{2})} \approx 2.269 \, J$$

This is one of the few cases where a statistical mechanics model can be solved exactly. At $$T_c$$, the system exhibits **critical behavior**:
- The magnetization follows: $$m \propto (T_c - T)^{1/8}$$ near $$T_c$$ from below
- The susceptibility (response to external field) diverges
- Correlations between spins extend over arbitrarily large distances

### Long-Range Fluctuations and Correlations

While correlations between spins decay exponentially at temperatures above $$T_c$$ with characteristic length scale called the **correlation length** $$\xi$$, at criticality ($$T = T_c$$), correlations decay algebraically:

$$\langle \sigma_i \sigma_j \rangle \propto \frac{1}{r^{1/4}}$$

where $$r$$ is the distance between spins. The correlation length diverges as:

$$\xi \propto (T - T_c)^{-\nu}$$

where $$\nu \approx 1$$ is the critical exponent. At the critical temperature, distant spins are correlated, and those correlations span the entire system.

## Simulation

Adjust the temperature slider below to see how the system behaves across different regimes:

<br>
<iframe
  src="https://egecancogulu.github.io/images/ising.html"
  width="100%"
  height="600px"
  frameborder="0"
  style="border: none; width: 100%; height: 100vh; overflow: hidden;"
></iframe>
<br>

### How to Use the Simulation

Press play to start. Adjust the temperature slider to observe:

1. **Low Temperature** ($$T \ll T_c$$): The system quickly reaches a highly organized state where most spins align in one direction (either majority up or majority down). The magnetization is strong and stable. You'll notice large regions of aligned spins organizing into domains.

2. **Near Critical Temperature** ($$T \approx T_c$$): Domains of all sizes coexist and the magnetization fluctuates dramatically. The spatial patterns are fractal-like, a signature of scale invariance at the critical point.

3. **High Temperature** ($$T \gg T_c$$): Individual spins are essentially independent, randomly pointing up or down. The system appears disordered, with no preferred magnetization direction. The average magnetization approaches zero.

### Key Observations from Simulation

**Average Magnetization**: 
- Below $$T_c$$: Shows a sharp increase as temperature decreases, consistent with the theoretical prediction $$m \propto (T_c - T)^{1/8}$$
- At $$T_c$$: Exhibits critical behavior with logarithmic divergence in susceptibility
- Above $$T_c$$: Rapidly decays to zero as thermal noise dominates

**Fluctuations**:
- At criticality, the system exhibits the largest fluctuations in magnetization
- These critical fluctuations span all length scales on the lattice
- This manifests as intricate, self-similar patterns visible in the 2D visualization

**Domain Formation**: 
- Below $$T_c$$, the system organizes into domains of aligned spins
- At criticality, domains of all sizes coexist
- Above $$T_c$$, domains become transient and ephemeral

## Conclusion

The Ising model packs a lot into a minimal setup. Each spin interacts only with its neighbors, yet the collective result is a sharp phase transition, spontaneous magnetization, and scale-free correlations at criticality. It is one of the few statistical mechanics models with an exact analytical solution, which makes it a natural starting point for understanding how macroscopic order emerges from microscopic rules.

### Further Reading

- Onsager, L. (1944). "Crystal Statistics. I. A Two-Dimensional Model with an Order-Disorder Transition." Physical Review, 65(3-4), 117.
- Landau, L. D., & Lifshitz, E. M. (1980). Statistical Physics (3rd ed.). Butterworth-Heinemann.
- Newman, M. E., & Barkema, G. T. (1999). Monte Carlo Methods in Statistical Physics. Oxford University Press.
