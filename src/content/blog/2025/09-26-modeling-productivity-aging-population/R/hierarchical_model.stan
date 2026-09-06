
  data {
    // Individual level
    int<lower=1> N_individuals;
    int<lower=1> N_time_individual;
    matrix[N_individuals, N_time_individual] cognitive_trajectory;
    matrix[N_individuals, N_time_individual] age_matrix;
    matrix[N_individuals, N_time_individual] technology_exposure;

    // Firm level
    int<lower=1> N_firms;
    int<lower=1> N_time_firm;
    matrix[N_firms, N_time_firm] productivity_firm;
    matrix[N_firms, N_time_firm] workforce_composition;
    matrix[N_firms, N_time_firm] technology_adoption;

    // Sector level
    int<lower=1> N_sectors;
    int<lower=1> N_time_sector;
    matrix[N_sectors, N_time_sector] technology_diffusion;
    vector[N_time_sector] regulatory_intensity;
    vector[N_time_sector] competition_measure;

    // Mapping indices
    array[N_individuals] int<lower=1, upper=N_firms> individual_to_firm;
    array[N_firms] int<lower=1, upper=N_sectors> firm_to_sector;
  }

  parameters {
    // Individual level parameters
    real alpha_cognitive;
    real<lower=0> sigma_cognitive;
    vector[N_individuals] individual_intercept;

    // Firm level parameters
    real alpha_productivity;
    real beta_workforce;
    real beta_technology_firm;
    real<lower=0> sigma_productivity;
    vector[N_firms] firm_intercept;

    // Sector level parameters
    real alpha_technology;
    real beta_regulation;
    real beta_competition;
    real<lower=0> sigma_technology;
    vector[N_sectors] sector_intercept;

    // Time-varying parameters (state-space components)
    vector[N_time_sector] aging_effect_time;
    real<lower=0> sigma_aging_evolution;

    // Hierarchical variance parameters
    real<lower=0> sigma_individual;
    real<lower=0> sigma_firm;
    real<lower=0> sigma_sector;
  }

  transformed parameters {
    // Individual level predictions
    matrix[N_individuals, N_time_individual] mu_cognitive;

    // Firm level predictions
    matrix[N_firms, N_time_firm] mu_productivity;

    // Sector level predictions
    matrix[N_sectors, N_time_sector] mu_technology;

    // Individual level: Cognitive trajectory model
    for(i in 1:N_individuals) {
      for(t in 1:N_time_individual) {
        mu_cognitive[i,t] = alpha_cognitive +
                           individual_intercept[i] +
                           0.02 * age_matrix[i,t] +
                           -0.0003 * pow(age_matrix[i,t], 2) +
                           0.1 * technology_exposure[i,t];
      }
    }

    // Firm level: Productivity model
    for(f in 1:N_firms) {
      for(t in 1:N_time_firm) {
        mu_productivity[f,t] = alpha_productivity +
                              firm_intercept[f] +
                              beta_workforce * workforce_composition[f,t] +
                              beta_technology_firm * technology_adoption[f,t];
      }
    }

    // Sector level: Technology adoption model
    for(s in 1:N_sectors) {
      for(t in 1:N_time_sector) {
        mu_technology[s,t] = alpha_technology +
                            sector_intercept[s] +
                            beta_regulation * regulatory_intensity[t] +
                            beta_competition * competition_measure[t] +
                            aging_effect_time[t];
      }
    }
  }

  model {
    // Priors
    alpha_cognitive ~ normal(1, 0.5);
    alpha_productivity ~ normal(0, 1);
    alpha_technology ~ normal(0, 1);

    beta_workforce ~ normal(0.5, 0.2);
    beta_technology_firm ~ normal(0.3, 0.2);
    beta_regulation ~ normal(-0.2, 0.1);
    beta_competition ~ normal(0.1, 0.1);

    sigma_cognitive ~ exponential(2);
    sigma_productivity ~ exponential(1);
    sigma_technology ~ exponential(1);
    sigma_aging_evolution ~ exponential(5);

    // Hierarchical structure
    sigma_individual ~ exponential(2);
    sigma_firm ~ exponential(2);
    sigma_sector ~ exponential(2);

    individual_intercept ~ normal(0, sigma_individual);
    firm_intercept ~ normal(0, sigma_firm);
    sector_intercept ~ normal(0, sigma_sector);

    // Time-varying aging effects (random walk)
    aging_effect_time[1] ~ normal(0, 0.1);
    for(t in 2:N_time_sector) {
      aging_effect_time[t] ~ normal(aging_effect_time[t-1], sigma_aging_evolution);
    }

    // Likelihood
    for(i in 1:N_individuals) {
      for(t in 1:N_time_individual) {
        cognitive_trajectory[i,t] ~ normal(mu_cognitive[i,t], sigma_cognitive);
      }
    }

    for(f in 1:N_firms) {
      for(t in 1:N_time_firm) {
        productivity_firm[f,t] ~ normal(mu_productivity[f,t], sigma_productivity);
      }
    }

    for(s in 1:N_sectors) {
      for(t in 1:N_time_sector) {
        technology_diffusion[s,t] ~ normal(mu_technology[s,t], sigma_technology);
      }
    }
  }

  generated quantities {
    // Posterior predictive checks
    matrix[N_individuals, N_time_individual] cognitive_rep;
    matrix[N_firms, N_time_firm] productivity_rep;
    matrix[N_sectors, N_time_sector] technology_rep;

    for(i in 1:N_individuals) {
      for(t in 1:N_time_individual) {
        cognitive_rep[i,t] = normal_rng(mu_cognitive[i,t], sigma_cognitive);
      }
    }

    for(f in 1:N_firms) {
      for(t in 1:N_time_firm) {
        productivity_rep[f,t] = normal_rng(mu_productivity[f,t], sigma_productivity);
      }
    }

    for(s in 1:N_sectors) {
      for(t in 1:N_time_sector) {
        technology_rep[s,t] = normal_rng(mu_technology[s,t], sigma_technology);
      }
    }
  }
  
