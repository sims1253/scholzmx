# Model Validation and Robustness Testing
# Author: Generated for scholzmx blog
# Date: 2025-09-26
# Purpose: Comprehensive validation of improved productivity models

library(tidyverse)
library(brms)
library(loo)
library(posterior)
library(bayesplot)

# Function to perform time series cross-validation
perform_time_series_cv <- function(model_data, model_types = c("original", "epi_levels"),
                                  window_size = 30, horizon = 5, step_size = 1) {

  cat("=== TIME SERIES CROSS-VALIDATION ===\n\n")

  total_obs <- nrow(model_data)
  min_train_size <- max(window_size, 15)  # Minimum training size

  if (total_obs < min_train_size + horizon) {
    cat("Insufficient data for cross-validation\n")
    return(NULL)
  }

  # Create cross-validation folds
  cv_results <- list()

  for (model_type in model_types) {
    cat("Cross-validating model:", model_type, "\n")

    fold_results <- list()
    fold_count <- 0

    # Rolling window approach
    for (start_idx in seq(1, total_obs - min_train_size - horizon + 1, by = step_size)) {
      end_train_idx <- start_idx + min_train_size - 1
      start_test_idx <- end_train_idx + 1
      end_test_idx <- min(start_test_idx + horizon - 1, total_obs)

      if (end_test_idx <= start_test_idx) break

      fold_count <- fold_count + 1

      # Split data
      train_data <- model_data[start_idx:end_train_idx, ]
      test_data <- model_data[start_test_idx:end_test_idx, ]

      cat("  Fold", fold_count, ": training years",
          min(train_data$year), "-", max(train_data$year),
          ", testing years", min(test_data$year), "-", max(test_data$year), "\n")

      # Fit model on training data
      tryCatch({
        fold_model <- fit_productivity_model(
          model_data = train_data,
          model_type = model_type,
          chains = 2,  # Faster for CV
          iter = 1000,
          save_model = FALSE
        )

        # Generate predictions
        if (model_type %in% c("original", "epi_levels")) {
          # Levels model predictions
          predictions <- posterior_predict(
            fold_model,
            newdata = test_data,
            ndraws = 200,
            allow_new_levels = TRUE
          )

          # Calculate metrics
          pred_mean <- apply(predictions, 2, mean)
          actual <- test_data$log_productivity

        } else {
          # Growth model predictions (iterative)
          pred_mean <- rep(NA, nrow(test_data))
          actual <- test_data$productivity_growth

          for (i in 1:nrow(test_data)) {
            growth_pred <- posterior_predict(
              fold_model,
              newdata = test_data[i, ],
              ndraws = 200,
              allow_new_levels = TRUE
            )
            pred_mean[i] <- mean(growth_pred)
          }
        }

        # Store results
        fold_results[[fold_count]] <- tibble(
          fold = fold_count,
          model_type = model_type,
          train_start = min(train_data$year),
          train_end = max(train_data$year),
          test_start = min(test_data$year),
          test_end = max(test_data$year),
          rmse = sqrt(mean((pred_mean - actual)^2, na.rm = TRUE)),
          mae = mean(abs(pred_mean - actual), na.rm = TRUE),
          mape = mean(abs((actual - pred_mean) / actual), na.rm = TRUE) * 100,
          coverage_80 = NA,  # Will add if needed
          coverage_95 = NA
        )

      }, error = function(e) {
        cat("    Error in fold", fold_count, ":", e$message, "\n")
        return(NULL)
      })
    }

    # Combine fold results
    if (length(fold_results) > 0) {
      cv_results[[model_type]] <- bind_rows(fold_results)
    }
  }

  # Summarize CV results
  if (length(cv_results) > 0) {
    cv_summary <- map_dfr(cv_results, function(df) {
      df %>%
        group_by(model_type) %>%
        summarise(
          n_folds = n(),
          mean_rmse = mean(rmse, na.rm = TRUE),
          sd_rmse = sd(rmse, na.rm = TRUE),
          mean_mae = mean(mae, na.rm = TRUE),
          mean_mape = mean(mape, na.rm = TRUE),
          .groups = "drop"
        )
    })

    cat("\nCross-Validation Summary:\n")
    print(cv_summary)

    return(list(
      detailed_results = cv_results,
      summary = cv_summary
    ))
  } else {
    cat("No successful cross-validation folds\n")
    return(NULL)
  }
}

