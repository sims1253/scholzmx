---
draft: true
title: "Building a brms Custom Family for the Kumaraswarmy Distribution"
author: ''
date: '2022-01-17'
slug: custom-brms-family
categories: ["software"]
tags: ["brms", "Bayes"]
subtitle: ''
summary: "Let's create a custom family for the Kumaraswamy distribution in brms."
authors: [admin]
lastmod: '2022-01-17T15:49:04+01:00'
featured: no
image:
  caption: ''
  focal_point: ''
  preview_only: no
projects: []
bibliography: references.bib
link-citations: yes
---

# Kumaraswamy Distribution

For my current paper I am looking at unit interval distributions and one of the
more common ones to be mentioned in the literature is the Kumaraswamy distribution
Kumaraswamy ([1980](#ref-kumaraswamyGeneralizedProbabilityDensity1980)).
In this case study I will show how to build a custom brms family for the
Kumaraswamy distribution and use it to fit and post-process brms models with it.

Before we can start the implementation, let’s collect all the necessary information
about the Kumaraswamy distribution that we need. I took these from Mitnik ([2013](#ref-mitnikNewPropertiesKumaraswamy2013)).

We will start with the probability density function for the unit interval:

`$$f_x(x) = pqx^{(p-1)}(1-x^p)^{(q-1)}, 0<x<1, p > 0, q > 0$$`
Now in brms we would like to have a mean parametrization for that density. Sadly,
the mean, as given by:

`$$E(X) = qB(1 + \frac{1}{p}, q)$$`
where `\(B\)` is the beta function, which we can not invert to solve for p or q.
However, the quantile function is available in closed-form and gives us a
function for the median that we can solve for q:

`$$x = [1-(1-u)^{\frac{1}{q}}]^\frac{1}{p}, 0<u<1$$`
`$$md(X) = w = (1-0.5^\frac{1}{q})^\frac{1}{p}$$`

Such that we get
`$$q = -\frac{log(2)}{log(1-w^p)}$$`
Finally, a quick setup for my R environment, before we start with the implementation.

``` r
library(brms)
```

## Median Parametrization

To build the median parametrization I first wrote a function for the given pdf
and then one for the median parametrization, where I replaced each occurence of
q with the result from the last section. The reason I also wrote the pq-parametrization
is to make sure, that my median based implementation is correct.

``` r
pq_dkumaraswamy <- function(x, p, q){
  p*q*x^(p-1)*(1-x^p)^(q-1)
}

median_dkumaraswamy <- function(x, md, p){
  p*(-(log(2)/log(1-md^p)))*x^(p-1)*(1-x^p)^((-(log(2)/log(1-md^p)))-1)
}
```

After writing the functions, I generate some data from both of them and look at the
difference to see if they behave the same. I get the median from the closed form
function from earlier and as the plots show, the error between both implementations
is on the scale of floating point resolution.

``` r
x=seq(from=0 , to=1 , length.out=1000)[2:999]
p=2
q=2
md = (1-0.5^(1/q))^(1/p)

pq_kumaraswamy = pq_dkumaraswamy(x, p, q)
median_kumaraswamy = median_dkumaraswamy(x, md, p)

plot(pq_kumaraswamy-median_kumaraswamy)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/median-test-1.png" width="672" />

``` r
hist(pq_kumaraswamy-median_kumaraswamy)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/median-test-2.png" width="672" />

## Log-Density-Function

One trick that is used to allow computers to handle all the numerical problems
better is to work on the log scale. But to make this work, I can’t just wrap the
code in a `log()` function. Instead, I have to use the rules for logarithms like
`\(log(x^r) = rlog(x)\)`. There are also built-in functions for special cases such as the
`log1p()` function that is a robust implementation of `\(log(1+x)\)`.
At this point the density function is complete, so we add checks for boundaries
and add a switch to get the density or the log density.

``` r
dkumaraswamy <- function(x, md, p, log = FALSE){
  if (isTRUE(any(x <=0 || x>= 1))) {
    stop("x must be in (0,1).")
  }
  if (isTRUE(any(md <= 0 || md >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(p <= 0))) {
    stop("P must be above 0.")
  }
  
  if (log) {
    return(
      log(p) +
      log(log(2)) -
      log(-(log1p(-md^p))) +  
      (p-1) * log(x) +  
      ((-(log(2)/log1p(-md^p)))-1) * log1p(-x^p)  
    )
  } 
  else {
    return(
      exp(
        log(p) +
        log(log(2)) -
        log(-(log1p(-md^p))) +  
        (p-1) * log(x) +  
        ((-(log(2)/log1p(-md^p)))-1) * log1p(-x^p)
      )  
    )
  }
}
```

We use the implementation from earlier to test against implementation problems
again and can see that the error is on the float resolution scale.

``` r
simple_log_kumaraswamy = log(median_dkumaraswamy(x, md, p))
robust_log_kumaraswamy = dkumaraswamy(x, md, p, log = TRUE)

plot(simple_log_kumaraswamy-robust_log_kumaraswamy)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/log-density-test-1.png" width="672" />

``` r
hist(simple_log_kumaraswamy-robust_log_kumaraswamy)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/log-density-test-2.png" width="672" />

## RNG

Before we can start with the model fitting, we also need a random number generator.
Luckily, we have the quantile function, which is the inverse cumulative density function,
and can use the inverse CDF method to build our RNG. All that is needed is to
recover q from p and the median and feed a random uniform number between 0 and 1
into the quantile function.

``` r
rkumaraswamy <- function(n, md, p){
  if (isTRUE(any(md <= 0 || md >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(p <= 0))) {
    stop("P must be above 0.")
  }
  q = -(log(2)/log1p(-md^p))
  return(
    (1-(1-runif(n, min=0, max=1))^(1/q))^(1/p)
  )
}
```

To test our RNG, we compare a random sample drawn to the density function with
the same parameters and the median of the sample to the analytical median.
Both look similar enough, that I am confident, that the implimentation is right.

``` r
x=seq(from=0 , to=1 , length.out=1000)[2:999]
y = rkumaraswamy(10000, md, p)
hist(y)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/rng-test-1.png" width="672" />

``` r
plot(dkumaraswamy(x, md, p))
```

<img src="{{< blogdown/postref >}}index_files/figure-html/rng-test-2.png" width="672" />

``` r
median(y) - (1-0.5^(1/q))^(1/p)
```

    ## [1] -0.002445333

## stan setup

Finally the brms and stan part can start.
The first thing is to define the brms `custom_family`. The main parameter is
always called `mu`, even if it is not a mean. In the case of the Kumaraswamy
distribution, the only additional parameter is `p`.
As the median `mu` has to be in `\((0,1)\)`, the **logit** link is a reasonable default
link. `p` is constrained to positive values, which the **log** link provides.
`lb` and `ub` define lower and upper bounds for `mu` and `p` respectively.
Finally, the codomain of the Kumaraswamy distribution are the real numbers.

``` r
kumaraswamy <- custom_family(
  "kumaraswamy",
  dpars = c("mu", "p"),
  links = c("logit", "log"),
  lb = c(0, 0),
  ub = c(1, NA),
  type = "real"
)
```

The last missing piece are the implementations of the log pdf and the rng in stan
for the actual sampling. The only difference to the R implementations are the use
of the stan buil-in functions `log1m` and `uniform_rng` which can be found in the
[stan function reference](https://mc-stan.org/docs/2_28/functions-reference).

``` r
stan_funs <- "
  real kumaraswamy_lpdf(real y, real mu, real p) {
    return  (log(p) + log(log(2)) - log(-(log1m(mu^p))) + (p-1) * log(y) + ((-(log(2)/log1m(mu^p)))-1) * log1m(y^p));
  }
  
  real kumaraswamy_rng(real mu, real p) {
    return ((1-(1-uniform_rng(0, 1))^(1/(-(log(2)/log1m(mu^p)))))^(1/p));
  }
"

stanvars <- stanvar(scode = stan_funs, block = "functions")
```

## brms fitting

Now on to actually fitting a model. We start with some data drawn from the
Kumaraswamy random number generator and fit a Kumaraswamy model to it.
The only extra step for the Kumaraswamy model, compared to what you are probably
used to, is the additional `stanvars` parameter.

``` r
a = rnorm(1000)
data = list(a = a, y = rkumaraswamy(1000, inv_logit_scaled(0.2 + 0.5 * a), 4))
hist(data$y)

fit1 <- brm(
  y ~ 1 + a,
  data = data, 
  family = kumaraswamy,
  stanvars = stanvars,
  cores = 4
)
```

    ## Compiling Stan program...

    ## Start sampling

``` r
summary(fit1)
```

    ##  Family: kumaraswamy 
    ##   Links: mu = logit; p = identity 
    ## Formula: y ~ 1 + a 
    ##    Data: data (Number of observations: 1000) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept     0.22      0.02     0.18     0.26 1.00     2515     2529
    ## a             0.52      0.02     0.49     0.56 1.00     2710     2561
    ## 
    ## Family Specific Parameters: 
    ##   Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## p     3.99      0.12     3.76     4.22 1.00     2736     2677
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

``` r
plot(fit1)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/brms-kumaraswamy-1.png" width="672" /><img src="{{< blogdown/postref >}}index_files/figure-html/brms-kumaraswamy-2.png" width="672" />

The summary shows that the model is sampling well and can recover the simulation
parameters quite well. There are also no sampling problems to see in both the
Rhat, ESS and trace plot. Wonderfull.
To have something to compare to in the post processing, another model is needed:

``` r
fit2 <- brm(
  y ~ 1 + a,
  data = data,
  family = Beta(),
  cores = 4
)
```

    ## Compiling Stan program...

    ## Start sampling

``` r
summary(fit2)
```

    ##  Family: beta 
    ##   Links: mu = logit; phi = identity 
    ## Formula: y ~ 1 + a 
    ##    Data: data (Number of observations: 1000) 
    ##   Draws: 4 chains, each with iter = 2000; warmup = 1000; thin = 1;
    ##          total post-warmup draws = 4000
    ## 
    ## Population-Level Effects: 
    ##           Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## Intercept     0.19      0.02     0.15     0.22 1.00     4115     2912
    ## a             0.48      0.02     0.44     0.52 1.00     3964     2861
    ## 
    ## Family Specific Parameters: 
    ##     Estimate Est.Error l-95% CI u-95% CI Rhat Bulk_ESS Tail_ESS
    ## phi    10.03      0.42     9.22    10.88 1.00     3500     2422
    ## 
    ## Draws were sampled using sampling(NUTS). For each parameter, Bulk_ESS
    ## and Tail_ESS are effective sample size measures, and Rhat is the potential
    ## scale reduction factor on split chains (at convergence, Rhat = 1).

The summaries show that the beta model is sampling better, with higher ESS numbers.
This could be down to a more efficient implementation inside of stan or simply a
case of the beta distribution being easier to sample from than the Kumaraswamy.

## post processing

The first post processing step we take is to check the posterior predictive plots
for rough model misspecifications. For this the only part part of the
provided skeleton that needs to be adapted is the `rkumaraswamy` function.

``` r
posterior_predict_kumaraswamy <- function(i, prep, ...) {
  mu <- brms::get_dpar(prep, "mu", i = i)
  p <- brms::get_dpar(prep, "p", i = i)
  rkumaraswamy(1, mu, p)
}

pp_check(fit1)
```

    ## Using 10 posterior draws for ppc type 'dens_overlay' by default.

<img src="{{< blogdown/postref >}}index_files/figure-html/pp-check-1.png" width="672" />

The second post processing step is to compare the Kumaraswamy and beta models
using `loo_compare`. Again, the only part of the provided skeleton that has to
change is the lpdf funktion.
And loh and behold, the Kumaraswamy model is a better fit, just as we would expect.
The main difference in this case might just come down to the fact that the Beta
distribution in brms has a mean parametrization, which might struggle to conform
to the median parametrization.

``` r
log_lik_kumaraswamy <- function(i, prep) {
  mu <- brms::get_dpar(prep, "mu", i = i)
  p <- brms::get_dpar(prep, "p", i = i)
  y <- prep$data$Y[i]
  dkumaraswamy(y, mu, p, log = TRUE)
}

loo_compare(loo(fit1), loo(fit2))
```

    ##      elpd_diff se_diff
    ## fit1   0.0       0.0  
    ## fit2 -53.0       9.7

The last step of post processing that is part of the custom family vignette is
the check of the conditional effects.
This requires the calculation of the posterior mean. Luckily we already have an
equation for the mean, so we can just recover q as we did earlier and plug p and
q in to the equation for the mean.
And tada, we get a beautiful conditional effects plot.

``` r
posterior_epred_kumaraswamy <- function(prep) {
  mu <- brms::get_dpar(prep, "mu")
  p <- brms::get_dpar(prep, "p")
  q <- -(log(2)/log1p(-mu^p))
  q * beta((1+1/p), q)
}

conditional_effects(fit1)
```

<img src="{{< blogdown/postref >}}index_files/figure-html/conditional-effects-1.png" width="672" />

## Missing pieces

As the last part of this post, I want to quickly complete the the missing functions
for the Kumaraswamy distribution, that would be available for other distributions in R.
Namely the quantile and CDF functions. Luckily, we have the quantile function
given and can just solve it for u to get the CDF.

`$$x = [1-(1-u)^{\frac{1}{q}}]^\frac{1}{p}, 0<u<1$$`

``` r
qkumaraswamy <- function(u, median = 0.5, p = 1) {
  if (isTRUE(any(u <= 0 || u >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(median <= 0 || median >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(p <= 0))) {
    stop("P must be above 0.")
  }
  (1-(1-u)^(1/(-(log(2)/log1p(-median^p)))))^(1/p)
}
```

``` r
pkumaraswamy <- function(x, median = 0.5, p = 1) {
  if (isTRUE(any(x <= 0 || x >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(median <= 0 || median >= 1))) {
    stop("The median must be in (0,1).")
  }
  if (isTRUE(any(p <= 0))) {
    stop("P must be above 0.")
  }
  q <- -(log(2)/log1p(-median^p))
  1+(x^p - 1)^q
}
```

## Bibliography

<div id="refs" class="references csl-bib-body hanging-indent">

<div id="ref-kumaraswamyGeneralizedProbabilityDensity1980" class="csl-entry">

Kumaraswamy, P. 1980. “A Generalized Probability Density Function for Double-Bounded Random Processes.” *Journal of Hydrology* 46 (1): 79–88. <https://doi.org/10.1016/0022-1694(80)90036-0>.

</div>

<div id="ref-mitnikNewPropertiesKumaraswamy2013" class="csl-entry">

Mitnik, Pablo A. 2013. “New Properties of the Kumaraswamy Distribution.” *Communications in Statistics - Theory and Methods* 42 (5): 741–55. <https://doi.org/10.1080/03610926.2011.581782>.

</div>

</div>
