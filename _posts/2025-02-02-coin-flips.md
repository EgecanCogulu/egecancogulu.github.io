---
title: 'Bayesian vs. Frequentist Approach to Probability and Uncertainty'
date: 2025-02-02
permalink: /posts/2025/02/coin-flip/
tags:
  - Bayesian vs. Frequentist Approach
  - Confidence Intervals
  - Bayes Theorem

---

When making decisions based on probability and uncertainty, first we have a choice to make in our approach. Our two choices are the **Frequentist** and the **Bayesian** interpretations. These frameworks differ fundamentally in how they interpret probability and uncertainty. Frequentists define probability as the long-run frequency of an event occurring, while Bayesians treat probability as a degree of belief that updates with new evidence.

A simple but illustrative example of these differences is the question of whether a coin is fair given some data about the coin. Suppose we flip a coin **N = 10 times**, what can we conclude about its fairness based on the observed outcome? In this post, we will explore how each approach answers this question.

## Frequentist Approach

The frequentist method estimates the probability of heads, denoted as $$p$$, based solely on observed data. A common approach is to construct a **confidence interval** for $$p$$, which provides a range of plausible values based on the sample proportion.

### Confidence Interval for Coin Fairness:

Let's say we observe **7 heads out of 10 flips**. The frequentist estimate of $$p$$ is simply:

$$\hat{p} = \frac{7}{10} = 0.70$$

Using a **95% confidence interval** for a binomial distribution:

$$ CI = \hat{p} \pm Z_{0.025} \times \sqrt{\frac{\hat{p} (1 - \hat{p})}{n}}$$

Substituting values ($$Z_{0.025} = 1.96$$, $$n = 10$$):

$$ CI = 0.70 \pm 1.96 \times \sqrt{\frac{0.70 \times 0.30}{10}} = 0.70 \pm 1.96 \times 0.145 = 0.70 \pm 0.284$$

Rounding, we get the confidence interval: **[0.416, 0.984]** or approximately **[0.42, 0.98]**. A frequentist interpretation is that if we repeated this experiment many times, 95% of such intervals would contain the true value of $$p$$. However, it does **not** tell us the probability that $$p$$ lies in this range.

## Bayesian Approach

The Bayesian method applies **Bayes' theorem** to update prior beliefs about $$p$$ based on observed data.

### Bayes’ theorem states:

$$
P(H | D) = \frac{P(D | H) P(H)}{P(D)}
$$

where:

- $$P(H\\|D)$$ is the *posterior* probability of fairness given the data (i.e. 7 heads out of 10 flips),
- $$P(D \\| H)$$ is the likelihood of observing the data under a given $$p$$,
- $$P(H)$$ is the *prior* belief about $$p$$,
- $$P(D)$$ is the marginal probability of the data.

### Choosing a Prior

A common prior for coin fairness is the **Beta distribution**: $$\text{Beta}(\alpha, \beta)$$, where $$\alpha$$ and $$\beta$$ represent prior "pseudo-counts" of heads and tails respectively. A uniform prior $$\text{Beta}(1,1)$$ assigns equal probability to all values of $$p$$ between 0 and 1, expressing complete uncertainty with no prior knowledge. This is mathematically equivalent to observing 1 hypothetical head and 1 hypothetical tail before seeing any real data.

### Updating with Data

Given 7 heads in 10 flips, the posterior follows a $$\text{Beta}(\alpha + 7, \beta + 3)$$ distribution, or $$\text{Beta}(8,4)$$. The Bayesian credible interval (analogous to the frequentist confidence interval) can be directly computed from this posterior. For this example, the 95% credible interval is approximately **[0.408, 0.891]**.

Unlike the frequentist approach, the Bayesian method allows direct probability statements: *"Given our prior belief and the observed data, there is a 95% probability that $$p$$ lies within [0.408, 0.891]."* This is a statement about $$p$$ itself, not about the repeated sampling procedure.

---

## Comparing the Two Approaches

### Key Differences

**Confidence Intervals vs. Credible Intervals:**
- **Frequentist:** The 95% confidence interval [0.42, 0.98] means that if you repeated this experiment (flip 10 coins, record heads count) infinitely many times and computed a confidence interval each time, 95% of those intervals would contain the true $$p$$. You *cannot* say "there is a 95% probability that $$p$$ lies here". Once the experiment is done, $$p$$ is either in the interval or not.
- **Bayesian:** The 95% credible interval [0.408, 0.891] means that given your prior belief and the data, there is a 95% probability that $$p$$ lies in this range. This directly answers the question most people intuitively ask.

**When to Use Each Approach:**
- Use **Frequentist** methods when: you're in a standardized scientific field with established protocols, you want to avoid subjective prior choices, or you're testing whether an effect exists at all.
- Use **Bayesian** methods when: you have meaningful prior knowledge you want to incorporate, you need to make decisions under uncertainty, or you want direct probability statements about parameters.

### Frequentist Confidence Interval Visualization

The interactive plot below shows how 95% confidence intervals change based on the observed number of heads (from 0 to 10) in 10 flips. Notice that when you observe very few or very many heads, the interval is narrower (more certain), while intermediate values show wider uncertainty.

<iframe src="https://egecancogulu.github.io/images/confidence_interval_plot_10_coin_flips.html" style="width: 1050px; height: 650px;"></iframe>

### Bayesian Posterior Visualizations

The first visualization shows the posterior distribution using a **uniform prior** $$\text{Beta}(1,1)$$, representing complete ignorance about the coin. The second visualization uses a **strong prior** that assumes the coin is fair (centered near $$p = 0.5$$). Compare the two: with the strong prior, observing 7 heads pulls the posterior less dramatically away from 0.5, because you started with a strong belief in fairness. This illustrates how prior choice affects conclusions.

<iframe src="https://egecancogulu.github.io/images/bayesian_plot_uniform_prior.html" style="width: 1050px; height: 650px;"></iframe>

Bayesian credible interval with uniform prior (minimal prior assumptions).

<iframe src="https://egecancogulu.github.io/images/bayesian_plot_strong_prior.html" style="width: 1050px; height: 650px;"></iframe>

Bayesian credible interval with strong prior (assumes coin fairness before seeing data).

## Conclusion

The frequentist and Bayesian approaches offer fundamentally different perspectives on the same data. Neither is universally "correct."

**Frequentists** ask: "If this experiment were repeated many times, what range of values would contain the true parameter 95% of the time?" This provides a principled, reproducible framework free from subjective priors.

**Bayesians** ask: "Given my prior beliefs and the data I observed, what is the probability distribution over possible parameter values?" This directly answers what most practitioners intuitively want to know, but requires specifying prior assumptions.

Choose your approach based on your goals: use frequentist confidence intervals for standardized hypothesis testing and regulatory compliance; use Bayesian credible intervals when you have prior knowledge worth incorporating and need direct probability statements. In practice, both approaches coexist. They're asking different questions about the same problem.