# Function to perform holdout validation
perform_holdout_validation <- function(model_data, model_types = c("original", "epi_levels"),
                                     holdout_years = 5) {

  cat("=== HOLDOUT VALIDATION ===\n\n")

  total_years <- length(unique(model_data$year))

  if (total_years <= holdout_years + 10) {
    cat("Insufficient data for holdout validation\n")
    return(NULL)
  }

  # Split data
  sorted_years <- sort(unique(model_data$year))
  split_year <- sorted_years[length(sorted_years) - holdout_years]

  train_data <- model_data %>% filter(year <= split_year)
  test_data <- model_data %>% filter(year > split_year)

  cat("Training period:", min(train_data$year), "-", max(train_data$year), "\n")
  cat("Test period:", min(test_data$year), "-", max(test_data$year), "\n\n")

  holdout_results <- list()

  for (model_type in model_types) {
    cat("Validating model:", model_type, "\n")

    tryCatch({
      # Fit model on training data
      holdout_model <- fit_productivity_model(
        model_data = train_data,
        model_type = model_type,
        save_model = FALSE
      )

      # Generate predictions for test period
      if (model_type %in% c("original", "epi_levels")) {
        # Levels model
        predictions <- posterior_predict(
          holdout_model,
          newdata = test_data,
          ndraws = 500,
          allow_new_levels = TRUE
        )

        pred_summary <- tibble(
          year = test_data$year,
          actual = test_data$log_productivity,
          pred_mean = apply(predictions, 2, mean),
          pred_median = apply(predictions, 2, median),
          pred_lower_80 = apply(predictions, 2, quantile, 0.1),
          pred_upper_80 = apply(predictions, 2, quantile, 0.9),
          pred_lower_95 = apply(predictions, 2, quantile, 0.025),
          pred_upper_95 = apply(predictions, 2, quantile, 0.975)
        )

        # Transform to original scale for interpretability
        pred_summary <- pred_summary %>%
          mutate(
            actual_level = exp(actual),
            pred_mean_level = exp(pred_mean),
            pred_lower_95_level = exp(pred_lower_95),
            pred_upper_95_level = exp(pred_upper_95)
          )

      } else {
        # Growth model - iterative prediction
        pred_summary <- tibble(
          year = test_data$year,
          actual = test_data$productivity_growth,
          pred_mean = numeric(nrow(test_data)),
          pred_lower_95 = numeric(nrow(test_data)),
          pred_upper_95 = numeric(nrow(test_data))
        )

        for (i in 1:nrow(test_data)) {
          growth_pred <- posterior_predict(
            holdout_model,
            newdata = test_data[i, ],
            ndraws = 500,
            allow_new_levels = TRUE
          )

          pred_summary$pred_mean[i] <- mean(growth_pred)
          pred_summary$pred_lower_95[i] <- quantile(growth_pred, 0.025)
          pred_summary$pred_upper_95[i] <- quantile(growth_pred, 0.975)
        }
      }

      # Calculate performance metrics
      metrics <- list(
        rmse = sqrt(mean((pred_summary$pred_mean - pred_summary$actual)^2, na.rm = TRUE)),
        mae = mean(abs(pred_summary$pred_mean - pred_summary$actual), na.rm = TRUE),
        mape = mean(abs((pred_summary$actual - pred_summary$pred_mean) / pred_summary$actual), na.rm = TRUE) * 100,
        coverage_80 = mean(pred_summary$actual >= pred_summary$pred_lower_80 &
                          pred_summary$actual <= pred_summary$pred_upper_80, na.rm = TRUE),
        coverage_95 = mean(pred_summary$actual >= pred_summary$pred_lower_95 &
                          pred_summary$actual <= pred_summary$pred_upper_95, na.rm = TRUE)
      )

      holdout_results[[model_type]] <- list(
        model = holdout_model,
        predictions = pred_summary,
        metrics = metrics
      )

      cat("  RMSE:", round(metrics$rmse, 4), "\n")
      cat("  MAE:", round(metrics$mae, 4), "\n")
      cat("  MAPE:", round(metrics$mape, 2), "%\n")
      cat("  95% Coverage:", round(metrics$coverage_95, 3), "\n\n")

    }, error = function(e) {
      cat("  Error:", e$message, "\n\n")
    })
  }

  return(holdout_results)
}

