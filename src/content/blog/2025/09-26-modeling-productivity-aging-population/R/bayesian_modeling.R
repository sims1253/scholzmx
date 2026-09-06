# Bayesian Modeling Framework for Productivity Analysis
# Author: Generated for scholzmx blog
# Date: 2025-09-26

library(brms)
library(tidybayes)
library(loo)
library(posterior)
library(bayesplot)
library(tidyverse)

# Function to fit improved productivity model with EPI
fit_productivity_model <- function(model_data,
                                  model_type = "epi_levels",
                                  chains = 4,
                                  iter = 2000,
                                  cores = 4,
                                  save_model = TRUE,
                                  model_file = NULL) {

  # Set default model file path if not provided
  if (is.null(model_file)) {
    model_file <- here("src", "content", "blog", "2025",
                      "09-26-modeling-productivity-aging-population",
                      "models", paste0("productivity_model_", model_type))
  }

  # Check if model already exists
  if (file.exists(paste0(model_file, ".rds")) && save_model) {
    cat("Loading existing model from:", model_file, "\n")
    return(readRDS(paste0(model_file, ".rds")))
  }

  # Define model formula based on type
  if (model_type == "epi_levels") {
    # EPI model in levels with controlled AR term
    model_formula <- bf(
      log_productivity ~
        # Polynomial time trend for technological progress
        poly(time_trend, 2) +
        # EPI as single demographic predictor
        epi_normalized + I(epi_normalized^2) +
        # Controlled autoregressive component
        ar(time = year, p = 1, cov = FALSE)
    )
  } else if (model_type == "epi_growth") {
    # Growth rate specification
    model_formula <- bf(
      productivity_growth ~
        # Trend in growth rates
        time_trend +
        # EPI effects on growth
        epi_normalized + epi_growth +
        # AR(1) for growth persistence
        ar(time = year, p = 1)
    )
  } else if (model_type == "epi_ecm") {
    # Error correction model
    model_formula <- bf(
      productivity_growth ~
        # Error correction term (lagged level deviations)
        ecm_residual_lag +
        # Short-run dynamics
        epi_growth + lag_productivity_growth +
        # Trend
        time_trend
    )
  } else if (model_type == "original") {
    # Original specification for comparison
    model_formula <- bf(
      log_productivity ~
        poly(time_trend, 2) +
        weighted_age + pop_over_50_pct + working_age_pct +
        ar(time = year, p = 1)
    )
  } else {
    stop("Unknown model_type. Use: 'epi_levels', 'epi_growth', 'epi_ecm', or 'original'")
  }

  # Define priors based on model type
  if (model_type %in% c("epi_levels", "original")) {
    model_priors <-
      prior(normal(0, 1), class = Intercept) +
      prior(normal(0, 0.5), class = b) +
      prior(normal(0.8, 0.2), class = ar) +  # Informative prior: AR < 1
      prior(exponential(2), class = sigma)
  } else if (model_type == "epi_growth") {
    model_priors <-
      prior(normal(0, 0.02), class = Intercept) +  # Small average growth
      prior(normal(0, 0.1), class = b) +
      prior(normal(0, 0.3), class = ar) +
      prior(exponential(5), class = sigma)  # Tighter prior for growth model
  } else if (model_type == "epi_ecm") {
    model_priors <-
      prior(normal(0, 0.02), class = Intercept) +
      prior(normal(-0.5, 0.2), class = b, coef = "ecm_residual_lag") +  # Error correction
      prior(normal(0, 0.1), class = b) +
      prior(exponential(5), class = sigma)
  }

  cat("Fitting Bayesian productivity model...\n")
  cat("Formula:", deparse(model_formula$formula), "\n")
  cat("Data points:", nrow(model_data), "\n")

  # Fit the model
  model <- brm(
    model_formula,
    data = model_data,
    family = gaussian(),
    prior = model_priors,
    chains = chains,
    iter = iter,
    cores = cores,
    seed = 42,
    control = list(adapt_delta = 0.95),
    refresh = 0  # Reduce console output during fitting
  )

  # Save model if requested
  if (save_model) {
    # Create models directory if it doesn't exist
    model_dir <- dirname(model_file)
    if (!dir.exists(model_dir)) {
      dir.create(model_dir, recursive = TRUE)
    }
    saveRDS(model, paste0(model_file, ".rds"))
    cat("Model saved to:", paste0(model_file, ".rds"), "\n")
  }

  return(model)
}

