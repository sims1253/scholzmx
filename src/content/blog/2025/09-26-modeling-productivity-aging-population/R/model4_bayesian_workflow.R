# Model 4 Bayesian Workflow: Aging-Shock Interactions
# Purpose: Investigate if aging effects vary by shock type and magnitude
# Hypothesis: Aging effects are heterogeneous across financial vs energy shocks
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

# Set options for high-quality analysis
options(mc.cores = parallel::detectCores())
bayesplot_theme_set(bayesplot::theme_default())

cat("=== MODEL 4: AGING-SHOCK INTERACTIONS ===\n\n")
cat("Testing hypothesis: Aging effects vary by shock type\n")
cat("Research question: Are aging effects heterogeneous across economic shocks?\n\n")

# ===== DATA PREPARATION =====

cat("1. LOADING AND PREPARING DATA\n")

# Load the comprehensive dataset from Model 3
load("../model3_results.RData")
cat("   ✓ Model 3 data loaded as baseline\n")

# Verify data structure
model4_data <- model3_data  # Same data structure as Model 3
cat("   ✓ Data structure verified\n")
cat(sprintf("   Data span: %d observations (%d-%d)\n",
            nrow(model4_data), min(model4_data$year), max(model4_data$year)))

# Data quality checks for interactions
cat("   Checking interaction variable coverage:\n")
financial_episodes <- sum(model4_data$financial_shock > 0)
energy_episodes <- sum(model4_data$energy_shock > 0)
both_episodes <- sum(model4_data$financial_shock > 0 & model4_data$energy_shock > 0)

cat(sprintf("   • Financial shock episodes: %d\n", financial_episodes))
cat(sprintf("   • Energy shock episodes: %d\n", energy_episodes))
cat(sprintf("   • Overlapping episodes: %d\n", both_episodes))

# Check interaction term variation
financial_interaction_var <- var(model4_data$epi_normalized * model4_data$financial_shock)
energy_interaction_var <- var(model4_data$epi_normalized * model4_data$energy_shock)

cat(sprintf("   • Financial interaction variance: %.4f\n", financial_interaction_var))
cat(sprintf("   • Energy interaction variance: %.4f\n", energy_interaction_var))

if (financial_interaction_var > 0.01 && energy_interaction_var > 0.01) {
  cat("   ✅ Sufficient variation for interaction estimation\n")
} else {
  cat("   ⚠️ Limited interaction variation - results may be uncertain\n")
}

# ===== MODEL COMPILATION =====

cat("\n2. COMPILING MODEL 4\n")

# Compile the Stan model
model4_file <- "model4_with_interactions.stan"
if (!file.exists(model4_file)) {
  stop("Model 4 Stan file not found. Ensure model4_with_interactions.stan exists.")
}

cat("   Compiling Stan model with interactions...\n")
model4 <- cmdstan_model(model4_file)
cat("   ✅ Model 4 compiled successfully\n")

# ===== DATA LIST PREPARATION =====

cat("\n3. PREPARING STAN DATA\n")

# Prepare data list for Stan (same as Model 3 structure)
stan_data <- list(
  N = nrow(model4_data),
  productivity_growth = model4_data$productivity_growth,
  time_index = model4_data$time_index,
  epi_normalized = model4_data$epi_normalized,
  financial_shock = model4_data$financial_shock,
  energy_shock = model4_data$energy_shock
)

cat("   Data prepared for Stan:\n")
cat(sprintf("   • Observations: %d\n", stan_data$N))
cat(sprintf("   • Productivity range: [%.2f, %.2f]\n",
            min(stan_data$productivity_growth), max(stan_data$productivity_growth)))
cat(sprintf("   • EPI range: [%.2f, %.2f]\n",
            min(stan_data$epi_normalized), max(stan_data$epi_normalized)))

# ===== HIGH-QUALITY MCMC SAMPLING =====

cat("\n4. RUNNING MCMC SAMPLING\n")

# Set sampling parameters for high-quality analysis
mcmc_settings <- list(
  chains = 4,
  parallel_chains = 4,
  iter_warmup = 2500,
  iter_sampling = 2500,
  adapt_delta = 0.95,
  max_treedepth = 12,
  refresh = 250
)

cat("   MCMC settings:\n")
cat(sprintf("   • Chains: %d (parallel)\n", mcmc_settings$chains))
cat(sprintf("   • Warmup: %d iterations\n", mcmc_settings$iter_warmup))
cat(sprintf("   • Sampling: %d iterations\n", mcmc_settings$iter_sampling))
cat(sprintf("   • Total iterations per chain: %d\n",
            mcmc_settings$iter_warmup + mcmc_settings$iter_sampling))

cat("\n   Starting MCMC sampling...\n")
start_time <- Sys.time()

fit4 <- model4$sample(
  data = stan_data,
  chains = mcmc_settings$chains,
  parallel_chains = mcmc_settings$parallel_chains,
  iter_warmup = mcmc_settings$iter_warmup,
  iter_sampling = mcmc_settings$iter_sampling,
  adapt_delta = mcmc_settings$adapt_delta,
  max_treedepth = mcmc_settings$max_treedepth,
  refresh = mcmc_settings$refresh,
  show_exceptions = FALSE
)

