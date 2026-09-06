# Counterfactual Analysis and Alternative Model Specifications
# Purpose: Generate substantive economic interpretation of EPI effects
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
cat("=== COUNTERFACTUAL ANALYSIS ===\n\n")

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

# Set working directory
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))
options(mc.cores = 2)

# Load functions
source("R/data_loading.R")
source("R/productivity_index.R")
source("R/bayesian_modeling.R")

# ===== STEP 1: LOAD DATA AND MODELS =====
cat("Step 1: Loading data and models...\n")

# Load data
germany_productivity <- load_productivity_data()
germany_demographics <- load_demographic_data()
cognitive_curves <- load_cognitive_data()
epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

# Prepare model data
model_data <- prepare_model_data(
  germany_productivity,
  epi_data,
  stationarity_results = NULL,
  ensure_consistent_sample = TRUE
)

# Add standardized versions
model_data <- model_data %>%
  mutate(
    epi_standardized = scale(epi_normalized)[,1],
    year_centered = year - mean(year)
  )

# Load models
models_dir <- "models"
models_list <- list()

if (file.exists(file.path(models_dir, "productivity_model_epi_levels.rds"))) {
  models_list$epi_levels <- readRDS(file.path(models_dir, "productivity_model_epi_levels.rds"))
  cat("✓ EPI levels model loaded\n")
} else {
  cat("⚠ EPI levels model not found, fitting new one...\n")
  models_list <- fit_model_comparison(model_data, "epi_levels")
}

if (file.exists(file.path(models_dir, "productivity_model_original.rds"))) {
  models_list$original <- readRDS(file.path(models_dir, "productivity_model_original.rds"))
  cat("✓ Original model loaded\n")
}

cat("✓ Models ready for counterfactual analysis\n\n")

# ===== STEP 2: COUNTERFACTUAL DECOMPOSITION =====
cat("Step 2: Generating counterfactual decomposition...\n")

if (!is.null(models_list$epi_levels)) {
  tryCatch({
    # Get posterior predictions for observed data
    cat("  Computing observed predictions...\n")
    pred_observed <- posterior_linpred(
      models_list$epi_levels,
      newdata = model_data,
      re_formula = NA,
      ndraws = 1000
    )

    # Create counterfactual: freeze EPI at baseline (1972) level
    baseline_epi <- model_data$epi_normalized[model_data$year == min(model_data$year)]
    newdata_counterfactual <- model_data
    newdata_counterfactual$epi_normalized <- baseline_epi
    newdata_counterfactual$epi_standardized <- scale(rep(baseline_epi, nrow(model_data)))[,1]

    cat("  Computing counterfactual predictions (EPI frozen at", round(baseline_epi, 4), ")...\n")
    pred_counterfactual <- posterior_linpred(
      models_list$epi_levels,
      newdata = newdata_counterfactual,
      re_formula = NA,
      ndraws = 1000
    )

    # Calculate EPI contribution (difference between observed and counterfactual)
    epi_contribution <- pred_observed - pred_counterfactual

    # Summarize by year
    counterfactual_summary <- tibble(
      year = model_data$year,
      observed_mean = apply(pred_observed, 2, mean),
      counterfactual_mean = apply(pred_counterfactual, 2, mean),
      epi_contribution_mean = apply(epi_contribution, 2, mean),
      epi_contribution_q025 = apply(epi_contribution, 2, quantile, 0.025),
      epi_contribution_q975 = apply(epi_contribution, 2, quantile, 0.975),
      actual_epi = model_data$epi_normalized,
      baseline_epi = baseline_epi
    )

    cat("✓ Counterfactual analysis completed\n\n")

    # Display key results
    cat("=== COUNTERFACTUAL RESULTS ===\n")
    cat("Baseline EPI (1972):", round(baseline_epi, 4), "\n")
    cat("Final EPI (2023):", round(counterfactual_summary$actual_epi[nrow(counterfactual_summary)], 4), "\n")

    epi_change <- counterfactual_summary$actual_epi[nrow(counterfactual_summary)] - baseline_epi
    cat("Total EPI change:", round(epi_change, 4), "\n")

    # EPI contribution in 2023
    final_contribution <- counterfactual_summary$epi_contribution_mean[nrow(counterfactual_summary)]
    final_contribution_pct <- (exp(final_contribution) - 1) * 100

    cat("\nEPI contribution to log productivity (2023):", round(final_contribution, 4), "\n")
    cat("EPI contribution to productivity level (2023):", round(final_contribution_pct, 2), "%\n")

    # Cumulative effect over the period
    total_productivity_change <- counterfactual_summary$observed_mean[nrow(counterfactual_summary)] -
                               counterfactual_summary$observed_mean[1]
    epi_share_of_change <- final_contribution / total_productivity_change * 100

    cat("Total log productivity change (1972-2023):", round(total_productivity_change, 4), "\n")
    cat("EPI's share of total change:", round(epi_share_of_change, 1), "%\n\n")

    # Save counterfactual data
    write_csv(counterfactual_summary, "counterfactual_analysis_results.csv")
    cat("✓ Counterfactual results saved to counterfactual_analysis_results.csv\n\n")

  }, error = function(e) {
    cat("✗ Counterfactual analysis failed:", e$message, "\n\n")
    counterfactual_summary <- NULL
  })
} else {
  cat("✗ EPI levels model not available for counterfactual analysis\n\n")
  counterfactual_summary <- NULL
}

