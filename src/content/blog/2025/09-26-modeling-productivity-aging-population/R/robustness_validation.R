# Comprehensive Robustness Validation for EPI Methodology
# Purpose: Address GPT feedback with rigorous statistical diagnostics
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
cat("=== COMPREHENSIVE ROBUSTNESS VALIDATION ===\n\n")

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(brms)
  library(tidybayes)
  library(here)
  library(loo)
  library(bayesplot)
  library(posterior)
})

# Set working directory and options
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))
options(mc.cores = 2)

# Load functions
source("R/data_loading.R")
source("R/productivity_index.R")
source("R/bayesian_modeling.R")

# ===== STEP 1: LOAD DATA AND PREPARE MODELS =====
cat("Step 1: Loading data and preparing consistent dataset...\n")

# Load base data
germany_productivity <- load_productivity_data()
germany_demographics <- load_demographic_data()
cognitive_curves <- load_cognitive_data()

# Calculate EPI
epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

# Prepare model data with strict consistency
model_data <- prepare_model_data(
  germany_productivity,
  epi_data,
  stationarity_results = NULL,
  ensure_consistent_sample = TRUE
)

cat("✓ Dataset prepared:\n")
cat("  - Observations:", nrow(model_data), "\n")
cat("  - Years:", min(model_data$year), "to", max(model_data$year), "\n")
cat("  - EPI range:", round(min(model_data$epi_normalized), 4), "to", round(max(model_data$epi_normalized), 4), "\n")
cat("  - EPI SD:", round(sd(model_data$epi_normalized), 4), "\n\n")

# Standardize EPI for interpretability
model_data <- model_data %>%
  mutate(
    epi_standardized = scale(epi_normalized)[,1],
    year_centered = year - mean(year)
  )

cat("✓ Added standardized EPI (mean=0, SD=1) for coefficient interpretation\n\n")

# ===== STEP 2: LOAD OR FIT MODELS =====
cat("Step 2: Loading or fitting models...\n")

models_dir <- "models"
if (!dir.exists(models_dir)) dir.create(models_dir)

# Model file paths
original_path <- file.path(models_dir, "productivity_model_original.rds")
epi_levels_path <- file.path(models_dir, "productivity_model_epi_levels.rds")
epi_growth_path <- file.path(models_dir, "productivity_model_epi_growth.rds")

# Load existing models or fit new ones
models_list <- list()

if (file.exists(original_path) && file.exists(epi_levels_path) && file.exists(epi_growth_path)) {
  cat("✓ Loading existing models...\n")
  models_list$original <- readRDS(original_path)
  models_list$epi_levels <- readRDS(epi_levels_path)
  models_list$epi_growth <- readRDS(epi_growth_path)
} else {
  cat("✓ Fitting fresh models...\n")
  models_list <- fit_model_comparison(model_data, c("original", "epi_levels", "epi_growth"))
}

cat("✓ Models ready for analysis\n\n")

# ===== STEP 3: COMPREHENSIVE PSIS-LOO DIAGNOSTICS =====
cat("Step 3: Running comprehensive PSIS-LOO diagnostics...\n")

# Compute LOO for each model
loo_results <- list()
pareto_k_issues <- list()

for (model_name in names(models_list)) {
  cat("  Computing LOO for", model_name, "...\n")

  tryCatch({
    loo_results[[model_name]] <- loo(models_list[[model_name]])

    # Check Pareto k diagnostics
    pareto_k <- loo_results[[model_name]]$diagnostics$pareto_k
    k_high <- sum(pareto_k > 0.7)
    k_moderate <- sum(pareto_k > 0.5 & pareto_k <= 0.7)

    pareto_k_issues[[model_name]] <- list(
      k_high = k_high,
      k_moderate = k_moderate,
      max_k = max(pareto_k),
      problematic = k_high > 0
    )

    cat("    ✓ LOO computed. Pareto k > 0.7:", k_high, "observations\n")

  }, error = function(e) {
    cat("    ✗ LOO failed for", model_name, ":", e$message, "\n")
    loo_results[[model_name]] <- NULL
    pareto_k_issues[[model_name]] <- list(problematic = TRUE, error = e$message)
  })
}

