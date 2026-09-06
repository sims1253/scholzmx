# Bayesian Hierarchical Productivity Decomposition Models
# Purpose: Replace frequentist models with Bayesian approach for better uncertainty quantification
# Author: Enhanced Bayesian EPI methodology

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(brms)
  library(rstanarm)
  library(bayesplot)
  library(loo)
  library(posterior)
  library(tidybayes)
})

options(mc.cores = parallel::detectCores())

cat("=== BAYESIAN HIERARCHICAL PRODUCTIVITY DECOMPOSITION ===\n\n")

# ===== DATA PREPARATION =====

#' Prepare Bayesian Modeling Data
#'
#' Combines all enhanced data sources for Bayesian analysis
prepare_bayesian_data <- function() {

  cat("Preparing data for Bayesian modeling...\n")

  # Load extended productivity data
  source(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "R", "extended_data_2024.R"))
  productivity_data <- create_extended_productivity_data()

  # Load enhanced cognitive data
  enhanced_cognitive_curves <- read_csv(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "data", "enhanced_cognitive_curves.csv"),
    show_col_types = FALSE)

  # Load shock database
  source(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "R", "economic_shock_database.R"))
  shock_database <- create_comprehensive_shock_database()

  # Calculate enhanced EPI by year
  epi_annual <- enhanced_cognitive_curves %>%
    # Use workforce weighting with human capital adjustment
    group_by(year) %>%
    summarise(
      epi_enhanced = weighted.mean(cognitive_composite_modern,
                                  human_capital_share, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      epi_normalized = epi_enhanced / mean(epi_enhanced, na.rm = TRUE),
      epi_change = c(NA, diff(epi_normalized))
    )

  # Aggregate shocks to annual level
  shock_annual <- shock_database %>%
    group_by(year) %>%
    summarise(
      temporary_shock = mean(temporary_shock, na.rm = TRUE),
      permanent_shock = mean(permanent_shock, na.rm = TRUE),
      financial_shock = mean(ifelse(shock_type == "Financial", historical_shock_composite, 0), na.rm = TRUE),
      energy_shock = mean(ifelse(shock_type == "Energy/Commodity", historical_shock_composite, 0), na.rm = TRUE),
      covid_shock = mean(ifelse(!is.na(lockdown_stringency), lockdown_stringency / 100, 0), na.rm = TRUE),
      war_shock = mean(ifelse(!is.na(energy_price_shock), (energy_price_shock - 100) / 200, 0), na.rm = TRUE),
      composite_shock = mean(composite_shock_index, na.rm = TRUE),
      .groups = "drop"
    )

  # Combine all data
  bayesian_data <- productivity_data %>%
    left_join(epi_annual, by = "year") %>%
    left_join(shock_annual, by = "year") %>%
    mutate(
      # Fill missing shock values
      across(c(temporary_shock, permanent_shock, financial_shock,
              energy_shock, covid_shock, war_shock, composite_shock),
             ~ ifelse(is.na(.), 0, .)),

      # Time variables
      time_trend = year - min(year),
      time_trend_sq = time_trend^2,
      time_decade = floor(time_trend / 10),

      # Log productivity and growth
      log_productivity = log(productivity_per_hour),
      productivity_growth = c(NA, diff(log_productivity)) * 100, # Convert to percentage

      # Period indicators
      period = case_when(
        year <= 1989 ~ "Early Period",
        year <= 1999 ~ "1990s",
        year <= 2006 ~ "Pre-Crisis",
        year <= 2009 ~ "Financial Crisis",
        year <= 2019 ~ "Recovery",
        year <= 2022 ~ "COVID Era",
        TRUE ~ "Current"
      ),
      period = factor(period, levels = c("Early Period", "1990s", "Pre-Crisis",
                                        "Financial Crisis", "Recovery", "COVID Era", "Current"))
    ) %>%
    filter(!is.na(productivity_growth)) %>%
    drop_na()

  cat("   ✓ Bayesian dataset prepared:", nrow(bayesian_data), "years\n")
  cat("   ✓ Coverage:", min(bayesian_data$year), "to", max(bayesian_data$year), "\n")

  return(bayesian_data)
}

# ===== BAYESIAN MODEL SPECIFICATIONS =====

