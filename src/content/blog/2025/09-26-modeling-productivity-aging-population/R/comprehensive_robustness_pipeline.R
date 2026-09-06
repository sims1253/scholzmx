# Comprehensive Robustness Pipeline for EPI Analysis
# Purpose: Complete validation pipeline with publication-ready outputs
# Author: Generated for scholzmx blog based on GPT recommendations

# Clear environment and load libraries
rm(list = ls())
cat("=== COMPREHENSIVE EPI ROBUSTNESS PIPELINE ===\n\n")

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(brms)
  library(tidybayes)
  library(here)
  library(loo)
  library(bayesplot)
  library(posterior)
  library(broom)
})

# Set working directory and options
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))
options(mc.cores = 2)
set.seed(42)

# Load our existing functions
source("R/data_loading.R")
source("R/productivity_index.R")
source("R/bayesian_modeling.R")

# Create output directories
dir.create("robustness_output", showWarnings = FALSE)
dir.create("robustness_output/figures", showWarnings = FALSE)
dir.create("robustness_output/tables", showWarnings = FALSE)

cat("✓ Environment prepared, output directories created\n\n")

# ===== STEP 1: DATA PREPARATION =====
cat("Step 1: Loading and preparing data...\n")

# Load base data using our functions
germany_productivity <- load_productivity_data()
germany_demographics <- load_demographic_data()
cognitive_curves <- load_cognitive_data()

# Calculate EPI using our composite method
epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

# Prepare model data with strict consistency
model_data <- prepare_model_data(
  germany_productivity,
  epi_data,
  stationarity_results = NULL,
  ensure_consistent_sample = TRUE
)

# Add standardized versions for interpretation
model_data <- model_data %>%
  mutate(
    epi_standardized = as.numeric(scale(epi_normalized)),
    year_centered = year - mean(year),
    time_trend_std = as.numeric(scale(time_trend))
  )

# Data summary
data_summary <- tibble(
  Metric = c("Observations", "Year Range", "EPI Range", "EPI SD", "EPI-Time Correlation"),
  Value = c(
    paste(nrow(model_data)),
    paste(min(model_data$year), "to", max(model_data$year)),
    paste(round(min(model_data$epi_normalized), 4), "to", round(max(model_data$epi_normalized), 4)),
    paste(round(sd(model_data$epi_normalized), 6)),
    paste(round(cor(model_data$epi_normalized, model_data$year), 3))
  )
)

cat("✓ Data prepared:\n")
print(data_summary)
cat("\n")

# ===== STEP 2: FIT CORE MODELS =====
cat("Step 2: Fitting core models...\n")

# Common priors for comparability
common_priors <- c(
  prior(normal(0, 1), class = "Intercept"),
  prior(normal(0, 0.5), class = "b"),
  prior(normal(0.95, 0.1), class = "ar"),
  prior(exponential(2), class = "sigma")
)

# Model 1: Original demographic model
cat("  Fitting original model...\n")
tryCatch({
  fit_original <- brm(
    bf(log_productivity ~ poly(time_trend, 2) + poly(avg_age, 2) + pop_over_50_pct +
       ar(time = year, p = 1)),
    data = model_data,
    prior = common_priors,
    chains = 4, cores = 2, iter = 3000, seed = 42,
    control = list(adapt_delta = 0.95),
    silent = 2, refresh = 0
  )
  cat("    ✓ Original model fitted\n")
}, error = function(e) {
  cat("    ✗ Original model failed:", e$message, "\n")
  fit_original <- NULL
})

# Model 2: EPI levels model
cat("  Fitting EPI levels model...\n")
tryCatch({
  fit_epi_levels <- brm(
    bf(log_productivity ~ poly(time_trend, 2) + epi_standardized + I(epi_standardized^2) +
       ar(time = year, p = 1)),
    data = model_data,
    prior = common_priors,
    chains = 4, cores = 2, iter = 3000, seed = 42,
    control = list(adapt_delta = 0.95),
    silent = 2, refresh = 0
  )
  cat("    ✓ EPI levels model fitted\n")
}, error = function(e) {
  cat("    ✗ EPI levels model failed:", e$message, "\n")
  fit_epi_levels <- NULL
})