# Function to perform model diagnostics
diagnose_model <- function(model) {
  cat("=== MODEL DIAGNOSTICS ===\n\n")

  # Basic model summary
  cat("Model Summary:\n")
  print(summary(model))

  cat("\n=== MCMC DIAGNOSTICS ===\n")

  # Check convergence (R-hat) - use posterior package directly to avoid S3 dispatch issues
  draws <- posterior::as_draws_array(model)
  draws_summary <- posterior::summarise_draws(draws, rhat = posterior::rhat, ess_bulk = posterior::ess_bulk)
  rhat_vals <- draws_summary$rhat
  names(rhat_vals) <- draws_summary$variable
  max_rhat <- max(rhat_vals, na.rm = TRUE)
  cat("Max R-hat:", round(max_rhat, 4),
      ifelse(max_rhat < 1.01, "(Good)", "(Concerning - check convergence)"), "\n")

  # Check effective sample size
  ess_vals <- draws_summary$ess_bulk / posterior::ndraws(draws)
  names(ess_vals) <- draws_summary$variable
  min_ess <- min(ess_vals, na.rm = TRUE)
  cat("Min ESS ratio:", round(min_ess, 4),
      ifelse(min_ess > 0.1, "(Good)", "(Low - consider more iterations)"), "\n")

  # Create diagnostic plots
  diagnostic_plots <- list(
    trace_plot = mcmc_trace(model),
    rhat_plot = mcmc_rhat(rhat_vals),
    neff_plot = mcmc_neff(ess_vals),
    posterior_pred = pp_check(model, ndraws = 50)
  )

  return(diagnostic_plots)
}

# Function to calculate model comparison metrics
calculate_model_metrics <- function(model, data, model_type = "unknown") {
  cat("Calculating model performance metrics for", model_type, "...\n")

  # Information criteria
  loo_result <- loo(model)
  waic_result <- waic(model)

  # Bayesian R-squared
  r2_bayes <- bayes_R2(model)
  r2_median <- median(r2_bayes)
  r2_ci <- quantile(r2_bayes, c(0.025, 0.975))

  # Get fitted values and ensure proper indexing
  fitted_vals <- fitted(model)[, "Estimate"]
  n_fitted <- length(fitted_vals)

  # Model-specific metrics based on response variable
  if (model_type %in% c("epi_levels", "original")) {
    # For levels models using log_productivity
    response_var <- data$log_productivity
    actual_vals <- response_var[!is.na(response_var)]

    # Match fitted values to actual data (brms may drop NAs)
    if (n_fitted != length(actual_vals)) {
      cat("⚠ Fitted values (", n_fitted, ") != actual values (", length(actual_vals), "), adjusting...\n")
      # Get the indices that brms used (non-NA values)
      valid_indices <- which(!is.na(response_var))
      if (n_fitted <= length(valid_indices)) {
        actual_vals <- response_var[valid_indices[1:n_fitted]]
      } else {
        # Pad fitted values if somehow we have more fitted than actual
        fitted_vals <- fitted_vals[1:length(actual_vals)]
      }
    }

    # Ensure equal lengths
    min_length <- min(length(fitted_vals), length(actual_vals))
    fitted_vals <- fitted_vals[1:min_length]
    actual_vals <- actual_vals[1:min_length]

    rmse_log <- sqrt(mean((fitted_vals - actual_vals)^2, na.rm = TRUE))

    # MAPE on original scale (productivity per hour)
    fitted_orig_scale <- exp(fitted_vals)
    actual_orig_scale <- exp(actual_vals)
    mape <- mean(abs((actual_orig_scale - fitted_orig_scale) / actual_orig_scale), na.rm = TRUE) * 100

  } else {
    # For growth models using productivity_growth
    response_var <- data$productivity_growth
    actual_vals <- response_var[!is.na(response_var)]

    # Match fitted values to actual data
    if (n_fitted != length(actual_vals)) {
      cat("⚠ Fitted values (", n_fitted, ") != actual values (", length(actual_vals), "), adjusting...\n")
      valid_indices <- which(!is.na(response_var))
      if (n_fitted <= length(valid_indices)) {
        actual_vals <- response_var[valid_indices[1:n_fitted]]
      } else {
        fitted_vals <- fitted_vals[1:length(actual_vals)]
      }
    }

    # Ensure equal lengths
    min_length <- min(length(fitted_vals), length(actual_vals))
    fitted_vals <- fitted_vals[1:min_length]
    actual_vals <- actual_vals[1:min_length]

    rmse_log <- sqrt(mean((fitted_vals - actual_vals)^2, na.rm = TRUE))

    # MAPE for growth rates (handle division by small numbers carefully)
    mape <- mean(abs((actual_vals - fitted_vals) / pmax(abs(actual_vals), 0.001)), na.rm = TRUE) * 100
  }

  # Report data matching
  cat(" - Matched", min_length, "observations for validation metrics\n")

  # Compile metrics
  metrics <- tibble(
    Metric = c("LOOIC", "WAIC", "Bayesian R²", "RMSE (log)", "MAPE (%)"),
    Value = c(
      loo_result$estimates["looic", "Estimate"],
      waic_result$estimates["waic", "Estimate"],
      r2_median,
      rmse_log,
      mape
    ),
    CI_Lower = c(
      loo_result$estimates["looic", "Estimate"] - 1.96 * loo_result$estimates["looic", "SE"],
      waic_result$estimates["waic", "Estimate"] - 1.96 * waic_result$estimates["waic", "SE"],
      r2_ci[1],
      NA,
      NA
    ),
    CI_Upper = c(
      loo_result$estimates["looic", "Estimate"] + 1.96 * loo_result$estimates["looic", "SE"],
      waic_result$estimates["waic", "Estimate"] + 1.96 * waic_result$estimates["waic", "SE"],
      r2_ci[2],
      NA,
      NA
    )
  )

  return(list(
    metrics = metrics,
    loo = loo_result,
    waic = waic_result,
    r2_samples = r2_bayes
  ))
}