cat("\n=== PSIS-LOO DIAGNOSTIC SUMMARY ===\n")
for (model_name in names(pareto_k_issues)) {
  issues <- pareto_k_issues[[model_name]]
  if (!is.null(issues$error)) {
    cat(model_name, ": ERROR -", issues$error, "\n")
  } else {
    cat(sprintf("%s: k>0.7: %d, k>0.5: %d, max_k: %.3f %s\n",
                model_name, issues$k_high, issues$k_moderate, issues$max_k,
                ifelse(issues$problematic, "⚠ PROBLEMATIC", "✓ OK")))
  }
}
cat("\n")

# Check if any models have Pareto k problems
any_pareto_problems <- any(sapply(pareto_k_issues, function(x) x$problematic))

if (any_pareto_problems) {
  cat("⚠ PSIS reliability issues detected. K-fold CV recommended.\n\n")
} else {
  cat("✓ All models have acceptable Pareto k diagnostics.\n\n")
}

# ===== STEP 4: MODEL COMPARISON WITH STANDARD ERRORS =====
cat("Step 4: Model comparison with standard error analysis...\n")

if (length(loo_results) >= 2) {
  # Get available models for comparison
  valid_models <- names(loo_results)[!sapply(loo_results, is.null)]

  if (length(valid_models) >= 2) {
    cat("Comparing models:", paste(valid_models, collapse = ", "), "\n")

    # Compare models
    loo_comparison <- loo_compare(loo_results[valid_models])
    print(loo_comparison)
    cat("\n")

    # Extract ELPD differences and standard errors
    cat("=== ELPD DIFFERENCES AND STANDARD ERRORS ===\n")
    best_model <- rownames(loo_comparison)[1]

    for (i in 2:nrow(loo_comparison)) {
      model_name <- rownames(loo_comparison)[i]
      elpd_diff <- loo_comparison[i, "elpd_diff"]
      se_diff <- loo_comparison[i, "se_diff"]

      # Statistical significance test
      is_significant <- abs(elpd_diff) > 2 * se_diff

      cat(sprintf("%s vs %s:\n", best_model, model_name))
      cat(sprintf("  ELPD difference: %.2f ± %.2f\n", elpd_diff, se_diff))
      cat(sprintf("  Statistical significance: %s (|diff| %s 2×SE)\n",
                  ifelse(is_significant, "YES", "NO"),
                  ifelse(is_significant, ">", "≤")))
      cat(sprintf("  LOOIC difference: %.2f\n", -2 * elpd_diff))
      cat("\n")
    }

    # Calculate stacking weights if no severe Pareto k issues
    if (!any_pareto_problems) {
      cat("=== MODEL STACKING WEIGHTS ===\n")
      tryCatch({
        stacking_weights <- loo_model_weights(loo_results[valid_models], method = "stacking")
        for (i in seq_along(stacking_weights)) {
          cat(sprintf("%s: %.1f%%\n", names(stacking_weights)[i], stacking_weights[i] * 100))
        }
        cat("\n")

        # Interpret weights
        max_weight <- max(stacking_weights)
        winning_model <- names(stacking_weights)[which.max(stacking_weights)]

        if (max_weight > 0.7) {
          cat("✓ Strong evidence for", winning_model, "(>70% weight)\n")
        } else if (max_weight > 0.5) {
          cat("⚠ Moderate evidence for", winning_model, "(50-70% weight)\n")
        } else {
          cat("⚠ Weak evidence - models perform similarly (<50% max weight)\n")
        }

      }, error = function(e) {
        cat("✗ Stacking weights failed:", e$message, "\n")
      })
    } else {
      cat("⚠ Stacking weights skipped due to Pareto k issues\n")
    }
  }
} else {
  cat("✗ Insufficient models for comparison\n")
}

cat("\n")

