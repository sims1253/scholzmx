// Model 1: Simplest Productivity-Aging Model
// Purpose: Diagnose convergence issues in Bayesian workflow
// Following Gelman's workflow: Start with the simplest possible model
//
// Model: productivity_growth ~ alpha + beta_epi * epi_normalized + error
// No time trends, no interactions, no hierarchy

data {
  int<lower=1> N;                    // Number of observations
  vector[N] productivity_growth;     // Outcome: productivity growth rate
  vector[N] epi_normalized;          // Predictor: normalized aging index
}

parameters {
  real alpha;                        // Intercept
  real beta_epi;                     // Coefficient on aging index
  real<lower=0> sigma;               // Residual standard deviation
}

model {
  // Priors (informative, following domain knowledge)
  alpha ~ normal(2, 1);              // Expected positive productivity growth ~2%
  beta_epi ~ normal(-0.5, 0.3);      // Expected negative aging effect
  sigma ~ exponential(1);            // Regularizing prior on variance

  // Likelihood
  productivity_growth ~ normal(alpha + beta_epi * epi_normalized, sigma);
}

generated quantities {
  // For posterior predictive checks
  vector[N] y_rep;                   // Replicated data
  vector[N] log_lik;                 // Log-likelihood for loo

  for (n in 1:N) {
    y_rep[n] = normal_rng(alpha + beta_epi * epi_normalized[n], sigma);
    log_lik[n] = normal_lpdf(productivity_growth[n] | alpha + beta_epi * epi_normalized[n], sigma);
  }
}