# Model 3: Detrended EPI model
cat("  Fitting detrended EPI model...\n")
tryCatch({
  # Create detrended EPI
  epi_trend_model <- lm(epi_normalized ~ poly(year, 2), data = model_data)
  model_data$epi_detrended <- residuals(epi_trend_model)
  model_data$epi_detrended_std <- as.numeric(scale(model_data$epi_detrended))

  fit_epi_detrended <- brm(
    bf(log_productivity ~ poly(time_trend, 2) + epi_detrended_std +
       ar(time = year, p = 1)),
    data = model_data,
    prior = common_priors,
    chains = 4, cores = 2, iter = 3000, seed = 42,
    control = list(adapt_delta = 0.95),
    silent = 2, refresh = 0
  )
  cat("    ✓ Detrended EPI model fitted\n")

  # Store detrending R²
  epi_trend_r2 <- summary(epi_trend_model)$r.squared

}, error = function(e) {
  cat("    ✗ Detrended EPI model failed:", e$message, "\n")
  fit_epi_detrended <- NULL
  epi_trend_r2 <- NA
})

# Model 4: Growth (differenced) model
cat("  Fitting growth model...\n")
tryCatch({
  # Create differenced data
  model_data_diff <- model_data %>%
    arrange(year) %>%
    mutate(
      dlog_productivity = log_productivity - lag(log_productivity),
      depi = epi_normalized - lag(epi_normalized),
      depi_std = as.numeric(scale(depi))
    ) %>%
    filter(!is.na(dlog_productivity), !is.na(depi))

  fit_growth <- brm(
    bf(dlog_productivity ~ depi_std),
    data = model_data_diff,
    prior = c(
      prior(normal(0, 0.1), class = "b"),
      prior(exponential(2), class = "sigma")
    ),
    chains = 4, cores = 2, iter = 3000, seed = 42,
    control = list(adapt_delta = 0.95),
    silent = 2, refresh = 0
  )
  cat("    ✓ Growth model fitted\n")
}, error = function(e) {
  cat("    ✗ Growth model failed:", e$message, "\n")
  fit_growth <- NULL
})

# Model 5: GP trend model
cat("  Fitting GP trend model...\n")
tryCatch({
  fit_gp <- brm(
    bf(log_productivity ~ gp(year) + epi_standardized),
    data = model_data,
    prior = c(
      prior(normal(0, 0.5), class = "b"),
      prior(normal(0, 1), class = "Intercept"),
      prior(inv_gamma(3, 3), class = "lscale"),
      prior(exponential(2), class = "sigma")
    ),
    chains = 4, cores = 2, iter = 3000, seed = 42,
    control = list(adapt_delta = 0.95),
    silent = 2, refresh = 0
  )
  cat("    ✓ GP trend model fitted\n")
}, error = function(e) {
  cat("    ✗ GP trend model failed:", e$message, "\n")
  fit_gp <- NULL
})

cat("\n")

# ===== STEP 3: PSIS-LOO DIAGNOSTICS =====
cat("Step 3: Computing PSIS-LOO diagnostics...\n")

# Store fitted models
models_list <- list()
if (!is.null(fit_original)) models_list$original <- fit_original
if (!is.null(fit_epi_levels)) models_list$epi_levels <- fit_epi_levels
if (!is.null(fit_epi_detrended)) models_list$epi_detrended <- fit_epi_detrended
if (!is.null(fit_gp)) models_list$gp_trend <- fit_gp

# Compute LOO for each model
loo_results <- list()
pareto_k_summary <- tibble()