# ===== STEP 3: ALTERNATIVE MODEL SPECIFICATIONS =====
cat("Step 3: Fitting alternative model specifications...\n")

# Model 1: GP trend instead of AR
cat("  Fitting GP trend model...\n")
tryCatch({
  fit_gp <- brm(
    log_productivity ~ gp(year) + epi_standardized + ar(time = year, p = 1),
    data = model_data,
    prior = c(
      prior(normal(0, 0.5), class = b, coef = epi_standardized),
      prior(inv_gamma(5, 5), class = lscale, coef = gp(year)),
      prior(normal(0, 0.5), class = sdgp, coef = gp(year))
    ),
    chains = 4,
    iter = 2000,
    cores = 2,
    control = list(adapt_delta = 0.95),
    silent = 2,
    refresh = 0
  )

  # Save GP model
  saveRDS(fit_gp, file.path(models_dir, "productivity_model_gp.rds"))
  cat("    ✓ GP trend model fitted and saved\n")

  # Quick diagnostic
  gp_loo <- loo(fit_gp)
  cat("    GP model LOOIC:", round(gp_loo$estimates["looic", "Estimate"], 1), "\n")

}, error = function(e) {
  cat("    ✗ GP trend model failed:", e$message, "\n")
  fit_gp <- NULL
})

# Model 2: Detrended EPI
cat("  Fitting detrended EPI model...\n")
tryCatch({
  # Create detrended EPI
  epi_trend_model <- lm(epi_normalized ~ poly(year, 2), data = model_data)
  model_data$epi_detrended <- residuals(epi_trend_model)
  model_data$epi_detrended_std <- scale(model_data$epi_detrended)[,1]

  fit_detrended <- brm(
    log_productivity ~ poly(year_centered, 2) + epi_detrended_std + ar(time = year, p = 1),
    data = model_data,
    prior = c(
      prior(normal(0, 0.5), class = b, coef = epi_detrended_std),
      prior(normal(0, 1), class = b, coef = polyyear_centered2Q1),
      prior(normal(0, 1), class = b, coef = polyyear_centered2Q2)
    ),
    chains = 4,
    iter = 2000,
    cores = 2,
    control = list(adapt_delta = 0.95),
    silent = 2,
    refresh = 0
  )

  # Save detrended model
  saveRDS(fit_detrended, file.path(models_dir, "productivity_model_detrended.rds"))
  cat("    ✓ Detrended EPI model fitted and saved\n")

  # Quick diagnostic
  detrended_loo <- loo(fit_detrended)
  cat("    Detrended model LOOIC:", round(detrended_loo$estimates["looic", "Estimate"], 1), "\n")

}, error = function(e) {
  cat("    ✗ Detrended EPI model failed:", e$message, "\n")
  fit_detrended <- NULL
})

