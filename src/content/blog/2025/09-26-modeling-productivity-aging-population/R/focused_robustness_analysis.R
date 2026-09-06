# Focused Robustness Analysis - Working with Available Models
# Purpose: Address GPT feedback with available EPI and original models
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
cat("=== FOCUSED ROBUSTNESS ANALYSIS ===\n\n")

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

# ===== STEP 1: LOAD DATA =====
cat("Step 1: Loading data...\n")

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

cat("✓ Dataset prepared:", nrow(model_data), "observations\n")
cat("✓ EPI variation (SD):", round(sd(model_data$epi_normalized), 4), "\n\n")

# ===== STEP 2: LOAD AVAILABLE MODELS =====
cat("Step 2: Loading available models...\n")

# Load models
models_list <- list()
models_list$original <- readRDS("models/productivity_model_original.rds")
models_list$epi_levels <- readRDS("models/productivity_model_epi_levels.rds")

cat("✓ Loaded 2 models: original, epi_levels\n\n")

# ===== STEP 3: COMPREHENSIVE PSIS-LOO ANALYSIS =====
cat("Step 3: PSIS-LOO diagnostics and model comparison...\n")

# Compute LOO for each model
loo_results <- list()
pareto_k_summary <- list()

for (model_name in names(models_list)) {
  cat("  Computing LOO for", model_name, "...\n")

  tryCatch({
    loo_results[[model_name]] <- loo(models_list[[model_name]])

    # Detailed Pareto k analysis
    pareto_k <- loo_results[[model_name]]$diagnostics$pareto_k
    k_high <- sum(pareto_k > 0.7)
    k_moderate <- sum(pareto_k > 0.5 & pareto_k <= 0.7)
    k_ok <- sum(pareto_k <= 0.5)

    pareto_k_summary[[model_name]] <- list(
      k_high = k_high,
      k_moderate = k_moderate,
      k_ok = k_ok,
      max_k = max(pareto_k),
      mean_k = mean(pareto_k),
      problematic = k_high > 0
    )

    cat("    ✓ LOO computed\n")
    cat("    Pareto k > 0.7:", k_high, "observations\n")
    cat("    Pareto k 0.5-0.7:", k_moderate, "observations\n")
    cat("    Pareto k ≤ 0.5:", k_ok, "observations\n")
    cat("    Max Pareto k:", round(max(pareto_k), 3), "\n")

  }, error = function(e) {
    cat("    ✗ LOO failed for", model_name, ":", e$message, "\n")
  })
}

cat("\n=== PSIS RELIABILITY ASSESSMENT ===\n")
reliable_models <- c()
for (model_name in names(pareto_k_summary)) {
  summary <- pareto_k_summary[[model_name]]
  cat(sprintf("%s: High k: %d, Moderate k: %d, Max k: %.3f\n",
              model_name, summary$k_high, summary$k_moderate, summary$max_k))

  if (summary$k_high == 0) {
    cat("  ✓ PSIS reliable\n")
    reliable_models <- c(reliable_models, model_name)
  } else if (summary$k_high <= 2) {
    cat("  ⚠ PSIS mostly reliable (few problematic points)\n")
    reliable_models <- c(reliable_models, model_name)
  } else {
    cat("  ✗ PSIS unreliable - k-fold CV needed\n")
  }
}
cat("\n")