for (model_name in names(models_list)) {
  cat("  Computing LOO for", model_name, "...\n")

  tryCatch({
    loo_results[[model_name]] <- loo(models_list[[model_name]], moment_match = TRUE)

    # Extract Pareto k diagnostics
    pareto_k <- loo_results[[model_name]]$diagnostics$pareto_k
    k_summary <- tibble(
      Model = model_name,
      `k > 0.7` = sum(pareto_k > 0.7),
      `k 0.5-0.7` = sum(pareto_k > 0.5 & pareto_k <= 0.7),
      `k ≤ 0.5` = sum(pareto_k <= 0.5),
      `Max k` = round(max(pareto_k), 3),
      `Mean k` = round(mean(pareto_k), 3),
      LOOIC = round(loo_results[[model_name]]$estimates["looic", "Estimate"], 1),
      `LOOIC SE` = round(loo_results[[model_name]]$estimates["looic", "SE"], 1)
    )

    pareto_k_summary <- bind_rows(pareto_k_summary, k_summary)

  }, error = function(e) {
    cat("    ✗ LOO failed for", model_name, ":", e$message, "\n")
  })
}

cat("✓ PSIS-LOO diagnostics completed\n\n")

# Display Pareto k summary
cat("=== PARETO K DIAGNOSTICS ===\n")
print(pareto_k_summary)
cat("\n")

# ===== STEP 4: MODEL COMPARISON =====
cat("Step 4: Model comparison analysis...\n")

# Check if we have enough models for comparison
valid_models <- names(loo_results)
if (length(valid_models) >= 2) {

  # Compare models
  loo_comparison <- loo_compare(loo_results[valid_models])

  # Extract comparison metrics
  comparison_summary <- as_tibble(loo_comparison, rownames = "Model") %>%
    mutate(
      Model = factor(Model, levels = rev(Model)),  # Keep loo_compare order
      `ELPD Diff` = round(elpd_diff, 2),
      `SE Diff` = round(se_diff, 2),
      `Z Score` = round(abs(elpd_diff) / se_diff, 2),
      `Significant` = abs(elpd_diff) > 2 * se_diff
    ) %>%
    select(Model, `ELPD Diff`, `SE Diff`, `Z Score`, `Significant`)

  # Calculate stacking weights
  problematic_k <- pareto_k_summary %>%
    filter(`k > 0.7` > 0) %>%
    nrow()

  if (problematic_k <= length(valid_models) / 2) {  # If most models are reliable
    cat("  Computing stacking weights...\n")
    tryCatch({
      stacking_weights <- loo_model_weights(loo_results[valid_models], method = "stacking")

      weights_summary <- tibble(
        Model = names(stacking_weights),
        `Stacking Weight` = round(stacking_weights * 100, 1)
      )

    }, error = function(e) {
      cat("    ✗ Stacking weights failed:", e$message, "\n")
      weights_summary <- NULL
    })
  } else {
    cat("  ⚠ Too many problematic Pareto k values, skipping stacking weights\n")
    weights_summary <- NULL
  }

} else {
  cat("  ✗ Insufficient models for comparison\n")
  comparison_summary <- NULL
  weights_summary <- NULL
}

cat("✓ Model comparison completed\n\n")

# ===== STEP 5: K-FOLD CV (IF NEEDED) =====
any_problematic_k <- any(pareto_k_summary$`k > 0.7` > 0)

if (any_problematic_k && length(valid_models) >= 2) {
  cat("Step 5: Running k-fold cross-validation due to Pareto k issues...\n")

  kfold_results <- list()
  for (model_name in valid_models) {
    cat("  Running 10-fold CV for", model_name, "...\n")

    tryCatch({
      kfold_results[[model_name]] <- kfold(models_list[[model_name]], K = 10)
      cat("    ✓ Completed\n")
    }, error = function(e) {
      cat("    ✗ Failed:", e$message, "\n")
    })
  }

  # Compare k-fold results
  if (length(kfold_results) >= 2) {
    kfold_comparison <- loo_compare(kfold_results)
    cat("✓ K-fold cross-validation completed\n\n")
  }

} else {
  cat("Step 5: K-fold CV not needed - PSIS diagnostics acceptable\n\n")
  kfold_results <- NULL
}

