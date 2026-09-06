# Enhanced Data Loading with Workforce Weighting
# Purpose: Implement workforce-weighted EPI and cross-country capabilities
# Author: Generated for scholzmx blog

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
})

# ===== WORKFORCE-WEIGHTED DEMOGRAPHICS LOADER =====

#' Load Enhanced Demographics with Workforce Information
#'
#' This function loads demographic data and enhances it with workforce participation
#' rates, hours worked, and employment shares to create more realistic EPI weights
#'
#' @param country Country code (ISO3 or name)
#' @param start_year Starting year for data
#' @param end_year Ending year for data
#' @return Enhanced demographic dataset with workforce weights
load_workforce_demographics <- function(country = "DEU", start_year = 1970, end_year = 2023) {

  cat("Loading workforce-weighted demographics for", country, "\n")

  # Load base demographic data (existing function)
  base_demographics <- load_demographic_data()

  # Create synthetic workforce participation rates by age
  # Based on OECD patterns: participation peaks 25-50, declines after 55
  workforce_rates <- tibble(
    age_group = c("15_24", "25_34", "35_44", "45_54", "55_64", "65_plus"),
    age_midpoint = c(20, 30, 40, 50, 60, 70),
    # Typical OECD participation rates (stylized)
    participation_rate_1970 = c(0.65, 0.75, 0.80, 0.75, 0.45, 0.05),
    participation_rate_2023 = c(0.60, 0.85, 0.88, 0.85, 0.65, 0.08),
    # Hours per worker (accounting for part-time by age)
    hours_per_worker_1970 = c(35, 40, 42, 40, 35, 20),
    hours_per_worker_2023 = c(32, 38, 40, 38, 32, 18)
  )

  # Interpolate participation rates and hours over time
  years <- start_year:end_year
  workforce_evolution <- map_dfr(years, function(year) {
    # Linear interpolation between 1970 and 2023
    weight <- pmax(0, pmin(1, (year - 1970) / (2023 - 1970)))

    workforce_rates %>%
      mutate(
        year = year,
        participation_rate = participation_rate_1970 + weight * (participation_rate_2023 - participation_rate_1970),
        hours_per_worker = hours_per_worker_1970 + weight * (hours_per_worker_2023 - hours_per_worker_1970),
        # Total labor input = participation × hours
        labor_intensity = participation_rate * hours_per_worker
      ) %>%
      select(year, age_group, age_midpoint, participation_rate, hours_per_worker, labor_intensity)
  })

  # Enhanced demographic data with workforce weights
  enhanced_demographics <- base_demographics %>%
    # Map age to age groups for workforce data
    mutate(
      age_group = case_when(
        age <= 24 ~ "15_24",
        age <= 34 ~ "25_34",
        age <= 44 ~ "35_44",
        age <= 54 ~ "45_54",
        age <= 64 ~ "55_64",
        TRUE ~ "65_plus"
      )
    ) %>%
    left_join(workforce_evolution, by = c("year", "age_group")) %>%
    mutate(
      # Calculate workforce-weighted population
      workforce_population = population * participation_rate,
      total_labor_hours = workforce_population * hours_per_worker,

      # Population shares
      population_share = population / sum(population),
      workforce_share = workforce_population / sum(workforce_population, na.rm = TRUE),
      hours_share = total_labor_hours / sum(total_labor_hours, na.rm = TRUE)
    ) %>%
    group_by(year) %>%
    summarise(
      # Aggregate workforce measures
      total_population = sum(population),
      total_workforce = sum(workforce_population, na.rm = TRUE),
      total_hours = sum(total_labor_hours, na.rm = TRUE),
      avg_participation_rate = weighted.mean(participation_rate, population, na.rm = TRUE),
      avg_hours_per_worker = weighted.mean(hours_per_worker, workforce_population, na.rm = TRUE),

      # Age distribution measures
      avg_age_population = weighted.mean(age, population),
      avg_age_workforce = weighted.mean(age, workforce_population, na.rm = TRUE),

      # Keep detailed age structure for EPI calculation
      age_structure = list(tibble(
        age = age,
        population = population,
        workforce_population = workforce_population,
        total_labor_hours = total_labor_hours,
        population_share = population_share,
        workforce_share = workforce_share,
        hours_share = hours_share
      )),

      .groups = "drop"
    )

  cat("✓ Enhanced demographics created with workforce weighting\n")
  cat("  Workforce participation range:",
      round(min(enhanced_demographics$avg_participation_rate), 3), "to",
      round(max(enhanced_demographics$avg_participation_rate), 3), "\n")

  return(enhanced_demographics)
}

