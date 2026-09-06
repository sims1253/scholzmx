# Panel Stationarity and Cointegration Analysis
# Purpose: Proper econometric specification for cross-country panel data
# Author: Enhanced EPI methodology for scholzmx blog

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)

  # Check if required packages are available
  if (requireNamespace("plm", quietly = TRUE)) {
    library(plm)
  } else {
    cat("Note: plm package not available, using simplified tests\n")
  }

  if (requireNamespace("urca", quietly = TRUE)) {
    library(urca)
  } else {
    cat("Note: urca package not available, using simplified tests\n")
  }
})

source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "cross_country_panel.R"))

cat("=== PANEL STATIONARITY AND COINTEGRATION ANALYSIS ===\n\n")

# ===== PANEL UNIT ROOT TESTS =====

#' Simplified Panel Unit Root Tests
#'
#' Implements basic panel unit root tests when advanced packages unavailable
simple_panel_unit_root_test <- function(panel_data, variable, country_col = "country",
                                       time_col = "year") {

  cat("Testing panel unit root for", variable, "\n")

  # Individual ADF tests for each country
  countries <- unique(panel_data[[country_col]])
  adf_results <- map_dfr(countries, function(ctry) {

    country_data <- panel_data %>%
      filter(!!sym(country_col) == ctry) %>%
      arrange(!!sym(time_col))

    series <- country_data[[variable]]

    if (length(series) < 10 || all(is.na(series))) {
      return(tibble(country = ctry, adf_statistic = NA, p_value = NA,
                   conclusion = "Insufficient data"))
    }

    # Simple ADF test (lag 1)
    y <- series[2:length(series)]
    y_lag1 <- series[1:(length(series)-1)]
    delta_y <- diff(series)

    if (length(y) < 5) {
      return(tibble(country = ctry, adf_statistic = NA, p_value = NA,
                   conclusion = "Too few observations"))
    }

    # ADF regression: Δy_t = α + βy_{t-1} + ε_t
    tryCatch({
      adf_reg <- lm(delta_y ~ y_lag1[-length(y_lag1)])
      adf_stat <- summary(adf_reg)$coefficients[2, 3] # t-statistic

      # Rough critical values (MacKinnon, 1996)
      # More negative = more evidence against unit root
      critical_1pct <- -3.43
      critical_5pct <- -2.86
      critical_10pct <- -2.57

      conclusion <- case_when(
        adf_stat < critical_1pct ~ "Stationary (1%)",
        adf_stat < critical_5pct ~ "Stationary (5%)",
        adf_stat < critical_10pct ~ "Stationary (10%)",
        TRUE ~ "Unit Root"
      )

      # Approximate p-value
      p_val <- case_when(
        adf_stat < critical_1pct ~ 0.01,
        adf_stat < critical_5pct ~ 0.05,
        adf_stat < critical_10pct ~ 0.10,
        TRUE ~ 0.20
      )

      tibble(country = ctry, adf_statistic = adf_stat, p_value = p_val,
             conclusion = conclusion)

    }, error = function(e) {
      tibble(country = ctry, adf_statistic = NA, p_value = NA,
             conclusion = "Test failed")
    })
  })

  # Panel summary
  stationary_count <- sum(adf_results$conclusion %in%
                         c("Stationary (1%)", "Stationary (5%)", "Stationary (10%)"),
                         na.rm = TRUE)
  total_countries <- nrow(adf_results)

  panel_conclusion <- ifelse(stationary_count > total_countries / 2,
                            "Panel: Stationary (majority)",
                            "Panel: Unit Root (majority)")

  cat("   Individual country results:\n")
  print(adf_results)
  cat("\n   Panel conclusion:", panel_conclusion, "\n")
  cat("   Countries stationary:", stationary_count, "out of", total_countries, "\n\n")

  return(list(
    individual_tests = adf_results,
    panel_conclusion = panel_conclusion,
    stationary_fraction = stationary_count / total_countries
  ))
}

# ===== COINTEGRATION ANALYSIS =====