# ===== STEP 6: PARAMETER ANALYSIS =====
cat("Step 6: Parameter analysis and AR coefficient investigation...\n")

parameter_summary <- tibble()

for (model_name in names(models_list)) {
  cat("  Analyzing parameters for", model_name, "...\n")

  tryCatch({
    # Extract draws
    draws <- as_draws_df(models_list[[model_name]])

    # AR coefficient analysis
    ar_cols <- grep("ar\\[1\\]", names(draws), value = TRUE)
    if (length(ar_cols) > 0) {
      ar_draws <- draws[[ar_cols[1]]]
      ar_summary <- tibble(
        Model = model_name,
        Parameter = "AR(1)",
        Mean = round(mean(ar_draws), 3),
        `2.5%` = round(quantile(ar_draws, 0.025), 3),
        `97.5%` = round(quantile(ar_draws, 0.975), 3),
        `P(>1.0)` = round(mean(ar_draws > 1.0) * 100, 1),
        `P(>0.95)` = round(mean(ar_draws > 0.95) * 100, 1)
      )

      parameter_summary <- bind_rows(parameter_summary, ar_summary)
    }

    # EPI coefficient analysis (if available)
    epi_cols <- grep("epi_standardized|epi_detrended_std", names(draws), value = TRUE)
    if (length(epi_cols) > 0) {
      epi_draws <- draws[[epi_cols[1]]]
      epi_summary <- tibble(
        Model = model_name,
        Parameter = "EPI (std)",
        Mean = round(mean(epi_draws), 4),
        `2.5%` = round(quantile(epi_draws, 0.025), 4),
        `97.5%` = round(quantile(epi_draws, 0.975), 4),
        `P(>0)` = round(mean(epi_draws > 0) * 100, 1),
        `Significant` = !(quantile(epi_draws, 0.025) < 0 & quantile(epi_draws, 0.975) > 0)
      )

      parameter_summary <- bind_rows(parameter_summary,
                                   epi_summary %>% select(-`P(>1.0)`, -`P(>0.95)`))
    }

  }, error = function(e) {
    cat("    ✗ Parameter analysis failed:", e$message, "\n")
  })
}

cat("✓ Parameter analysis completed\n\n")

# ===== STEP 7: COUNTERFACTUAL ANALYSIS =====
cat("Step 7: Counterfactual analysis...\n")

if (!is.null(fit_epi_levels)) {
  tryCatch({
    # Baseline EPI (1972 value)
    baseline_epi <- model_data$epi_normalized[model_data$year == min(model_data$year)]

    # Create counterfactual dataset
    newdata_counterfactual <- model_data %>%
      mutate(
        epi_normalized = baseline_epi,
        epi_standardized = (baseline_epi - mean(model_data$epi_normalized)) / sd(model_data$epi_normalized)
      )

    # Posterior predictions
    pred_observed <- posterior_linpred(fit_epi_levels, re_formula = NA, ndraws = 1000)
    pred_counterfactual <- posterior_linpred(fit_epi_levels,
                                           newdata = newdata_counterfactual,
                                           re_formula = NA, ndraws = 1000)

    # Calculate EPI contribution
    epi_contribution <- pred_observed - pred_counterfactual

    # Summarize by year
    counterfactual_summary <- tibble(
      Year = model_data$year,
      `Observed EPI` = round(model_data$epi_normalized, 4),
      `Baseline EPI` = round(baseline_epi, 4),
      `Log Contrib (Mean)` = round(apply(epi_contribution, 2, mean), 4),
      `Log Contrib (2.5%)` = round(apply(epi_contribution, 2, quantile, 0.025), 4),
      `Log Contrib (97.5%)` = round(apply(epi_contribution, 2, quantile, 0.975), 4),
      `Pct Contrib (Mean)` = round((exp(apply(epi_contribution, 2, mean)) - 1) * 100, 3),
      `Pct Contrib (2.5%)` = round((exp(apply(epi_contribution, 2, quantile, 0.025)) - 1) * 100, 3),
      `Pct Contrib (97.5%)` = round((exp(apply(epi_contribution, 2, quantile, 0.975)) - 1) * 100, 3)
    )

    # Key summary statistics
    final_year_effect <- counterfactual_summary$`Pct Contrib (Mean)`[nrow(counterfactual_summary)]
    total_epi_change <- max(model_data$epi_normalized) - min(model_data$epi_normalized)

    counterfactual_key_stats <- tibble(
      Metric = c(
        "Baseline EPI (1972)",
        "Final EPI (2023)",
        "Total EPI Change",
        "Final Year Effect (%)",
        "Annualized Effect (%)"
      ),
      Value = c(
        round(baseline_epi, 4),
        round(model_data$epi_normalized[nrow(model_data)], 4),
        round(total_epi_change, 4),
        round(final_year_effect, 3),
        round(final_year_effect / (max(model_data$year) - min(model_data$year)), 4)
      )
    )

    cat("✓ Counterfactual analysis completed\n")

  }, error = function(e) {
    cat("  ✗ Counterfactual analysis failed:", e$message, "\n")
    counterfactual_summary <- NULL
    counterfactual_key_stats <- NULL
  })
} else {
  cat("  ✗ EPI levels model not available for counterfactual analysis\n")
  counterfactual_summary <- NULL
  counterfactual_key_stats <- NULL
}

