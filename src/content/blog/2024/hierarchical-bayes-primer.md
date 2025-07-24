---
title: A Gentle Introduction to Hierarchical Bayesian Models
description: >-
  Understanding when and how to use hierarchical Bayesian models for complex
  data structures.
date: '2024-01-15'
categories:
  - Research
  - Bayesian Statistics
  - Methodology
tags:
  - hierarchical models
  - Bayesian inference
  - multilevel modeling
author: Maximilian Scholz
execute:
  echo: true
  eval: true
  warning: false
  message: false
format:
  md:
    variant: gfm
    preserve-yaml: true
---


# A Gentle Introduction to Hierarchical Bayesian Models
Maximilian Scholz
2024-01-15

Hierarchical Bayesian models are among the most powerful tools in modern statistics, yet they can seem intimidating to newcomers. In this post, I’ll walk through the key concepts and provide intuitive examples to help you understand when and how to use these models effectively.

## What Are Hierarchical Models?

At their core, hierarchical models recognize that data often have natural groupings or levels. Consider student test scores across different schools—we expect students within the same school to be more similar to each other than to students from different schools. Hierarchical models explicitly model this structure.

The key insight is that instead of treating each group as completely separate (which ignores similarities) or pooling all data together (which ignores differences), we allow groups to “borrow strength” from each other through shared higher-level parameters.

## A Simple Example: Student Performance

Let’s consider a concrete example. Suppose we’re studying math performance across 20 schools, with varying numbers of students per school.

### The Hierarchical Structure

    Level 1 (Student): Score_ij ~ Normal(μ_j, σ²)
    Level 2 (School):  μ_j ~ Normal(γ, τ²)
    Level 3 (Global):  γ ~ Normal(μ_γ, σ_γ²)

Here, each student’s score comes from a school-specific distribution, but the school means themselves come from a higher-level distribution.

### Why This Matters

1.  **Shrinkage**: Schools with few students have their estimates “shrunk” toward the global mean
2.  **Uncertainty quantification**: We properly account for both within-school and between-school variability
3.  **Predictive power**: We can make predictions for new schools or students

## Implementation in R

Here’s a basic implementation using the `rstanarm` package:

