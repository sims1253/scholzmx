---
title: Simulating DAGs
description: >-
  Wouldn't it be cool if we could simulate data from a DAG and see for ourselves
  what happens if we used good and bad controls?
date: 2022-01-26T00:00:00.000Z
categories:
  - Causality
tags:
  - DAG
  - simulation
  - brms
  - Bayes
author: Maximilian Scholz
execute:
  echo: true
  eval: false
  warning: false
  message: false
format:
  md:
    variant: gfm
    preserve-yaml: true
---


# Simulating DAGs
Maximilian Scholz
2022-01-26

Have you ever wondered what would happen if you used good or bad controls in your regression? Let’s simulate some data from a directed acyclic graph (DAG) and find out!

## The DAG

Let’s start with a simple DAG that illustrates the relationship between variables:

``` r
# Create the DAG
dag <- dagify(
  Y ~ X + Z1 + Z2,
  X ~ Z1,
  Z2 ~ Z1,
  coords = list(
    x = c(X = 1, Y = 3, Z1 = 2, Z2 = 2),
    y = c(X = 1, Y = 1, Z1 = 2, Z2 = 0)
  )
)

# Plot the DAG
ggdag(dag) +
  theme_dag() +
  ggtitle("Causal DAG")
```

## Adjustment Sets

Now let’s look at what variables we need to adjust for to estimate the causal effect of X on Y:

``` r
# Find adjustment sets
adj_sets <- ggdag_adjustment_set(dag, exposure = "X", outcome = "Y")

adj_sets +
  theme_dag() +
  ggtitle("Adjustment Sets for X → Y")
```

## Simulating the Data

Based on our DAG, let’s simulate some data:

``` r
set.seed(1234)
n <- 1000

# Generate data according to the DAG
data <- tibble(
  Z1 = rnorm(n),
  Z2 = 0.5 * Z1 + rnorm(n, 0, 0.5),
  X = 0.3 * Z1 + rnorm(n, 0, 0.7),
  Y = 0.5 * X + 0.4 * Z1 + 0.2 * Z2 + rnorm(n, 0, 0.5)
)

# True effect of X on Y is 0.5

# Visualize the data
data %>%
  select(X, Y, Z1, Z2) %>%
  GGally::ggpairs() +
  ggtitle("Simulated Data Relationships")
```

## Fitting Models

Now let’s fit different models and see how including or excluding controls affects our estimates:

``` r
# Model 1: No controls (bad - confounded)
model1 <- brm(Y ~ X, data = data, refresh = 0, silent = 2)

# Model 2: Good controls (Z1)
model2 <- brm(Y ~ X + Z1, data = data, refresh = 0, silent = 2)

# Model 3: All variables (includes collider Z2 - bad)
model3 <- brm(Y ~ X + Z1 + Z2, data = data, refresh = 0, silent = 2)

# Extract coefficients for X
coef_comparison <- tibble(
  Model = c("No controls", "Good controls (Z1)", "All variables"),
  Estimate = c(
    fixef(model1)["X", "Estimate"],
    fixef(model2)["X", "Estimate"], 
    fixef(model3)["X", "Estimate"]
  ),
  Lower = c(
    fixef(model1)["X", "Q2.5"],
    fixef(model2)["X", "Q2.5"],
    fixef(model3)["X", "Q2.5"]
  ),
  Upper = c(
    fixef(model1)["X", "Q97.5"],
    fixef(model2)["X", "Q97.5"],
    fixef(model3)["X", "Q97.5"]
  )
)

print(coef_comparison)
```

## Results

The true causal effect of X on Y is 0.5. Let’s see how our different models performed:

- **No controls**: Biased estimate due to confounding through Z1
- **Good controls (Z1)**: Unbiased estimate of the causal effect  
- **All variables**: Biased again because we’re conditioning on the collider Z2

## Conclusion

This simulation demonstrates why understanding your causal structure is crucial for making valid inferences. Including too few controls leads to confounding bias, but including too many (especially colliders) can also bias your results.

**Don’t ignore your DAGs, it makes them sad.**

## References

McElreath, R. (2020). Statistical rethinking: A Bayesian course with examples in R and Stan. CRC press.