# ===== STEP 4: MODEL COMPARISON WITH STANDARD ERRORS =====
if (length(reliable_models) >= 2) {
  cat("Step 4: Model comparison with standard error analysis...\n")

  # Compare models
  loo_comparison <- loo_compare(loo_results[reliable_models])
  print(loo_comparison)
  cat("\n")

  # Extract key comparison metrics
  best_model <- rownames(loo_comparison)[1]
  second_model <- rownames(loo_comparison)[2]

  elpd_diff <- loo_comparison[2, "elpd_diff"]
  se_diff <- loo_comparison[2, "se_diff"]

  cat("=== CRITICAL STATISTICAL ASSESSMENT ===\n")
  cat("Best model:", best_model, "\n")
  cat("Second model:", second_model, "\n")
  cat("ELPD difference:", round(elpd_diff, 2), "±", round(se_diff, 2), "\n")
  cat("LOOIC difference:", round(-2 * elpd_diff, 2), "\n")

  # Statistical significance test
  is_significant <- abs(elpd_diff) > 2 * se_diff
  z_score <- abs(elpd_diff) / se_diff

  cat("Z-score (|diff|/SE):", round(z_score, 2), "\n")
  cat("Statistical significance (|diff| > 2×SE):", ifelse(is_significant, "YES", "NO"), "\n")

  if (is_significant) {
    cat("✓ ROBUST EVIDENCE: Model difference is statistically significant\n")
  } else {
    cat("⚠ WEAK EVIDENCE: Model difference is not statistically significant\n")
    cat("  → Cannot claim decisive superiority\n")
  }

  # Calculate stacking weights
  cat("\n=== STACKING WEIGHTS ===\n")
  tryCatch({
    stacking_weights <- loo_model_weights(loo_results[reliable_models], method = "stacking")

    for (i in seq_along(stacking_weights)) {
      cat(sprintf("%s: %.1f%%\n", names(stacking_weights)[i], stacking_weights[i] * 100))
    }

    max_weight <- max(stacking_weights)
    winning_model <- names(stacking_weights)[which.max(stacking_weights)]

    cat("\nStacking weight interpretation:\n")
    if (max_weight > 0.8) {
      cat("✓ Very strong evidence for", winning_model, "\n")
    } else if (max_weight > 0.6) {
      cat("✓ Strong evidence for", winning_model, "\n")
    } else if (max_weight > 0.5) {
      cat("⚠ Moderate evidence for", winning_model, "\n")
    } else {
      cat("⚠ Weak evidence - models perform similarly\n")
    }

    # Critical assessment for publication
    cat("\n=== PUBLICATION READINESS ASSESSMENT ===\n")

    evidence_strength <- "INCONCLUSIVE"
    if (is_significant && max_weight > 0.7) {
      evidence_strength <- "STRONG"
    } else if (is_significant || max_weight > 0.6) {
      evidence_strength <- "MODERATE"
    } else {
      evidence_strength <- "WEAK"
    }

    cat("Overall evidence strength:", evidence_strength, "\n")

    if (evidence_strength == "STRONG") {
      cat("✓ Ready for publication with confident claims\n")
    } else if (evidence_strength == "MODERATE") {
      cat("⚠ Ready for publication with cautious claims\n")
    } else {
      cat("✗ Not ready for publication - insufficient evidence\n")
    }

  }, error = function(e) {
    cat("Stacking weights failed:", e$message, "\n")
  })

} else {
  cat("Step 4: Insufficient reliable models for comparison\n")
}

cat("\n")

# ===== STEP 5: PARAMETER ANALYSIS =====
cat("Step 5: Parameter analysis and AR(1) investigation...\n")

for (model_name in names(models_list)) {
  cat("\n--- Parameter Analysis:", model_name, "---\n")

  tryCatch({
    # Extract all parameters
    draws <- as_draws_df(models_list[[model_name]])

    # AR coefficient analysis
    ar_cols <- grep("ar\\[1\\]", names(draws), value = TRUE)
    if (length(ar_cols) > 0) {
      ar_draws <- draws[[ar_cols[1]]]
      ar_mean <- mean(ar_draws)
      ar_q025 <- quantile(ar_draws, 0.025)
      ar_q975 <- quantile(ar_draws, 0.975)

      cat("AR(1) coefficient:", round(ar_mean, 3), "[", round(ar_q025, 3), ",", round(ar_q975, 3), "]\n")

      # Unit root diagnostics
      prob_gt_1 <- mean(ar_draws > 1.0)
      prob_gt_095 <- mean(ar_draws > 0.95)

      cat("P(AR > 1.0):", round(prob_gt_1 * 100, 1), "%\n")
      cat("P(AR > 0.95):", round(prob_gt_095 * 100, 1), "%\n")

      if (prob_gt_1 > 0.5) {
        cat("🚨 CRITICAL ISSUE: Unit root detected (AR > 1)\n")
        cat("   → Model specification may be inappropriate\n")
        cat("   → Consider differenced model or structural break\n")
      } else if (prob_gt_095 > 0.8) {
        cat("⚠ MODERATE ISSUE: High persistence\n")
        cat("   → Near unit root behavior\n")
      } else {
        cat("✓ AR coefficient in reasonable range\n")
      }
    }

    # EPI coefficient analysis (if available)
    epi_cols <- grep("epi_normalized", names(draws), value = TRUE)
    if (length(epi_cols) > 0) {
      epi_draws <- draws[[epi_cols[1]]]
      epi_mean <- mean(epi_draws)
      epi_q025 <- quantile(epi_draws, 0.025)
      epi_q975 <- quantile(epi_draws, 0.975)

      cat("EPI coefficient:", round(epi_mean, 4), "[", round(epi_q025, 4), ",", round(epi_q975, 4), "]\n")

      # Statistical significance
      is_significant <- !(epi_q025 < 0 & epi_q975 > 0)
      cat("95% CI excludes zero:", ifelse(is_significant, "YES", "NO"), "\n")

      if (!is_significant) {
        cat("⚠ EPI coefficient not statistically significant\n")
        cat("   → Large uncertainty relative to effect size\n")
      }
    }

    # Model fit diagnostics
    loo_ic <- loo_results[[model_name]]$estimates["looic", "Estimate"]
    loo_se <- loo_results[[model_name]]$estimates["looic", "SE"]

    cat("LOOIC:", round(loo_ic, 1), "±", round(loo_se, 1), "\n")

  }, error = function(e) {
    cat("Parameter analysis failed:", e$message, "\n")
  })
}