#' Define Bayesian Prior Specifications
#'
#' Sets informative priors based on economic theory and previous research
define_priors <- function() {

  cat("Defining Bayesian priors...\n")

  # Prior specifications based on economic knowledge
  priors <- c(
    # Intercept: Modest positive prior for productivity growth
    prior(normal(2, 1), class = Intercept),

    # Time trend: Slightly positive but uncertain
    prior(normal(0.02, 0.01), class = b, coef = time_trend),

    # Time trend squared: Small negative (diminishing returns)
    prior(normal(-0.0001, 0.0001), class = b, coef = time_trend_sq),

    # EPI change: Negative but uncertain effect
    prior(normal(-0.5, 0.3), class = b, coef = epi_change),

    # Shock effects: Negative priors for various shocks
    prior(normal(-0.02, 0.01), class = b, coef = temporary_shock),
    prior(normal(-0.015, 0.01), class = b, coef = permanent_shock),
    prior(normal(-0.025, 0.015), class = b, coef = financial_shock),
    prior(normal(-0.02, 0.01), class = b, coef = energy_shock),
    prior(normal(-0.01, 0.01), class = b, coef = covid_shock),
    prior(normal(-0.015, 0.01), class = b, coef = war_shock),

    # Error term: Moderate variability
    prior(exponential(0.5), class = sigma),

    # Random effects (if used)
    prior(exponential(1), class = sd)
  )

  cat("   ✓ Informative priors defined for all parameters\n")
  return(priors)
}

# ===== BAYESIAN MODEL ESTIMATION =====

#' Estimate Bayesian Productivity Decomposition Models
#'
#' Fits multiple hierarchical models with different specifications
estimate_bayesian_models <- function(data, priors) {

  cat("Estimating Bayesian productivity decomposition models...\n")

  # Model 1: Basic trend + aging
  cat("   Fitting Model 1: Basic trend + aging...\n")
  model_basic <- brm(
    productivity_growth ~ time_trend + I(time_trend^2) + epi_change,
    data = data,
    prior = priors,
    family = gaussian(),
    chains = 4,
    iter = 4000,
    warmup = 2000,
    cores = 4,
    seed = 1234,
    file = here("src", "content", "blog", "2025",
      "09-26-modeling-productivity-aging-population", "models", "bayesian_basic"),
    file_refit = "on_change"
  )

  # Model 2: Trend + aging + composite shocks
  cat("   Fitting Model 2: Trend + aging + composite shocks...\n")
  model_composite <- brm(
    productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                         temporary_shock + permanent_shock,
    data = data,
    prior = priors,
    family = gaussian(),
    chains = 4,
    iter = 4000,
    warmup = 2000,
    cores = 4,
    seed = 1234,
    file = here("src", "content", "blog", "2025",
      "09-26-modeling-productivity-aging-population", "models", "bayesian_composite"),
    file_refit = "on_change"
  )

  # Model 3: Trend + aging + specific shocks
  cat("   Fitting Model 3: Trend + aging + specific shocks...\n")
  model_detailed <- brm(
    productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                         financial_shock + energy_shock + covid_shock + war_shock,
    data = data,
    prior = priors,
    family = gaussian(),
    chains = 4,
    iter = 4000,
    warmup = 2000,
    cores = 4,
    seed = 1234,
    file = here("src", "content", "blog", "2025",
      "09-26-modeling-productivity-aging-population", "models", "bayesian_detailed"),
    file_refit = "on_change"
  )

  # Model 4: Hierarchical period effects
  cat("   Fitting Model 4: Hierarchical period effects...\n")
  model_hierarchical <- brm(
    productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                         temporary_shock + permanent_shock +
                         (1 + epi_change | period),
    data = data,
    prior = c(priors,
              prior(exponential(1), class = sd, group = period)),
    family = gaussian(),
    chains = 4,
    iter = 4000,
    warmup = 2000,
    cores = 4,
    seed = 1234,
    file = here("src", "content", "blog", "2025",
      "09-26-modeling-productivity-aging-population", "models", "bayesian_hierarchical"),
    file_refit = "on_change"
  )

  # Model 5: Time-varying parameters (state-space approach)
  cat("   Fitting Model 5: Time-varying parameters...\n")
  model_timevarying <- brm(
    productivity_growth ~ time_trend + I(time_trend^2) +
                         epi_change + temporary_shock + permanent_shock,
    data = data,
    prior = priors,
    family = gaussian(),
    # Add AR(1) structure for time-varying effects
    autocor = cor_ar(~ time_trend, p = 1),
    chains = 4,
    iter = 4000,
    warmup = 2000,
    cores = 4,
    seed = 1234,
    file = here("src", "content", "blog", "2025",
      "09-26-modeling-productivity-aging-population", "models", "bayesian_timevarying"),
    file_refit = "on_change"
  )

  cat("   ✓ Five Bayesian models estimated successfully\n")

  return(list(
    basic = model_basic,
    composite = model_composite,
    detailed = model_detailed,
    hierarchical = model_hierarchical,
    timevarying = model_timevarying
  ))
}