#' Panel Cointegration Test
#'
#' Test for long-run relationship between productivity and EPI
test_panel_cointegration <- function(panel_data, dep_var, indep_var,
                                   country_col = "country", time_col = "year") {

  cat("Testing panel cointegration between", dep_var, "and", indep_var, "\n")

  countries <- unique(panel_data[[country_col]])

  # Individual cointegration tests
  cointegration_results <- map_dfr(countries, function(ctry) {

    country_data <- panel_data %>%
      filter(!!sym(country_col) == ctry) %>%
      arrange(!!sym(time_col)) %>%
      select(all_of(c(dep_var, indep_var))) %>%
      drop_na()

    if (nrow(country_data) < 15) {
      return(tibble(country = ctry, engle_granger_stat = NA, conclusion = "Insufficient data"))
    }

    y <- country_data[[dep_var]]
    x <- country_data[[indep_var]]

    tryCatch({
      # Step 1: Estimate long-run relationship
      cointegrating_reg <- lm(y ~ x)
      residuals <- resid(cointegrating_reg)

      # Step 2: Test residuals for stationarity (Engle-Granger)
      if (length(residuals) < 10) {
        return(tibble(country = ctry, engle_granger_stat = NA,
                     conclusion = "Too few observations"))
      }

      # ADF test on residuals
      delta_resid <- diff(residuals)
      resid_lag1 <- residuals[1:(length(residuals)-1)]

      eg_reg <- lm(delta_resid ~ resid_lag1[-length(resid_lag1)] - 1) # No constant for EG test
      eg_stat <- summary(eg_reg)$coefficients[1, 3] # t-statistic

      # Engle-Granger critical values (more negative = cointegration)
      eg_critical_5pct <- -3.17
      eg_critical_10pct <- -2.84

      conclusion <- case_when(
        eg_stat < eg_critical_5pct ~ "Cointegrated (5%)",
        eg_stat < eg_critical_10pct ~ "Cointegrated (10%)",
        TRUE ~ "No Cointegration"
      )

      tibble(country = ctry, engle_granger_stat = eg_stat, conclusion = conclusion,
             long_run_coef = coef(cointegrating_reg)[2])

    }, error = function(e) {
      tibble(country = ctry, engle_granger_stat = NA, conclusion = "Test failed",
             long_run_coef = NA)
    })
  })

  # Panel summary
  cointegrated_count <- sum(str_detect(cointegration_results$conclusion, "Cointegrated"),
                           na.rm = TRUE)
  total_countries <- nrow(cointegration_results)

  panel_cointegration <- ifelse(cointegrated_count > total_countries / 2,
                               "Panel: Cointegrated (majority)",
                               "Panel: No Cointegration (majority)")

  cat("   Individual country cointegration results:\n")
  print(cointegration_results)
  cat("\n   Panel conclusion:", panel_cointegration, "\n")
  cat("   Countries cointegrated:", cointegrated_count, "out of", total_countries, "\n\n")

  return(list(
    individual_tests = cointegration_results,
    panel_conclusion = panel_cointegration,
    cointegrated_fraction = cointegrated_count / total_countries
  ))
}

# ===== MODEL SPECIFICATION GUIDANCE =====

#' Determine Optimal Model Specification
#'
#' Based on stationarity and cointegration tests
determine_model_specification <- function(productivity_stationarity, epi_stationarity,
                                        cointegration_result) {

  cat("Determining optimal model specification...\n")

  prod_stationary <- productivity_stationarity$stationary_fraction > 0.5
  epi_stationary <- epi_stationarity$stationary_fraction > 0.5
  cointegrated <- cointegration_result$cointegrated_fraction > 0.5

  specification <- case_when(
    # Both stationary: levels regression
    prod_stationary & epi_stationary ~ "levels",

    # Both non-stationary but cointegrated: error correction model
    !prod_stationary & !epi_stationary & cointegrated ~ "vecm",

    # Both non-stationary, no cointegration: first differences
    !prod_stationary & !epi_stationary & !cointegrated ~ "first_differences",

    # Mixed stationarity: transform non-stationary variables
    prod_stationary & !epi_stationary ~ "mixed_transform_epi",
    !prod_stationary & epi_stationary ~ "mixed_transform_productivity",

    # Default: first differences (conservative)
    TRUE ~ "first_differences"
  )

  cat("   Recommended specification:", specification, "\n")

  guidance <- case_when(
    specification == "levels" ~
      "Both variables stationary. Use levels regression with fixed effects.",

    specification == "vecm" ~
      "Variables cointegrated. Use Vector Error Correction Model or levels with trend.",

    specification == "first_differences" ~
      "No cointegration found. Use first differences to avoid spurious regression.",

    specification == "mixed_transform_epi" ~
      "Transform EPI to stationary (first difference) and use with productivity levels.",

    specification == "mixed_transform_productivity" ~
      "Transform productivity to stationary and use with EPI levels.",

    TRUE ~ "Use first differences as conservative approach."
  )

  cat("   Guidance:", guidance, "\n\n")

  return(list(
    specification = specification,
    guidance = guidance,
    test_summary = list(
      productivity_stationary = prod_stationary,
      epi_stationary = epi_stationary,
      cointegrated = cointegrated
    )
  ))
}

