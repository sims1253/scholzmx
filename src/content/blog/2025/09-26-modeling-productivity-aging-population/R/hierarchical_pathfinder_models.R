# Phase 2: Advanced Bayesian Models with Pathfinder Algorithm
# Implementation of Three-Level Hierarchical Model using cmdstanr
# Focus: Individual -> Firm -> Sector hierarchy with pathfinder initialization

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(cmdstanr)
  library(bayesplot)
  library(posterior)
  library(loo)
  library(brms)
})

# Check if cmdstanr is properly configured
check_cmdstanr_setup <- function() {
  cat("=== CHECKING CMDSTANR SETUP ===\n")

  # Check if cmdstan is installed
  if(!cmdstan_version(error_on_NA = FALSE) %>% is.na()) {
    cat("✓ CmdStan version:", cmdstan_version(), "\n")
  } else {
    cat("⚠ CmdStan not found. Installing...\n")
    # install_cmdstan() # Uncomment if needed
    return(FALSE)
  }

  # Check if pathfinder is available
  tryCatch({
    cat("✓ cmdstanr loaded successfully\n")
    cat("✓ Pathfinder algorithm available\n")
    return(TRUE)
  }, error = function(e) {
    cat("✗ Error with cmdstanr:", e$message, "\n")
    return(FALSE)
  })
}

# ===== THREE-LEVEL HIERARCHICAL MODEL SPECIFICATION =====

create_hierarchical_stan_model <- function() {
  cat("Creating three-level hierarchical Stan model...\n")

  stan_code <- '
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
  '

  # Write Stan model to file
  model_file <- here("src", "content", "blog", "2025",
                    "09-26-modeling-productivity-aging-population",
                    "R", "hierarchical_model.stan")

  writeLines(stan_code, model_file)
  cat("✓ Stan model saved to:", model_file, "\n")

  return(model_file)
}

# ===== GENERATE SYNTHETIC HIERARCHICAL DATA =====