# ===== CROSS-COUNTRY DATA LOADER =====

#' Load Cross-Country Panel Data
#'
#' Creates a panel dataset with multiple countries for better identification
#'
#' @param countries Vector of country codes
#' @param start_year Starting year
#' @param end_year Ending year
#' @return Cross-country panel dataset
load_cross_country_panel <- function(countries = c("DEU", "USA", "JPN", "FRA", "GBR", "ITA", "CAN", "AUS"),
                                   start_year = 1980, end_year = 2020) {

  cat("Loading cross-country panel for", length(countries), "countries\n")

  # Create synthetic productivity data for multiple countries
  # Based on real OECD patterns but simplified for demonstration

  # Base productivity levels (GDP per hour worked, normalized)
  base_productivity <- tibble(
    country = countries,
    productivity_1980 = c(100, 105, 85, 95, 90, 85, 100, 95), # Germany = 100 baseline
    productivity_growth_rate = c(0.015, 0.012, 0.018, 0.014, 0.016, 0.010, 0.013, 0.017)
  )

  # Demographic patterns vary by country
  demographic_patterns <- tibble(
    country = countries,
    # Aging speed varies (Japan fastest, USA slowest)
    aging_speed = c(0.8, 0.3, 1.2, 0.7, 0.6, 0.9, 0.5, 0.4),
    # Baseline age structure
    baseline_old_share = c(0.15, 0.12, 0.09, 0.14, 0.16, 0.13, 0.10, 0.11)
  )

  # Generate panel data
  panel_data <- expand_grid(
    country = countries,
    year = start_year:end_year
  ) %>%
    left_join(base_productivity, by = "country") %>%
    left_join(demographic_patterns, by = "country") %>%
    arrange(country, year) %>%
    group_by(country) %>%
    mutate(
      # Productivity evolution with country-specific trends
      years_since_base = year - 1980,
      productivity_per_hour = productivity_1980 * (1 + productivity_growth_rate)^years_since_base,

      # Add some realistic noise and cyclical components
      cycle_component = 0.02 * sin(2 * pi * years_since_base / 10) + 0.01 * rnorm(n()),
      productivity_per_hour = productivity_per_hour * (1 + cycle_component),

      # Demographic evolution
      old_share = baseline_old_share + aging_speed * years_since_base / 40,
      old_share = pmin(old_share, 0.35), # Cap at reasonable level

      # Workforce participation (declines with aging, varies by country)
      participation_rate = 0.75 - 0.2 * (old_share - baseline_old_share),
      participation_rate = pmax(participation_rate, 0.55),

      # Technology adoption (affects EPI impact)
      ict_capital_share = pmax(0.05, 0.05 + 0.02 * years_since_base + 0.01 * rnorm(n())),

      # Policy variables
      effective_retirement_age = case_when(
        country == "FRA" ~ 60 + 0.1 * years_since_base, # France gradually increased
        country == "DEU" ~ 65 + 0.05 * years_since_base, # Germany modest increase
        country == "JPN" ~ 65, # Japan stable
        TRUE ~ 65 + 0.03 * years_since_base # Others small increases
      ),

      log_productivity = log(productivity_per_hour)
    ) %>%
    ungroup()

  cat("✓ Cross-country panel created:\n")
  cat("  Countries:", length(countries), "\n")
  cat("  Years:", start_year, "to", end_year, "\n")
  cat("  Total observations:", nrow(panel_data), "\n")

  return(panel_data)
}

# ===== SECTOR-SPECIFIC DATA LOADER =====