# Function to generate predictions with scenarios
generate_scenario_predictions <- function(model, scenarios_data, n_draws = 1000) {
  cat("Generating predictions for", nrow(scenarios_data), "scenarios...\n")

  # Generate posterior predictions
  predictions <- posterior_predict(
    model,
    newdata = scenarios_data,
    ndraws = n_draws,
    allow_new_levels = TRUE
  )

  # Summarize predictions
  pred_summary <- scenarios_data %>%
    mutate(
      pred_mean = apply(predictions, 2, mean),
      pred_median = apply(predictions, 2, median),
      pred_lower_95 = apply(predictions, 2, quantile, 0.025),
      pred_upper_95 = apply(predictions, 2, quantile, 0.975),
      pred_lower_50 = apply(predictions, 2, quantile, 0.25),
      pred_upper_50 = apply(predictions, 2, quantile, 0.75),
      # Convert back to original scale
      productivity_mean = exp(pred_mean),
      productivity_median = exp(pred_median),
      productivity_lower_95 = exp(pred_lower_95),
      productivity_upper_95 = exp(pred_upper_95),
      productivity_lower_50 = exp(pred_lower_50),
      productivity_upper_50 = exp(pred_upper_50)
    )

  return(list(
    summary = pred_summary,
    draws = predictions
  ))
}

