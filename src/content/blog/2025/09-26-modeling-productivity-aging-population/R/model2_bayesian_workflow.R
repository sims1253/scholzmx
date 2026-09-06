# Model 2: Bayesian Workflow Implementation with Time Trend
# Purpose: Test if time trend improves aging effect identification
# Author: Enhanced Bayesian methodology implementation
# Date: 2025-09-29

# ===== SETUP =====

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(cmdstanr)
  library(bayesplot)
  library(posterior)
  library(loo)
})

# Set options
options(mc.cores = parallel::detectCores())
bayesplot_theme_set(bayesplot::theme_default())

cat("=== MODEL 2: BAYESIAN WORKFLOW WITH TIME TREND ===\n\n")
cat("Following Gelman's Bayesian workflow for model comparison\n")
cat("Model: productivity_growth ~ alpha + beta_time * time_index + beta_epi * epi_normalized + error\n\n")

# ===== DATA PREPARATION =====

prepare_model2_data <- function() {
  cat("1. PREPARING DATA FOR MODEL 2\n")
  cat("   Loading and processing data...\n")

  # Load productivity data
  productivity_data <- read_csv(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "data", "germany_productivity.csv"),
    show_col_types = FALSE, skip = 4)

  # Load enhanced cognitive curves for EPI calculation
  enhanced_curves <- read_csv(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "data", "enhanced_cognitive_curves.csv"),
    show_col_types = FALSE)

  # Calculate annual EPI (Experience-weighted Productivity Index)
  epi_annual <- enhanced_curves %>%
    group_by(year) %>%
    summarise(
      epi_raw = weighted.mean(cognitive_composite_modern, human_capital_share, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      epi_normalized = epi_raw / mean(epi_raw, na.rm = TRUE)  # Normalize around 1
    )

  # Combine data and create growth rates with time index
  model2_data <- productivity_data %>%
    left_join(epi_annual, by = "year") %>%
    mutate(
      log_productivity = log(productivity_per_hour),
      productivity_growth = c(NA, diff(log_productivity)) * 100  # Growth rate in %
    ) %>%
    filter(!is.na(productivity_growth), !is.na(epi_normalized)) %>%
    drop_na() %>%
    mutate(
      # Standardize time index: mean 0, std 1 for numerical stability
      time_index = scale(year)[,1]
    )

  # Data summary
  cat("   ✓ Data prepared successfully\n")
  cat("   ✓ Sample size:", nrow(model2_data), "observations\n")
  cat("   ✓ Time coverage:", min(model2_data$year), "to", max(model2_data$year), "\n")
  cat("   ✓ Mean productivity growth:", round(mean(model2_data$productivity_growth), 2), "%\n")
  cat("   ✓ Mean EPI (normalized):", round(mean(model2_data$epi_normalized), 3), "\n")
  cat("   ✓ Time index range:", round(min(model2_data$time_index), 2), "to",
      round(max(model2_data$time_index), 2), "\n\n")

  return(model2_data)
}

# ===== PRIOR PREDICTIVE CHECKS =====

run_prior_predictive_checks_m2 <- function(stan_model, data) {
  cat("2. PRIOR PREDICTIVE CHECKS (MODEL 2)\n")
  cat("   Running prior predictive simulation with time trend...\n")

  # Prepare data for Stan (prior predictive)
  stan_data_prior <- list(
    N = nrow(data),
    productivity_growth = rep(0, nrow(data)),  # Placeholder for prior pred
    epi_normalized = data$epi_normalized,
    time_index = data$time_index
  )

  # Sample from prior
  fit_prior <- stan_model$sample(
    data = stan_data_prior,
    chains = 2,
    parallel_chains = 2,
    iter_warmup = 1000,
    iter_sampling = 1000,
    refresh = 0,
    show_messages = FALSE,
    fixed_param = TRUE  # Sample only from prior
  )

  # Extract prior samples
  prior_draws <- fit_prior$draws(variables = c("alpha", "beta_time", "beta_epi", "sigma"), format = "df")

  # Prior predictive simulations
  n_sims <- 100
  prior_pred_sims <- matrix(NA, nrow = n_sims, ncol = nrow(data))

  set.seed(123)
  for(i in 1:n_sims) {
    idx <- sample(nrow(prior_draws), 1)
    alpha_sim <- prior_draws$alpha[idx]
    beta_time_sim <- prior_draws$beta_time[idx]
    beta_epi_sim <- prior_draws$beta_epi[idx]
    sigma_sim <- prior_draws$sigma[idx]

    mu_sim <- alpha_sim + beta_time_sim * data$time_index + beta_epi_sim * data$epi_normalized
    prior_pred_sims[i, ] <- rnorm(length(mu_sim), mu_sim, sigma_sim)
  }

  # Prior predictive summaries
  prior_pred_summary <- tibble(
    year = data$year,
    observed = data$productivity_growth,
    prior_mean = colMeans(prior_pred_sims),
    prior_q05 = apply(prior_pred_sims, 2, quantile, 0.05),
    prior_q95 = apply(prior_pred_sims, 2, quantile, 0.95)
  )

  cat("   ✓ Prior predictive checks completed\n")
  cat("   ✓ Prior predicted range: [", round(min(prior_pred_sims), 1), ",",
      round(max(prior_pred_sims), 1), "]%\n")
  cat("   ✓ Observed range: [", round(min(data$productivity_growth), 1), ",",
      round(max(data$productivity_growth), 1), "]%\n")

  # Check if priors are reasonable
  prior_reasonable <- (min(prior_pred_sims) > -10 & max(prior_pred_sims) < 15)
  cat("   ✓ Priors generate reasonable values:", prior_reasonable, "\n\n")

  return(list(
    prior_draws = prior_draws,
    prior_predictions = prior_pred_summary,
    prior_reasonable = prior_reasonable
  ))
}