cat("\n")

# ===== STEP 6: EPI COLLINEARITY ANALYSIS =====
cat("Step 6: EPI collinearity and effect size analysis...\n")

# Check EPI-time correlation
epi_time_cor <- cor(model_data$epi_normalized, model_data$year)
cat("EPI-time correlation:", round(epi_time_cor, 3), "\n")

# Fit time trend to EPI
epi_trend_model <- lm(epi_normalized ~ poly(year, 2), data = model_data)
epi_trend_r2 <- summary(epi_trend_model)$r.squared

cat("EPI explained by time trend (R²):", round(epi_trend_r2, 3), "\n")

if (epi_trend_r2 > 0.8) {
  cat("🚨 HIGH COLLINEARITY: EPI strongly predicted by time\n")
  cat("   → EPI effects may be confounded with secular trends\n")
  cat("   → Coefficient uncertainty expected\n")
} else if (epi_trend_r2 > 0.5) {
  cat("⚠ MODERATE COLLINEARITY: EPI partially predicted by time\n")
} else {
  cat("✓ LOW COLLINEARITY: EPI variation independent of time\n")
}

# EPI variation analysis
epi_range <- max(model_data$epi_normalized) - min(model_data$epi_normalized)
epi_sd <- sd(model_data$epi_normalized)

cat("EPI total range:", round(epi_range, 4), "\n")
cat("EPI standard deviation:", round(epi_sd, 4), "\n")
cat("EPI coefficient of variation:", round(epi_sd / mean(model_data$epi_normalized), 4), "\n")

if (epi_sd < 0.01) {
  cat("⚠ SMALL VARIATION: EPI has limited variation\n")
  cat("   → Large coefficient uncertainty expected\n")
  cat("   → Small effects may still be economically meaningful\n")
}

cat("\n")

# ===== STEP 7: SUBSTANTIVE EFFECT ANALYSIS =====
cat("Step 7: Substantive economic effect analysis...\n")

if (!is.null(models_list$epi_levels)) {
  tryCatch({
    # Extract EPI coefficient
    draws <- as_draws_df(models_list$epi_levels)
    epi_cols <- grep("epi_normalized", names(draws), value = TRUE)

    if (length(epi_cols) > 0) {
      epi_draws <- draws[[epi_cols[1]]]
      epi_mean <- mean(epi_draws)

      # Calculate observed EPI change effect
      epi_change_observed <- epi_range  # Total change over period
      log_productivity_effect <- epi_mean * epi_change_observed
      productivity_level_effect <- (exp(log_productivity_effect) - 1) * 100

      cat("Observed EPI change (1972-2023):", round(epi_change_observed, 4), "\n")
      cat("Implied log productivity effect:", round(log_productivity_effect, 4), "\n")
      cat("Implied productivity level effect:", round(productivity_level_effect, 2), "%\n")

      # Annual equivalent
      years_span <- max(model_data$year) - min(model_data$year)
      annual_effect <- productivity_level_effect / years_span
      cat("Annualized productivity effect:", round(annual_effect, 3), "% per year\n")

      # Credible interval for effect
      log_effect_draws <- epi_draws * epi_change_observed
      level_effect_draws <- (exp(log_effect_draws) - 1) * 100

      effect_q025 <- quantile(level_effect_draws, 0.025)
      effect_q975 <- quantile(level_effect_draws, 0.975)

      cat("Effect 95% CI:", round(effect_q025, 2), "% to", round(effect_q975, 2), "%\n")

      # Economic significance assessment
      if (abs(productivity_level_effect) > 1) {
        cat("✓ ECONOMICALLY SIGNIFICANT: >1% total effect\n")
      } else if (abs(productivity_level_effect) > 0.1) {
        cat("⚠ MODEST ECONOMIC SIGNIFICANCE: 0.1-1% total effect\n")
      } else {
        cat("⚠ LIMITED ECONOMIC SIGNIFICANCE: <0.1% total effect\n")
      }

    } else {
      cat("EPI coefficient not found\n")
    }

  }, error = function(e) {
    cat("Substantive effect analysis failed:", e$message, "\n")
  })
}