# ===== STEP 5: K-FOLD CROSS-VALIDATION (IF NEEDED) =====
if (any_pareto_problems) {
  cat("Step 5: Running k-fold cross-validation due to PSIS issues...\n")

  kfold_results <- list()
  for (model_name in valid_models) {
    cat("  Running 10-fold CV for", model_name, "...\n")

    tryCatch({
      kfold_results[[model_name]] <- kfold(models_list[[model_name]], K = 10)
      cat("    ✓ K-fold CV completed\n")
    }, error = function(e) {
      cat("    ✗ K-fold CV failed:", e$message, "\n")
      kfold_results[[model_name]] <- NULL
    })
  }

  # Compare k-fold results
  if (length(kfold_results) >= 2) {
    valid_kfold <- names(kfold_results)[!sapply(kfold_results, is.null)]
    if (length(valid_kfold) >= 2) {
      cat("\n=== K-FOLD CROSS-VALIDATION COMPARISON ===\n")
      kfold_comparison <- loo_compare(kfold_results[valid_kfold])
      print(kfold_comparison)
      cat("\n")
    }
  }
} else {
  cat("Step 5: K-fold CV skipped - PSIS diagnostics acceptable\n\n")
}

# ===== STEP 6: AR(1) COEFFICIENT ANALYSIS =====
cat("Step 6: Analyzing AR(1) coefficients and model specification...\n")

for (model_name in names(models_list)) {
  if (!is.null(models_list[[model_name]])) {
    cat("\n--- AR(1) Analysis for", model_name, "---\n")

    tryCatch({
      # Extract AR coefficient
      draws <- as_draws_df(models_list[[model_name]])
      ar_cols <- grep("ar\\[1\\]", names(draws), value = TRUE)

      if (length(ar_cols) > 0) {
        ar_draws <- draws[[ar_cols[1]]]
        ar_mean <- mean(ar_draws)
        ar_q025 <- quantile(ar_draws, 0.025)
        ar_q975 <- quantile(ar_draws, 0.975)

        cat(sprintf("AR(1) coefficient: %.3f [%.3f, %.3f]\n", ar_mean, ar_q025, ar_q975))

        # Check for unit root issues
        prob_gt_1 <- mean(ar_draws > 1.0)
        prob_gt_095 <- mean(ar_draws > 0.95)

        cat(sprintf("P(AR > 1.0): %.1f%%\n", prob_gt_1 * 100))
        cat(sprintf("P(AR > 0.95): %.1f%%\n", prob_gt_095 * 100))

        if (prob_gt_1 > 0.5) {
          cat("⚠ MAJOR ISSUE: High probability of unit root (AR > 1)\n")
          cat("  Recommendation: Consider differenced model or GP trend\n")
        } else if (prob_gt_095 > 0.8) {
          cat("⚠ MODERATE ISSUE: High persistence detected\n")
          cat("  Recommendation: Validate with differenced specification\n")
        } else {
          cat("✓ AR coefficient in reasonable range\n")
        }
      } else {
        cat("No AR coefficient found in this model\n")
      }

    }, error = function(e) {
      cat("Error analyzing AR coefficient:", e$message, "\n")
    })
  }
}

cat("\n")

# ===== STEP 7: DETRENDED EPI ANALYSIS =====
cat("Step 7: Creating detrended EPI analysis...\n")

# Remove time trend from EPI
epi_trend_model <- lm(epi_normalized ~ poly(year, 2), data = model_data)
model_data$epi_detrended <- residuals(epi_trend_model)
model_data$epi_detrended_std <- scale(model_data$epi_detrended)[,1]

cat("✓ EPI detrended (removed quadratic time trend)\n")
cat("  Detrended EPI SD:", round(sd(model_data$epi_detrended), 4), "\n")
cat("  R² of EPI vs time trend:", round(summary(epi_trend_model)$r.squared, 3), "\n")

if (summary(epi_trend_model)$r.squared > 0.8) {
  cat("⚠ HIGH COLLINEARITY: EPI strongly correlated with time trend\n")
  cat("  This may explain weak EPI coefficient identification\n")
} else {
  cat("✓ Moderate collinearity with time trend\n")
}

cat("\n")

# ===== STEP 8: DIFFERENCED MODEL ANALYSIS =====
cat("Step 8: Implementing differenced (growth) model specification...\n")