end_time <- Sys.time()
sampling_time <- round(as.numeric(end_time - start_time, units = "secs"), 2)

cat(sprintf("\n   ✅ MCMC sampling completed in %.2f seconds\n", sampling_time))

# ===== CONVERGENCE DIAGNOSTICS =====

cat("\n5. CONVERGENCE DIAGNOSTICS\n")

# Extract samples for diagnostics
draws <- fit4$draws()

# Check Rhat values
rhat_values <- posterior::rhat(draws)
max_rhat <- max(rhat_values, na.rm = TRUE)

cat(sprintf("   Maximum R-hat: %.4f\n", max_rhat))

if (max_rhat < 1.05) {
  cat("   ✅ Excellent convergence (R-hat < 1.05)\n")
} else if (max_rhat < 1.1) {
  cat("   ⚠️ Acceptable convergence (R-hat < 1.1)\n")
} else {
  cat("   ❌ Poor convergence (R-hat >= 1.1)\n")
}

# Check effective sample sizes
ess_bulk <- posterior::ess_bulk(draws)
ess_tail <- posterior::ess_tail(draws)

min_ess_bulk <- min(ess_bulk, na.rm = TRUE)
min_ess_tail <- min(ess_tail, na.rm = TRUE)

cat(sprintf("   Minimum ESS (bulk): %.0f\n", min_ess_bulk))
cat(sprintf("   Minimum ESS (tail): %.0f\n", min_ess_tail))

if (min_ess_bulk > 400 && min_ess_tail > 400) {
  cat("   ✅ Excellent effective sample sizes\n")
} else if (min_ess_bulk > 100 && min_ess_tail > 100) {
  cat("   ⚠️ Acceptable effective sample sizes\n")
} else {
  cat("   ❌ Poor effective sample sizes\n")
}

# Check for divergent transitions
divergent_transitions <- fit4$diagnostic_summary()$num_divergent[1]
cat(sprintf("   Divergent transitions: %d\n", divergent_transitions))

if (divergent_transitions == 0) {
  cat("   ✅ No divergent transitions\n")
} else {
  cat("   ⚠️ Some divergent transitions detected\n")
}

# Overall convergence assessment
convergence_good <- (max_rhat < 1.05) && (min_ess_bulk > 400) &&
                   (min_ess_tail > 400) && (divergent_transitions == 0)

convergence_results <- list(
  max_rhat = max_rhat,
  min_ess_bulk = min_ess_bulk,
  min_ess_tail = min_ess_tail,
  divergent_transitions = divergent_transitions,
  convergence_good = convergence_good
)

if (convergence_good) {
  cat("\n   🎉 OVERALL ASSESSMENT: EXCELLENT CONVERGENCE\n")
} else {
  cat("\n   ⚠️ OVERALL ASSESSMENT: REVIEW CONVERGENCE ISSUES\n")
}

# ===== PARAMETER EXTRACTION AND ANALYSIS =====

cat("\n6. PARAMETER ESTIMATION\n")

# Extract parameter summaries
param_summary <- fit4$summary(
  variables = c("alpha", "beta_time", "beta_epi", "beta_financial", "beta_energy",
                "beta_epi_financial", "beta_epi_energy", "sigma")
) %>%
  mutate(
    q5 = `5%`,
    q95 = `95%`
  )

# Convert to percentage scale for interpretation
param_summary <- param_summary %>%
  mutate(
    mean_pct = mean * 100,
    q5_pct = q5 * 100,
    q95_pct = q95 * 100,
    ci_lower = q5_pct,
    ci_upper = q95_pct,
    includes_zero = (q5 <= 0 & q95 >= 0)
  )

cat("   Model 4 Parameter Estimates (90% CI):\n")
for (i in 1:nrow(param_summary)) {
  row <- param_summary[i, ]
  zero_status <- if (row$includes_zero) "includes 0" else "excludes 0"
  cat(sprintf("   %s: %.2f%% [%.2f, %.2f] (%s)\n",
              str_pad(row$variable, 16), row$mean_pct, row$ci_lower, row$ci_upper, zero_status))
}

# Focus on key interaction results
aging_main <- param_summary %>% filter(variable == "beta_epi")
aging_financial_int <- param_summary %>% filter(variable == "beta_epi_financial")
aging_energy_int <- param_summary %>% filter(variable == "beta_epi_energy")

cat("\n   KEY FINDINGS:\n")
cat(sprintf("   • Main aging effect: %.2f%% [%.2f, %.2f]\n",
            aging_main$mean_pct, aging_main$ci_lower, aging_main$ci_upper))
cat(sprintf("   • Aging-financial interaction: %.2f%% [%.2f, %.2f]\n",
            aging_financial_int$mean_pct, aging_financial_int$ci_lower, aging_financial_int$ci_upper))
cat(sprintf("   • Aging-energy interaction: %.2f%% [%.2f, %.2f]\n",
            aging_energy_int$mean_pct, aging_energy_int$ci_lower, aging_energy_int$ci_upper))

