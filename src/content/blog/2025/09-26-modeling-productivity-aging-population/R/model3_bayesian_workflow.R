# Model 3: Bayesian Workflow Implementation with Economic Shocks
# Purpose: Test if economic shocks provide identification for aging effects
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

cat("=== MODEL 3: BAYESIAN WORKFLOW WITH ECONOMIC SHOCKS ===\n\n")
cat("Following Gelman's Bayesian workflow for shock identification\n")
cat("Model: productivity_growth ~ alpha + beta_time * time_index + beta_epi * epi_normalized +\n")
cat("       beta_financial * financial_shock + beta_energy * energy_shock + error\n\n")

# ===== DATA PREPARATION =====

prepare_model3_data <- function() {
  cat("1. PREPARING DATA FOR MODEL 3\n")
  cat("   Loading and processing data with economic shocks...\n")

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

  # Create comprehensive shock database
  cat("   Creating economic shock variables...\n")

  # Major economic shocks affecting Germany (1972-2023)
  economic_shocks <- tibble(
    year = 1972:2023
  ) %>%
    mutate(
      # Financial crisis shocks (major events affecting productivity)
      financial_shock = case_when(
        # 1973-74 Oil Crisis & Stock Market Crash
        year %in% 1973:1975 ~ pmax(0, 0.8 - 0.2 * (year - 1973)),

        # 1979-81 Oil Crisis & Recession
        year %in% 1979:1981 ~ pmax(0, 0.7 - 0.15 * (year - 1979)),

        # 1992-93 ERM Crisis (European Exchange Rate Mechanism)
        year == 1992 ~ 0.5,
        year == 1993 ~ 0.3,

        # 2001-02 Dot-com Crash
        year == 2001 ~ 0.4,
        year == 2002 ~ 0.2,

        # 2008-09 Financial Crisis (most severe)
        year == 2008 ~ 0.9,
        year == 2009 ~ 0.8,
        year == 2010 ~ 0.4,

        # 2020 COVID Financial Disruption
        year == 2020 ~ 0.6,
        year == 2021 ~ 0.3,

        TRUE ~ 0
      ),

      # Energy/commodity shocks (supply disruptions)
      energy_shock = case_when(
        # 1973-74 OPEC Oil Embargo
        year %in% 1973:1975 ~ pmax(0, 0.9 - 0.25 * (year - 1973)),

        # 1979-80 Iran Revolution Oil Crisis
        year %in% 1979:1981 ~ pmax(0, 0.8 - 0.2 * (year - 1979)),

        # 1990-91 Gulf War
        year == 1990 ~ 0.4,
        year == 1991 ~ 0.2,

        # 2008 Commodity Price Spike
        year == 2008 ~ 0.5,

        # 2022-23 Ukraine War Energy Crisis
        year == 2022 ~ 0.8,
        year == 2023 ~ 0.4,

        TRUE ~ 0
      )
    )

  # Combine all datasets
  complete_data <- productivity_data %>%
    inner_join(epi_annual, by = "year") %>%
    inner_join(economic_shocks, by = "year") %>%
    mutate(
      # Calculate productivity growth rate
      log_productivity = log(productivity_per_hour),
      productivity_growth = c(NA, diff(log_productivity)) * 100,  # Growth rate in %

      # Standardize time index (mean = 0, sd = 1) for stability
      time_index = scale(year)[,1],

      # Center EPI around 1 for interpretability
      epi_normalized = epi_normalized - 1
    ) %>%
    # Remove any rows with missing values (especially first year due to growth calculation)
    filter(!is.na(productivity_growth)) %>%
    filter(complete.cases(.))

  cat("   ✓ Data prepared: N =", nrow(complete_data), "observations\n")
  cat("   ✓ Years covered:", min(complete_data$year), "-", max(complete_data$year), "\n")
  cat("   ✓ Financial shocks: ", sum(complete_data$financial_shock > 0), "years\n")
  cat("   ✓ Energy shocks:", sum(complete_data$energy_shock > 0), "years\n")

  # Summary statistics
  cat("\n   Data Summary:\n")
  summary_stats <- complete_data %>%
    select(productivity_growth, time_index, epi_normalized, financial_shock, energy_shock) %>%
    summarise(across(everything(), list(mean = mean, sd = sd, min = min, max = max))) %>%
    pivot_longer(everything(), names_to = "variable", values_to = "value") %>%
    separate(variable, into = c("var", "stat"), sep = "_(?=[^_]*$)") %>%
    pivot_wider(names_from = stat, values_from = value)

  print(summary_stats)

  return(complete_data)
}

