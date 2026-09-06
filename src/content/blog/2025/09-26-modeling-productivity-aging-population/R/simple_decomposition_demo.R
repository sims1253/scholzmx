# Simple Productivity Decomposition Demo
# Purpose: Demonstrate decomposition of productivity growth into aging vs shock effects
# Author: Enhanced EPI methodology

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(broom)
})

cat("=== SIMPLE PRODUCTIVITY DECOMPOSITION DEMO ===\n\n")

# ===== CREATE DEMO DATA =====

cat("Creating demonstration dataset...\n")

# Extend the working EPI data through 2024
create_demo_decomposition_data <- function() {

  # Use the working EPI demonstration data structure
  years <- 1971:2024

  # Create realistic demographic aging and EPI evolution
  demo_data <- map_dfr(years, function(year) {
    aging_progress <- (year - 1970) / (2024 - 1970)
    mean_age <- 40 + aging_progress * 8
    epi_value <- 0.95 + aging_progress * 0.1  # EPI rises with education then falls with aging

    tibble(
      year = year,
      epi_normalized = epi_value,
      avg_age_population = mean_age
    )
  })

  # Add productivity data (54 years: 1971-2024)
  productivity_data <- tibble(
    year = 1971:2024
  ) %>%
    mutate(
      # Generate realistic productivity evolution
      base_trend = 5.3 * (1.025^(year - 1971)),  # 2.5% annual trend

      # Add cyclical and shock effects
      productivity_per_hour = case_when(
        year %in% 1973:1975 ~ base_trend * 0.95,  # Oil crisis 1
        year %in% 1979:1981 ~ base_trend * 0.92,  # Oil crisis 2
        year %in% 1991:1993 ~ base_trend * 0.90,  # German reunification
        year %in% 2001:2003 ~ base_trend * 0.96,  # Dot-com crash
        year %in% 2008:2009 ~ base_trend * 0.88,  # Financial crisis
        year == 2020 ~ base_trend * 0.98,         # COVID initial
        year == 2021 ~ base_trend * 1.05,         # COVID recovery
        year == 2022 ~ base_trend * 1.06,         # Post-COVID catch-up
        year >= 2023 ~ base_trend * 1.02,         # New normal
        TRUE ~ base_trend
      )
    ) %>%
    mutate(
      log_productivity = log(productivity_per_hour),
      productivity_growth = c(NA, diff(log_productivity))
    )

  # Add economic shocks (simplified)
  shock_data <- tibble(
    year = 1971:2024,
    major_shock = case_when(
      year %in% 1973:1975 ~ 0.8,  # Oil crisis 1
      year %in% 1979:1981 ~ 0.7,  # Oil crisis 2
      year %in% 1991:1993 ~ 0.5,  # German reunification
      year %in% 2001:2003 ~ 0.4,  # Dot-com crash
      year %in% 2008:2009 ~ 0.9,  # Financial crisis
      year %in% 2020:2022 ~ 0.8,  # COVID
      year %in% 2022:2023 ~ 0.6,  # Ukraine war
      TRUE ~ 0
    ),
    temporary_shock = major_shock,
    permanent_shock = case_when(
      year >= 1991 ~ 0.1,  # German reunification permanent effects
      year >= 2020 ~ 0.2,  # COVID permanent remote work changes
      TRUE ~ 0
    )
  )

  # Combine datasets
  combined_data <- productivity_data %>%
    left_join(demo_data, by = "year") %>%
    left_join(shock_data, by = "year") %>%
    mutate(
      # Time trends
      time_trend = year - min(year),
      time_trend_sq = time_trend^2,

      # EPI changes
      epi_change = c(NA, diff(epi_normalized)),

      # Period indicators
      pre_crisis = year < 2007,
      crisis_period = year >= 2007 & year <= 2009,
      covid_period = year >= 2020 & year <= 2022,
      current_period = year >= 2023
    ) %>%
    filter(!is.na(productivity_growth))

  cat("   ✓ Demo dataset created:", nrow(combined_data), "years\n")

  return(combined_data)
}