# Function to test model robustness to data perturbations
test_model_robustness <- function(model_data, model_types = c("epi_levels"),
                                 perturbation_levels = c(0.05, 0.1, 0.2),
                                 n_simulations = 10) {

  cat("=== ROBUSTNESS TESTING ===\n\n")

  robustness_results <- list()

  for (model_type in model_types) {
    cat("Testing robustness for model:", model_type, "\n")

    model_results <- list()

    # Fit reference model
    cat("  Fitting reference model...\n")
    reference_model <- fit_productivity_model(
      model_data = model_data,
      model_type = model_type,
      save_model = FALSE
    )

    reference_params <- extract_parameter_estimates(reference_model, model_type)

    for (perturb_level in perturbation_levels) {
      cat("  Testing perturbation level:", perturb_level, "\n")

      perturb_results <- list()

      for (sim in 1:n_simulations) {
        # Perturb the data
        perturbed_data <- model_data %>%
          mutate(
            # Add noise to key variables
            log_productivity = log_productivity + rnorm(n(), 0, perturb_level * sd(log_productivity, na.rm = TRUE)),
            epi_normalized = epi_normalized + rnorm(n(), 0, perturb_level * sd(epi_normalized, na.rm = TRUE))
          )

        tryCatch({
          # Fit model on perturbed data
          perturbed_model <- fit_productivity_model(
            model_data = perturbed_data,
            model_type = model_type,
            chains = 2,
            iter = 1000,
            save_model = FALSE
          )

          # Extract parameters
          perturbed_params <- extract_parameter_estimates(perturbed_model, model_type)

          # Compare to reference
          param_comparison <- reference_params$summary %>%
            select(parameter, reference_mean = mean) %>%
            left_join(
              perturbed_params$summary %>% select(parameter, perturbed_mean = mean),
              by = "parameter"
            ) %>%
            mutate(
              relative_change = abs(perturbed_mean - reference_mean) / abs(reference_mean),
              simulation = sim,
              perturbation_level = perturb_level
            )

          perturb_results[[sim]] <- param_comparison

        }, error = function(e) {
          cat("    Error in simulation", sim, ":", e$message, "\n")
        })
      }

      if (length(perturb_results) > 0) {
        model_results[[paste0("perturb_", perturb_level)]] <- bind_rows(perturb_results)
      }
    }

    robustness_results[[model_type]] <- model_results
  }

  # Summarize robustness
  if (length(robustness_results) > 0) {
    robustness_summary <- map_dfr(robustness_results, function(model_result) {
      map_dfr(model_result, function(perturb_result) {
        perturb_result %>%
          group_by(parameter, perturbation_level) %>%
          summarise(
            mean_relative_change = mean(relative_change, na.rm = TRUE),
            max_relative_change = max(relative_change, na.rm = TRUE),
            stability = 1 / (1 + mean_relative_change),  # Higher = more stable
            .groups = "drop"
          )
      }, .id = "perturbation")
    }, .id = "model_type")

    cat("\nRobustness Summary (lower relative change = more robust):\n")
    print(robustness_summary)

    return(list(
      detailed_results = robustness_results,
      summary = robustness_summary
    ))
  } else {
    return(NULL)
  }
}

# Function to test sensitivity to priors
test_prior_sensitivity <- function(model_data, model_type = "epi_levels",
                                  prior_scenarios = c("default", "diffuse", "informative")) {

  cat("=== PRIOR SENSITIVITY ANALYSIS ===\n\n")

  sensitivity_results <- list()

  for (prior_scenario in prior_scenarios) {
    cat("Testing prior scenario:", prior_scenario, "\n")

    tryCatch({
      # Modify the fit_productivity_model function to accept custom priors
      # For now, we'll fit with different prior setups manually

      if (prior_scenario == "default") {
        # Use existing priors in the function
        model <- fit_productivity_model(
          model_data = model_data,
          model_type = model_type,
          save_model = FALSE
        )

      } else if (prior_scenario == "diffuse") {
        # Implement diffuse priors
        # This would require modifying the model formula and priors
        cat("  Note: Diffuse priors not fully implemented in current framework\n")
        model <- NULL

      } else if (prior_scenario == "informative") {
        # Implement more informative priors
        cat("  Note: Informative priors not fully implemented in current framework\n")
        model <- NULL
      }

      if (!is.null(model)) {
        # Extract parameters
        params <- extract_parameter_estimates(model, model_type)

        # Store results
        sensitivity_results[[prior_scenario]] <- list(
          model = model,
          parameters = params
        )

        # Print key parameter estimates
        key_params <- params$summary %>%
          filter(grepl("EPI|ar", parameter)) %>%
          select(parameter, mean, q025, q975)

        cat("  Key parameter estimates:\n")
        print(key_params)
        cat("\n")
      }

    }, error = function(e) {
      cat("  Error:", e$message, "\n\n")
    })
  }

  # Compare prior scenarios
  if (length(sensitivity_results) > 1) {
    cat("Prior sensitivity comparison not fully implemented\n")
    cat("Would compare parameter estimates across prior scenarios\n\n")
  }

  return(sensitivity_results)
}

