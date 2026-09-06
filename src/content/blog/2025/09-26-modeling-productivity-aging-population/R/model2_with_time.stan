// Model 2: Productivity-Aging Model with Time Trend
// Purpose: Test if time trends help identify aging effects
// Following Gelman's workflow: Add time trend to improve identification
//
// Model: productivity_growth ~ alpha + beta_time * time_index + beta_epi * epi_normalized + error
// Added time trend to capture secular productivity changes

data {
  int<lower=1> N;                    // Number of observations
  vector[N] productivity_growth;     // Outcome: productivity growth rate
  vector[N] epi_normalized;          // Predictor: normalized aging index
  vector[N] time_index;              // Time trend (standardized years)
}

parameters {
  real alpha;                        // Intercept
  real beta_time;                    // Coefficient on time trend
  real beta_epi;                     // Coefficient on aging index
  real<lower=0> sigma;               // Residual standard deviation
}

model {
  // Priors (same as Model 1, plus time trend prior)
  alpha ~ normal(2, 1);              // Expected positive productivity growth ~2%
  beta_time ~ normal(0.02, 0.01);    // Expected small time trend ~0.02% per year
  beta_epi ~ normal(-0.5, 0.3);      // Expected negative aging effect
  sigma ~ exponential(1);            // Regularizing prior on variance

  // Likelihood with time trend
  productivity_growth ~ normal(alpha + beta_time * time_index + beta_epi * epi_normalized, sigma);
}

generated quantities {
  // For posterior predictive checks and model comparison
  vector[N] y_rep;                   // Replicated data
  vector[N] log_lik;                 // Log-likelihood for loo
  vector[N] mu;                      // Linear predictor

  for (n in 1:N) {
    mu[n] = alpha + beta_time * time_index[n] + beta_epi * epi_normalized[n];
    y_rep[n] = normal_rng(mu[n], sigma);
    log_lik[n] = normal_lpdf(productivity_growth[n] | mu[n], sigma);
  }
}