# Function to extract and summarize parameter estimates
extract_parameter_estimates <- function(model, model_name = "unknown") {

  cat("Extracting parameters for", model_name, "model...\n")

  # Get all available parameters from the model
  tryCatch({
    # Use gather_draws for more flexible parameter extraction
    all_params <- model %>%
      gather_draws(
        `b_.*`,
        `ar.*`,
        sigma,
        regex = TRUE
      )

    # Convert to wider format for easier handling
    posterior_draws <- all_params %>%
      ungroup() %>%
      select(.variable, .value, .chain, .iteration, .draw) %>%
      pivot_wider(names_from = .variable, values_from = .value)

    # Create human-readable parameter names
    param_names <- names(posterior_draws)[!names(posterior_draws) %in% c('.chain', '.iteration', '.draw')]
    readable_names <- param_names %>%
      str_replace("b_Intercept", "Intercept") %>%
      str_replace("b_polytime_trend21", "Time Trend (Linear)") %>%
      str_replace("b_polytime_trend22", "Time Trend (Quadratic)") %>%
      str_replace("b_epi_normalized", "EPI (Linear)") %>%
      str_replace("b_Iepi_normalized.2", "EPI (Quadratic)") %>%
      str_replace("b_epi_growth", "EPI Growth") %>%
      str_replace("b_time_trend", "Time Trend") %>%
      str_replace("b_weighted_age", "Weighted Age") %>%
      str_replace("b_pop_over_50_pct", "Pop Over 50%") %>%
      str_replace("b_working_age_pct", "Working Age %") %>%
      str_replace("ar\\[1\\]", "AR(1) Coefficient") %>%
      str_replace("sigma", "Residual SD")

    # Rename columns
    names(posterior_draws)[names(posterior_draws) %in% param_names] <- readable_names

  }, error = function(e) {
    cat("Error extracting parameters:", e$message, "\n")
    cat("Using fallback parameter extraction...\n")

    # Fallback: try to extract basic parameters
    posterior_draws <- model %>%
      as_draws_df() %>%
      select(starts_with("b_"), starts_with("ar"), sigma, .chain, .iteration, .draw)
  })

  # Calculate summary statistics
  param_summary <- posterior_draws %>%
    select(-c(.chain, .iteration, .draw)) %>%
    pivot_longer(cols = everything(), names_to = "parameter", values_to = "value") %>%
    group_by(parameter) %>%
    summarise(
      mean = mean(value),
      median = median(value),
      sd = sd(value),
      q025 = quantile(value, 0.025),
      q975 = quantile(value, 0.975),
      prob_positive = mean(value > 0),
      .groups = "drop"
    ) %>%
    mutate(
      ci_95 = paste0("[", round(q025, 3), ", ", round(q975, 3), "]"),
      significant = (q025 > 0 | q975 < 0)
    )

  return(list(
    draws = posterior_draws,
    summary = param_summary
  ))
}

# Function to create scenario projections for the interactive model
create_scenario_projections <- function(model, base_data, projection_years = 2024:2050) {

  # Define scenarios
  scenarios <- expand_grid(
    year = projection_years,
    scenario = c("current_trends", "accelerated_aging", "tech_breakthrough", "stagnation")
  ) %>%
    mutate(
      time_trend = year - min(base_data$year),
      # Scenario-specific demographic projections
      weighted_age = case_when(
        scenario == "current_trends" ~ 45.5 + (year - 2024) * 0.12,
        scenario == "accelerated_aging" ~ 45.5 + (year - 2024) * 0.18,
        scenario == "tech_breakthrough" ~ 45.5 + (year - 2024) * 0.08,
        scenario == "stagnation" ~ 45.5 + (year - 2024) * 0.15
      ),
      pop_over_50_pct = case_when(
        scenario == "current_trends" ~ 0.515 + (year - 2024) * 0.003,
        scenario == "accelerated_aging" ~ 0.515 + (year - 2024) * 0.005,
        scenario == "tech_breakthrough" ~ 0.515 + (year - 2024) * 0.002,
        scenario == "stagnation" ~ 0.515 + (year - 2024) * 0.004
      ),
      working_age_pct = case_when(
        scenario == "current_trends" ~ 0.61 - (year - 2024) * 0.002,
        scenario == "accelerated_aging" ~ 0.61 - (year - 2024) * 0.004,
        scenario == "tech_breakthrough" ~ 0.61 - (year - 2024) * 0.001,
        scenario == "stagnation" ~ 0.61 - (year - 2024) * 0.003
      ),
      # Ensure proportions stay within reasonable bounds
      pop_over_50_pct = pmax(0.4, pmin(0.7, pop_over_50_pct)),
      working_age_pct = pmax(0.45, pmin(0.65, working_age_pct)),
      # Scenario labels for plotting
      scenario_label = case_when(
        scenario == "current_trends" ~ "Current Trends",
        scenario == "accelerated_aging" ~ "Accelerated Aging",
        scenario == "tech_breakthrough" ~ "Tech Breakthrough",
        scenario == "stagnation" ~ "Economic Stagnation"
      )
    )

  # Generate predictions
  predictions <- generate_scenario_predictions(model, scenarios, n_draws = 500)

  return(predictions)
}