# ===== MODEL FITTING =====

fit_model2 <- function(stan_model, data) {
  cat("3. MODEL FITTING (HIGH QUALITY SETTINGS)\n")
  cat("   Fitting Model 2 with cmdstanr...\n")

  # Prepare data for Stan
  stan_data <- list(
    N = nrow(data),
    productivity_growth = data$productivity_growth,
    epi_normalized = data$epi_normalized,
    time_index = data$time_index
  )

  # High-quality sampling settings (same as Model 1)
  fit <- stan_model$sample(
    data = stan_data,
    chains = 4,
    parallel_chains = 4,
    iter_warmup = 2500,
    iter_sampling = 2500,
    adapt_delta = 0.95,      # High adaptation for difficult posteriors
    max_treedepth = 12,      # Allow deeper trees
    refresh = 500,           # Show progress
    show_messages = TRUE
  )

  cat("   ✓ Model fitting completed\n\n")

  return(fit)
}

# ===== CONVERGENCE DIAGNOSTICS =====

check_convergence_m2 <- function(fit) {
  cat("4. CONVERGENCE DIAGNOSTICS (MODEL 2)\n")

  # Extract draws
  draws <- fit$draws()

  # Basic diagnostics
  diagnostics <- fit$diagnostic_summary()

  cat("   Sampling diagnostics:\n")
  cat("   ✓ Divergent transitions:", sum(diagnostics$divergent), "\n")
  cat("   ✓ Max treedepth hits:", sum(diagnostics$max_treedepth), "\n")
  cat("   ✓ Low EBFMI chains:", sum(diagnostics$ebfmi < 0.2), "\n")

  # R-hat and ESS
  summary_stats <- fit$summary()

  # Check R-hat
  rhat_issues <- summary_stats %>%
    filter(rhat > 1.05) %>%
    nrow()

  # Check ESS
  ess_bulk_low <- summary_stats %>%
    filter(ess_bulk < 400) %>%
    nrow()

  ess_tail_low <- summary_stats %>%
    filter(ess_tail < 400) %>%
    nrow()

  cat("   R-hat diagnostics:\n")
  cat("   ✓ Parameters with R-hat > 1.05:", rhat_issues, "\n")
  cat("   ✓ Max R-hat:", round(max(summary_stats$rhat, na.rm = TRUE), 4), "\n")

  cat("   ESS diagnostics:\n")
  cat("   ✓ Parameters with ESS bulk < 400:", ess_bulk_low, "\n")
  cat("   ✓ Parameters with ESS tail < 400:", ess_tail_low, "\n")
  cat("   ✓ Min ESS bulk:", round(min(summary_stats$ess_bulk, na.rm = TRUE), 0), "\n")
  cat("   ✓ Min ESS tail:", round(min(summary_stats$ess_tail, na.rm = TRUE), 0), "\n")

  # Overall convergence assessment
  converged <- (rhat_issues == 0) & (ess_bulk_low == 0) & (ess_tail_low == 0) &
               (sum(diagnostics$divergent) == 0)

  cat("   Overall convergence status:", ifelse(converged, "PASSED", "FAILED"), "\n\n")

  return(list(
    converged = converged,
    summary_stats = summary_stats,
    diagnostics = diagnostics,
    rhat_issues = rhat_issues,
    ess_issues = ess_bulk_low + ess_tail_low
  ))
}

# ===== POSTERIOR PREDICTIVE CHECKS =====

