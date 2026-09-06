// Model 3: Productivity-Aging Model with Economic Shocks
// Purpose: Test if economic shocks provide identification for aging effects
// Hypothesis: Shocks reveal how aging affects productivity resilience
// Author: Enhanced Bayesian methodology implementation
// Date: 2025-09-29

data {
  int<lower=0> N;                    // Number of observations
  vector[N] productivity_growth;     // Outcome: Productivity growth rates
  vector[N] time_index;             // Time trend (standardized)
  vector[N] epi_normalized;         // Aging measure (normalized EPI)
  vector[N] financial_shock;        // Financial crisis shock intensity
  vector[N] energy_shock;           // Energy/commodity shock intensity
}

parameters {
  real alpha;                       // Intercept (baseline productivity growth)
  real beta_time;                  // Time trend coefficient
  real beta_epi;                   // Aging effect (key parameter of interest)
  real beta_financial;             // Financial shock effect
  real beta_energy;                // Energy shock effect
  real<lower=0> sigma;             // Residual standard deviation
}

model {
  // Priors (following enhanced methodology)
  alpha ~ normal(2, 1);                    // Expected positive productivity growth ~2%
  beta_time ~ normal(0.02, 0.01);         // Expected small positive time trend
  beta_epi ~ normal(-0.5, 0.3);           // Expected negative aging effect
  beta_financial ~ normal(-0.8, 0.3);     // Expected negative financial shock effect
  beta_energy ~ normal(-0.6, 0.3);        // Expected negative energy shock effect
  sigma ~ exponential(1);                  // Regularizing prior on residual variance

  // Likelihood
  productivity_growth ~ normal(
    alpha +
    beta_time * time_index +
    beta_epi * epi_normalized +
    beta_financial * financial_shock +
    beta_energy * energy_shock,
    sigma
  );
}

generated quantities {
  // Posterior predictions for model checking
  vector[N] productivity_pred;
  vector[N] log_lik;

  // Generate posterior predictions
  for (n in 1:N) {
    productivity_pred[n] = normal_rng(
      alpha +
      beta_time * time_index[n] +
      beta_epi * epi_normalized[n] +
      beta_financial * financial_shock[n] +
      beta_energy * energy_shock[n],
      sigma
    );

    // Log-likelihood for LOO-CV
    log_lik[n] = normal_lpdf(
      productivity_growth[n] |
      alpha +
      beta_time * time_index[n] +
      beta_epi * epi_normalized[n] +
      beta_financial * financial_shock[n] +
      beta_energy * energy_shock[n],
      sigma
    );
  }

  // Derived quantities for interpretation
  real productivity_at_low_aging = alpha + beta_epi * (-1);    // 1 SD below mean aging
  real productivity_at_high_aging = alpha + beta_epi * 1;      // 1 SD above mean aging
  real aging_effect_range = productivity_at_high_aging - productivity_at_low_aging;

  // Shock effect magnitudes
  real financial_shock_magnitude = abs(beta_financial);
  real energy_shock_magnitude = abs(beta_energy);
  real aging_vs_financial_ratio = abs(beta_epi) / financial_shock_magnitude;
  real aging_vs_energy_ratio = abs(beta_epi) / energy_shock_magnitude;
}