# Function to validate model assumptions
validate_model_assumptions <- function(model, data) {
  cat("=== MODEL ASSUMPTION VALIDATION ===\n\n")

  # Residual analysis
  residuals <- residuals(model)[, "Estimate"]
  fitted_vals <- fitted(model)[, "Estimate"]

  # Test for normality of residuals
  shapiro_test <- shapiro.test(sample(residuals, min(5000, length(residuals))))
  cat("Shapiro-Wilk test for normality of residuals:\n")
  cat("W =", round(shapiro_test$statistic, 4), ", p-value =",
      format(shapiro_test$p.value, scientific = TRUE), "\n")

  # Test for homoscedasticity
  bp_test <- lmtest::bptest(lm(residuals ~ fitted_vals))
  cat("Breusch-Pagan test for homoscedasticity:\n")
  cat("BP =", round(bp_test$statistic, 4), ", p-value =",
      format(bp_test$p.value, scientific = TRUE), "\n")

  # Durbin-Watson test for autocorrelation in residuals
  dw_test <- lmtest::dwtest(lm(residuals ~ 1))
  cat("Durbin-Watson test for autocorrelation:\n")
  cat("DW =", round(dw_test$statistic, 4), ", p-value =",
      format(dw_test$p.value, scientific = TRUE), "\n")

  # Create diagnostic plots
  validation_plots <- list(
    residuals_vs_fitted = ggplot(data.frame(fitted = fitted_vals, residuals = residuals),
                                aes(x = fitted, y = residuals)) +
      geom_point(alpha = 0.6) +
      geom_hline(yintercept = 0, color = "red", linetype = "dashed") +
      geom_smooth(method = "loess", se = FALSE, color = "blue") +
      labs(title = "Residuals vs Fitted", x = "Fitted Values", y = "Residuals") +
      theme_minimal(),

    qq_plot = ggplot(data.frame(residuals = residuals), aes(sample = residuals)) +
      stat_qq() + stat_qq_line() +
      labs(title = "Q-Q Plot of Residuals") +
      theme_minimal(),

    residuals_histogram = ggplot(data.frame(residuals = residuals), aes(x = residuals)) +
      geom_histogram(bins = 30, alpha = 0.7, color = "black", fill = "lightblue") +
      geom_density(color = "red", size = 1) +
      labs(title = "Distribution of Residuals", x = "Residuals", y = "Density") +
      theme_minimal()
  )

  return(list(
    tests = list(
      shapiro = shapiro_test,
      breusch_pagan = bp_test,
      durbin_watson = dw_test
    ),
    plots = validation_plots
  ))
}

# Function to fit multiple model specifications and compare
fit_model_comparison <- function(model_data, model_types = c("original", "epi_levels", "epi_growth")) {

  cat("Fitting", length(model_types), "model specifications for comparison...\n\n")

  models <- list()

  for (model_type in model_types) {
    cat("Fitting model:", model_type, "...\n")

    models[[model_type]] <- fit_productivity_model(
      model_data = model_data,
      model_type = model_type,
      save_model = TRUE
    )

    cat("Model", model_type, "completed.\n\n")
  }

  return(models)
}