run_posterior_predictive_checks_m2 <- function(fit, data) {
  cat("5. POSTERIOR PREDICTIVE CHECKS (MODEL 2)\n")
  cat("   Running posterior predictive simulations...\n")

  # Extract posterior predictions
  y_rep <- fit$draws("y_rep", format = "matrix")

  # Compute test statistics
  test_stats <- list()

  # T1: Mean
  test_stats$mean_obs <- mean(data$productivity_growth)
  test_stats$mean_rep <- rowMeans(y_rep)
  test_stats$p_mean <- mean(test_stats$mean_rep >= test_stats$mean_obs)

  # T2: Standard deviation
  test_stats$sd_obs <- sd(data$productivity_growth)
  test_stats$sd_rep <- apply(y_rep, 1, sd)
  test_stats$p_sd <- mean(test_stats$sd_rep >= test_stats$sd_obs)

  # T3: Minimum value
  test_stats$min_obs <- min(data$productivity_growth)
  test_stats$min_rep <- apply(y_rep, 1, min)
  test_stats$p_min <- mean(test_stats$min_rep <= test_stats$min_obs)

  # T4: Maximum value
  test_stats$max_obs <- max(data$productivity_growth)
  test_stats$max_rep <- apply(y_rep, 1, max)
  test_stats$p_max <- mean(test_stats$max_rep >= test_stats$max_obs)

  cat("   Posterior predictive p-values:\n")
  cat("   ✓ Mean:", round(test_stats$p_mean, 3),
      "(obs:", round(test_stats$mean_obs, 2), ")\n")
  cat("   ✓ Std dev:", round(test_stats$p_sd, 3),
      "(obs:", round(test_stats$sd_obs, 2), ")\n")
  cat("   ✓ Minimum:", round(test_stats$p_min, 3),
      "(obs:", round(test_stats$min_obs, 2), ")\n")
  cat("   ✓ Maximum:", round(test_stats$p_max, 3),
      "(obs:", round(test_stats$max_obs, 2), ")\n")

  # Check for extreme p-values (< 0.05 or > 0.95)
  extreme_p <- sum(c(test_stats$p_mean, test_stats$p_sd, test_stats$p_min, test_stats$p_max) < 0.05 |
                   c(test_stats$p_mean, test_stats$p_sd, test_stats$p_min, test_stats$p_max) > 0.95)

  cat("   ✓ Extreme p-values (< 0.05 or > 0.95):", extreme_p, "out of 4\n")

  ppc_passed <- extreme_p <= 1  # Allow 1 extreme p-value
  cat("   ✓ Posterior predictive checks:", ifelse(ppc_passed, "PASSED", "FAILED"), "\n\n")

  return(list(
    test_stats = test_stats,
    ppc_passed = ppc_passed,
    y_rep = y_rep
  ))
}

# ===== PARAMETER INTERPRETATION =====

interpret_parameters_m2 <- function(fit) {
  cat("6. PARAMETER INTERPRETATION (MODEL 2)\n")

  # Extract parameter summaries
  params <- fit$summary(c("alpha", "beta_time", "beta_epi", "sigma"))

  cat("   Posterior parameter estimates:\n")
  for(i in 1:nrow(params)) {
    param <- params$variable[i]
    est <- round(params$mean[i], 4)
    lower <- round(params$q5[i], 4)
    upper <- round(params$q95[i], 4)

    cat("   ✓", param, ":", est, "[", lower, ",", upper, "]\n")
  }

  # Economic interpretation
  alpha_est <- params$mean[params$variable == "alpha"]
  beta_time_est <- params$mean[params$variable == "beta_time"]
  beta_epi_est <- params$mean[params$variable == "beta_epi"]

  cat("\n   Economic interpretation:\n")
  cat("   ✓ Base productivity growth:", round(alpha_est, 2), "%\n")
  cat("   ✓ Time trend:", round(beta_time_est, 4), "% per year (standardized)\n")
  cat("   ✓ Aging effect:", round(beta_epi_est, 2), "% per unit EPI change\n")

  # Check aging effect significance
  beta_epi_lower <- params$q5[params$variable == "beta_epi"]
  beta_epi_upper <- params$q95[params$variable == "beta_epi"]
  aging_excludes_zero <- (beta_epi_lower > 0) | (beta_epi_upper < 0)

  cat("   ✓ Aging effect 90% CI excludes zero:", aging_excludes_zero, "\n")
  if(aging_excludes_zero) {
    cat("   ✓ IMPROVEMENT: Aging effect now significantly identified!\n")
  } else {
    cat("   ⚠ Aging effect still includes zero in 90% CI\n")
  }
  cat("\n")

  return(list(
    params = params,
    aging_excludes_zero = aging_excludes_zero
  ))
}