``` r
library(rstanarm)
library(dplyr)

# Simulate some example data
set.seed(123)
n_schools <- 20
n_students_per_school <- rpois(n_schools, 25)

school_effects <- rnorm(n_schools, 0, 5)
student_data <- tibble(
  school = rep(1:n_schools, n_students_per_school),
  score = rnorm(sum(n_students_per_school), 
                school_effects[school], 
                sd = 3)
)

# Fit hierarchical model
model <- stan_glmer(
  score ~ (1 | school), 
  data = student_data,
  family = gaussian()
)
```


    SAMPLING FOR MODEL 'continuous' NOW (CHAIN 1).
    Chain 1: 
    Chain 1: Gradient evaluation took 0.000152 seconds
    Chain 1: 1000 transitions using 10 leapfrog steps per transition would take 1.52 seconds.
    Chain 1: Adjust your expectations accordingly!
    Chain 1: 
    Chain 1: 
    Chain 1: Iteration:    1 / 2000 [  0%]  (Warmup)
    Chain 1: Iteration:  200 / 2000 [ 10%]  (Warmup)
    Chain 1: Iteration:  400 / 2000 [ 20%]  (Warmup)
    Chain 1: Iteration:  600 / 2000 [ 30%]  (Warmup)
    Chain 1: Iteration:  800 / 2000 [ 40%]  (Warmup)
    Chain 1: Iteration: 1000 / 2000 [ 50%]  (Warmup)
    Chain 1: Iteration: 1001 / 2000 [ 50%]  (Sampling)
    Chain 1: Iteration: 1200 / 2000 [ 60%]  (Sampling)
    Chain 1: Iteration: 1400 / 2000 [ 70%]  (Sampling)
    Chain 1: Iteration: 1600 / 2000 [ 80%]  (Sampling)
    Chain 1: Iteration: 1800 / 2000 [ 90%]  (Sampling)
    Chain 1: Iteration: 2000 / 2000 [100%]  (Sampling)
    Chain 1: 
    Chain 1:  Elapsed Time: 0.883 seconds (Warm-up)
    Chain 1:                0.791 seconds (Sampling)
    Chain 1:                1.674 seconds (Total)
    Chain 1: 

    SAMPLING FOR MODEL 'continuous' NOW (CHAIN 2).
    Chain 2: 
    Chain 2: Gradient evaluation took 2.4e-05 seconds
    Chain 2: 1000 transitions using 10 leapfrog steps per transition would take 0.24 seconds.
    Chain 2: Adjust your expectations accordingly!
    Chain 2: 
    Chain 2: 
    Chain 2: Iteration:    1 / 2000 [  0%]  (Warmup)
    Chain 2: Iteration:  200 / 2000 [ 10%]  (Warmup)
    Chain 2: Iteration:  400 / 2000 [ 20%]  (Warmup)
    Chain 2: Iteration:  600 / 2000 [ 30%]  (Warmup)
    Chain 2: Iteration:  800 / 2000 [ 40%]  (Warmup)
    Chain 2: Iteration: 1000 / 2000 [ 50%]  (Warmup)
    Chain 2: Iteration: 1001 / 2000 [ 50%]  (Sampling)
    Chain 2: Iteration: 1200 / 2000 [ 60%]  (Sampling)
    Chain 2: Iteration: 1400 / 2000 [ 70%]  (Sampling)
    Chain 2: Iteration: 1600 / 2000 [ 80%]  (Sampling)
    Chain 2: Iteration: 1800 / 2000 [ 90%]  (Sampling)
    Chain 2: Iteration: 2000 / 2000 [100%]  (Sampling)
    Chain 2: 
    Chain 2:  Elapsed Time: 0.884 seconds (Warm-up)
    Chain 2:                0.794 seconds (Sampling)
    Chain 2:                1.678 seconds (Total)
    Chain 2: 

    SAMPLING FOR MODEL 'continuous' NOW (CHAIN 3).
    Chain 3: 
    Chain 3: Gradient evaluation took 2.6e-05 seconds
    Chain 3: 1000 transitions using 10 leapfrog steps per transition would take 0.26 seconds.
    Chain 3: Adjust your expectations accordingly!
    Chain 3: 
    Chain 3: 
    Chain 3: Iteration:    1 / 2000 [  0%]  (Warmup)
    Chain 3: Iteration:  200 / 2000 [ 10%]  (Warmup)
    Chain 3: Iteration:  400 / 2000 [ 20%]  (Warmup)
    Chain 3: Iteration:  600 / 2000 [ 30%]  (Warmup)
    Chain 3: Iteration:  800 / 2000 [ 40%]  (Warmup)
    Chain 3: Iteration: 1000 / 2000 [ 50%]  (Warmup)
    Chain 3: Iteration: 1001 / 2000 [ 50%]  (Sampling)
    Chain 3: Iteration: 1200 / 2000 [ 60%]  (Sampling)
    Chain 3: Iteration: 1400 / 2000 [ 70%]  (Sampling)
    Chain 3: Iteration: 1600 / 2000 [ 80%]  (Sampling)
    Chain 3: Iteration: 1800 / 2000 [ 90%]  (Sampling)
    Chain 3: Iteration: 2000 / 2000 [100%]  (Sampling)
    Chain 3: 
    Chain 3:  Elapsed Time: 0.823 seconds (Warm-up)
    Chain 3:                0.781 seconds (Sampling)
    Chain 3:                1.604 seconds (Total)
    Chain 3: 

    SAMPLING FOR MODEL 'continuous' NOW (CHAIN 4).
    Chain 4: 
    Chain 4: Gradient evaluation took 2.3e-05 seconds
    Chain 4: 1000 transitions using 10 leapfrog steps per transition would take 0.23 seconds.
    Chain 4: Adjust your expectations accordingly!
    Chain 4: 
    Chain 4: 
    Chain 4: Iteration:    1 / 2000 [  0%]  (Warmup)
    Chain 4: Iteration:  200 / 2000 [ 10%]  (Warmup)
    Chain 4: Iteration:  400 / 2000 [ 20%]  (Warmup)
    Chain 4: Iteration:  600 / 2000 [ 30%]  (Warmup)
    Chain 4: Iteration:  800 / 2000 [ 40%]  (Warmup)
    Chain 4: Iteration: 1000 / 2000 [ 50%]  (Warmup)
    Chain 4: Iteration: 1001 / 2000 [ 50%]  (Sampling)
    Chain 4: Iteration: 1200 / 2000 [ 60%]  (Sampling)
    Chain 4: Iteration: 1400 / 2000 [ 70%]  (Sampling)
    Chain 4: Iteration: 1600 / 2000 [ 80%]  (Sampling)
    Chain 4: Iteration: 1800 / 2000 [ 90%]  (Sampling)
    Chain 4: Iteration: 2000 / 2000 [100%]  (Sampling)
    Chain 4: 
    Chain 4:  Elapsed Time: 0.851 seconds (Warm-up)
    Chain 4:                0.769 seconds (Sampling)
    Chain 4:                1.62 seconds (Total)
    Chain 4: 

``` r
# Extract school-level estimates
school_estimates <- ranef(model)$school
```

## Key Advantages

1.  **Partial pooling**: Balances complete pooling (ignoring groups) and no pooling (treating groups as unrelated)
2.  **Regularization**: Naturally prevents overfitting, especially with small group sizes
3.  **Interpretability**: Parameters have clear hierarchical interpretations
4.  **Flexibility**: Can handle unbalanced data and missing groups

## When to Use Hierarchical Models

Consider hierarchical models when:

- Your data has natural groupings (students in schools, patients in hospitals, etc.)
- Group sizes vary considerably
- You want to make predictions for new groups
- You suspect that groups share some commonalities but aren’t identical

## Common Pitfalls

1.  **Overcomplicating**: Start simple and add complexity gradually
2.  **Ignoring convergence**: Always check your MCMC diagnostics
3.  **Misspecifying priors**: Especially important for variance parameters
4.  **Not visualizing**: Plot your hierarchical structure and results

## Further Reading

For deeper dives into hierarchical modeling:

- Gelman & Hill (2007): *Data Analysis Using Regression and Multilevel/Hierarchical Models*
- McElreath (2020): *Statistical Rethinking* (Chapters 13-14)
- Kruschke (2015): *Doing Bayesian Data Analysis* (Chapters 19-20)

## Conclusion

Hierarchical Bayesian models provide a principled way to handle complex, structured data. By explicitly modeling the hierarchical structure in your data, you can make more accurate inferences and predictions while properly quantifying uncertainty.

The key is to start with simple structures and gradually add complexity as needed. Remember: the goal is insight, not just sophisticated methodology.

------------------------------------------------------------------------

*What hierarchical modeling challenges have you encountered? I’d love to hear about your experiences in the comments or via email.*