# Function to prepare data for different model specifications
prepare_model_data <- function(productivity_data, epi_data, stationarity_results = NULL, ensure_consistent_sample = TRUE) {

  cat("Preparing model data...\n")

  # Merge productivity and EPI data
  model_data <- productivity_data %>%
    inner_join(epi_data, by = "year") %>%
    arrange(year) %>%
    mutate(
      # Basic transformations
      log_productivity = log(productivity_per_hour),
      time_trend = year - min(year),

      # Growth rates (will create NAs for first observation)
      productivity_growth = (productivity_per_hour - lag(productivity_per_hour)) / lag(productivity_per_hour),
      epi_growth = epi_normalized - lag(epi_normalized),
      lag_productivity_growth = lag(productivity_growth),

      # For ECM: compute long-run residuals
      # This will be updated after estimating long-run relationship
      ecm_residual_lag = NA
    )

  # Report initial data summary
  cat(" - Total observations:", nrow(model_data), "\n")
  cat(" - Years:", min(model_data$year), "to", max(model_data$year), "\n")
  cat(" - Missing productivity growth (first year):", sum(is.na(model_data$productivity_growth)), "\n")
  cat(" - Missing EPI growth (first year):", sum(is.na(model_data$epi_growth)), "\n")

  # Ensure consistent sample size across all model types
  if (ensure_consistent_sample) {
    cat(" - Ensuring consistent sample size for all models...\n")

    # Remove observations where any growth variables are NA
    # This ensures all models use the same observations
    original_nrow <- nrow(model_data)
    model_data <- model_data %>%
      filter(
        !is.na(log_productivity),
        !is.na(productivity_growth),
        !is.na(epi_growth)
      )

    cat(" - Filtered from", original_nrow, "to", nrow(model_data), "observations for consistency\n")
    cat(" - Final year range:", min(model_data$year), "to", max(model_data$year), "\n")
  }

  # Estimate long-run relationship for ECM
  if (nrow(model_data) > 10) {
    long_run_model <- lm(log_productivity ~ epi_normalized + time_trend, data = model_data)
    model_data <- model_data %>%
      mutate(
        long_run_fitted = predict(long_run_model),
        ecm_residual = log_productivity - long_run_fitted,
        ecm_residual_lag = lag(ecm_residual)
      )
  }

  # Add original demographic variables for comparison
  if ("weighted_avg_age" %in% names(epi_data)) {
    model_data <- model_data %>%
      mutate(
        weighted_age = weighted_avg_age,
        pop_over_50_pct = pop_over_50,
        working_age_pct = ifelse("working_age_pct" %in% names(epi_data), working_age_pct, 0.6)
      )
  } else {
    # Approximate from EPI data if not available
    model_data <- model_data %>%
      mutate(
        weighted_age = avg_age,
        pop_over_50_pct = pop_over_50,
        working_age_pct = ifelse("pop_30_to_50" %in% names(epi_data), pop_30_to_50, 0.6)
      )
  }

  cat("Model data prepared with", nrow(model_data), "observations\n")
  cat("Variables available:", paste(names(model_data), collapse = ", "), "\n\n")

  return(model_data)
}

# Function to compare multiple models
compare_models <- function(models_list, model_data) {

  cat("Comparing", length(models_list), "models...\n\n")

  # Calculate metrics for each model
  all_metrics <- map2_dfr(models_list, names(models_list), function(model, model_name) {
    metrics_result <- calculate_model_metrics(model, model_data, model_name)
    metrics_result$metrics %>%
      mutate(Model = model_name)
  })

  # Calculate LOO for each model
  loo_results <- map(models_list, loo)

  # Check if all models have the same number of observations for LOO comparison
  loo_n_obs <- map_int(loo_results, ~ .x$estimates["p_loo", "Estimate"] %>% length())
  same_sample_size <- length(unique(loo_n_obs)) == 1

  # Initialize model_weights
  model_weights <- NULL

  if (same_sample_size) {
    # Can safely calculate model weights
    tryCatch({
      model_weights <- loo_model_weights(loo_results)
      cat("✓ Model weights calculated using LOO stacking\n")
    }, error = function(e) {
      cat("⚠ LOO model weights failed, using LOOIC-based weights\n")
      # Fallback: calculate weights based on LOOIC differences
      looic_values <- map_dbl(loo_results, ~ .x$estimates["looic", "Estimate"])
      # Convert to weights (lower LOOIC = higher weight)
      weight_unnorm <- exp(-0.5 * (looic_values - min(looic_values)))
      model_weights <<- weight_unnorm / sum(weight_unnorm)
      names(model_weights) <<- names(models_list)
    })
  } else {
    cat("⚠ Models have different sample sizes, cannot compare directly\n")
    cat("Sample sizes by model:\n")
    for (i in seq_along(models_list)) {
      cat(" -", names(models_list)[i], ":", nobs(models_list[[i]]), "observations\n")
    }

    # Create equal weights as fallback
    model_weights <- rep(1/length(models_list), length(models_list))
    names(model_weights) <- names(models_list)
  }

  # Final fallback if model_weights is still NULL
  if (is.null(model_weights)) {
    cat("⚠ Model weights NULL, creating equal weights\n")
    model_weights <- rep(1/length(models_list), length(models_list))
    names(model_weights) <- names(models_list)
  }

  # Debug information
  cat("Model names in metrics:", paste(unique(all_metrics$Model), collapse = ", "), "\n")
  cat("Model weight names:", paste(names(model_weights), collapse = ", "), "\n")

  # Summary comparison table with safer indexing
  comparison_summary <- all_metrics %>%
    select(Model, Metric, Value) %>%
    pivot_wider(names_from = Metric, values_from = Value)

  # Add model weights more safely
  comparison_summary <- comparison_summary %>%
    rowwise() %>%
    mutate(
      Model_Weight = ifelse(Model %in% names(model_weights),
                           model_weights[[Model]],
                           NA_real_)
    ) %>%
    ungroup() %>%
    arrange(LOOIC)  # Best models first

  cat("\nModel Comparison Summary (ordered by LOOIC):\n")
  print(comparison_summary)

  return(list(
    detailed_metrics = all_metrics,
    summary = comparison_summary,
    model_weights = model_weights,
    loo_results = loo_results,
    same_sample_size = same_sample_size
  ))
}