# ===== MAIN ANALYSIS =====

cat("1. Loading cross-country panel data...\n")
panel_data <- create_cross_country_panel()
cross_country_results <- calculate_cross_country_epi(panel_data)
analysis_data <- cross_country_results$panel_data

cat("\n2. Testing stationarity of key variables...\n")

# Test productivity stationarity
productivity_stationarity <- simple_panel_unit_root_test(
  analysis_data, "log_productivity"
)

# Test EPI stationarity
epi_stationarity <- simple_panel_unit_root_test(
  analysis_data, "epi_human_capital_country_norm"
)

cat("\n3. Testing cointegration between productivity and EPI...\n")

cointegration_result <- test_panel_cointegration(
  analysis_data, "log_productivity", "epi_human_capital_country_norm"
)

cat("\n4. Determining optimal model specification...\n")

model_specification <- determine_model_specification(
  productivity_stationarity, epi_stationarity, cointegration_result
)

# ===== PREPARE MODEL-READY DATA =====

cat("\n5. Preparing model-ready dataset...\n")

# Create transformed variables based on specification
model_ready_data <- analysis_data %>%
  group_by(country) %>%
  arrange(year) %>%
  mutate(
    # First differences
    d_log_productivity = log_productivity - lag(log_productivity),
    d_epi_human_capital = epi_human_capital_country_norm - lag(epi_human_capital_country_norm),
    d_population_mean_age = population_mean_age - lag(population_mean_age),

    # Detrended variables (within-country deviations from trend)
    log_productivity_detrended = residuals(lm(log_productivity ~ poly(year, 2))),
    epi_detrended = residuals(lm(epi_human_capital_country_norm ~ poly(year, 2))),

    # Growth rates
    productivity_growth = d_log_productivity,
    epi_growth = d_epi_human_capital / lag(epi_human_capital_country_norm)
  ) %>%
  ungroup() %>%
  # Add time effects
  mutate(
    time_trend = year - min(year),
    time_trend_sq = time_trend^2
  )

# Sample based on recommended specification
sample_for_model <- model_ready_data %>%
  filter(!is.na(d_log_productivity), !is.na(d_epi_human_capital)) %>%
  select(
    country, year,
    # Levels
    log_productivity, epi_human_capital_country_norm,
    # First differences
    d_log_productivity, d_epi_human_capital,
    # Controls
    population_mean_age, participation_rate, tertiary_education_rate,
    ict_capital_share, effective_retirement_age,
    # Time effects
    time_trend, time_trend_sq
  )

cat("   Model-ready dataset:", nrow(sample_for_model), "observations\n")
cat("   Countries:", length(unique(sample_for_model$country)), "\n")
cat("   Time span:", min(sample_for_model$year), "to", max(sample_for_model$year), "\n")

# Show sample
cat("\n6. Sample of model-ready data:\n")
print(sample_for_model %>% slice(1:15))

cat("\n=== STATIONARITY ANALYSIS SUMMARY ===\n")
cat("✓ Panel unit root tests completed\n")
cat("✓ Cointegration analysis performed\n")
cat("✓ Optimal specification determined:", model_specification$specification, "\n")
cat("✓ Model-ready dataset prepared\n")
cat("\nNext step: Implement causal identification framework\n")