cat("\n")

# ===== STEP 8: FINAL ASSESSMENT =====
cat("=== FINAL ROBUSTNESS ASSESSMENT ===\n\n")

cat("1. STATISTICAL EVIDENCE:\n")
if (exists("is_significant") && exists("max_weight")) {
  if (is_significant && max_weight > 0.7) {
    cat("   ✓ STRONG: Statistically significant difference + high stacking weight\n")
  } else if (is_significant || max_weight > 0.6) {
    cat("   ⚠ MODERATE: Either statistical significance OR high stacking weight\n")
  } else {
    cat("   ✗ WEAK: Neither statistical significance nor high stacking weight\n")
  }
} else {
  cat("   ⚠ Assessment incomplete\n")
}

cat("\n2. METHODOLOGICAL ISSUES:\n")
# AR(1) assessment
if (exists("prob_gt_1")) {
  if (any(sapply(models_list, function(m) {
    draws <- as_draws_df(m)
    ar_cols <- grep("ar\\[1\\]", names(draws), value = TRUE)
    if(length(ar_cols) > 0) mean(draws[[ar_cols[1]]]) > 1 else FALSE
  }))) {
    cat("   🚨 CRITICAL: AR(1) > 1 in some models (unit root)\n")
  } else {
    cat("   ✓ AR coefficients in reasonable range\n")
  }
}

# Collinearity assessment
if (exists("epi_trend_r2")) {
  if (epi_trend_r2 > 0.8) {
    cat("   ⚠ HIGH: EPI strongly collinear with time trend\n")
  } else {
    cat("   ✓ MODERATE: EPI collinearity manageable\n")
  }
}

# PSIS reliability
if (all(sapply(pareto_k_summary, function(x) x$k_high) == 0)) {
  cat("   ✓ PSIS diagnostics acceptable for all models\n")
} else {
  cat("   ⚠ Some PSIS reliability issues detected\n")
}

cat("\n3. PUBLICATION RECOMMENDATIONS:\n")

if (exists("evidence_strength")) {
  if (evidence_strength == "STRONG") {
    cat("   ✓ Proceed with publication using confident language\n")
    cat("   ✓ Emphasize both statistical and methodological advances\n")
  } else if (evidence_strength == "MODERATE") {
    cat("   ⚠ Proceed with publication using cautious language\n")
    cat("   ⚠ Focus on methodological contribution over empirical claims\n")
    cat("   ⚠ Acknowledge limitations and need for further validation\n")
  } else {
    cat("   ✗ Not ready for publication in current form\n")
    cat("   ✗ Need stronger empirical evidence or different approach\n")
  }
} else {
  cat("   ⚠ Assessment incomplete - run full analysis\n")
}

cat("\n4. KEY LANGUAGE RECOMMENDATIONS:\n")
cat("   • Use 'improved predictive performance' not 'revolutionary'\n")
cat("   • Report ELPD differences with standard errors\n")
cat("   • Acknowledge small effect sizes and uncertainty\n")
cat("   • Emphasize theoretical advance of EPI methodology\n")
cat("   • Frame as 'promising approach warranting further research'\n")

cat("\n=== ROBUSTNESS ANALYSIS COMPLETE ===\n")

# Save results
save.image("focused_robustness_results.RData")
cat("✓ Results saved to focused_robustness_results.RData\n")