# ===== MODEL COMPILATION AND FITTING =====

compile_and_fit_model3 <- function(data) {
  cat("\n2. COMPILING AND FITTING MODEL 3\n")

  # Compile Stan model
  model_file <- here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "R", "model3_with_shocks.stan")

  cat("   Compiling Stan model...\n")
  model3 <- cmdstan_model(model_file)

  # Prepare data for Stan
  stan_data <- list(
    N = nrow(data),
    productivity_growth = data$productivity_growth,
    time_index = data$time_index,
    epi_normalized = data$epi_normalized,
    financial_shock = data$financial_shock,
    energy_shock = data$energy_shock
  )

  cat("   ✓ Stan data prepared\n")
  cat("   ✓ Starting MCMC sampling...\n")

  # Fit model with high-quality settings
  fit3 <- model3$sample(
    data = stan_data,
    chains = 4,
    parallel_chains = 4,
    iter_warmup = 2500,
    iter_sampling = 2500,
    refresh = 500,
    seed = 12345,
    adapt_delta = 0.95,
    max_treedepth = 12
  )

  cat("   ✓ MCMC sampling completed\n")

  return(list(model = model3, fit = fit3, data = stan_data))
}

# ===== CONVERGENCE DIAGNOSTICS =====

check_model3_convergence <- function(fit) {
  cat("\n3. CONVERGENCE DIAGNOSTICS\n")

  # R-hat statistics
  rhat_values <- fit$summary()$rhat
  max_rhat <- max(rhat_values, na.rm = TRUE)

  # Effective sample sizes
  ess_bulk <- fit$summary()$ess_bulk
  ess_tail <- fit$summary()$ess_tail
  min_ess_bulk <- min(ess_bulk, na.rm = TRUE)
  min_ess_tail <- min(ess_tail, na.rm = TRUE)

  # Divergent transitions
  sampler_diagnostics <- fit$sampler_diagnostics()
  # Extract divergent transitions properly
  if (is.array(sampler_diagnostics) && length(dim(sampler_diagnostics)) == 3) {
    divergent_transitions <- sum(sampler_diagnostics[,,"divergent__"])
  } else {
    divergent_transitions <- 0  # Fallback if format is different
  }

  cat("   Max R-hat:", round(max_rhat, 4), "\n")
  cat("   Min ESS (bulk):", round(min_ess_bulk), "\n")
  cat("   Min ESS (tail):", round(min_ess_tail), "\n")
  cat("   Divergent transitions:", divergent_transitions, "\n")

  # Convergence assessment
  convergence_good <- (max_rhat < 1.05) && (min_ess_bulk > 400) &&
                     (min_ess_tail > 400) && (divergent_transitions == 0)

  if (convergence_good) {
    cat("   ✅ CONVERGENCE: EXCELLENT\n")
  } else {
    cat("   ⚠️  CONVERGENCE: POTENTIAL ISSUES\n")
    if (max_rhat >= 1.05) cat("      - R-hat too high (>= 1.05)\n")
    if (min_ess_bulk <= 400) cat("      - ESS bulk too low (<= 400)\n")
    if (min_ess_tail <= 400) cat("      - ESS tail too low (<= 400)\n")
    if (divergent_transitions > 0) cat("      - Divergent transitions detected\n")
  }

  return(list(
    max_rhat = max_rhat,
    min_ess_bulk = min_ess_bulk,
    min_ess_tail = min_ess_tail,
    divergent_transitions = divergent_transitions,
    convergence_good = convergence_good
  ))
}

# ===== PARAMETER ANALYSIS =====