cat("\n")

# ===== STEP 8: CREATE VISUALIZATIONS =====
cat("Step 8: Creating visualizations...\n")

# Plot 1: EPI vs Time with trend
p1 <- ggplot(model_data, aes(x = year, y = epi_normalized)) +
  geom_line(color = "blue", size = 1) +
  geom_smooth(method = "lm", formula = y ~ poly(x, 2), se = TRUE, alpha = 0.2) +
  labs(
    title = "Effective Productivity Index (EPI) Over Time",
    subtitle = paste("Correlation with time:", round(cor(model_data$epi_normalized, model_data$year), 3)),
    x = "Year",
    y = "EPI"
  ) +
  theme_minimal()

# Plot 2: Model comparison (if available)
if (!is.null(comparison_summary) && nrow(comparison_summary) > 1) {
  p2 <- comparison_summary %>%
    filter(Model != rownames(loo_comparison)[1]) %>%  # Exclude reference model
    ggplot(aes(x = reorder(Model, `ELPD Diff`), y = `ELPD Diff`)) +
    geom_col(aes(fill = `Significant`), alpha = 0.7) +
    geom_errorbar(aes(ymin = `ELPD Diff` - `SE Diff`, ymax = `ELPD Diff` + `SE Diff`),
                  width = 0.2) +
    geom_hline(yintercept = 0, linetype = "dashed") +
    coord_flip() +
    scale_fill_manual(values = c("TRUE" = "darkgreen", "FALSE" = "orange")) +
    labs(
      title = "Model Comparison: ELPD Differences",
      subtitle = "Error bars show ±1 SE, significance at |diff| > 2×SE",
      x = "Model",
      y = "ELPD Difference"
    ) +
    theme_minimal()
} else {
  p2 <- ggplot() +
    annotate("text", x = 0.5, y = 0.5, label = "Model comparison\nnot available", size = 6) +
    theme_void()
}

# Plot 3: Pareto k diagnostics
p3 <- pareto_k_summary %>%
  select(Model, `k > 0.7`, `k 0.5-0.7`, `k ≤ 0.5`) %>%
  pivot_longer(-Model, names_to = "Pareto_k_Range", values_to = "Count") %>%
  ggplot(aes(x = Model, y = Count, fill = Pareto_k_Range)) +
  geom_col(position = "stack") +
  scale_fill_manual(
    values = c("k > 0.7" = "red", "k 0.5-0.7" = "orange", "k ≤ 0.5" = "green"),
    name = "Pareto k"
  ) +
  coord_flip() +
  labs(
    title = "PSIS Reliability: Pareto k Diagnostics",
    subtitle = "Green = reliable, Orange = moderate, Red = problematic",
    x = "Model",
    y = "Number of Observations"
  ) +
  theme_minimal()