# Function to perform model selection and averaging
perform_model_selection <- function(models_list, model_data) {

  cat("Performing Bayesian model selection...\n\n")

  # Calculate model comparison metrics
  comparison_results <- compare_models(models_list, model_data)

  # Select best model based on LOOIC
  best_model_name <- comparison_results$summary %>%
    arrange(LOOIC) %>%
    slice(1) %>%
    pull(Model)

  best_model <- models_list[[best_model_name]]

  cat("Best model according to LOOIC:", best_model_name, "\n")

  # Handle stacking weights based on whether models have same sample size
  stacking_weights <- NULL

  if (comparison_results$same_sample_size) {
    tryCatch({
      stacking_weights <- loo_model_weights(comparison_results$loo_results, method = "stacking")
      cat("\n✓ Stacking weights for model averaging:\n")
    }, error = function(e) {
      cat("\n⚠ Stacking weights failed, using LOOIC-based weights:\n")
      stacking_weights <<- comparison_results$model_weights
    })
  } else {
    cat("\n⚠ Different sample sizes - using individual model performance for selection:\n")
    stacking_weights <- comparison_results$model_weights
  }

  # Fallback if stacking_weights is still NULL
  if (is.null(stacking_weights) || length(stacking_weights) == 0) {
    cat("⚠ No weights available, creating equal weights:\n")
    stacking_weights <- rep(1/length(models_list), length(models_list))
    names(stacking_weights) <- names(models_list)
  }

  for (i in seq_along(stacking_weights)) {
    cat(" -", names(stacking_weights)[i], ":", round(stacking_weights[i], 3), "\n")
  }

  # Additional model selection insights
  cat("\n--- MODEL SELECTION SUMMARY ---\n")
  if (comparison_results$same_sample_size) {
    cat("✓ All models fitted on same data (valid comparison)\n")
  } else {
    cat("⚠ Models fitted on different sample sizes:\n")
    for (model_name in names(models_list)) {
      cat(" -", model_name, ":", nobs(models_list[[model_name]]), "observations\n")
    }
  }

  return(list(
    best_model = best_model,
    best_model_name = best_model_name,
    comparison_results = comparison_results,
    stacking_weights = stacking_weights,
    sample_size_consistent = comparison_results$same_sample_size
  ))
}

# Function to create enhanced model diagnostics
create_enhanced_diagnostics <- function(models_list, model_data) {

  diagnostics_list <- list()

  for (model_name in names(models_list)) {
    model <- models_list[[model_name]]

    cat("Creating diagnostics for", model_name, "...\n")

    # Basic diagnostics
    basic_diagnostics <- diagnose_model(model)

    # Parameter estimates
    param_estimates <- extract_parameter_estimates(model, model_name)

    # Model metrics
    model_metrics <- calculate_model_metrics(model, model_data, model_name)

    # Store all diagnostics
    diagnostics_list[[model_name]] <- list(
      basic_plots = basic_diagnostics,
      parameters = param_estimates,
      metrics = model_metrics,
      model_name = model_name
    )
  }

  return(diagnostics_list)
}