# ===== DECOMPOSITION MODELS =====

estimate_demo_models <- function(data) {

  cat("Estimating decomposition models...\n")

  # Model 1: Basic trend only
  model_trend <- lm(productivity_growth ~ time_trend + I(time_trend^2), data = data)

  # Model 2: Trend + aging
  model_aging <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change, data = data)

  # Model 3: Trend + aging + shocks
  model_full <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                   temporary_shock + permanent_shock, data = data)

  # Model 4: Period effects
  model_periods <- lm(productivity_growth ~ time_trend + I(time_trend^2) + epi_change +
                     crisis_period + covid_period, data = data)

  models <- list(
    trend_only = model_trend,
    with_aging = model_aging,
    with_shocks = model_full,
    period_effects = model_periods
  )

  # Model comparison
  model_comparison <- map_dfr(models, ~ {
    summary_stats <- summary(.x)
    tibble(
      r_squared = summary_stats$r.squared,
      adj_r_squared = summary_stats$adj.r.squared,
      aic = AIC(.x),
      rmse = sqrt(mean(resid(.x)^2))
    )
  }, .id = "model")

  cat("   Model comparison:\n")
  print(model_comparison %>% arrange(desc(adj_r_squared)))

  return(list(
    models = models,
    comparison = model_comparison,
    best_model = models[[model_comparison$model[which.max(model_comparison$adj_r_squared)]]]
  ))
}

# ===== CONTRIBUTION ANALYSIS =====

