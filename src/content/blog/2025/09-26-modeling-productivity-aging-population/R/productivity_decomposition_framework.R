# Productivity Decomposition Framework
# Purpose: Decompose productivity changes into aging vs shock effects for policy analysis
# Author: Enhanced EPI methodology with shock controls

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(broom)
})

source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "extended_data_2024.R"))
source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "economic_shock_database.R"))

cat("=== PRODUCTIVITY DECOMPOSITION FRAMEWORK ===\n\n")

# ===== PRODUCTIVITY DECOMPOSITION MODEL =====

#' Implement Productivity Decomposition Analysis
#'
#' Decomposes productivity growth into: Baseline Trend + Aging Effect + Shock Effects + Residual
decompose_productivity_growth <- function() {

  cat("Implementing productivity decomposition analysis...\n")

  # 1. Combine extended data with shock database
  cat("   1. Combining productivity and shock data...\n")

  # Get extended productivity data
  extended_productivity <- create_extended_productivity_data()

  # Get enhanced demographics and EPI
  enhanced_demographics <- extend_demographics_to_2024()

  # Calculate enhanced EPI for the extended period
  epi_data <- enhanced_demographics %>%
    mutate(
      aging_progress = (year - 1970) / (2024 - 1970),

      # Simple workforce participation by age
      workforce_participation = case_when(
        age < 25 ~ 0.6,
        age <= 54 ~ 0.85,
        age <= 64 ~ 0.6,
        TRUE ~ 0.1
      ),

      # Education trends
      tertiary_education = 0.15 + 0.25 * aging_progress,

      workforce_population = population * workforce_participation,
      human_capital_weight = workforce_population * (1 + 0.4 * tertiary_education)
    ) %>%
    group_by(year) %>%
    mutate(
      human_capital_share = human_capital_weight / sum(human_capital_weight, na.rm = TRUE)
    ) %>%
    ungroup()

  # Load cognitive curves and calculate EPI
  source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "data_loading.R"))
  cognitive_curves <- load_cognitive_data()

  epi_annual <- epi_data %>%
    left_join(cognitive_curves, by = "age") %>%
    mutate(
      across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
             ~ ifelse(is.na(.), approx(cognitive_curves$age, .x, age, rule = 2)$y, .)),

      education_boost = 1 + 0.4 * tertiary_education,
      cognitive_productivity = (0.3 * fluid_intelligence + 0.3 * crystallized_intelligence +
                               0.2 * processing_speed + 0.2 * working_memory) * education_boost / 100
    ) %>%
    group_by(year) %>%
    summarise(
      epi_human_capital = sum(human_capital_share * cognitive_productivity, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      epi_normalized = epi_human_capital / mean(epi_human_capital, na.rm = TRUE)
    )

  # Get shock database and aggregate to annual
  shock_database <- create_comprehensive_shock_database()

  shock_annual <- shock_database %>%
    group_by(year) %>%
    summarise(
      composite_shock_index = mean(composite_shock_index, na.rm = TRUE),
      temporary_shock = mean(temporary_shock, na.rm = TRUE),
      permanent_shock = mean(permanent_shock, na.rm = TRUE),

      # Specific shock types
      financial_shock = mean(ifelse(shock_type == "Financial", historical_shock_composite, 0), na.rm = TRUE),
      energy_shock = mean(ifelse(shock_type == "Energy/Commodity", historical_shock_composite, 0), na.rm = TRUE),
      covid_shock = mean(ifelse(!is.na(lockdown_stringency), lockdown_stringency / 100, 0), na.rm = TRUE),
      war_shock = mean(ifelse(!is.na(energy_price_shock), (energy_price_shock - 100) / 200, 0), na.rm = TRUE),

      .groups = "drop"
    )

  # 2. Create comprehensive dataset
  decomposition_data <- extended_productivity %>%
    left_join(epi_annual, by = "year") %>%
    left_join(shock_annual, by = "year") %>%
    mutate(
      # Fill missing values
      across(c(composite_shock_index, temporary_shock, permanent_shock,
              financial_shock, energy_shock, covid_shock, war_shock),
             ~ ifelse(is.na(.), 0, .)),

      # Time trends
      time_trend = year - min(year),
      time_trend_sq = time_trend^2,

      # Productivity measures
      log_productivity = log(productivity_per_hour),
      productivity_growth = c(NA, diff(log_productivity)),

      # EPI changes
      epi_change = c(NA, diff(epi_normalized)),

      # Period indicators
      pre_shock_period = year < 2007,
      crisis_period = year >= 2007 & year <= 2009,
      recovery_period = year >= 2010 & year <= 2019,
      covid_period = year >= 2020 & year <= 2022,
      current_period = year >= 2023
    ) %>%
    filter(!is.na(productivity_growth))

  cat("   ✓ Combined dataset created:", nrow(decomposition_data), "years\n")

  return(decomposition_data)
}