# Model 3: Pure differenced model
cat("  Fitting differenced (growth) model...\n")
tryCatch({
  # Create differenced data
  model_data_diff <- model_data %>%
    arrange(year) %>%
    mutate(
      dlog_productivity = log_productivity - lag(log_productivity),
      depi = epi_normalized - lag(epi_normalized),
      depi_std = scale(depi)[,1]
    ) %>%
    filter(!is.na(dlog_productivity), !is.na(depi))

  fit_growth <- brm(
    dlog_productivity ~ depi_std,
    data = model_data_diff,
    prior = prior(normal(0, 0.5), class = b, coef = depi_std),
    chains = 4,
    iter = 2000,
    cores = 2,
    control = list(adapt_delta = 0.95),
    silent = 2,
    refresh = 0
  )

  # Save growth model
  saveRDS(fit_growth, file.path(models_dir, "productivity_model_growth_clean.rds"))
  cat("    ✓ Clean differenced model fitted and saved\n")

  # Quick diagnostic
  growth_loo <- loo(fit_growth)
  cat("    Clean growth model LOOIC:", round(growth_loo$estimates["looic", "Estimate"], 1), "\n")

}, error = function(e) {
  cat("    ✗ Clean differenced model failed:", e$message, "\n")
  fit_growth <- NULL
})

cat("\n")

# ===== STEP 4: PARAMETER INTERPRETATION =====
cat("Step 4: Parameter interpretation and effect sizes...\n")

if (!is.null(models_list$epi_levels)) {
  cat("\n=== EPI LEVELS MODEL PARAMETER INTERPRETATION ===\n")

  tryCatch({
    # Extract EPI coefficient
    draws <- as_draws_df(models_list$epi_levels)
    epi_cols <- grep("epi_standardized", names(draws), value = TRUE)

    if (length(epi_cols) > 0) {
      epi_draws <- draws[[epi_cols[1]]]
      epi_mean <- mean(epi_draws)
      epi_q025 <- quantile(epi_draws, 0.025)
      epi_q975 <- quantile(epi_draws, 0.975)

      cat("EPI coefficient (standardized):", round(epi_mean, 4), "[", round(epi_q025, 4), ",", round(epi_q975, 4), "]\n")

      # Effect size interpretation
      epi_sd <- sd(model_data$epi_normalized)
      effect_1sd <- epi_mean  # Already standardized

      cat("Effect of 1 SD increase in EPI on log productivity:", round(effect_1sd, 4), "\n")
      cat("Effect of 1 SD increase in EPI on productivity level:", round((exp(effect_1sd) - 1) * 100, 2), "%\n")

      # Observed EPI change effect
      epi_range <- max(model_data$epi_normalized) - min(model_data$epi_normalized)
      epi_range_std <- epi_range / epi_sd
      observed_effect <- epi_mean * epi_range_std

      cat("Observed EPI range (1972-2023):", round(epi_range, 4), "\n")
      cat("Observed effect on log productivity:", round(observed_effect, 4), "\n")
      cat("Observed effect on productivity level:", round((exp(observed_effect) - 1) * 100, 2), "%\n")

      # Probability of negative effect
      prob_negative <- mean(epi_draws < 0)
      cat("Probability of negative EPI effect:", round(prob_negative * 100, 1), "%\n")

      # Statistical significance
      is_significant <- !(epi_q025 < 0 & epi_q975 > 0)
      cat("95% CI excludes zero:", ifelse(is_significant, "YES", "NO"), "\n")

    } else {
      cat("EPI coefficient not found in model\n")
    }

  }, error = function(e) {
    cat("Parameter interpretation failed:", e$message, "\n")
  })
}

cat("\n")

# ===== STEP 5: OUT-OF-SAMPLE VALIDATION =====
cat("Step 5: Out-of-sample validation...\n")