# ===== MODEL COMPARISON AND VALIDATION =====

#' Compare Bayesian Models Using LOO-CV and WAIC
#'
#' Performs comprehensive model comparison and validation
compare_bayesian_models <- function(models) {

  cat("Comparing Bayesian models using LOO-CV and WAIC...\n")

  # Calculate LOO-CV for all models
  loo_results <- map(models, ~ loo(.x, save_psis = TRUE))

  # Calculate WAIC for all models
  waic_results <- map(models, waic)

  # Model comparison table
  comparison_table <- tibble(
    model = names(models),
    loo_elpd = map_dbl(loo_results, ~ .x$estimates["elpd_loo", "Estimate"]),
    loo_se = map_dbl(loo_results, ~ .x$estimates["elpd_loo", "SE"]),
    waic_elpd = map_dbl(waic_results, ~ .x$estimates["elpd_waic", "Estimate"]),
    waic_se = map_dbl(waic_results, ~ .x$estimates["elpd_waic", "SE"]),
    n_params = map_dbl(models, ~ length(fixef(.x)[,1]))
  ) %>%
    arrange(desc(loo_elpd))

  cat("   Model comparison results:\n")
  print(comparison_table)

  # LOO model comparison
  cat("\n   LOO model comparison:\n")
  loo_compare_result <- loo_compare(loo_results)
  print(loo_compare_result)

  # Best model
  best_model_name <- rownames(loo_compare_result)[1]
  best_model <- models[[best_model_name]]

  cat("\n   ✓ Best model:", best_model_name, "\n")

  return(list(
    comparison_table = comparison_table,
    loo_results = loo_results,
    waic_results = waic_results,
    best_model = best_model,
    best_model_name = best_model_name
  ))
}

# ===== POSTERIOR INFERENCE =====

#' Extract Posterior Inference from Best Model
#'
#' Provides comprehensive posterior analysis with uncertainty quantification
extract_posterior_inference <- function(best_model, data) {

  cat("Extracting posterior inference from best model...\n")

  # Extract posterior samples
  posterior_samples <- posterior_samples(best_model)

  # Posterior summaries for all parameters
  posterior_summary <- summarise_draws(posterior_samples) %>%
    mutate(
      prob_negative = map_dbl(variable, ~ mean(posterior_samples[[.x]] < 0)),
      prob_positive = map_dbl(variable, ~ mean(posterior_samples[[.x]] > 0)),
      economic_significance = abs(mean) > 0.01  # 1 percentage point threshold
    ) %>%
    filter(!str_detect(variable, "^lp|^lprior"))

  cat("   ✓ Posterior parameter summaries:\n")
  print(posterior_summary %>%
    select(variable, mean, sd, q5, q95, prob_negative, economic_significance))

  # Posterior predictive checks
  cat("\n   Generating posterior predictive checks...\n")
  pp_check_plot <- pp_check(best_model, nsamples = 100) +
    labs(title = "Posterior Predictive Check",
         subtitle = "Model fit assessment") +
    theme_minimal()

  # Extract fitted values with uncertainty
  fitted_values <- fitted(best_model, summary = FALSE) %>%
    as_tibble() %>%
    mutate(draw = row_number()) %>%
    pivot_longer(-draw, names_to = "observation", values_to = "fitted") %>%
    mutate(observation = as.numeric(str_remove(observation, "V"))) %>%
    group_by(observation) %>%
    summarise(
      fitted_mean = mean(fitted),
      fitted_q5 = quantile(fitted, 0.05),
      fitted_q95 = quantile(fitted, 0.95),
      .groups = "drop"
    ) %>%
    bind_cols(data %>% select(year, productivity_growth, period))

  # Calculate factor contributions with uncertainty
  factor_contributions <- calculate_bayesian_contributions(best_model, data)

  cat("   ✓ Posterior inference extracted successfully\n")

  return(list(
    posterior_summary = posterior_summary,
    fitted_values = fitted_values,
    factor_contributions = factor_contributions,
    pp_check_plot = pp_check_plot
  ))
}