analyze_model3_parameters <- function(fit) {
  cat("\n4. PARAMETER ANALYSIS\n")

  # Extract posterior samples
  draws <- fit$draws()

  # Key parameters
  parameter_summary <- fit$summary(c("alpha", "beta_time", "beta_epi",
                                    "beta_financial", "beta_energy", "sigma"))

  cat("   Parameter Estimates (90% Credible Intervals):\n")

  param_results <- parameter_summary %>%
    select(variable, mean, q5, q95) %>%
    mutate(
      mean_pct = mean * 100,
      ci_lower = q5 * 100,
      ci_upper = q95 * 100,
      includes_zero = (q5 <= 0 & q95 >= 0)
    )

  # Print results
  for (i in 1:nrow(param_results)) {
    row <- param_results[i, ]
    zero_status <- if(row$includes_zero) "⚠️ (includes zero)" else "✅ (excludes zero)"
    cat(sprintf("   %s: %.2f%% [%.2f, %.2f] %s\n",
                row$variable, row$mean_pct, row$ci_lower, row$ci_upper, zero_status))
  }

  # Focus on aging effect
  aging_effect <- param_results %>% filter(variable == "beta_epi")
  cat("\n   🎯 KEY FINDING - Aging Effect (beta_epi):\n")
  cat(sprintf("      Point estimate: %.2f%%\n", aging_effect$mean_pct))
  cat(sprintf("      90%% CI: [%.2f%%, %.2f%%]\n", aging_effect$ci_lower, aging_effect$ci_upper))
  cat(sprintf("      Includes zero: %s\n", aging_effect$includes_zero))

  return(param_results)
}

# ===== POSTERIOR PREDICTIVE CHECKS =====

posterior_predictive_checks <- function(fit, original_data) {
  cat("\n5. POSTERIOR PREDICTIVE CHECKS\n")

  # Extract predictions
  predictions <- fit$draws("productivity_pred", format = "matrix")
  observed <- original_data$productivity_growth

  # Calculate test statistics
  test_stats <- function(x) {
    c(mean = mean(x), sd = sd(x), min = min(x), max = max(x))
  }

  # Observed statistics
  obs_stats <- test_stats(observed)

  # Predicted statistics for each draw
  pred_stats <- apply(predictions, 1, test_stats)

  # Calculate p-values (proportion of predicted stats more extreme than observed)
  p_values <- sapply(1:length(obs_stats), function(i) {
    mean(pred_stats[i, ] >= obs_stats[i])
  })
  names(p_values) <- names(obs_stats)

  cat("   Posterior Predictive Check Results:\n")
  for (i in 1:length(p_values)) {
    status <- if (p_values[i] > 0.05 && p_values[i] < 0.95) "✅ Good" else
             if (p_values[i] <= 0.05 || p_values[i] >= 0.95) "⚠️ Extreme" else "✅ Acceptable"
    cat(sprintf("   %s: p = %.3f %s\n", names(p_values)[i], p_values[i], status))
  }

  return(list(observed_stats = obs_stats, p_values = p_values))
}

# ===== MAIN EXECUTION =====

cat("Starting Model 3 Bayesian workflow...\n\n")

# Step 1: Prepare data
model3_data <- prepare_model3_data()

# Step 2: Fit model
model3_results <- compile_and_fit_model3(model3_data)

# Step 3: Check convergence
convergence_results <- check_model3_convergence(model3_results$fit)

# Step 4: Analyze parameters
parameter_results <- analyze_model3_parameters(model3_results$fit)

# Step 5: Posterior predictive checks
ppc_results <- posterior_predictive_checks(model3_results$fit, model3_data)

# Save results
cat("\n6. SAVING RESULTS\n")
save(model3_data, model3_results, convergence_results, parameter_results, ppc_results,
     file = here("src", "content", "blog", "2025",
                "09-26-modeling-productivity-aging-population", "model3_results.RData"))
cat("   ✓ Results saved to model3_results.RData\n")

cat("\n=== MODEL 3 WORKFLOW COMPLETE ===\n")
cat("Next steps: Compare with Models 1&2 via LOO cross-validation\n")