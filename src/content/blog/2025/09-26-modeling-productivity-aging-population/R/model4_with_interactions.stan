// Model 4: Productivity-Aging Model with Economic Shock Interactions
// Purpose: Test if aging effects vary by shock type and magnitude
// Hypothesis: Aging effects are heterogeneous across financial vs energy shocks
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
  real beta_epi;                   // Main aging effect (key parameter of interest)
  real beta_financial;             // Main financial shock effect
  real beta_energy;                // Main energy shock effect
  real beta_epi_financial;         // Aging-financial shock interaction
  real beta_epi_energy;            // Aging-energy shock interaction
  real<lower=0> sigma;             // Residual standard deviation
}

model {
  // Priors (following enhanced methodology with informative priors for interactions)
  alpha ~ normal(2, 1);                        // Expected positive productivity growth ~2%
  beta_time ~ normal(0.02, 0.01);             // Expected small positive time trend
  beta_epi ~ normal(-0.5, 0.3);               // Expected negative aging effect
  beta_financial ~ normal(-0.8, 0.3);         // Expected negative financial shock effect
  beta_energy ~ normal(-0.6, 0.3);            // Expected negative energy shock effect

  // Informative priors for interaction terms
  beta_epi_financial ~ normal(-0.3, 0.2);     // Expected negative aging-financial interaction
  beta_epi_energy ~ normal(-0.2, 0.2);        // Expected moderate aging-energy interaction

  sigma ~ exponential(1);                      // Regularizing prior on residual variance

  // Likelihood with interaction terms
  productivity_growth ~ normal(
    alpha +
    beta_time * time_index +
    beta_epi * epi_normalized +
    beta_financial * financial_shock +
    beta_energy * energy_shock +
    beta_epi_financial * (epi_normalized .* financial_shock) +
    beta_epi_energy * (epi_normalized .* energy_shock),
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
      beta_energy * energy_shock[n] +
      beta_epi_financial * (epi_normalized[n] * financial_shock[n]) +
      beta_epi_energy * (epi_normalized[n] * energy_shock[n]),
      sigma
    );

    // Log-likelihood for LOO-CV
    log_lik[n] = normal_lpdf(
      productivity_growth[n] |
      alpha +
      beta_time * time_index[n] +
      beta_epi * epi_normalized[n] +
      beta_financial * financial_shock[n] +
      beta_energy * energy_shock[n] +
      beta_epi_financial * (epi_normalized[n] * financial_shock[n]) +
      beta_epi_energy * (epi_normalized[n] * energy_shock[n]),
      sigma
    );
  }

  // Derived quantities for interpretation
  real productivity_at_low_aging = alpha + beta_epi * (-1);    // 1 SD below mean aging
  real productivity_at_high_aging = alpha + beta_epi * 1;      // 1 SD above mean aging
  real aging_effect_range = productivity_at_high_aging - productivity_at_low_aging;

  // Main effect magnitudes
  real financial_shock_magnitude = abs(beta_financial);
  real energy_shock_magnitude = abs(beta_energy);
  real aging_vs_financial_ratio = abs(beta_epi) / financial_shock_magnitude;
  real aging_vs_energy_ratio = abs(beta_epi) / energy_shock_magnitude;

  // Interaction effect analysis
  real aging_effect_during_financial_crisis = beta_epi + beta_epi_financial;
  real aging_effect_during_energy_shock = beta_epi + beta_epi_energy;

  // Conditional aging effects at different shock intensities
  real aging_effect_no_shock = beta_epi;                                    // No shocks
  real aging_effect_mild_financial = beta_epi + beta_epi_financial * 0.5;   // Mild financial shock
  real aging_effect_severe_financial = beta_epi + beta_epi_financial * 1.0; // Severe financial shock
  real aging_effect_mild_energy = beta_epi + beta_epi_energy * 0.5;         // Mild energy shock
  real aging_effect_severe_energy = beta_epi + beta_epi_energy * 1.0;       // Severe energy shock

  // Test for significant interactions
  real financial_interaction_significant = abs(beta_epi_financial) > 0.1 ? 1 : 0;
  real energy_interaction_significant = abs(beta_epi_energy) > 0.1 ? 1 : 0;

  // Economic interpretation ratios
  real interaction_financial_vs_main = abs(beta_epi_financial) / abs(beta_epi);
  real interaction_energy_vs_main = abs(beta_epi_energy) / abs(beta_epi);

  // Shock-specific aging multipliers
  real aging_multiplier_financial = aging_effect_during_financial_crisis / aging_effect_no_shock;
  real aging_multiplier_energy = aging_effect_during_energy_shock / aging_effect_no_shock;
}