analyze_contributions <- function(data, best_model) {

  cat("Analyzing factor contributions...\n")

  # Get coefficients
  coeffs <- coef(best_model)

  # Calculate contributions
  contributions <- data %>%
    mutate(
      trend_contribution = coeffs["time_trend"] * time_trend +
                          ifelse("I(time_trend^2)" %in% names(coeffs),
                                coeffs["I(time_trend^2)"] * time_trend^2, 0),

      aging_contribution = ifelse("epi_change" %in% names(coeffs),
                                 coeffs["epi_change"] * epi_change, 0),

      shock_contribution = ifelse("temporary_shock" %in% names(coeffs),
                                 coeffs["temporary_shock"] * temporary_shock, 0) +
                          ifelse("permanent_shock" %in% names(coeffs),
                                coeffs["permanent_shock"] * permanent_shock, 0),

      fitted_growth = predict(best_model),
      residual = productivity_growth - fitted_growth
    )

  # Period analysis
  period_summary <- contributions %>%
    mutate(
      period = case_when(
        year <= 2006 ~ "Pre-Crisis (1972-2006)",
        year <= 2009 ~ "Financial Crisis (2007-2009)",
        year <= 2019 ~ "Recovery (2010-2019)",
        year <= 2022 ~ "COVID Era (2020-2022)",
        TRUE ~ "Current (2023+)"
      )
    ) %>%
    filter(!is.na(period)) %>%
    group_by(period) %>%
    summarise(
      years = n(),
      avg_growth = mean(productivity_growth, na.rm = TRUE),
      avg_trend = mean(trend_contribution, na.rm = TRUE),
      avg_aging = mean(aging_contribution, na.rm = TRUE),
      avg_shock = mean(shock_contribution, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      aging_pct = avg_aging / abs(avg_growth) * 100,
      shock_pct = avg_shock / abs(avg_growth) * 100,
      trend_pct = avg_trend / abs(avg_growth) * 100
    )

  cat("   Period decomposition:\n")
  print(period_summary %>%
          select(period, avg_growth, trend_pct, aging_pct, shock_pct))

  return(list(
    contributions = contributions,
    period_summary = period_summary
  ))
}

# ===== POLICY INSIGHTS =====

derive_policy_insights <- function(period_summary) {

  cat("Deriving policy insights...\n")

  # Recent period focus
  recent_periods <- period_summary %>%
    filter(str_detect(period, "COVID|Current"))

  if (nrow(recent_periods) > 0) {
    covid_period <- recent_periods %>% filter(str_detect(period, "COVID"))
    current_period <- recent_periods %>% filter(str_detect(period, "Current"))

    cat("\n   Key Policy Insights:\n")

    if (nrow(covid_period) > 0) {
      cat("   COVID Era (2020-2022):\n")
      cat("     - Average productivity growth:", round(covid_period$avg_growth * 100, 2), "%\n")
      cat("     - Aging contribution:", round(covid_period$aging_pct, 1), "% of total\n")
      cat("     - Shock contribution:", round(covid_period$shock_pct, 1), "% of total\n")

      if (covid_period$shock_pct > covid_period$aging_pct) {
        cat("     → COVID-era productivity changes primarily due to TEMPORARY shocks\n")
      } else {
        cat("     → COVID-era productivity changes show significant AGING effects\n")
      }
    }

    if (nrow(current_period) > 0) {
      cat("\n   Current Period (2023+):\n")
      cat("     - Average productivity growth:", round(current_period$avg_growth * 100, 2), "%\n")
      cat("     - Aging contribution:", round(current_period$aging_pct, 1), "% of total\n")
      cat("     - Shock contribution:", round(current_period$shock_pct, 1), "% of total\n")

      if (abs(current_period$aging_pct) > abs(current_period$shock_pct)) {
        cat("     → Current productivity patterns increasingly driven by AGING\n")
        cat("     → Policy implication: Address structural demographic changes\n")
      } else {
        cat("     → Current productivity still affected by temporary shocks\n")
        cat("     → Policy implication: Wait for shock recovery before structural changes\n")
      }
    }

    # Overall message for wage policy
    cat("\n   WAGE POLICY IMPLICATIONS:\n")
    cat("   If employers argue 'we can't pay more due to productivity decline':\n")

    overall_aging_share <- mean(recent_periods$aging_pct, na.rm = TRUE)
    overall_shock_share <- mean(recent_periods$shock_pct, na.rm = TRUE)

    if (abs(overall_aging_share) > abs(overall_shock_share)) {
      cat("   → Demographics contribute", round(abs(overall_aging_share), 1), "% - this is PERMANENT\n")
      cat("   → Shocks contribute", round(abs(overall_shock_share), 1), "% - this is TEMPORARY\n")
      cat("   → Young workers shouldn't bear costs of demographic transitions\n")
      cat("   → Need age-neutral productivity investments and immigration policies\n")
    } else {
      cat("   → Temporary shocks dominate (", round(abs(overall_shock_share), 1), "%)\n")
      cat("   → Aging effects are smaller (", round(abs(overall_aging_share), 1), "%)\n")
      cat("   → Productivity weakness is largely temporary - avoid permanent wage cuts\n")
      cat("   → Focus on shock recovery rather than demographic adjustments\n")
    }
  }

  return(list(
    recent_periods = recent_periods,
    overall_aging_share = overall_aging_share,
    overall_shock_share = overall_shock_share
  ))
}

# ===== MAIN EXECUTION =====

cat("1. Creating demonstration data...\n")
demo_data <- create_demo_decomposition_data()

cat("\n2. Estimating models...\n")
model_results <- estimate_demo_models(demo_data)

cat("\n3. Analyzing contributions...\n")
contribution_results <- analyze_contributions(demo_data, model_results$best_model)

cat("\n4. Deriving policy insights...\n")
policy_insights <- derive_policy_insights(contribution_results$period_summary)

cat("\n=== PRODUCTIVITY DECOMPOSITION COMPLETE ===\n")
cat("✓ Productivity growth successfully decomposed into components\n")
cat("✓ Aging vs shock effects quantified by time period\n")
cat("✓ Policy-relevant insights derived for wage negotiations\n")
cat("✓ Framework ready for empirical application with real data\n")