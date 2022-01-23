---
draft: true
title: Simulating DAGs
author: Maximilian Scholz
date: '2022-01-23'
slug: simulating-dags
categories: ["Causality"]
tags: ["DAG", "simulation", "brms", "Bayes"]
subtitle: ''
summary: "Wouldn't it be cool if we could simulate data from a DAG and see for ourselves what happens if we used good and bad controls?"
authors: [admin]
lastmod: '2022-01-23T09:13:41+01:00'
featured: no
image:
  caption: ''
  focal_point: ''
  preview_only: no
projects: []
bibliography: references.bib
link-citations: yes
---

I came across a cool example for a DAG (thanks to a comment by [Paul Bürkner](https://twitter.com/paulbuerkner))
while working on some simulation and to me it became a somewhat minimal example
for how DAGs work, how they can help inform modeling decisions and what can go
wrong if one ignores causality. In this post I will walk you through the DAG
basics, data simulation and model fitting.

This post is basically based on this paper by Cinelli, Forney, and Pearl ([2020](#ref-cinelliCrashCourseGood2020)) but as it
turns out, Richard McElreath spent an [entire lecture](https://www.youtube.com/watch?v=NSuTaeW6Orc)
on the same paper as well. While I can recommend the paper itself, Richard’s
lectures are a treat and I can not recommend them enough.

Before we start, here are the libraries I will use throughout the rest of the code:

``` r
library(ggdag) # uses dagitty for DAG logic and creates nice plots from them
library(brms) # used to fit bayesian models instead of raw stan
library(GGally) # used for the nice pairs plot
set.seed(1235813)
```

## The DAG

The paper shows examples for good, neutral and bad controls. Good controls being
those where asymptotic bias is reduced by controlling for the respective variable
and bad controls being those where bias is increased by controlling.
There are two kinds of neutral controls in the paper. Those that increase and
those that decrease precision when controlled for. By combining models 1, 8, 9
and 17 from the paper (in case you want to look them up by themselves) we get
a very compact DAG that allows us to include all four kinds of controls presented
in the paper at the same time.

The DAG below shows the outcome `y`, the treatment/exposure `x` we’d like to
estimate the *average causal effect* of (see the paper for the difference between
average and direct effect) and the four additional control variables `z1, z2, z3, z4`.

``` r
tidy_ggdag <- tidy_dagitty(
  dagify(
    y ~ x + z1 + z2,
    x ~ z1 + z3,
    z4 ~ x + y,
    outcome = "y",
    exposure = "x"
  )
) 
ggdag(tidy_ggdag, layout = "circle") + theme_dag()
```

<img src="{{< blogdown/postref >}}index_files/figure-html/DAG-1.png" width="672" />

Something that `dagitty` or `ggdag` allow us to do automatically is to calculate
the so calld adjustment set. Given an exposure and outcome, the adjustment set
tells us which additional variables to add to a model, to receive an unbiased
estimator for the treatment effect.

``` r
ggdag_adjustment_set(tidy_ggdag, node_size = 14) + 
  theme(legend.position = "bottom")
```

<img src="{{< blogdown/postref >}}index_files/figure-html/adjustment-set-1.png" width="672" />

In our case, the only necessary control for an unbiased estimation is `z1`. Note
however, that there is more to an estimation besides unbiasednes as we will see
in a second.

## Data Generation

Alright, let’s generate some data for this DAG.
To do this I simply used the formulas from the DAGs definition as a basis for the
data generation.
To keep things simple, I used normal distributions and simple additive linear
combinations of the variables. However DAGs do not rely on the type of model, so
you can do the same for your hierarchical or multilevel model with no problem.
The chosen coefficients are completely arbitrary here and do not influence the
results considerably.
The sample size was set rather low for a simulation, as the observed differences
in precision decrease with sample size and I wanted to make them more visible.

``` r
N = 100

z1 = rnorm(N)
z2 = rnorm(N)
z3 = rnorm(N)

x = rnorm(N, mean = (z1 + z3), sd = 1)
y = rnorm(N, mean = (x + z1 + z2))
z4 = rnorm(N, mean=(y + x), sd = 1)

data = data.frame(x = x,
                  z1 = z1,
                  z2 = z2,
                  z3 = z3,
                  z4 = z4,
                  y = y)
ggpairs(data)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/data-1.png" width="672" />

You can see some quite high correlations in the pairs plot, as we would expect
from the way the data were generated. However, the correlations alone would not
tell us which variables to include or exclude from our models. Only the causal
model of the DAG can help us with that.

## Modeling

After the data generation let’s inspect how including or excluding the different
variables changes our model estimations.
One thing to remember is that we are interested in estimating the effect of `x`
on `y` and not on the effects of the four control variables.

### True Model

As a baseline, we will start with the true model. True in the sense, that it
recreates the original data generating process (of `y`). I refrained from adding
models for `x` and `z4` to keep the modeling simpler.

As we would expect from the true model, it recovers the effect for `x` quite well.

``` r
true_model <- brm(
  y ~ x + z1 + z2,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
summary(true_model)
```

    ##  Family: gaussian 
    ##   Links: mu = identity; sigma = identity 
    ## Formula: y ~ x + z1 + z2 
    ##    Data: data (Number of observations: 100) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept    -0.03      0.12    -0.26     0.21 1.00     4931     2465
    ## x             1.01      0.08     0.87     1.16 1.00     4298     2633
    ## z1            1.00      0.14     0.72     1.28 1.00     4353     3188
    ## z2            0.99      0.11     0.78     1.21 1.00     4854     3262
    ## 
    ## Family Specific Parameters: 
    ##       Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## sigma     1.13      0.08     0.98     1.30 1.00     4220     3211
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

### Z1 Model

For the fist bad model, we leave out `z1` from the controls. This opens up the
backdoor path `x -> z1 -> y` and should bias the estimation of the effect `x` has
on `y`.

And lo and behold, that is exactly what we can observe from the summary and
posterior intervals. The model is quite certain about the effect of `x` however,
it is rather off target. There is nothing in the summary that would hint at a
sampling problem or some kind of misspecification. So without our DAG, we might
just roll with it and be confident in an effect that is roughly one third
overestimated.

``` r
bad_model1 <- brm(
  y ~ x + z2,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
summary(bad_model1)
```

    ##  Family: gaussian 
    ##   Links: mu = identity; sigma = identity 
    ## Formula: y ~ x + z2 
    ##    Data: data (Number of observations: 100) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept     0.10      0.14    -0.17     0.38 1.00     4351     3288
    ## x             1.27      0.08     1.12     1.43 1.00     4545     3105
    ## z2            0.94      0.13     0.69     1.19 1.00     4300     3252
    ## 
    ## Family Specific Parameters: 
    ##       Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## sigma     1.39      0.10     1.21     1.61 1.00     4312     2890
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

### Z2 Model

Next, we leave out `z2` from the controls. While this does not open open any
backdoor paths, it increases the variation of `y` and thus should reduce the
precision of the estimated effect of `x`. This is one of the differences that
reduces with growing sample sizes.

And again, we can observe just that. While the true effect of 1 is close to the
mean of the posterior interval, the interval itself is wider than for the true model.

``` r
bad_model2 <- brm(
  y ~ x + z1,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
summary(bad_model2)
```

    ##  Family: gaussian 
    ##   Links: mu = identity; sigma = identity 
    ## Formula: y ~ x + z1 
    ##    Data: data (Number of observations: 100) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept     0.18      0.16    -0.13     0.49 1.00     3791     2621
    ## x             1.01      0.10     0.81     1.21 1.00     3594     3198
    ## z1            0.91      0.19     0.53     1.29 1.00     3298     2917
    ## 
    ## Family Specific Parameters: 
    ##       Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## sigma     1.54      0.11     1.35     1.78 1.00     3673     2979
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

### Z3 Model

Onward we go to include `z3`, which again does not open any backdoor paths.
This time, it decreases the variation of `x` and should reduce the
precision of the estimated effect of `x` that way.
Again, this is one of the differences that reduces with growing sample sizes.

As with the model for `z2` the interval mean is close to the true effect of 1 but
the interval itself is wider again.

``` r
bad_model3 <- brm(
  y ~ x + z1 + z2 + z3,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
summary(bad_model3)
```

    ##  Family: gaussian 
    ##   Links: mu = identity; sigma = identity 
    ## Formula: y ~ x + z1 + z2 + z3 
    ##    Data: data (Number of observations: 100) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept    -0.02      0.12    -0.26     0.21 1.00     4975     2850
    ## x             0.98      0.10     0.78     1.18 1.00     2601     2525
    ## z1            1.04      0.16     0.73     1.35 1.00     3011     2836
    ## z2            0.99      0.11     0.78     1.21 1.00     5221     2751
    ## z3            0.08      0.15    -0.22     0.37 1.00     2982     2970
    ## 
    ## Family Specific Parameters: 
    ##       Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## sigma     1.13      0.08     0.99     1.31 1.00     4359     2970
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

### Z4 Model

Finally we arrive at the final boss of the DAG, the collider `z4`. By controlling
for it we open the backdoor path `x -> z4 -> y`.
While there is slightly more to this, you’ll have to read the paper for that.
Noticing the backdoor path will be enough for our case here.

As with opening backdoor paths, we would expect the resulting estimation to be
biased and again, we get what we were hoping for.
This time, a lot of the posterior interval even lies on the wrong side of 0.
And as before, there is nothing in the summary and diagnostics to warn us of
our grave error.

``` r
bad_model4 <- brm(
  y ~ x + z1 + z2 + z4,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
summary(bad_model4)
```

    ##  Family: gaussian 
    ##   Links: mu = identity; sigma = identity 
    ## Formula: y ~ x + z1 + z2 + z4 
    ##    Data: data (Number of observations: 100) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept     0.01      0.08    -0.14     0.16 1.00     4283     2565
    ## x            -0.03      0.11    -0.25     0.18 1.00     2255     2336
    ## z1            0.46      0.11     0.24     0.67 1.00     2990     2849
    ## z2            0.40      0.09     0.22     0.58 1.00     2945     2968
    ## z4            0.53      0.05     0.44     0.63 1.00     2008     2242
    ## 
    ## Family Specific Parameters: 
    ##       Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## sigma     0.75      0.05     0.65     0.87 1.00     3928     2677
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

### Model Comparison

One last thing we can do with the five models we have on hand is to use some kind
of model comparison to figure out, which of those models is *the best*.
For this we will use the elpd based loo function to compare the models on their
out of sample predictions.

``` r
loo_compare(
  loo(true_model),
  loo(bad_model1),
  loo(bad_model2),
  loo(bad_model3),
  loo(bad_model4)
)
```

    ##            elpd_diff se_diff
    ## bad_model4   0.0       0.0  
    ## true_model -41.1       7.7  
    ## bad_model3 -42.0       7.8  
    ## bad_model1 -61.1       7.7  
    ## bad_model2 -71.9       8.1

And, we have a clear winner. `bad_model4` has a significant advantage over all
other models.
I guess that settles it.
Turns out we have been all wrong, `x` has barely any effect on `y` and if any,
it is probably negative.

And with that we will go and publish our paper for fame and fortune.
But for some reason, when it gets really quiet, there is this screeching from
beyond the veil. It almost sounds like the tormented souls of a million ignored
DAGs.

## References

<div id="refs" class="references csl-bib-body hanging-indent">

<div id="ref-cinelliCrashCourseGood2020" class="csl-entry">

Cinelli, Carlos, Andrew Forney, and Judea Pearl. 2020. “A Crash Course in Good and Bad Controls.” *SSRN Electronic Journal*. <https://doi.org/10.2139/ssrn.3689437>.

</div>

</div>
