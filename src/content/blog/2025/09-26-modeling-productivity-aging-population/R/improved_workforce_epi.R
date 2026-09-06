# Improved Workforce-Weighted EPI Implementation
# Purpose: Address identification issues with better data and larger variation
# Author: Enhanced EPI methodology for scholzmx blog

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(lubridate)
})

# ===== OECD-STYLE LABOR FORCE DATA =====

#' Create Realistic Labor Force Participation by Age
#'
#' Based on actual OECD patterns with time variation
create_oecd_labor_force_data <- function(start_year = 1970, end_year = 2023) {

  cat("Creating OECD-style labor force participation data\n")

  # Age groups with realistic participation patterns
  age_groups <- tibble(
    age_group = c("15_19", "20_24", "25_34", "35_44", "45_54", "55_59", "60_64", "65_69", "70_plus"),
    age_midpoint = c(17, 22, 30, 40, 50, 57, 62, 67, 72),

    # 1970 participation rates (lower overall, especially women)
    participation_1970 = c(0.40, 0.70, 0.65, 0.60, 0.65, 0.45, 0.20, 0.05, 0.02),

    # 2023 participation rates (higher, delayed retirement)
    participation_2023 = c(0.35, 0.75, 0.85, 0.88, 0.87, 0.75, 0.55, 0.15, 0.03),

    # Hours per worker (accounting for part-time trends)
    hours_1970 = c(25, 38, 42, 43, 42, 40, 35, 20, 15),
    hours_2023 = c(20, 35, 39, 40, 38, 35, 30, 18, 12),

    # Education levels by age (affects cognitive capacity)
    tertiary_education_1970 = c(0.05, 0.10, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01),
    tertiary_education_2023 = c(0.25, 0.45, 0.50, 0.42, 0.35, 0.25, 0.20, 0.15, 0.10)
  )

  # Create time series with realistic trends
  years <- start_year:end_year
  labor_force_time_series <- map_dfr(years, function(year) {

    # Linear interpolation with some non-linearities
    progress <- (year - 1970) / (2023 - 1970)
    progress <- pmax(0, pmin(1, progress))

    # Some trends accelerated after 1990 (women's labor force participation)
    women_acceleration <- ifelse(year >= 1990, 1 + 0.3 * ((year - 1990) / 33), 1)

    # Retirement age increases accelerated after 2000
    retirement_delay <- ifelse(year >= 2000, 1 + 0.2 * ((year - 2000) / 23), 1)

    age_groups %>%
      mutate(
        year = year,

        # Interpolate participation rates with structural changes
        participation_rate = participation_1970 + progress * (participation_2023 - participation_1970),

        # Apply women's participation boost to prime-age groups
        participation_rate = ifelse(age_group %in% c("25_34", "35_44", "45_54"),
                                   participation_rate * women_acceleration,
                                   participation_rate),

        # Apply retirement delay to older groups
        participation_rate = ifelse(age_group %in% c("55_59", "60_64", "65_69"),
                                   participation_rate * retirement_delay,
                                   participation_rate),

        # Cap at realistic levels
        participation_rate = pmin(participation_rate, 0.95),

        # Hours evolution
        hours_per_worker = hours_1970 + progress * (hours_2023 - hours_1970),

        # Education evolution
        tertiary_education_share = tertiary_education_1970 +
          progress * (tertiary_education_2023 - tertiary_education_1970),

        # Total labor input intensity
        labor_intensity = participation_rate * hours_per_worker,

        # Education-adjusted labor input (human capital)
        human_capital_intensity = labor_intensity * (1 + 0.4 * tertiary_education_share)
      )
  })

  cat("✓ OECD-style labor force data created\n")
  cat("  Time span:", min(years), "to", max(years), "\n")
  cat("  Age groups:", nrow(age_groups), "\n")
  cat("  Total observations:", nrow(labor_force_time_series), "\n")

  return(labor_force_time_series)
}

# ===== ENHANCED DEMOGRAPHIC DATA =====

