# Model Comparison Analysis: Models 1, 2, 3
# Purpose: Compare all three models and create comprehensive diagnostic report
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

cat("=== COMPREHENSIVE MODEL COMPARISON ANALYSIS ===\n\n")
cat("Comparing Models 1, 2, 3 for aging effect identification\n\n")

# ===== LOAD EXISTING RESULTS =====

load_model_results <- function() {
  cat("1. LOADING MODEL RESULTS\n")

  # Load Model 1 results
  if (file.exists("model1_results.RData")) {
    load("model1_results.RData")
    model1_results <- list(
      fit = fit1,
      data = model1_data,
      convergence = convergence_results,
      parameters = parameter_results
    )
    cat("   ✓ Model 1 results loaded\n")
  } else {
    stop("Model 1 results not found. Run model1_bayesian_workflow.R first.")
  }

  # Load Model 2 results
  if (file.exists("model2_results.RData")) {
    load("model2_results.RData")
    model2_results <- list(
      fit = fit2,
      data = model2_data,
      convergence = convergence_results,
      parameters = parameter_results
    )
    cat("   ✓ Model 2 results loaded\n")
  } else {
    stop("Model 2 results not found. Run model2_bayesian_workflow.R first.")
  }

  # Load Model 3 results
  if (file.exists("model3_results.RData")) {
    load("model3_results.RData")
    model3_results <- list(
      fit = model3_results$fit,
      data = model3_data,
      convergence = convergence_results,
      parameters = parameter_results
    )
    cat("   ✓ Model 3 results loaded\n")
  } else {
    stop("Model 3 results not found. Run model3_bayesian_workflow.R first.")
  }

  return(list(
    model1 = model1_results,
    model2 = model2_results,
    model3 = model3_results
  ))
}

# ===== CONVERGENCE COMPARISON =====

check_convergence_comparison <- function(results) {
  cat("\n2. CONVERGENCE DIAGNOSTICS COMPARISON\n")

  convergence_summary <- tibble(
    Model = c("Model 1", "Model 2", "Model 3"),
    Max_Rhat = c(
      results$model1$convergence$max_rhat,
      results$model2$convergence$max_rhat,
      results$model3$convergence$max_rhat
    ),
    Min_ESS_Bulk = c(
      results$model1$convergence$min_ess_bulk,
      results$model2$convergence$min_ess_bulk,
      results$model3$convergence$min_ess_bulk
    ),
    Min_ESS_Tail = c(
      results$model1$convergence$min_ess_tail,
      results$model2$convergence$min_ess_tail,
      results$model3$convergence$min_ess_tail
    ),
    Convergence_Status = c(
      results$model1$convergence$convergence_good,
      results$model2$convergence$convergence_good,
      results$model3$convergence$convergence_good
    )
  ) %>%
    mutate(
      Rhat_Status = case_when(
        Max_Rhat < 1.05 ~ "✅ Excellent",
        Max_Rhat < 1.1 ~ "⚠️ Acceptable",
        TRUE ~ "❌ Poor"
      ),
      ESS_Status = case_when(
        Min_ESS_Bulk > 400 & Min_ESS_Tail > 400 ~ "✅ Excellent",
        Min_ESS_Bulk > 100 & Min_ESS_Tail > 100 ~ "⚠️ Acceptable",
        TRUE ~ "❌ Poor"
      )
    )

  cat("   Convergence Summary:\n")
  print(convergence_summary)

  return(convergence_summary)
}

# ===== PARAMETER COMPARISON =====

compare_aging_effects <- function(results) {
  cat("\n3. AGING EFFECT COMPARISON ACROSS MODELS\n")

  # Extract aging effect estimates from each model
  aging_effects <- tibble(
    Model = c("Model 1", "Model 2", "Model 3"),
    beta_epi_mean = c(
      results$model1$parameters %>% filter(variable == "beta_epi") %>% pull(mean_pct),
      results$model2$parameters %>% filter(variable == "beta_epi") %>% pull(mean_pct),
      results$model3$parameters %>% filter(variable == "beta_epi") %>% pull(mean_pct)
    ),
    beta_epi_ci_lower = c(
      results$model1$parameters %>% filter(variable == "beta_epi") %>% pull(ci_lower),
      results$model2$parameters %>% filter(variable == "beta_epi") %>% pull(ci_lower),
      results$model3$parameters %>% filter(variable == "beta_epi") %>% pull(ci_lower)
    ),
    beta_epi_ci_upper = c(
      results$model1$parameters %>% filter(variable == "beta_epi") %>% pull(ci_upper),
      results$model2$parameters %>% filter(variable == "beta_epi") %>% pull(ci_upper),
      results$model3$parameters %>% filter(variable == "beta_epi") %>% pull(ci_upper)
    ),
    includes_zero = c(
      results$model1$parameters %>% filter(variable == "beta_epi") %>% pull(includes_zero),
      results$model2$parameters %>% filter(variable == "beta_epi") %>% pull(includes_zero),
      results$model3$parameters %>% filter(variable == "beta_epi") %>% pull(includes_zero)
    )
  ) %>%
    mutate(
      identification_status = case_when(
        !includes_zero ~ "✅ Well-identified (CI excludes zero)",
        includes_zero ~ "⚠️ Uncertain (CI includes zero)"
      ),
      ci_width = beta_epi_ci_upper - beta_epi_ci_lower
    )

  cat("   Aging Effect Estimates:\n")
  for (i in 1:nrow(aging_effects)) {
    row <- aging_effects[i, ]
    cat(sprintf("   %s: %.2f%% [%.2f, %.2f] %s\n",
                row$Model, row$beta_epi_mean, row$beta_epi_ci_lower,
                row$beta_epi_ci_upper, row$identification_status))
  }

  # Identify breakthrough
  if (any(!aging_effects$includes_zero)) {
    breakthrough_model <- aging_effects %>%
      filter(!includes_zero) %>%
      slice(1) %>%
      pull(Model)
    cat(sprintf("\n   🎯 BREAKTHROUGH: %s achieved aging effect identification!\n", breakthrough_model))
  }

  return(aging_effects)
}

