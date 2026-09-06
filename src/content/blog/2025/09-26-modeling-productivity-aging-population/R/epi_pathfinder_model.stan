
  data {
    int<lower=1> N;
    int<lower=1> N_regime;

    vector[N] productivity_growth;
    vector[N] time_index;
    vector[N] epi_normalized;
    vector[N] tech_normalized;
    vector[N] innovation_normalized;
    vector[N] financial_shock;
    vector[N] energy_shock;
    vector[N] technological_revolution;
    vector[N] epi_tech_interaction;
    vector[N] age_shock_interaction;

    array[N] int<lower=1, upper=N_regime> regime_id;
  }

  parameters {
    // Fixed effects
    real alpha;                          // Intercept
    real beta_time;                      // Time trend
    real beta_epi;                       // EPI effect
    real beta_tech;                      // Technology adoption
    real beta_innovation;                // Innovation capacity
    real beta_financial;                 // Financial shocks
    real beta_energy;                    // Energy shocks
    real beta_tech_revolution;           // Technology revolution
    real beta_epi_tech;                  // EPI-technology interaction
    real beta_age_shock;                 // Age-shock interaction

    // Time-varying EPI effect (state-space component)
    vector[N] epi_effect_time;
    real<lower=0> sigma_epi_evolution;

    // Regime-specific random effects
    vector[N_regime] regime_intercept;
    real<lower=0> sigma_regime;

    // Error terms
    real<lower=0> sigma;

    // AR(1) component for temporal dependence
    real<lower=-1, upper=1> rho;
  }

  transformed parameters {
    vector[N] mu;
    vector[N] epsilon;

    // Main regression equation
    mu[1] = alpha + regime_intercept[regime_id[1]] +
            beta_time * time_index[1] +
            (beta_epi + epi_effect_time[1]) * epi_normalized[1] +
            beta_tech * tech_normalized[1] +
            beta_innovation * innovation_normalized[1] +
            beta_financial * financial_shock[1] +
            beta_energy * energy_shock[1] +
            beta_tech_revolution * technological_revolution[1] +
            beta_epi_tech * epi_tech_interaction[1] +
            beta_age_shock * age_shock_interaction[1];

    epsilon[1] = 0; // Initialize

    for (n in 2:N) {
      mu[n] = alpha + regime_intercept[regime_id[n]] +
              beta_time * time_index[n] +
              (beta_epi + epi_effect_time[n]) * epi_normalized[n] +
              beta_tech * tech_normalized[n] +
              beta_innovation * innovation_normalized[n] +
              beta_financial * financial_shock[n] +
              beta_energy * energy_shock[n] +
              beta_tech_revolution * technological_revolution[n] +
              beta_epi_tech * epi_tech_interaction[n] +
              beta_age_shock * age_shock_interaction[n] +
              rho * epsilon[n-1];

      epsilon[n] = productivity_growth[n] - mu[n];
    }
  }

  model {
    // Priors based on economic theory and empirical evidence
    alpha ~ normal(2, 1);
    beta_time ~ normal(0.02, 0.01);      // Modest positive time trend
    beta_epi ~ normal(-0.5, 0.3);        // Aging reduces productivity
    beta_tech ~ normal(0.3, 0.2);        // Technology increases productivity
    beta_innovation ~ normal(0.2, 0.15);  // Innovation positive effect
    beta_financial ~ normal(-0.8, 0.3);   // Financial shocks negative
    beta_energy ~ normal(-0.6, 0.3);      // Energy shocks negative
    beta_tech_revolution ~ normal(0.4, 0.2); // Tech revolutions positive
    beta_epi_tech ~ normal(0.2, 0.1);     // Interaction positive (tech helps aging)
    beta_age_shock ~ normal(-0.3, 0.2);   // Older populations hit harder by shocks

    // Time-varying EPI effects (random walk)
    sigma_epi_evolution ~ exponential(10);
    epi_effect_time[1] ~ normal(0, 0.1);
    for (n in 2:N) {
      epi_effect_time[n] ~ normal(epi_effect_time[n-1], sigma_epi_evolution);
    }

    // Regime effects
    sigma_regime ~ exponential(2);
    regime_intercept ~ normal(0, sigma_regime);

    // AR(1) and error
    rho ~ uniform(-1, 1);
    sigma ~ exponential(1);

    // Likelihood
    productivity_growth ~ normal(mu, sigma);
  }

  generated quantities {
    vector[N] log_lik;
    vector[N] productivity_rep;

    // For model checking
    for (n in 1:N) {
      log_lik[n] = normal_lpdf(productivity_growth[n] | mu[n], sigma);
      productivity_rep[n] = normal_rng(mu[n], sigma);
    }

    // Key economic insights
    real total_aging_effect = beta_epi + mean(epi_effect_time);
    real technology_mitigation = beta_epi_tech * mean(epi_tech_interaction);
    real net_aging_impact = total_aging_effect + technology_mitigation;
  }
  