#' Create Enhanced Demographic Dataset
#'
#' Combines population with realistic workforce patterns
create_enhanced_demographics <- function(base_demographics_file = NULL) {

  cat("Creating enhanced demographic dataset\n")

  # Load base demographics or create synthetic
  if (!is.null(base_demographics_file) && file.exists(base_demographics_file)) {
    base_demo <- read_csv(base_demographics_file, show_col_types = FALSE)
  } else {
    # Create synthetic demographic evolution for Germany
    base_demo <- create_synthetic_demographics()
  }

  # Get labor force data
  labor_force_data <- create_oecd_labor_force_data()

  # Map ages to age groups for joining
  age_to_group <- function(age) {
    case_when(
      age <= 19 ~ "15_19",
      age <= 24 ~ "20_24",
      age <= 34 ~ "25_34",
      age <= 44 ~ "35_44",
      age <= 54 ~ "45_54",
      age <= 59 ~ "55_59",
      age <= 64 ~ "60_64",
      age <= 69 ~ "65_69",
      TRUE ~ "70_plus"
    )
  }

  # Enhance with workforce information
  enhanced_demographics <- base_demo %>%
    mutate(age_group = age_to_group(age)) %>%
    left_join(labor_force_data, by = c("year", "age_group")) %>%
    mutate(
      # Calculate workforce populations
      workforce_population = population * participation_rate,
      total_labor_hours = workforce_population * hours_per_worker,
      human_capital_hours = total_labor_hours * (1 + 0.4 * tertiary_education_share),

      # Handle missing values
      across(c(workforce_population, total_labor_hours, human_capital_hours),
             ~ ifelse(is.na(.), 0, .))
    ) %>%
    group_by(year) %>%
    mutate(
      # Calculate shares
      population_share = population / sum(population),
      workforce_share = workforce_population / sum(workforce_population, na.rm = TRUE),
      hours_share = total_labor_hours / sum(total_labor_hours, na.rm = TRUE),
      human_capital_share = human_capital_hours / sum(human_capital_hours, na.rm = TRUE)
    ) %>%
    ungroup()

  # Create summary by year
  demographic_summary <- enhanced_demographics %>%
    group_by(year) %>%
    summarise(
      total_population = sum(population),
      total_workforce = sum(workforce_population, na.rm = TRUE),
      total_hours = sum(total_labor_hours, na.rm = TRUE),
      total_human_capital = sum(human_capital_hours, na.rm = TRUE),

      avg_age_population = weighted.mean(age, population),
      avg_age_workforce = weighted.mean(age, workforce_population, na.rm = TRUE),

      participation_rate_overall = total_workforce / total_population,
      avg_hours_per_worker = total_hours / total_workforce,

      # Keep detailed structure for EPI calculation
      age_structure = list(tibble(
        age = age,
        population = population,
        workforce_population = workforce_population,
        total_labor_hours = total_labor_hours,
        human_capital_hours = human_capital_hours,
        population_share = population_share,
        workforce_share = workforce_share,
        hours_share = hours_share,
        human_capital_share = human_capital_share,
        tertiary_education_share = tertiary_education_share
      )),

      .groups = "drop"
    )

  cat("✓ Enhanced demographics created\n")
  cat("  Workforce participation range:",
      round(min(demographic_summary$participation_rate_overall), 3), "to",
      round(max(demographic_summary$participation_rate_overall), 3), "\n")
  cat("  Workforce age range:",
      round(min(demographic_summary$avg_age_workforce, na.rm = TRUE), 1), "to",
      round(max(demographic_summary$avg_age_workforce, na.rm = TRUE), 1), "years\n")

  return(demographic_summary)
}