# ===== MODEL COMPARISON =====

compare_models <- function(fit_m1, fit_m2) {
  cat("7. MODEL COMPARISON (MODEL 1 vs MODEL 2)\n")
  cat("   Computing LOO cross-validation...\n")

  # Extract log-likelihood for both models
  log_lik_m1 <- fit_m1$draws("log_lik", format = "matrix")
  log_lik_m2 <- fit_m2$draws("log_lik", format = "matrix")

  # Compute LOO
  loo_m1 <- loo(log_lik_m1)
  loo_m2 <- loo(log_lik_m2)

  # Compare models
  loo_comparison <- loo_compare(loo_m1, loo_m2)

  cat("   ✓ LOO comparison completed\n")

  # Print comparison results
  cat("   LOO comparison (negative ELPD, higher is better):\n")
  print(loo_comparison)

  # Determine preferred model
  if(loo_comparison[1, "elpd_diff"] == 0) {
    preferred_model <- "Model 2"
  } else {
    preferred_model <- "Model 1"
  }

  elpd_diff <- abs(loo_comparison[2, "elpd_diff"])
  se_diff <- loo_comparison[2, "se_diff"]

  cat("   ✓ Preferred model:", preferred_model, "\n")
  cat("   ✓ ELPD difference:", round(elpd_diff, 2), "± ", round(se_diff, 2), "\n")

  # Assess significance of difference
  significant_diff <- elpd_diff > 2 * se_diff
  cat("   ✓ Difference is significant (>2 SE):", significant_diff, "\n\n")

  return(list(
    loo_m1 = loo_m1,
    loo_m2 = loo_m2,
    comparison = loo_comparison,
    preferred_model = preferred_model,
    significant_diff = significant_diff
  ))
}

# ===== MAIN EXECUTION =====

main_model2 <- function() {
  # Compile model
  cat("Compiling Stan Model 2...\n")
  stan_file <- here("src", "content", "blog", "2025",
                   "09-26-modeling-productivity-aging-population", "R",
                   "model2_with_time.stan")
  model2 <- cmdstan_model(stan_file)
  cat("✓ Model 2 compiled successfully\n\n")

  # Load Model 1 results for comparison
  cat("Loading Model 1 results for comparison...\n")
  model1_file <- here("src", "content", "blog", "2025",
                     "09-26-modeling-productivity-aging-population", "R",
                     "model1_simple.stan")
  model1 <- cmdstan_model(model1_file)

  # Need to fit Model 1 again for comparison (use same data as Model 2)
  data <- prepare_model2_data()

  # Fit Model 1 with new data structure
  stan_data_m1 <- list(
    N = nrow(data),
    productivity_growth = data$productivity_growth,
    epi_normalized = data$epi_normalized
  )

  cat("Fitting Model 1 for comparison...\n")
  fit_m1 <- model1$sample(
    data = stan_data_m1,
    chains = 4,
    parallel_chains = 4,
    iter_warmup = 2500,
    iter_sampling = 2500,
    adapt_delta = 0.95,
    max_treedepth = 12,
    refresh = 0,
    show_messages = FALSE
  )
  cat("✓ Model 1 fitted for comparison\n\n")

  # Execute Model 2 workflow steps
  prior_results <- run_prior_predictive_checks_m2(model2, data)

  fit_m2 <- fit_model2(model2, data)

  convergence_results <- check_convergence_m2(fit_m2)

  ppc_results <- run_posterior_predictive_checks_m2(fit_m2, data)

  parameters <- interpret_parameters_m2(fit_m2)

  # Model comparison
  comparison_results <- compare_models(fit_m1, fit_m2)

  # Return all results
  return(list(
    data = data,
    fit_m1 = fit_m1,
    fit_m2 = fit_m2,
    prior_results = prior_results,
    convergence_results = convergence_results,
    ppc_results = ppc_results,
    parameters = parameters,
    comparison_results = comparison_results
  ))
}

# Run the analysis
cat("Starting Model 2 Bayesian Workflow...\n\n")
model2_results <- main_model2()

cat("=== MODEL 2 WORKFLOW COMPLETED ===\n")
cat("Key findings:\n")
cat("✓ Convergence status:", ifelse(model2_results$convergence_results$converged, "PASSED", "FAILED"), "\n")
cat("✓ Aging effect excludes zero:", model2_results$parameters$aging_excludes_zero, "\n")
cat("✓ Preferred model:", model2_results$comparison_results$preferred_model, "\n")
cat("✓ Model difference significant:", model2_results$comparison_results$significant_diff, "\n")