# Plot 4: Counterfactual (if available)
if (!is.null(counterfactual_summary)) {
  p4 <- counterfactual_summary %>%
    ggplot(aes(x = Year)) +
    geom_ribbon(aes(ymin = `Pct Contrib (2.5%)`, ymax = `Pct Contrib (97.5%)`),
                alpha = 0.3, fill = "blue") +
    geom_line(aes(y = `Pct Contrib (Mean)`), color = "blue", size = 1) +
    geom_hline(yintercept = 0, linetype = "dashed") +
    labs(
      title = "EPI Counterfactual Analysis",
      subtitle = "Productivity effect if EPI remained at 1972 level",
      x = "Year",
      y = "Productivity Effect (%)"
    ) +
    theme_minimal()
} else {
  p4 <- ggplot() +
    annotate("text", x = 0.5, y = 0.5, label = "Counterfactual\nanalysis not available", size = 6) +
    theme_void()
}

# Save individual plots
ggsave("robustness_output/figures/epi_time_trend.png", p1, width = 10, height = 6, dpi = 300)
ggsave("robustness_output/figures/model_comparison.png", p2, width = 10, height = 6, dpi = 300)
ggsave("robustness_output/figures/pareto_k_diagnostics.png", p3, width = 10, height = 6, dpi = 300)
ggsave("robustness_output/figures/counterfactual_analysis.png", p4, width = 10, height = 6, dpi = 300)

# Create a simple combined plot without patchwork
png("robustness_output/figures/comprehensive_diagnostics.png", width = 1600, height = 1200, res = 150)
par(mfrow = c(2, 2))
plot(model_data$year, model_data$epi_normalized, type = "l", main = "EPI Over Time", xlab = "Year", ylab = "EPI")
if (exists("pareto_k_summary") && nrow(pareto_k_summary) > 0) {
  barplot(pareto_k_summary$`k > 0.7`, names.arg = pareto_k_summary$Model, main = "Problematic Pareto k")
}
dev.off()

cat("✓ Visualizations created and saved\n\n")

# ===== STEP 9: CREATE SUMMARY TABLES =====
cat("Step 9: Creating summary tables...\n")

# Table 1: Data summary
write_csv(data_summary, "robustness_output/tables/data_summary.csv")

# Table 2: Pareto k diagnostics
write_csv(pareto_k_summary, "robustness_output/tables/pareto_k_diagnostics.csv")

# Table 3: Model comparison
if (!is.null(comparison_summary)) {
  write_csv(comparison_summary, "robustness_output/tables/model_comparison.csv")
}

# Table 4: Stacking weights
if (!is.null(weights_summary)) {
  write_csv(weights_summary, "robustness_output/tables/stacking_weights.csv")
}

# Table 5: Parameter summary
if (nrow(parameter_summary) > 0) {
  write_csv(parameter_summary, "robustness_output/tables/parameter_summary.csv")
}

# Table 6: Counterfactual key stats
if (!is.null(counterfactual_key_stats)) {
  write_csv(counterfactual_key_stats, "robustness_output/tables/counterfactual_summary.csv")
  write_csv(counterfactual_summary, "robustness_output/tables/counterfactual_detailed.csv")
}

cat("✓ Summary tables created and saved\n\n")

# ===== STEP 10: GENERATE DIAGNOSTIC REPORT =====
cat("Step 10: Generating diagnostic report...\n")