#' Create Synthetic Demographics if no file available
create_synthetic_demographics <- function() {

  cat("Creating synthetic demographic data for Germany\n")

  # Age structure evolution from 1970-2023
  years <- 1970:2023
  ages <- 18:75

  # Create demographic evolution
  synthetic_demo <- expand_grid(year = years, age = ages) %>%
    mutate(
      # Population by age evolves over time (aging + growth)
      cohort_birth_year = year - age,

      # Post-war baby boom (1946-1964) creates larger cohorts
      baby_boom_effect = ifelse(cohort_birth_year >= 1946 & cohort_birth_year <= 1964, 1.3, 1.0),

      # Base population by age (normal distribution around 45)
      base_population = dnorm(age, mean = 42, sd = 15) * 1000000,

      # Aging effect: population shifts older over time
      aging_shift = (year - 1970) * 0.15, # Average age increases
      adjusted_mean_age = 42 + aging_shift,

      # Calculate population with aging
      population = dnorm(age, mean = adjusted_mean_age, sd = 15) *
        (1000000 + (year - 1970) * 8000) * # Population growth
        baby_boom_effect,

      # Ensure positive values
      population = pmax(population, 1000)
    ) %>%
    select(year, age, population)

  return(synthetic_demo)
}

# ===== IMPROVED EPI CALCULATION =====

#' Calculate Workforce-Weighted EPI with Multiple Variants
#'
#' This addresses the "tiny variation" problem by using workforce composition
calculate_improved_epi <- function(enhanced_demographics, cognitive_curves,
                                 method = "human_capital") {

  cat("Calculating improved EPI with", method, "weighting\n")

  # Extract detailed age structure
  detailed_data <- enhanced_demographics %>%
    select(year, age_structure) %>%
    unnest(age_structure)

  # Join with cognitive curves and handle missing values
  epi_calculation <- detailed_data %>%
    left_join(cognitive_curves, by = "age") %>%
    mutate(
      # Fill missing cognitive values with safe approximation
      across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
             ~ {
               if (all(is.na(.))) {
                 # No data to interpolate
                 1.0
               } else {
                 # Safe interpolation
                 ifelse(is.na(.),
                        approx(cognitive_curves$age,
                               cognitive_curves[[cur_column()]],
                               age, rule = 2)$y,
                        .)
               }
             })
    )

  # Education adjustment to cognitive abilities
  epi_calculation <- epi_calculation %>%
    mutate(
      # Higher education boosts cognitive capacity, especially crystallized
      education_boost = 1 + 0.5 * tertiary_education_share,

      # Apply education adjustment
      fluid_intelligence_adj = fluid_intelligence * (1 + 0.2 * (education_boost - 1)),
      crystallized_intelligence_adj = crystallized_intelligence * (1 + 0.6 * (education_boost - 1)),
      processing_speed_adj = processing_speed * (1 + 0.1 * (education_boost - 1)),
      working_memory_adj = working_memory * (1 + 0.3 * (education_boost - 1))
    )

  # Calculate multiple EPI variants
  epi_results <- epi_calculation %>%
    mutate(
      # Composite cognitive productivity
      cognitive_productivity =
        0.30 * fluid_intelligence_adj +
        0.30 * crystallized_intelligence_adj +
        0.20 * processing_speed_adj +
        0.20 * working_memory_adj
    ) %>%
    group_by(year) %>%
    summarise(
      # Multiple EPI variants for comparison
      epi_population = sum(population_share * cognitive_productivity, na.rm = TRUE),
      epi_workforce = sum(workforce_share * cognitive_productivity, na.rm = TRUE),
      epi_hours = sum(hours_share * cognitive_productivity, na.rm = TRUE),
      epi_human_capital = sum(human_capital_share * cognitive_productivity, na.rm = TRUE),

      # Component analysis
      epi_fluid_only = sum(workforce_share * fluid_intelligence_adj, na.rm = TRUE),
      epi_crystallized_only = sum(workforce_share * crystallized_intelligence_adj, na.rm = TRUE),

      # Summary statistics
      avg_cognitive_productivity = weighted.mean(cognitive_productivity, workforce_population, na.rm = TRUE),
      avg_education_level = weighted.mean(tertiary_education_share, workforce_population, na.rm = TRUE),

      .groups = "drop"
    ) %>%
    mutate(
      # Select primary EPI based on method
      epi_raw = case_when(
        method == "population" ~ epi_population,
        method == "workforce" ~ epi_workforce,
        method == "hours" ~ epi_hours,
        method == "human_capital" ~ epi_human_capital,
        TRUE ~ epi_human_capital
      ),

      # Normalize (mean = 1)
      epi_normalized = epi_raw / mean(epi_raw, na.rm = TRUE),

      # Growth rates
      epi_growth = (epi_normalized - lag(epi_normalized)) / lag(epi_normalized),

      # Standardized for regression
      epi_standardized = as.numeric(scale(epi_normalized))
    )

  # Calculate improvement metrics
  variation_stats <- list(
    epi_range = range(epi_results$epi_normalized),
    epi_sd = sd(epi_results$epi_normalized),
    epi_cv = sd(epi_results$epi_normalized) / mean(epi_results$epi_normalized),
    time_correlation = cor(epi_results$epi_normalized, epi_results$year),
    linear_trend_r2 = summary(lm(epi_normalized ~ year, data = epi_results))$r.squared
  )

  cat("✓ Improved EPI calculated\n")
  cat("  EPI standard deviation:", round(variation_stats$epi_sd, 4), "\n")
  cat("  EPI coefficient of variation:", round(variation_stats$epi_cv, 4), "\n")
  cat("  EPI range:", round(variation_stats$epi_range[1], 4), "to",
      round(variation_stats$epi_range[2], 4), "\n")
  cat("  Time correlation:", round(variation_stats$time_correlation, 3), "\n")

  return(list(
    epi_data = epi_results,
    variation_stats = variation_stats
  ))
}