if (!is.null(models_list$epi_levels) && nrow(model_data) >= 10) {
  tryCatch({
    # Use last 5 years as holdout
    n_holdout <- min(5, floor(nrow(model_data) * 0.1))
    train_data <- model_data[1:(nrow(model_data) - n_holdout), ]
    test_data <- model_data[(nrow(model_data) - n_holdout + 1):nrow(model_data), ]

    cat("  Training observations:", nrow(train_data), "\n")
    cat("  Test observations:", nrow(test_data), "\n")

    # Refit model on training data
    cat("  Refitting model on training data...\n")
    fit_train <- update(
      models_list$epi_levels,
      newdata = train_data,
      chains = 2,
      iter = 1000,
      silent = 2,
      refresh = 0
    )

    # Predict on test data
    pred_test <- posterior_predict(fit_train, newdata = test_data, ndraws = 500)
    pred_mean <- apply(pred_test, 2, mean)

    # Calculate RMSE
    rmse <- sqrt(mean((pred_mean - test_data$log_productivity)^2))
    mae <- mean(abs(pred_mean - test_data$log_productivity))

    cat("  Out-of-sample RMSE:", round(rmse, 4), "\n")
    cat("  Out-of-sample MAE:", round(mae, 4), "\n")

    # Compare to naive forecast (last observation carried forward)
    naive_pred <- rep(train_data$log_productivity[nrow(train_data)], nrow(test_data))
    rmse_naive <- sqrt(mean((naive_pred - test_data$log_productivity)^2))

    cat("  Naive forecast RMSE:", round(rmse_naive, 4), "\n")
    cat("  Improvement over naive:", round((rmse_naive - rmse) / rmse_naive * 100, 1), "%\n")

  }, error = function(e) {
    cat("  Out-of-sample validation failed:", e$message, "\n")
  })
} else {
  cat("  Insufficient data for out-of-sample validation\n")
}

cat("\n")

# ===== STEP 6: SENSITIVITY ANALYSIS =====
cat("Step 6: Cognitive curve sensitivity analysis...\n")

# Define alternative cognitive curves
alternative_curves <- list(
  "conservative" = list(
    fluid_weight = 0.4,
    crystallized_weight = 0.4,
    speed_weight = 0.1,
    memory_weight = 0.1
  ),
  "speed_heavy" = list(
    fluid_weight = 0.2,
    crystallized_weight = 0.2,
    speed_weight = 0.4,
    memory_weight = 0.2
  ),
  "memory_heavy" = list(
    fluid_weight = 0.2,
    crystallized_weight = 0.2,
    speed_weight = 0.2,
    memory_weight = 0.4
  )
)

sensitivity_results <- tibble()

for (curve_name in names(alternative_curves)) {
  cat("  Testing", curve_name, "cognitive weighting...\n")

  tryCatch({
    # Calculate alternative EPI
    weights <- alternative_curves[[curve_name]]
    alt_epi <- calculate_epi(
      germany_demographics,
      cognitive_curves,
      method = "composite",
      weights = weights
    )

    # Prepare alternative model data
    alt_model_data <- prepare_model_data(
      germany_productivity,
      alt_epi,
      stationarity_results = NULL,
      ensure_consistent_sample = TRUE
    ) %>%
      mutate(epi_standardized = scale(epi_normalized)[,1])

    # Quick model fit
    alt_fit <- brm(
      log_productivity ~ poly(year_centered, 2) + epi_standardized + ar(time = year, p = 1),
      data = alt_model_data,
      chains = 2,
      iter = 1000,
      cores = 2,
      silent = 2,
      refresh = 0
    )

    # Extract EPI coefficient
    alt_draws <- as_draws_df(alt_fit)
    epi_col <- grep("epi_standardized", names(alt_draws), value = TRUE)[1]
    epi_coef <- mean(alt_draws[[epi_col]])

    # Store result
    sensitivity_results <- bind_rows(
      sensitivity_results,
      tibble(
        curve = curve_name,
        epi_coefficient = epi_coef,
        fluid_weight = weights$fluid_weight,
        crystallized_weight = weights$crystallized_weight,
        speed_weight = weights$speed_weight,
        memory_weight = weights$memory_weight
      )
    )

    cat("    EPI coefficient:", round(epi_coef, 4), "\n")

  }, error = function(e) {
    cat("    Failed:", e$message, "\n")
  })
}

if (nrow(sensitivity_results) > 0) {
  cat("\n=== SENSITIVITY ANALYSIS RESULTS ===\n")
  print(sensitivity_results)
  write_csv(sensitivity_results, "cognitive_curve_sensitivity.csv")
  cat("✓ Sensitivity results saved to cognitive_curve_sensitivity.csv\n")
}

cat("\n=== COUNTERFACTUAL ANALYSIS COMPLETE ===\n")

# Save all results
save.image("counterfactual_analysis_workspace.RData")
cat("✓ All results saved to counterfactual_analysis_workspace.RData\n")