# ===== DECOMPOSITION MODELS =====

#' Estimate Productivity Decomposition Models
#'
#' Fits multiple models to quantify aging vs shock contributions
estimate_decomposition_models <- function(decomposition_data) {

  cat("Estimating productivity decomposition models...\n")

  # Model 1: Basic trend + aging
  model_basic <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change,
                   data = decomposition_data)

  # Model 2: Trend + aging + composite shocks
  model_composite <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                       temporary_shock + permanent_shock,
                       data = decomposition_data)

  # Model 3: Trend + aging + specific shock types
  model_detailed <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                      financial_shock + energy_shock + covid_shock + war_shock,
                      data = decomposition_data)

  # Model 4: Period-specific effects
  model_periods <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                     crisis_period + covid_period +
                     epi_change:crisis_period + epi_change:covid_period,
                     data = decomposition_data)

  cat("   ✓ Four decomposition models estimated\n")

  return(list(
    basic = model_basic,
    composite = model_composite,
    detailed = model_detailed,
    periods = model_periods,
    data = decomposition_data
  ))
}

# ===== DECOMPOSITION ANALYSIS =====

#' Analyze Productivity Decomposition Results
#'
#' Quantifies the contribution of different factors to productivity changes
analyze_decomposition_results <- function(models) {

  cat("Analyzing decomposition results...\n")

  # Extract model summaries
  model_summaries <- map(models[1:4], ~ {
    model_summary <- summary(.x)
    tibble(
      r_squared = model_summary$r.squared,
      adj_r_squared = model_summary$adj.r.squared,
      rmse = sqrt(mean(resid(.x)^2)),
      n_obs = nobs(.x)
    )
  })

  comparison_table <- bind_rows(model_summaries, .id = "model") %>%
    arrange(desc(adj_r_squared))

  cat("   Model comparison (by adjusted R²):\n")
  print(comparison_table)

  # Use best model for detailed analysis
  best_model <- models[[comparison_table$model[1]]]
  data <- models$data

  cat("\n   Analyzing best model:", comparison_table$model[1], "\n")

  # Coefficient analysis
  coef_analysis <- tidy(best_model, conf.int = TRUE) %>%
    mutate(
      significant = p.value < 0.05,
      economic_significance = abs(estimate) > 0.001  # 0.1 percentage point
    ) %>%
    filter(term != "(Intercept)")

  cat("   Key coefficients:\n")
  print(coef_analysis %>% select(term, estimate, std.error, p.value, significant))

  return(list(
    model_comparison = comparison_table,
    best_model = best_model,
    best_model_name = comparison_table$model[1],
    coefficients = coef_analysis,
    data = data
  ))
}

# ===== CONTRIBUTION CALCULATION =====