# Function to create validation visualizations
create_validation_plots <- function(validation_results, holdout_results = NULL) {

  plots_list <- list()

  # 1. Cross-validation performance comparison
  if (!is.null(validation_results) && "summary" %in% names(validation_results)) {
    cv_summary <- validation_results$summary

    plots_list$cv_performance <- cv_summary %>%
      select(model_type, mean_rmse, mean_mae, mean_mape) %>%
      pivot_longer(cols = c(mean_rmse, mean_mae, mean_mape),
                   names_to = "metric", values_to = "value") %>%
      mutate(
        metric = case_when(
          metric == "mean_rmse" ~ "RMSE",
          metric == "mean_mae" ~ "MAE",
          metric == "mean_mape" ~ "MAPE (%)"
        )
      ) %>%
      ggplot(aes(x = model_type, y = value, fill = model_type)) +
      geom_col(alpha = 0.7) +
      facet_wrap(~metric, scales = "free_y") +
      labs(
        title = "Cross-Validation Performance Comparison",
        subtitle = "Lower values indicate better out-of-sample performance",
        x = "Model Type",
        y = "Metric Value"
      ) +
      theme_minimal() +
      theme(
        axis.text.x = element_text(angle = 45, hjust = 1),
        legend.position = "none"
      )
  }

  # 2. Holdout validation plots
  if (!is.null(holdout_results)) {
    for (model_name in names(holdout_results)) {
      if ("predictions" %in% names(holdout_results[[model_name]])) {
        pred_data <- holdout_results[[model_name]]$predictions

        plots_list[[paste0("holdout_", model_name)]] <- pred_data %>%
          ggplot(aes(x = year)) +
          geom_ribbon(aes(ymin = pred_lower_95, ymax = pred_upper_95),
                     alpha = 0.2, fill = "blue") +
          geom_line(aes(y = pred_mean, color = "Predicted"), size = 1) +
          geom_line(aes(y = actual, color = "Actual"), size = 1) +
          geom_point(aes(y = actual, color = "Actual"), size = 2) +
          scale_color_manual(
            name = "",
            values = c("Predicted" = "blue", "Actual" = "red")
          ) +
          labs(
            title = paste("Holdout Validation:", str_to_title(model_name)),
            subtitle = "95% prediction intervals shown",
            x = "Year",
            y = "Log Productivity"
          ) +
          theme_minimal() +
          theme(legend.position = "bottom")
      }
    }
  }

  return(plots_list)
}

# Function to generate comprehensive validation report
generate_validation_report <- function(model_data, model_types = c("original", "epi_levels")) {

  cat("=== COMPREHENSIVE MODEL VALIDATION REPORT ===\n\n")

  validation_report <- list()

  # 1. Time series cross-validation
  cat("1. PERFORMING TIME SERIES CROSS-VALIDATION...\n")
  cv_results <- perform_time_series_cv(model_data, model_types)
  validation_report$cross_validation <- cv_results

  # 2. Holdout validation
  cat("\n2. PERFORMING HOLDOUT VALIDATION...\n")
  holdout_results <- perform_holdout_validation(model_data, model_types)
  validation_report$holdout <- holdout_results

  # 3. Robustness testing
  cat("\n3. PERFORMING ROBUSTNESS TESTING...\n")
  robustness_results <- test_model_robustness(model_data, model_types)
  validation_report$robustness <- robustness_results

  # 4. Create validation plots
  cat("\n4. CREATING VALIDATION PLOTS...\n")
  validation_plots <- create_validation_plots(cv_results, holdout_results)
  validation_report$plots <- validation_plots

  # 5. Overall assessment
  cat("\n5. OVERALL VALIDATION ASSESSMENT:\n")

  if (!is.null(cv_results) && !is.null(holdout_results)) {
    # Compare models
    best_cv_model <- cv_results$summary %>%
      arrange(mean_rmse) %>%
      slice(1) %>%
      pull(model_type)

    cat("Best performing model (CV RMSE):", best_cv_model, "\n")

    # Check if EPI model outperforms original
    if ("epi_levels" %in% model_types && "original" %in% model_types) {
      epi_rmse <- cv_results$summary %>%
        filter(model_type == "epi_levels") %>%
        pull(mean_rmse)

      orig_rmse <- cv_results$summary %>%
        filter(model_type == "original") %>%
        pull(mean_rmse)

      if (length(epi_rmse) > 0 && length(orig_rmse) > 0) {
        improvement <- (orig_rmse - epi_rmse) / orig_rmse * 100
        cat("EPI model improvement over original:", round(improvement, 1), "%\n")
      }
    }
  }

  cat("\nValidation report complete.\n\n")

  return(validation_report)
}