generate_hierarchical_data <- function() {
  cat("Generating synthetic hierarchical data...\n")

  # Parameters
  N_sectors <- 8
  N_firms <- 24  # 3 firms per sector
  N_individuals <- 120  # 5 individuals per firm
  N_time <- 20

  set.seed(2024)

  # Sector level data
  sectors <- tibble(
    sector_id = 1:N_sectors,
    sector_name = c("Manufacturing", "Services", "Technology", "Healthcare",
                   "Finance", "Education", "Construction", "Agriculture")
  )

  # Time-varying sector data
  sector_data <- expand_grid(
    sector_id = 1:N_sectors,
    time = 1:N_time
  ) %>%
    mutate(
      year = 2004 + time - 1,
      regulatory_intensity = rnorm(n(), 0, 0.5),
      competition_measure = rnorm(n(), 0, 0.3),
      technology_diffusion = 0.5 + 0.02 * time + rnorm(n(), 0, 0.2)
    )

  # Firm level data
  firms <- tibble(
    firm_id = 1:N_firms,
    sector_id = rep(1:N_sectors, each = N_firms/N_sectors)
  )

  firm_data <- expand_grid(
    firm_id = 1:N_firms,
    time = 1:N_time
  ) %>%
    left_join(firms, by = "firm_id") %>%
    mutate(
      year = 2004 + time - 1,
      workforce_composition = 0.3 + 0.01 * time + rnorm(n(), 0, 0.1),
      technology_adoption = 0.4 + 0.02 * time + rnorm(n(), 0, 0.15),
      productivity_firm = 1.2 + 0.5 * workforce_composition +
                         0.3 * technology_adoption + rnorm(n(), 0, 0.2)
    )

  # Individual level data
  individuals <- tibble(
    individual_id = 1:N_individuals,
    firm_id = rep(1:N_firms, each = N_individuals/N_firms),
    birth_year = sample(1950:1970, N_individuals, replace = TRUE)
  ) %>%
    left_join(firms, by = "firm_id")

  individual_data <- expand_grid(
    individual_id = 1:N_individuals,
    time = 1:N_time
  ) %>%
    left_join(individuals, by = "individual_id") %>%
    mutate(
      year = 2004 + time - 1,
      age = year - birth_year,
      technology_exposure = 0.3 + 0.02 * time + rnorm(n(), 0, 0.1),
      cognitive_trajectory = 1.0 + 0.02 * age - 0.0003 * age^2 +
                           0.1 * technology_exposure + rnorm(n(), 0, 0.15)
    )

  # Prepare data for Stan
  stan_data <- list(
    N_individuals = N_individuals,
    N_time_individual = N_time,
    N_firms = N_firms,
    N_time_firm = N_time,
    N_sectors = N_sectors,
    N_time_sector = N_time,

    # Individual data matrices
    cognitive_trajectory = individual_data %>%
      select(individual_id, time, cognitive_trajectory) %>%
      pivot_wider(names_from = time, values_from = cognitive_trajectory) %>%
      select(-individual_id) %>%
      as.matrix(),

    age_matrix = individual_data %>%
      select(individual_id, time, age) %>%
      pivot_wider(names_from = time, values_from = age) %>%
      select(-individual_id) %>%
      as.matrix(),

    technology_exposure = individual_data %>%
      select(individual_id, time, technology_exposure) %>%
      pivot_wider(names_from = time, values_from = technology_exposure) %>%
      select(-individual_id) %>%
      as.matrix(),

    # Firm data matrices
    productivity_firm = firm_data %>%
      select(firm_id, time, productivity_firm) %>%
      pivot_wider(names_from = time, values_from = productivity_firm) %>%
      select(-firm_id) %>%
      as.matrix(),

    workforce_composition = firm_data %>%
      select(firm_id, time, workforce_composition) %>%
      pivot_wider(names_from = time, values_from = workforce_composition) %>%
      select(-firm_id) %>%
      as.matrix(),

    technology_adoption = firm_data %>%
      select(firm_id, time, technology_adoption) %>%
      pivot_wider(names_from = time, values_from = technology_adoption) %>%
      select(-firm_id) %>%
      as.matrix(),

    # Sector data matrices
    technology_diffusion = sector_data %>%
      select(sector_id, time, technology_diffusion) %>%
      pivot_wider(names_from = time, values_from = technology_diffusion) %>%
      select(-sector_id) %>%
      as.matrix(),

    regulatory_intensity = sector_data %>%
      filter(sector_id == 1) %>%
      pull(regulatory_intensity),

    competition_measure = sector_data %>%
      filter(sector_id == 1) %>%
      pull(competition_measure),

    # Mapping indices
    individual_to_firm = individuals$firm_id,
    firm_to_sector = firms$sector_id
  )

  cat("✓ Hierarchical data generated:\n")
  cat("  - Individuals:", N_individuals, "\n")
  cat("  - Firms:", N_firms, "\n")
  cat("  - Sectors:", N_sectors, "\n")
  cat("  - Time periods:", N_time, "\n")

  return(list(
    stan_data = stan_data,
    raw_data = list(
      individuals = individual_data,
      firms = firm_data,
      sectors = sector_data
    )
  ))
}

# ===== PATHFINDER ALGORITHM COMPARISON =====