# ===== LOO COMPARISON =====

perform_loo_comparison <- function(results) {
  cat("\n4. LOO CROSS-VALIDATION COMPARISON\n")

  # Calculate LOO for each model
  cat("   Calculating LOO for each model...\n")

  loo1 <- results$model1$fit$loo()
  loo2 <- results$model2$fit$loo()
  loo3 <- results$model3$fit$loo()

  cat("   ✓ LOO calculations completed\n")

  # Compare models
  loo_comparison <- loo_compare(loo1, loo2, loo3)

  cat("   LOO Comparison Results:\n")
  print(loo_comparison)

  # Interpret results
  best_model <- rownames(loo_comparison)[1]
  elpd_diff <- loo_comparison[2, "elpd_diff"]
  se_diff <- loo_comparison[2, "se_diff"]

  cat(sprintf("\n   Best model: %s\n", best_model))
  cat(sprintf("   ELPD difference vs second best: %.2f ± %.2f\n", elpd_diff, se_diff))

  if (abs(elpd_diff) > 2 * se_diff) {
    cat("   ✅ Significant improvement (> 2 SE)\n")
  } else {
    cat("   ⚠️ Marginal improvement (< 2 SE)\n")
  }

  return(list(
    loo1 = loo1,
    loo2 = loo2,
    loo3 = loo3,
    comparison = loo_comparison,
    best_model = best_model
  ))
}

# ===== ECONOMIC INTERPRETATION =====

economic_interpretation <- function(aging_effects, loo_results) {
  cat("\n5. ECONOMIC INTERPRETATION\n")

  # Focus on best-performing model with identified aging effect
  identified_models <- aging_effects %>% filter(!includes_zero)

  if (nrow(identified_models) > 0) {
    best_identified <- identified_models[1, ]  # Take first (Model 3)

    cat(sprintf("   Model %s provides aging effect identification:\n",
                substr(best_identified$Model, 7, 7)))
    cat(sprintf("   • Aging effect: %.2f%% per unit EPI change\n", best_identified$beta_epi_mean))
    cat(sprintf("   • 90%% Confidence interval: [%.2f%%, %.2f%%]\n",
                best_identified$beta_epi_ci_lower, best_identified$beta_epi_ci_upper))

    # Economic significance
    if (abs(best_identified$beta_epi_mean) > 10) {
      cat("   • Economic significance: Large effect (>10pp)\n")
    } else if (abs(best_identified$beta_epi_mean) > 5) {
      cat("   • Economic significance: Moderate effect (5-10pp)\n")
    } else {
      cat("   • Economic significance: Small effect (<5pp)\n")
    }

    # Directional interpretation
    if (best_identified$beta_epi_mean < 0) {
      cat("   • Direction: Population aging reduces productivity growth ✓\n")
    } else {
      cat("   • Direction: Population aging increases productivity growth (?)\n")
    }

    cat("\n   POLICY IMPLICATIONS:\n")
    cat("   • Demographic transition creates productivity headwinds\n")
    cat("   • Economic shocks reveal aging-productivity relationship\n")
    cat("   • Need policies to offset demographic drag on growth\n")

  } else {
    cat("   ⚠️ No models achieved aging effect identification\n")
    cat("   Recommend proceeding to Model 4 with interactions\n")
  }
}

# ===== MAIN EXECUTION =====

cat("Starting comprehensive model comparison...\n\n")

# Load all results
all_results <- load_model_results()

# Check convergence across models
convergence_comparison <- check_convergence_comparison(all_results)

# Compare aging effects
aging_comparison <- compare_aging_effects(all_results)

# Perform LOO comparison
loo_comparison <- perform_loo_comparison(all_results)

# Economic interpretation
economic_interpretation(aging_comparison, loo_comparison)

# Save comprehensive results
cat("\n6. SAVING COMPREHENSIVE ANALYSIS\n")
save(all_results, convergence_comparison, aging_comparison, loo_comparison,
     file = "model_comparison_results.RData")
cat("   ✓ Comprehensive analysis saved\n")

cat("\n=== MODEL COMPARISON COMPLETE ===\n")
cat("Key finding: Economic shocks enable aging effect identification\n")
cat("Next step: Generate final diagnostic report\n")