#' Load Sector-Level Productivity Data
#'
#' Creates sector-specific data to test heterogeneous aging effects
#'
#' @param sectors Vector of sector names
#' @param country Country code
#' @return Sector-level dataset
load_sector_data <- function(sectors = c("Manufacturing", "Services", "Construction", "ICT"),
                           country = "DEU") {

  cat("Loading sector-level data for", country, "\n")

  # Sector characteristics
  sector_profiles <- tibble(
    sector = sectors,
    # Different cognitive requirements by sector
    fluid_intelligence_weight = c(0.4, 0.2, 0.5, 0.6),    # Manufacturing/Construction high
    crystallized_intelligence_weight = c(0.2, 0.4, 0.2, 0.3), # Services high
    processing_speed_weight = c(0.3, 0.2, 0.2, 0.4),      # ICT high
    working_memory_weight = c(0.1, 0.2, 0.1, 0.3),        # Services/ICT higher

    # Age composition varies by sector
    avg_worker_age_2000 = c(42, 38, 45, 35),
    aging_rate = c(0.15, 0.12, 0.10, 0.08), # per decade

    # Productivity levels and growth
    base_productivity = c(100, 85, 90, 120),
    productivity_growth = c(0.020, 0.015, 0.010, 0.035)
  )

  # Generate sector time series
  years <- 2000:2023
  sector_data <- expand_grid(
    sector = sectors,
    year = years
  ) %>%
    left_join(sector_profiles, by = "sector") %>%
    mutate(
      years_since_2000 = year - 2000,

      # Evolving age structure by sector
      avg_worker_age = avg_worker_age_2000 + aging_rate * years_since_2000,

      # Sector productivity evolution
      productivity_index = base_productivity * (1 + productivity_growth)^years_since_2000,

      # Add sector-specific shocks
      sector_shock = case_when(
        sector == "ICT" & year >= 2020 ~ 0.15, # COVID tech boom
        sector == "Services" & year %in% 2020:2021 ~ -0.10, # COVID services hit
        TRUE ~ 0
      ),
      productivity_index = productivity_index * (1 + sector_shock),

      log_productivity = log(productivity_index)
    )

  cat("✓ Sector data created for", length(sectors), "sectors\n")

  return(sector_data)
}

# ===== POLICY DATA LOADER =====

#' Load Policy Variables
#'
#' Loads retirement and social policy data that affect workforce composition
#'
#' @param countries Vector of country codes
#' @return Policy dataset
load_policy_data <- function(countries = c("DEU", "USA", "JPN", "FRA", "GBR")) {

  cat("Loading policy data for", length(countries), "countries\n")

  # Create synthetic policy data based on real OECD patterns
  policy_data <- expand_grid(
    country = countries,
    year = 1980:2023
  ) %>%
    mutate(
      # Retirement age policies (stylized real reforms)
      statutory_retirement_age = case_when(
        country == "FRA" & year < 1990 ~ 60,
        country == "FRA" & year < 2010 ~ 60 + 0.1 * (year - 1990),
        country == "FRA" ~ 62,
        country == "DEU" & year < 2000 ~ 65,
        country == "DEU" & year < 2020 ~ 65 + 0.05 * (year - 2000),
        country == "DEU" ~ 67,
        country == "JPN" ~ 65, # Stable
        TRUE ~ 65 + 0.025 * pmax(0, year - 1990) # Others gradual increase
      ),

      # Pension replacement rates (affect retirement incentives)
      pension_replacement_rate = case_when(
        country == "FRA" ~ 0.75 - 0.002 * pmax(0, year - 1990), # France generous but declining
        country == "DEU" ~ 0.60 - 0.001 * pmax(0, year - 1990), # Germany moderate decline
        country == "USA" ~ 0.45, # USA low and stable
        TRUE ~ 0.55 - 0.001 * pmax(0, year - 1990)
      ),

      # Early retirement availability
      early_retirement_available = case_when(
        country == "FRA" & year < 2010 ~ 1,
        country == "DEU" & year < 2005 ~ 1,
        year < 2000 ~ 1,
        TRUE ~ 0
      ),

      # Immigration policies (affect age structure)
      immigration_openness = case_when(
        country == "CAN" ~ 0.8,
        country == "AUS" ~ 0.7,
        country == "USA" ~ 0.6,
        country == "GBR" ~ 0.5 + 0.01 * pmax(0, year - 2000),
        TRUE ~ 0.4
      )
    )

  cat("✓ Policy data created\n")

  return(policy_data)
}