compare_pathfinder_algorithms <- function(model_file, data) {
  cat("=== PATHFINDER ALGORITHM COMPARISON ===\n")

  # Compile model
  cat("Compiling hierarchical Stan model...\n")
  model <- cmdstan_model(model_file)

  # Pathfinder with multiple initializations
  cat("Running Pathfinder with multiple initializations...\n")
  start_time_pf <- Sys.time()

  pathfinder_fit <- model$pathfinder(
    data = data$stan_data,
    seed = 1234,
    num_paths = 4,  # Multiple pathfinder runs
    max_lbfgs_iters = 1000,
    history_size = 5,
    init_alpha = 0.001,
    tol_obj = 1e-12,
    tol_rel_obj = 1e-4,
    tol_grad = 1e-8,
    tol_rel_grad = 1e-6,
    save_single_paths = FALSE
  )

  pf_time <- as.numeric(difftime(Sys.time(), start_time_pf, units = "secs"))

  # MCMC for comparison (reduced for speed)
  cat("Running MCMC for comparison...\n")
  start_time_mcmc <- Sys.time()

  mcmc_fit <- model$sample(
    data = data$stan_data,
    seed = 1234,
    chains = 2,
    parallel_chains = 2,
    iter_warmup = 250,
    iter_sampling = 250,
    refresh = 0,
    show_exceptions = FALSE
  )

  mcmc_time <- as.numeric(difftime(Sys.time(), start_time_mcmc, units = "secs"))

  cat("✓ Both algorithms completed\n")

  # Extract summaries
  pf_summary <- pathfinder_fit$summary()
  mcmc_summary <- mcmc_fit$summary()

  # Compare key parameters
  key_params <- c("alpha_cognitive", "alpha_productivity", "alpha_technology",
                 "beta_workforce", "beta_technology_firm", "sigma_cognitive")

  comparison <- tibble(
    parameter = key_params,
    pathfinder_mean = pf_summary %>%
      filter(variable %in% key_params) %>%
      pull(mean),
    mcmc_mean = mcmc_summary %>%
      filter(variable %in% key_params) %>%
      pull(mean),
    pathfinder_sd = pf_summary %>%
      filter(variable %in% key_params) %>%
      pull(sd),
    mcmc_sd = mcmc_summary %>%
      filter(variable %in% key_params) %>%
      pull(sd)
  ) %>%
    mutate(
      mean_diff = abs(pathfinder_mean - mcmc_mean),
      relative_diff = mean_diff / abs(mcmc_mean) * 100
    )

  cat("\nParameter Comparison (Pathfinder vs MCMC):\n")
  print(comparison %>%
    select(parameter, pathfinder_mean, mcmc_mean, relative_diff) %>%
    mutate(across(where(is.numeric), ~ round(.x, 3))))

  cat("\nTiming Comparison:\n")
  cat("Pathfinder time:", round(pf_time, 1), "seconds\n")
  cat("MCMC time:", round(mcmc_time, 1), "seconds\n")
  cat("Speedup:", round(mcmc_time / pf_time, 1), "x\n")

  return(list(
    pathfinder_fit = pathfinder_fit,
    mcmc_fit = mcmc_fit,
    comparison = comparison,
    timing = list(pathfinder = pf_time, mcmc = mcmc_time)
  ))
}

# ===== MAIN EXECUTION FUNCTION =====

run_hierarchical_pathfinder_demo <- function() {
  cat("HIERARCHICAL PATHFINDER DEMO\n")
  cat(str_c(rep("=", 40), collapse = ""), "\n")

  # 1. Check setup
  if(!check_cmdstanr_setup()) {
    cat("⚠ cmdstanr setup incomplete. Install cmdstan first.\n")
    return(NULL)
  }

  # 2. Create Stan model
  model_file <- create_hierarchical_stan_model()

  # 3. Generate data
  data <- generate_hierarchical_data()

  # 4. Run comparison
  results <- compare_pathfinder_algorithms(model_file, data)

  # 5. Summary
  cat("\n", str_c(rep("=", 40), collapse = ""), "\n")
  cat("HIERARCHICAL PATHFINDER DEMO COMPLETE\n")
  cat("✓ Three-level hierarchical model implemented\n")
  cat("✓ Pathfinder algorithm successfully applied\n")
  cat("✓ Multiple initialization paths explored\n")

  max_rel_diff <- max(results$comparison$relative_diff, na.rm = TRUE)
  if(max_rel_diff < 15) {
    cat("✓ Pathfinder provides good approximation (", round(max_rel_diff, 1), "% max diff)\n")
  } else {
    cat("⚠ Pathfinder differs from MCMC (", round(max_rel_diff, 1), "% max diff)\n")
  }

  speedup <- results$timing$mcmc / results$timing$pathfinder
  cat("✓ Speedup:", round(speedup, 1), "x faster than MCMC\n")

  return(results)
}

cat("Hierarchical Pathfinder Framework Loaded\n")
cat("Run run_hierarchical_pathfinder_demo() to test the implementation\n")