# Create differenced data
model_data_diff <- model_data %>%
  arrange(year) %>%
  mutate(
    dlog_productivity = log_productivity - lag(log_productivity),
    depi = epi_normalized - lag(epi_normalized),
    depi_std = scale(depi)[,1]
  ) %>%
  filter(!is.na(dlog_productivity), !is.na(depi)) %>%
  mutate(time_index = 1:n())

cat("✓ Differenced data prepared:\n")
cat("  Growth observations:", nrow(model_data_diff), "\n")
cat("  Productivity growth SD:", round(sd(model_data_diff$dlog_productivity), 4), "\n")
cat("  EPI change SD:", round(sd(model_data_diff$depi), 4), "\n\n")

# ===== STEP 9: POSTERIOR PREDICTIVE CHECKS =====
cat("Step 9: Posterior predictive checks...\n")

for (model_name in names(models_list)) {
  if (!is.null(models_list[[model_name]])) {
    cat("\nPosterior predictive check for", model_name, ":\n")

    tryCatch({
      # Basic pp_check
      pp_check_result <- pp_check(models_list[[model_name]], ndraws = 50)

      # Save plot
      plot_path <- file.path("figures", paste0("pp_check_", model_name, ".png"))
      if (!dir.exists("figures")) dir.create("figures")

      ggsave(plot_path, pp_check_result, width = 8, height = 6)
      cat("  ✓ Posterior predictive check saved to", plot_path, "\n")

    }, error = function(e) {
      cat("  ✗ Posterior predictive check failed:", e$message, "\n")
    })
  }
}

cat("\n=== ROBUSTNESS VALIDATION COMPLETE ===\n\n")

# ===== STEP 10: SUMMARY AND RECOMMENDATIONS =====
cat("SUMMARY OF ROBUSTNESS FINDINGS:\n\n")

cat("1. PSIS-LOO RELIABILITY:\n")
if (any_pareto_problems) {
  cat("   ⚠ Some models have problematic Pareto k values\n")
  cat("   → Use k-fold CV results for model comparison\n")
} else {
  cat("   ✓ All models have acceptable PSIS diagnostics\n")
  cat("   → PSIS-LOO comparison is reliable\n")
}

cat("\n2. MODEL COMPARISON EVIDENCE:\n")
if (exists("loo_comparison") && nrow(loo_comparison) >= 2) {
  best_model <- rownames(loo_comparison)[1]
  elpd_diff <- loo_comparison[2, "elpd_diff"]
  se_diff <- loo_comparison[2, "se_diff"]
  is_significant <- abs(elpd_diff) > 2 * se_diff

  cat("   Best model:", best_model, "\n")
  cat("   ELPD difference:", round(elpd_diff, 2), "±", round(se_diff, 2), "\n")

  if (is_significant) {
    cat("   ✓ Statistically significant difference (|diff| > 2×SE)\n")
  } else {
    cat("   ⚠ Difference not statistically significant (|diff| ≤ 2×SE)\n")
    cat("   → Evidence for model superiority is weak\n")
  }
} else {
  cat("   ⚠ Model comparison incomplete\n")
}

cat("\n3. AR(1) SPECIFICATION ISSUES:\n")
cat("   → Review AR coefficient analysis above\n")
cat("   → Consider differenced model if AR > 1 persists\n")

cat("\n4. EPI COLLINEARITY:\n")
if (exists("epi_trend_model")) {
  r2_trend <- summary(epi_trend_model)$r.squared
  if (r2_trend > 0.8) {
    cat("   ⚠ High collinearity with time trend (R² =", round(r2_trend, 3), ")\n")
    cat("   → Use detrended EPI or interpret carefully\n")
  } else {
    cat("   ✓ Moderate collinearity (R² =", round(r2_trend, 3), ")\n")
  }
}

cat("\nRECOMMENDATIONS FOR PUBLICATION:\n")
cat("- Report ELPD differences with standard errors\n")
cat("- Include Pareto k diagnostics in appendix\n")
cat("- Address AR(1) > 1 issue explicitly\n")
cat("- Acknowledge EPI's small variation and collinearity\n")
cat("- Use cautious language about model superiority\n")
cat("- Focus on theoretical contribution and EPI methodology\n")

cat("\n=== ANALYSIS SAVED TO WORKSPACE ===\n")
save.image("robustness_validation_results.RData")