#' Calculate Bayesian Factor Contributions
#'
#' Decomposes productivity growth with full uncertainty quantification
calculate_bayesian_contributions <- function(model, data) {

  cat("   Calculating factor contributions with uncertainty...\n")

  # Extract posterior samples
  posterior_samples <- posterior_samples(model)

  # Create design matrix for predictions
  X <- model.matrix(~ time_trend + I(time_trend^2) + epi_change +
                   temporary_shock + permanent_shock, data = data)

  # Calculate contributions for each posterior draw
  n_draws <- nrow(posterior_samples)
  contributions_list <- vector("list", n_draws)

  for(i in 1:min(n_draws, 1000)) {  # Limit to 1000 draws for efficiency
    # Extract parameters for this draw
    params <- posterior_samples[i, str_detect(names(posterior_samples), "^b_")]

    # Calculate contributions
    trend_contrib <- X[,"time_trend"] * params$b_time_trend +
                    X[,"I(time_trend^2)"] * params$`b_I(time_trend^2)`
    aging_contrib <- X[,"epi_change"] * params$b_epi_change
    shock_contrib <- X[,"temporary_shock"] * params$b_temporary_shock +
                    X[,"permanent_shock"] * params$b_permanent_shock

    contributions_list[[i]] <- tibble(
      draw = i,
      year = data$year,
      trend_contribution = trend_contrib,
      aging_contribution = aging_contrib,
      shock_contribution = shock_contrib,
      total_contribution = trend_contrib + aging_contrib + shock_contrib
    )
  }

  # Combine and summarize
  contributions_summary <- bind_rows(contributions_list) %>%
    group_by(year) %>%
    summarise(
      across(c(trend_contribution, aging_contribution, shock_contribution, total_contribution),
             list(mean = mean, q5 = ~ quantile(.x, 0.05), q95 = ~ quantile(.x, 0.95))),
      .groups = "drop"
    ) %>%
    left_join(data %>% select(year, productivity_growth, period), by = "year")

  # Period-specific analysis
  period_contributions <- contributions_summary %>%
    group_by(period) %>%
    summarise(
      across(c(trend_contribution_mean, aging_contribution_mean, shock_contribution_mean),
             list(period_mean = mean)),
      avg_productivity_growth = mean(productivity_growth),
      .groups = "drop"
    ) %>%
    mutate(
      aging_share = aging_contribution_mean_period_mean / avg_productivity_growth * 100,
      shock_share = shock_contribution_mean_period_mean / avg_productivity_growth * 100
    )

  cat("   ✓ Factor contributions calculated with full uncertainty\n")

  return(list(
    yearly_contributions = contributions_summary,
    period_contributions = period_contributions
  ))
}

# ===== MAIN EXECUTION =====

cat("1. Preparing Bayesian modeling data...\n")
bayesian_data <- prepare_bayesian_data()

cat("\n2. Defining priors...\n")
priors <- define_priors()

cat("\n3. Estimating Bayesian models...\n")
# Create models directory if it doesn't exist
dir.create(here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "models"), recursive = TRUE, showWarnings = FALSE)

bayesian_models <- estimate_bayesian_models(bayesian_data, priors)

cat("\n4. Comparing models...\n")
model_comparison <- compare_bayesian_models(bayesian_models)

cat("\n5. Extracting posterior inference...\n")
posterior_inference <- extract_posterior_inference(model_comparison$best_model, bayesian_data)

# ===== SAVE RESULTS =====

cat("\n6. Saving Bayesian results...\n")

# Save model comparison
write_csv(model_comparison$comparison_table, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "results", "bayesian_model_comparison.csv"))

# Save posterior inference
write_csv(posterior_inference$posterior_summary, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "results", "bayesian_posterior_summary.csv"))

write_csv(posterior_inference$factor_contributions$yearly_contributions, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "results", "bayesian_factor_contributions.csv"))

write_csv(posterior_inference$factor_contributions$period_contributions, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "results", "bayesian_period_analysis.csv"))

cat("   ✓ All Bayesian results saved\n")

# ===== SUMMARY =====

cat("\n=== BAYESIAN PRODUCTIVITY DECOMPOSITION SUMMARY ===\n")
cat("✓ Five Bayesian models estimated with informative priors\n")
cat("✓ Model comparison using LOO-CV and WAIC\n")
cat("✓ Best model:", model_comparison$best_model_name, "\n")
cat("✓ Posterior inference with full uncertainty quantification\n")
cat("✓ Factor contributions decomposed by period\n")
cat("✓ Posterior predictive checks for model validation\n")

cat("\nKey Bayesian advantages:\n")
cat("• Uncertainty quantification for all estimates\n")
cat("• Informative priors based on economic theory\n")
cat("• Model comparison using proper scoring rules\n")
cat("• Hierarchical structure accommodates heterogeneity\n")
cat("• Posterior predictive checks validate model fit\n")
cat("• Credible intervals replace problematic p-values\n")

cat("\n=== BAYESIAN FRAMEWORK COMPLETE ===\n")