#' Calculate Factor Contributions to Productivity Changes
#'
#' Quantifies how much each factor contributed to productivity growth patterns
calculate_factor_contributions <- function(analysis_results) {

  cat("Calculating factor contributions to productivity changes...\n")

  best_model <- analysis_results$best_model
  data <- analysis_results$data
  coefficients <- analysis_results$coefficients

  # Get fitted values and residuals
  data <- data %>%
    mutate(
      fitted_growth = predict(best_model),
      residual = resid(best_model)
    )

  # Calculate contributions for key periods
  period_analysis <- data %>%
    mutate(
      # Contribution calculations based on model coefficients
      trend_contribution = coef(best_model)["time_trend"] * time_trend +
                          ifelse("I(time_trend^2)" %in% names(coef(best_model)),
                                coef(best_model)["I(time_trend^2)"] * time_trend^2, 0),

      aging_contribution = ifelse("epi_change" %in% names(coef(best_model)),
                                 coef(best_model)["epi_change"] * epi_change, 0),

      shock_contribution = fitted_growth - trend_contribution - aging_contribution
    ) %>%
    select(year, productivity_growth, fitted_growth, trend_contribution,
           aging_contribution, shock_contribution, residual)

  # Summary by periods
  period_summary <- period_analysis %>%
    mutate(
      period = case_when(
        year <= 2006 ~ "Pre-Crisis (1972-2006)",
        year <= 2009 ~ "Financial Crisis (2007-2009)",
        year <= 2019 ~ "Recovery (2010-2019)",
        year <= 2022 ~ "COVID Era (2020-2022)",
        TRUE ~ "Current (2023+)"
      )
    ) %>%
    group_by(period) %>%
    summarise(
      years = n(),
      avg_productivity_growth = mean(productivity_growth, na.rm = TRUE),
      avg_trend_contribution = mean(trend_contribution, na.rm = TRUE),
      avg_aging_contribution = mean(aging_contribution, na.rm = TRUE),
      avg_shock_contribution = mean(shock_contribution, na.rm = TRUE),
      avg_residual = mean(residual, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      # Calculate percentages
      aging_pct = avg_aging_contribution / abs(avg_productivity_growth) * 100,
      shock_pct = avg_shock_contribution / abs(avg_productivity_growth) * 100,
      explained_pct = (avg_trend_contribution + avg_aging_contribution + avg_shock_contribution) /
                      abs(avg_productivity_growth) * 100
    )

  cat("   Factor contributions by period:\n")
  print(period_summary %>%
          select(period, avg_productivity_growth, aging_pct, shock_pct, explained_pct))

  return(list(
    period_analysis = period_analysis,
    period_summary = period_summary
  ))
}

# ===== POLICY IMPLICATIONS =====

#' Calculate Policy-Relevant Decomposition
#'
#' Addresses the "we can't pay you more" argument with quantitative decomposition
calculate_policy_implications <- function(contributions) {

  cat("Calculating policy implications...\n")

  # Recent period focus (2020-2024)
  recent_period <- contributions$period_analysis %>%
    filter(year >= 2020)

  if (nrow(recent_period) > 0) {
    recent_summary <- recent_period %>%
      summarise(
        avg_productivity_growth = mean(productivity_growth, na.rm = TRUE),
        total_aging_effect = sum(aging_contribution, na.rm = TRUE),
        total_shock_effect = sum(shock_contribution, na.rm = TRUE),
        .groups = "drop"
      ) %>%
      mutate(
        aging_share = total_aging_effect / (total_aging_effect + total_shock_effect),
        shock_share = total_shock_effect / (total_aging_effect + total_shock_effect),

        # Policy messages
        aging_is_permanent = aging_share > 0,
        shocks_are_temporary = shock_share > 0,
        aging_dominates = aging_share > 0.5,
        shocks_dominate = shock_share > 0.5
      )

    cat("   Recent period (2020-2024) decomposition:\n")
    cat("     Average productivity growth:", round(recent_summary$avg_productivity_growth * 100, 2), "%\n")
    cat("     Aging contribution share:", round(recent_summary$aging_share * 100, 1), "%\n")
    cat("     Shock contribution share:", round(recent_summary$shock_share * 100, 1), "%\n")

    # Policy recommendations
    policy_message <- case_when(
      recent_summary$aging_dominates ~ "Aging effects dominate - need structural adjustments",
      recent_summary$shocks_dominate ~ "Temporary shocks dominate - avoid permanent policy changes",
      TRUE ~ "Mixed effects - balanced policy response needed"
    )

    cat("     Policy implication:", policy_message, "\n")

  } else {
    recent_summary <- NULL
    policy_message <- "Insufficient recent data for policy analysis"
  }

  return(list(
    recent_summary = recent_summary,
    policy_message = policy_message
  ))
}

# ===== MAIN EXECUTION =====

cat("1. Creating productivity decomposition dataset...\n")
decomposition_data <- decompose_productivity_growth()

cat("\n2. Estimating decomposition models...\n")
models <- estimate_decomposition_models(decomposition_data)

cat("\n3. Analyzing decomposition results...\n")
analysis_results <- analyze_decomposition_results(models)

cat("\n4. Calculating factor contributions...\n")
contributions <- calculate_factor_contributions(analysis_results)

cat("\n5. Deriving policy implications...\n")
policy_implications <- calculate_policy_implications(contributions)

# ===== SUMMARY RESULTS =====

cat("\n=== PRODUCTIVITY DECOMPOSITION SUMMARY ===\n")

cat("Model Performance:\n")
cat("  Best model:", analysis_results$best_model_name, "\n")
cat("  Adjusted R²:", round(analysis_results$model_comparison$adj_r_squared[1], 3), "\n")
cat("  RMSE:", round(analysis_results$model_comparison$rmse[1], 4), "\n")

if (!is.null(policy_implications$recent_summary)) {
  cat("\nRecent Period Decomposition (2020-2024):\n")
  cat("  Aging effect share:", round(policy_implications$recent_summary$aging_share * 100, 1), "%\n")
  cat("  Shock effect share:", round(policy_implications$recent_summary$shock_share * 100, 1), "%\n")
  cat("  Policy message:", policy_implications$policy_message, "\n")
}

cat("\nKey Finding: This decomposition directly addresses the 'we can't pay more' argument\n")
cat("by quantifying how much productivity decline is permanent (aging) vs temporary (shocks).\n")

cat("\n=== DECOMPOSITION FRAMEWORK COMPLETE ===\n")
cat("✓ Productivity growth decomposed into trend, aging, and shock components\n")
cat("✓ Multiple model specifications tested for robustness\n")
cat("✓ Factor contributions quantified by time period\n")
cat("✓ Policy-relevant insights derived for wage-setting discussions\n")
cat("✓ Ready for shock-adjusted EPI modeling\n")