# Assess interaction significance
financial_int_significant <- !aging_financial_int$includes_zero
energy_int_significant <- !aging_energy_int$includes_zero

if (financial_int_significant) {
  cat("   ✅ Aging-financial interaction: SIGNIFICANT\n")
} else {
  cat("   ⚠️ Aging-financial interaction: Not significant\n")
}

if (energy_int_significant) {
  cat("   ✅ Aging-energy interaction: SIGNIFICANT\n")
} else {
  cat("   ⚠️ Aging-energy interaction: Not significant\n")
}

# ===== POSTERIOR PREDICTIVE CHECKS =====

cat("\n7. POSTERIOR PREDICTIVE CHECKS\n")

# Extract posterior predictions
y_rep <- fit4$draws("productivity_pred", format = "matrix")

# Perform posterior predictive checks
ppc_stats <- bayesplot::ppc_stat_grouped(
  y = stan_data$productivity_growth,
  yrep = y_rep,
  stat = "mean"
)

# Calculate test statistics
test_stats <- c("mean", "sd", "min", "max")
ppc_results <- tibble()

for (stat in test_stats) {
  if (stat == "mean") {
    obs_stat <- mean(stan_data$productivity_growth)
    rep_stats <- apply(y_rep, 1, mean)
  } else if (stat == "sd") {
    obs_stat <- sd(stan_data$productivity_growth)
    rep_stats <- apply(y_rep, 1, sd)
  } else if (stat == "min") {
    obs_stat <- min(stan_data$productivity_growth)
    rep_stats <- apply(y_rep, 1, min)
  } else if (stat == "max") {
    obs_stat <- max(stan_data$productivity_growth)
    rep_stats <- apply(y_rep, 1, max)
  }

  p_value <- mean(rep_stats >= obs_stat)
  p_value <- min(p_value, 1 - p_value) * 2  # Two-tailed p-value

  ppc_results <- bind_rows(ppc_results, tibble(
    statistic = stat,
    observed = obs_stat,
    p_value = p_value
  ))
}

cat("   Posterior Predictive Check Results:\n")
for (i in 1:nrow(ppc_results)) {
  row <- ppc_results[i, ]
  status <- if (row$p_value > 0.1) "✅ Good" else "⚠️ Check"
  cat(sprintf("   %s: p = %.3f (%s)\n",
              str_to_title(row$statistic), row$p_value, status))
}

# ===== DERIVED QUANTITIES ANALYSIS =====

cat("\n8. INTERACTION EFFECTS ANALYSIS\n")

# Extract derived quantities for interaction interpretation
derived_summary <- fit4$summary(
  variables = c("aging_effect_no_shock", "aging_effect_during_financial_crisis",
                "aging_effect_during_energy_shock", "aging_multiplier_financial",
                "aging_multiplier_energy")
) %>%
  mutate(
    q5 = `5%`,
    q95 = `95%`
  )

derived_summary <- derived_summary %>%
  mutate(
    mean_pct = mean * 100,
    q5_pct = q5 * 100,
    q95_pct = q95 * 100
  )

cat("   Conditional Aging Effects:\n")
for (i in 1:nrow(derived_summary)) {
  row <- derived_summary[i, ]
  if (str_detect(row$variable, "multiplier")) {
    cat(sprintf("   %s: %.2f [%.2f, %.2f]\n",
                str_replace_all(row$variable, "_", " "), row$mean, row$q5, row$q95))
  } else {
    cat(sprintf("   %s: %.2f%% [%.2f, %.2f]\n",
                str_replace_all(row$variable, "_", " "), row$mean_pct, row$q5_pct, row$q95_pct))
  }
}

# ===== SAVE RESULTS =====

cat("\n9. SAVING MODEL 4 RESULTS\n")

# Create comprehensive results object
model4_results <- list(
  fit = fit4,
  convergence = convergence_results,
  parameters = param_summary,
  ppc_results = ppc_results,
  derived_quantities = derived_summary,
  sampling_time = sampling_time,
  interaction_significance = list(
    financial = financial_int_significant,
    energy = energy_int_significant
  )
)

# Save results
save(model4_results, model4_data, file = "../model4_results.RData")
cat("   ✅ Model 4 results saved to model4_results.RData\n")

# ===== SUMMARY AND NEXT STEPS =====

cat("\n=== MODEL 4 EXECUTION COMPLETE ===\n")
cat(sprintf("Sampling time: %.2f seconds\n", sampling_time))
cat(sprintf("Convergence status: %s\n", if (convergence_good) "✅ Excellent" else "⚠️ Review"))
cat(sprintf("Interaction findings: Financial=%s, Energy=%s\n",
            if (financial_int_significant) "Significant" else "Not significant",
            if (energy_int_significant) "Significant" else "Not significant"))

if (financial_int_significant || energy_int_significant) {
  cat("\n🎯 INTERACTION EFFECTS DETECTED\n")
  cat("Aging effects are heterogeneous across shock types\n")
} else {
  cat("\n📊 NO SIGNIFICANT INTERACTIONS\n")
  cat("Aging effects appear homogeneous across shock types\n")
}

cat("\nNext step: Comprehensive model comparison (Models 1-4)\n")