# ===== ENHANCED EPI CALCULATION =====

#' Calculate Workforce-Weighted EPI
#'
#' Enhanced EPI calculation using workforce composition instead of total population
#'
#' @param demographics_data Enhanced demographics with workforce info
#' @param cognitive_curves Cognitive aging curves
#' @param weighting_method Method: "population", "workforce", "hours"
#' @param sector_weights Optional sector-specific cognitive weights
#' @return Enhanced EPI dataset
calculate_workforce_epi <- function(demographics_data,
                                  cognitive_curves,
                                  weighting_method = "workforce",
                                  sector_weights = NULL) {

  cat("Calculating workforce-weighted EPI using", weighting_method, "weighting\n")

  # Extract age structure details from list column
  detailed_demographics <- demographics_data %>%
    select(year, age_structure) %>%
    unnest(age_structure)

  # Merge with cognitive curves
  epi_calculation <- detailed_demographics %>%
    left_join(cognitive_curves, by = "age") %>%
    mutate(
      # Fill missing cognitive values with interpolation
      across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
             ~ ifelse(is.na(.), approx(cognitive_curves$age, .x, age, rule = 2)$y, .))
    )

  # Apply sector-specific weights if provided
  if (!is.null(sector_weights)) {
    cognitive_weights <- sector_weights
  } else {
    # Default cognitive weights (balanced)
    cognitive_weights <- list(
      fluid_weight = 0.30,
      crystallized_weight = 0.30,
      speed_weight = 0.20,
      memory_weight = 0.20
    )
  }

  # Calculate composite cognitive score and EPI
  epi_results <- epi_calculation %>%
    mutate(
      # Composite cognitive productivity
      cognitive_productivity =
        cognitive_weights$fluid_weight * fluid_intelligence +
        cognitive_weights$crystallized_weight * crystallized_intelligence +
        cognitive_weights$speed_weight * processing_speed +
        cognitive_weights$memory_weight * working_memory
    ) %>%
    group_by(year) %>%
    summarise(
      # Different weighting methods
      epi_population = sum(population_share * cognitive_productivity, na.rm = TRUE),
      epi_workforce = sum(workforce_share * cognitive_productivity, na.rm = TRUE),
      epi_hours = sum(hours_share * cognitive_productivity, na.rm = TRUE),

      # Summary statistics
      total_population = sum(population, na.rm = TRUE),
      total_workforce = sum(workforce_population, na.rm = TRUE),
      total_hours = sum(total_labor_hours, na.rm = TRUE),
      avg_cognitive_productivity = mean(cognitive_productivity, na.rm = TRUE),

      .groups = "drop"
    ) %>%
    mutate(
      # Select the requested weighting method
      epi_raw = case_when(
        weighting_method == "population" ~ epi_population,
        weighting_method == "workforce" ~ epi_workforce,
        weighting_method == "hours" ~ epi_hours,
        TRUE ~ epi_workforce
      ),

      # Normalize EPI (mean = 1 over the sample)
      epi_normalized = epi_raw / mean(epi_raw, na.rm = TRUE)
    )

  cat("✓ Workforce-weighted EPI calculated\n")
  cat("  EPI range:", round(min(epi_results$epi_normalized), 4), "to",
      round(max(epi_results$epi_normalized), 4), "\n")
  cat("  EPI SD:", round(sd(epi_results$epi_normalized), 4), "\n")
  cat("  EPI-time correlation:", round(cor(epi_results$epi_normalized, epi_results$year), 3), "\n")

  return(epi_results)
}

cat("✓ Enhanced data loading functions created\n")
cat("Available functions:\n")
cat("  - load_workforce_demographics(): Demographics with workforce weighting\n")
cat("  - load_cross_country_panel(): Multi-country panel data\n")
cat("  - load_sector_data(): Sector-specific analysis data\n")
cat("  - load_policy_data(): Retirement and social policy variables\n")
cat("  - calculate_workforce_epi(): Enhanced EPI with workforce weighting\n")