# Create comprehensive diagnostic report
report <- paste0(
  "# EPI Robustness Analysis: Diagnostic Report\n",
  "Generated: ", Sys.time(), "\n\n",

  "## Data Summary\n",
  "- Observations: ", nrow(model_data), "\n",
  "- Year range: ", min(model_data$year), " to ", max(model_data$year), "\n",
  "- EPI range: ", round(min(model_data$epi_normalized), 4), " to ", round(max(model_data$epi_normalized), 4), "\n",
  "- EPI standard deviation: ", round(sd(model_data$epi_normalized), 6), "\n",
  "- EPI-time correlation: ", round(cor(model_data$epi_normalized, model_data$year), 3), "\n",
  if (!is.na(epi_trend_r2)) paste0("- EPI explained by time trend (R²): ", round(epi_trend_r2, 3), "\n") else "",
  "\n",

  "## Model Fitting Results\n",
  "Models successfully fitted: ", length(models_list), "\n",
  "- ", paste(names(models_list), collapse = ", "), "\n\n",

  "## PSIS-LOO Reliability\n",
  if (any_problematic_k) {
    "⚠ WARNING: Some models have problematic Pareto k values (>0.7)\n"
  } else {
    "✓ All models have acceptable Pareto k diagnostics\n"
  },
  "Models with k > 0.7: ", sum(pareto_k_summary$`k > 0.7` > 0), "\n",
  if (exists("kfold_results") && !is.null(kfold_results)) {
    "✓ K-fold cross-validation completed as fallback\n"
  } else {
    "K-fold CV not needed\n"
  },
  "\n",

  "## Model Comparison Evidence\n",
  if (!is.null(comparison_summary) && nrow(comparison_summary) > 1) {
    paste0(
      "Best model: ", comparison_summary$Model[1], "\n",
      "ELPD difference vs second best: ", comparison_summary$`ELPD Diff`[2], " ± ", comparison_summary$`SE Diff`[2], "\n",
      "Statistical significance: ", ifelse(comparison_summary$`Significant`[2], "YES", "NO"), "\n",
      "Evidence strength: ",
      if (comparison_summary$`Significant`[2] && !is.null(weights_summary)) {
        if (max(weights_summary$`Stacking Weight`) > 70) "STRONG" else "MODERATE"
      } else {
        "WEAK"
      }, "\n"
    )
  } else {
    "Model comparison not available\n"
  },
  "\n",

  "## AR(1) Coefficient Analysis\n",
  if (nrow(parameter_summary) > 0) {
    ar_params <- parameter_summary %>% filter(Parameter == "AR(1)")
    if (nrow(ar_params) > 0) {
      unit_root_models <- ar_params %>% filter(`P(>1.0)` > 50)
      if (nrow(unit_root_models) > 0) {
        paste0(
          "🚨 UNIT ROOT DETECTED in ", nrow(unit_root_models), " model(s):\n",
          paste0("- ", unit_root_models$Model, ": AR(1) = ", unit_root_models$Mean,
                 " [P(>1.0) = ", unit_root_models$`P(>1.0)`, "%]", collapse = "\n"), "\n",
          "RECOMMENDATION: Consider differenced models or structural trend specifications\n"
        )
      } else {
        "✓ AR coefficients in reasonable range\n"
      }
    } else {
      "AR coefficient analysis not available\n"
    }
  } else {
    "Parameter analysis not available\n"
  },
  "\n",

  "## EPI Effects and Economic Significance\n",
  if (!is.null(counterfactual_key_stats)) {
    paste0(
      "Total EPI change (1972-2023): ", counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Total EPI Change"], "\n",
      "Estimated productivity effect: ", counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Final Year Effect (%)"], "%\n",
      "Annualized effect: ", counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Annualized Effect (%)"], "% per year\n",
      "Economic significance: ",
      if (abs(as.numeric(counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Final Year Effect (%)"])) > 1) {
        "HIGH (>1% total effect)"
      } else if (abs(as.numeric(counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Final Year Effect (%)"])) > 0.1) {
        "MODERATE (0.1-1% total effect)"
      } else {
        "LOW (<0.1% total effect)"
      }, "\n"
    )
  } else {
    "Economic effect analysis not available\n"
  },
  "\n",

  "## Publication Readiness Assessment\n",
  if (!is.null(comparison_summary) && nrow(comparison_summary) > 1) {
    evidence_strength <- "INCONCLUSIVE"
    if (!is.null(weights_summary)) {
      max_weight <- max(weights_summary$`Stacking Weight`)
      is_significant <- any(comparison_summary$`Significant`[-1])

      if (is_significant && max_weight > 70) {
        evidence_strength <- "STRONG"
      } else if (is_significant || max_weight > 60) {
        evidence_strength <- "MODERATE"
      } else {
        evidence_strength <- "WEAK"
      }
    }

    paste0(
      "Overall evidence strength: ", evidence_strength, "\n",
      "Publication recommendation: ",
      switch(evidence_strength,
        "STRONG" = "✓ Proceed with confident claims about EPI superiority",
        "MODERATE" = "⚠ Proceed with cautious claims, emphasize methodology",
        "WEAK" = "⚠ Focus on theoretical contribution, acknowledge empirical limitations",
        "INCONCLUSIVE" = "✗ Insufficient evidence for empirical superiority claims"
      ), "\n"
    )
  } else {
    "Assessment incomplete\n"
  },
  "\n",

  "## Key Recommendations\n",
  "1. Report ELPD differences with standard errors\n",
  "2. Include Pareto k diagnostics in supplementary material\n",
  if (any_problematic_k) "3. Use k-fold CV results for problematic models\n" else "",
  if (exists("epi_trend_r2") && !is.na(epi_trend_r2) && epi_trend_r2 > 0.8) {
    "3. Address high EPI-time collinearity in interpretation\n"
  } else "",
  if (nrow(parameter_summary) > 0) {
    ar_params <- parameter_summary %>% filter(Parameter == "AR(1)")
    if (nrow(ar_params) > 0 && any(ar_params$`P(>1.0)` > 50)) {
      "4. Address AR(1) > 1 issue with alternative specifications\n"
    } else ""
  } else "",
  "5. Emphasize theoretical innovation of EPI methodology\n",
  "6. Use appropriately cautious language about empirical findings\n",
  "\n",

  "## Files Generated\n",
  "- Tables: robustness_output/tables/\n",
  "- Figures: robustness_output/figures/\n",
  "- Full workspace: robustness_output/comprehensive_robustness_workspace.RData\n"
)

# Write report
writeLines(report, "robustness_output/diagnostic_report.txt")

cat("✓ Diagnostic report generated\n\n")

# ===== STEP 11: SAVE WORKSPACE =====
cat("Step 11: Saving complete workspace...\n")

save.image("robustness_output/comprehensive_robustness_workspace.RData")

cat("✓ Workspace saved\n\n")

# ===== FINAL SUMMARY =====
cat("=== COMPREHENSIVE ROBUSTNESS ANALYSIS COMPLETE ===\n\n")

cat("SUMMARY:\n")
cat("- Models fitted:", length(models_list), "\n")
cat("- PSIS reliability:", ifelse(any_problematic_k, "Some issues detected", "All models reliable"), "\n")
if (!is.null(comparison_summary) && nrow(comparison_summary) > 1) {
  cat("- Best model:", as.character(comparison_summary$Model[1]), "\n")
  cat("- Statistical significance:", ifelse(any(comparison_summary$`Significant`[-1]), "YES", "NO"), "\n")
}
if (!is.null(counterfactual_key_stats)) {
  final_effect <- as.numeric(counterfactual_key_stats$Value[counterfactual_key_stats$Metric == "Final Year Effect (%)"])
  cat("- Economic effect:", round(final_effect, 3), "% over",
      max(model_data$year) - min(model_data$year), "years\n")
}

cat("\nOUTPUTS GENERATED:\n")
cat("- Diagnostic report: robustness_output/diagnostic_report.txt\n")
cat("- Comprehensive plots: robustness_output/figures/comprehensive_diagnostics.png\n")
cat("- Summary tables: robustness_output/tables/\n")
cat("- Complete workspace: robustness_output/comprehensive_robustness_workspace.RData\n")

cat("\nNext steps: Review diagnostic report and adjust paper claims accordingly.\n")

cat("\n=== PIPELINE COMPLETE ===\n")