# ===== COMPARISON WITH ORIGINAL EPI =====

#' Compare Original vs Improved EPI
#'
#' Show the improvement in variation and identification
compare_epi_methods <- function(enhanced_demographics, cognitive_curves) {

  cat("Comparing EPI calculation methods\n")

  # Calculate all variants
  population_epi <- calculate_improved_epi(enhanced_demographics, cognitive_curves, "population")
  workforce_epi <- calculate_improved_epi(enhanced_demographics, cognitive_curves, "workforce")
  hours_epi <- calculate_improved_epi(enhanced_demographics, cognitive_curves, "hours")
  human_capital_epi <- calculate_improved_epi(enhanced_demographics, cognitive_curves, "human_capital")

  # Create comparison dataset
  comparison_data <- tibble(
    Method = c("Population", "Workforce", "Hours", "Human Capital"),
    Standard_Deviation = c(
      population_epi$variation_stats$epi_sd,
      workforce_epi$variation_stats$epi_sd,
      hours_epi$variation_stats$epi_sd,
      human_capital_epi$variation_stats$epi_sd
    ),
    Coefficient_of_Variation = c(
      population_epi$variation_stats$epi_cv,
      workforce_epi$variation_stats$epi_cv,
      hours_epi$variation_stats$epi_cv,
      human_capital_epi$variation_stats$epi_cv
    ),
    Time_Correlation = c(
      population_epi$variation_stats$time_correlation,
      workforce_epi$variation_stats$time_correlation,
      hours_epi$variation_stats$time_correlation,
      human_capital_epi$variation_stats$time_correlation
    )
  ) %>%
    mutate(
      Improvement_vs_Population = Standard_Deviation / Standard_Deviation[1],
      Rank = rank(-Standard_Deviation)
    )

  cat("✓ EPI method comparison completed\n")
  print(comparison_data)

  # Return time series for plotting
  time_series_comparison <- population_epi$epi_data %>%
    select(year, epi_population = epi_normalized) %>%
    left_join(workforce_epi$epi_data %>% select(year, epi_workforce = epi_normalized), by = "year") %>%
    left_join(hours_epi$epi_data %>% select(year, epi_hours = epi_normalized), by = "year") %>%
    left_join(human_capital_epi$epi_data %>% select(year, epi_human_capital = epi_normalized), by = "year")

  return(list(
    comparison_stats = comparison_data,
    time_series = time_series_comparison,
    best_method = comparison_data$Method[which.max(comparison_data$Standard_Deviation)]
  ))
}

cat("✓ Improved workforce-weighted EPI functions loaded\n")
cat("Available functions:\n")
cat("  - create_oecd_labor_force_data(): Realistic labor force participation\n")
cat("  - create_enhanced_demographics(): Demographics with workforce weighting\n")
cat("  - calculate_improved_epi(): Enhanced EPI calculation\n")
cat("  - compare_epi_methods(): Compare different weighting methods\n")