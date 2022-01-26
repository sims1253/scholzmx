---
title: "Simulating DAGs"
author: "Maximilian Scholz"
date: '2022-01-26'
slug: simulating-dags
categories: Causality
tags:
- DAG
- simulation
- brms
- Bayes
subtitle: ''
summary: Wouldn't it be cool if we could simulate data from a DAG and see for ourselves
  what happens if we used good and bad controls?
authors: [admin]
lastmod: '2022-01-26'
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
wrong if one ignores causality.
This post is basically about this paper by Cinelli, Forney, and Pearl ([2020](#ref-cinelliCrashCourseGood2020)) but as it
turns out, Richard McElreath spent an [entire lecture](https://www.youtube.com/watch?v=NSuTaeW6Orc)
on the same paper as well. While you should read the paper itself, Richard’s
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
and bad controls being those where bias is increased.
There are two kinds of neutral controls in the paper: Those that increase and
those that decrease precision when controlled for. By combining models 1, 8, 9
and 17 from the paper (in case you want to look them up) we get
a very compact DAG that allows us to include all four kinds of controls presented
in the paper at the same time. It’s also a cool dag for parameter recovery
simulation studies, as there is a single effect we are interested in.

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
the so called adjustment set. Given an exposure and outcome, the adjustment set
tells us which additional variables to add to a model, to receive an unbiased
estimator for the treatment effect.

``` r
ggdag_adjustment_set(tidy_ggdag, node_size = 14) + 
  theme(legend.position = "bottom")
```

<img src="{{< blogdown/postref >}}index_files/figure-html/adjustment-set-1.png" width="672" />

In our case, the only necessary control for an unbiased estimation is `z1`. Note
however, that there is more to an estimation besides being unbiased as we will see
in a second.

## Data Generation

Alright, let’s generate some data for this DAG.
To do this I simply used the formulas from the DAGs definition as a basis for the
data generation.
To keep things simple, I used normal distributions and simple additive linear
combinations of the variables. However DAGs do not rely on the type of model, so
you can do the same for more complex model types.
The chosen coefficients are just for convenience. While they influence the results,
they do not change the overall behavior.
The sample size was set rather low, as the observed differences
in precision decrease with sample size and I wanted to make them more visible.

``` r
N = 100

z1 = rnorm(N)
z2 = rnorm(N)
z3 = rnorm(N)

x = rnorm(N, mean = (z1 + z3), sd = 1)
y = rnorm(N, mean = (x + z1 + z2), sd = 1)
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
These are also the results of single models fit to a single dataset. For proper
parameter recovery we would have to repeat these many times over, something I
might be working on but felt a little much for this post.

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
fixef(true_model, pars = c("x"))
```

    ##   Estimate  Est.Error      Q2.5    Q97.5
    ## x 1.017021 0.07421161 0.8687428 1.160975

### Z1 Model

For the fist bad model, we leave out `z1` from the controls. This opens up the
backdoor path `x -> z1 -> y` and should bias the estimation of the effect `x` has
on `y`.

And lo and behold, that is exactly what we can observe from the summary and
posterior intervals. The model is quite certain about the effect of `x` however,
it is rather off target. There is nothing in the summary that would hint at a
sampling problem or some kind of misspecification. So without our DAG, we might
just roll with it and be confident in an effect that is roughly overestimated
by one third.

``` r
bad_model1 <- brm(
  y ~ x + z2,
  family = gaussian(),
  data=data,
  cores = 4
)
```

``` r
fixef(bad_model1, pars = c("x"))
```

    ##   Estimate  Est.Error     Q2.5    Q97.5
    ## x 1.270522 0.07936353 1.116095 1.432161

### Z2 Model

Next, we leave out `z2` from the controls. While this does not open any
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
fixef(bad_model2, pars = c("x"))
```

    ##   Estimate Est.Error      Q2.5    Q97.5
    ## x 1.008441 0.1010231 0.8123737 1.209088

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
fixef(bad_model3, pars = c("x"))
```

    ##    Estimate Est.Error      Q2.5    Q97.5
    ## x 0.9835386 0.1048379 0.7787038 1.190063

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
fixef(bad_model4, pars = c("x"))
```

    ##      Estimate Est.Error       Q2.5     Q97.5
    ## x -0.03079065 0.1093182 -0.2445922 0.1817436

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
    ## true_model -40.9       7.7  
    ## bad_model3 -42.2       7.8  
    ## bad_model1 -61.1       7.7  
    ## bad_model2 -72.0       8.1

And, we have a clear winner. `bad_model4` has a significant advantage over all
other models.
I guess that settles it.
Turns out we have been all wrong, `x` has barely any effect on `y` and if any,
it is probably negative.

And with that we will go and publish our findings for fame and fortune.
But for some reason, when it gets really quiet, there is this wailing from
beyond the veil. It almost sounds like the tormented souls of a million ignored
DAGs.

Don’t ignore your DAGs, it makes them sad.

## References

<div id="refs" class="references csl-bib-body hanging-indent">

<div id="ref-cinelliCrashCourseGood2020" class="csl-entry">

Cinelli, Carlos, Andrew Forney, and Judea Pearl. 2020. “A Crash Course in Good and Bad Controls.” *SSRN Electronic Journal*. <https://doi.org/10.2139/ssrn.3689437>.

</div>

</div>
