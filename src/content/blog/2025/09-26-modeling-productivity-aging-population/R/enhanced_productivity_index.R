# Enhanced Productivity Index with Workforce Weighting
# Purpose: Improved EPI methodology addressing identification issues
# Author: Generated for scholzmx blog

# Load required libraries
suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
})

# ===== ENHANCED COGNITIVE CURVES =====

#' Create Enhanced Cognitive Aging Curves
#'
#' Builds more sophisticated cognitive curves with education and health adjustments
#'
#' @param education_adjustment Factor for education effect on cognitive decline
#' @param health_adjustment Factor for population health effect
#' @return Enhanced cognitive curves dataset
create_enhanced_cognitive_curves <- function(education_adjustment = 1.0, health_adjustment = 1.0) {

  cat("Creating enhanced cognitive curves\n")

  # Base cognitive curves with more realistic parameterization
  ages <- 18:75

  cognitive_curves <- tibble(age = ages) %>%
    mutate(
      # Fluid intelligence: Peaks early, steady decline
      fluid_intelligence_base = pmax(0, dnorm(age, mean = 25, sd = 12) * 4),

      # Crystallized intelligence: Peaks later, plateau
      crystallized_intelligence_base = pmax(0, dnorm(age, mean = 55, sd = 20) * 2.5),

      # Processing speed: Linear decline from youth
      processing_speed_base = pmax(0.3, 1.2 * exp(-(age - 20) / 35)),

      # Working memory: Peaks ~30, moderate decline
      working_memory_base = pmax(0.4, dnorm(age, mean = 32, sd = 15) * 3),

      # Apply education adjustment (higher education delays decline)
      fluid_intelligence = fluid_intelligence_base *
        (1 + 0.3 * education_adjustment * pmax(0, (40 - age) / 40)),

      crystallized_intelligence = crystallized_intelligence_base *
        (1 + 0.5 * education_adjustment),

      processing_speed = processing_speed_base *
        (1 + 0.2 * education_adjustment * pmax(0, (50 - age) / 50)),

      working_memory = working_memory_base *
        (1 + 0.25 * education_adjustment * pmax(0, (45 - age) / 45)),

      # Apply health adjustment (better health extends cognitive capacity)
      fluid_intelligence = fluid_intelligence * health_adjustment,
      crystallized_intelligence = crystallized_intelligence * health_adjustment,
      processing_speed = processing_speed * health_adjustment,
      working_memory = working_memory * health_adjustment
    ) %>%
    select(age, fluid_intelligence, crystallized_intelligence, processing_speed, working_memory)

  # Normalize curves so mean = 1 across ages 25-60 (prime working years)
  prime_ages <- cognitive_curves %>% filter(age >= 25, age <= 60)

  normalization_factors <- list(
    fluid = mean(prime_ages$fluid_intelligence),
    crystallized = mean(prime_ages$crystallized_intelligence),
    speed = mean(prime_ages$processing_speed),
    memory = mean(prime_ages$working_memory)
  )

  cognitive_curves <- cognitive_curves %>%
    mutate(
      fluid_intelligence = fluid_intelligence / normalization_factors$fluid,
      crystallized_intelligence = crystallized_intelligence / normalization_factors$crystallized,
      processing_speed = processing_speed / normalization_factors$speed,
      working_memory = working_memory / normalization_factors$memory
    )

  cat("✓ Enhanced cognitive curves created\n")
  cat("  Age range:", min(ages), "to", max(ages), "\n")
  cat("  Education adjustment:", education_adjustment, "\n")
  cat("  Health adjustment:", health_adjustment, "\n")

  return(cognitive_curves)
}

# ===== SECTOR-SPECIFIC COGNITIVE PROFILES =====

#' Define Sector-Specific Cognitive Requirements
#'
#' Different sectors emphasize different cognitive abilities
#'
#' @return List of sector-specific cognitive weight profiles
define_sector_cognitive_profiles <- function() {

  sector_profiles <- list(
    # Manufacturing: Physical coordination, routine expertise
    manufacturing = list(
      fluid_weight = 0.35,      # Problem-solving for technical issues
      crystallized_weight = 0.40, # Accumulated technical knowledge
      speed_weight = 0.15,      # Moderate speed requirements
      memory_weight = 0.10      # Procedural memory
    ),

    # Services: Social interaction, experience-based knowledge
    services = list(
      fluid_weight = 0.20,      # Less novel problem solving
      crystallized_weight = 0.50, # Customer knowledge, regulations
      speed_weight = 0.15,      # Moderate speed
      memory_weight = 0.15      # Customer/case memory
    ),

    # ICT: Innovation, rapid learning, complex problem solving
    ict = list(
      fluid_weight = 0.45,      # High novel problem solving
      crystallized_weight = 0.25, # Technical knowledge base
      speed_weight = 0.20,      # Fast information processing
      memory_weight = 0.10      # Working memory for complex tasks
    ),

    # Construction: Physical skills, experience, safety knowledge
    construction = list(
      fluid_weight = 0.30,      # Spatial problem solving
      crystallized_weight = 0.45, # Safety and technique knowledge
      speed_weight = 0.15,      # Moderate speed
      memory_weight = 0.10      # Procedural memory
    ),

    # Finance: Analysis, regulation knowledge, pattern recognition
    finance = list(
      fluid_weight = 0.35,      # Analytical thinking
      crystallized_weight = 0.35, # Regulatory and market knowledge
      speed_weight = 0.15,      # Information processing
      memory_weight = 0.15      # Client and case details
    ),

    # Healthcare: Diagnosis, medical knowledge, patient care
    healthcare = list(
      fluid_weight = 0.30,      # Diagnostic reasoning
      crystallized_weight = 0.45, # Medical knowledge
      speed_weight = 0.10,      # Less time pressure emphasis
      memory_weight = 0.15      # Patient history, procedures
    ),

    # Education: Knowledge transfer, social skills, experience
    education = list(
      fluid_weight = 0.25,      # Moderate innovation
      crystallized_weight = 0.50, # Subject matter expertise
      speed_weight = 0.10,      # Less speed emphasis
      memory_weight = 0.15      # Student needs, curricula
    )
  )

  cat("✓ Sector cognitive profiles defined for", length(sector_profiles), "sectors\n")

  return(sector_profiles)
}

# ===== ADVANCED EPI CALCULATION =====

#' Calculate Advanced EPI with Multiple Dimensions
#'
#' Enhanced EPI calculation with workforce weighting, sector profiles, and policy adjustments
#'
#' @param demographics_data Enhanced demographics with workforce information
#' @param cognitive_curves Enhanced cognitive aging curves
#' @param weighting_method "population", "workforce", or "hours"
#' @param sector_profile Sector-specific cognitive weights (optional)
#' @param policy_adjustments Policy variables affecting workforce (optional)
#' @param education_trend Trend in educational attainment over time
#' @return Advanced EPI dataset with multiple variants
calculate_advanced_epi <- function(demographics_data,
                                 cognitive_curves,
                                 weighting_method = "workforce",
                                 sector_profile = NULL,
                                 policy_adjustments = NULL,
                                 education_trend = 0.02) {

  cat("Calculating advanced EPI with", weighting_method, "weighting\n")

  # Determine cognitive weights
  if (!is.null(sector_profile)) {
    weights <- sector_profile
    cat("  Using sector-specific weights\n")
  } else {
    weights <- list(
      fluid_weight = 0.30,
      crystallized_weight = 0.30,
      speed_weight = 0.20,
      memory_weight = 0.20
    )
    cat("  Using balanced cognitive weights\n")
  }

  # Extract detailed age structure
  detailed_data <- demographics_data %>%
    select(year, age_structure) %>%
    unnest(age_structure)

  # Add education trend (rising education levels over time)
  detailed_data <- detailed_data %>%
    mutate(
      # Education adjustment increases over time (more educated workforce)
      years_since_base = year - min(year),
      education_factor = 1 + education_trend * years_since_base / 10
    )

  # Merge with cognitive curves and calculate adjusted cognitive productivity
  epi_calculation <- detailed_data %>%
    left_join(cognitive_curves, by = "age") %>%
    mutate(
      # Interpolate missing cognitive values
      across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
             ~ ifelse(is.na(.), approx(cognitive_curves$age, .x, age, rule = 2)$y, .)),

      # Apply education adjustment to cognitive abilities
      fluid_intelligence_adj = fluid_intelligence * (1 + 0.2 * (education_factor - 1)),
      crystallized_intelligence_adj = crystallized_intelligence * (1 + 0.4 * (education_factor - 1)),
      processing_speed_adj = processing_speed * (1 + 0.1 * (education_factor - 1)),
      working_memory_adj = working_memory * (1 + 0.15 * (education_factor - 1)),

      # Calculate composite cognitive productivity
      cognitive_productivity =
        weights$fluid_weight * fluid_intelligence_adj +
        weights$crystallized_weight * crystallized_intelligence_adj +
        weights$speed_weight * processing_speed_adj +
        weights$memory_weight * working_memory_adj
    )

  # Apply policy adjustments if provided
  if (!is.null(policy_adjustments)) {
    epi_calculation <- epi_calculation %>%
      left_join(policy_adjustments, by = "year") %>%
      mutate(
        # Retirement age affects workforce participation of older workers
        retirement_effect = ifelse(age >= 60,
                                 pmax(0.5, 1 - 0.1 * pmax(0, 65 - statutory_retirement_age)),
                                 1),

        # Adjust workforce participation based on policy
        workforce_population_adj = workforce_population * retirement_effect,
        total_labor_hours_adj = total_labor_hours * retirement_effect
      ) %>%
      group_by(year) %>%
      mutate(
        workforce_share_adj = workforce_population_adj / sum(workforce_population_adj, na.rm = TRUE),
        hours_share_adj = total_labor_hours_adj / sum(total_labor_hours_adj, na.rm = TRUE)
      ) %>%
      ungroup()
  } else {
    epi_calculation <- epi_calculation %>%
      mutate(
        workforce_share_adj = workforce_share,
        hours_share_adj = hours_share
      )
  }

  # Calculate multiple EPI variants
  epi_results <- epi_calculation %>%
    group_by(year) %>%
    summarise(
      # Basic EPI variants
      epi_population = sum(population_share * cognitive_productivity, na.rm = TRUE),
      epi_workforce = sum(workforce_share * cognitive_productivity, na.rm = TRUE),
      epi_hours = sum(hours_share * cognitive_productivity, na.rm = TRUE),

      # Policy-adjusted variants
      epi_workforce_policy = sum(workforce_share_adj * cognitive_productivity, na.rm = TRUE),
      epi_hours_policy = sum(hours_share_adj * cognitive_productivity, na.rm = TRUE),

      # Component-wise EPI for sensitivity analysis
      epi_fluid_only = sum(workforce_share * fluid_intelligence_adj, na.rm = TRUE),
      epi_crystallized_only = sum(workforce_share * crystallized_intelligence_adj, na.rm = TRUE),
      epi_speed_only = sum(workforce_share * processing_speed_adj, na.rm = TRUE),
      epi_memory_only = sum(workforce_share * working_memory_adj, na.rm = TRUE),

      # Summary statistics
      total_population = sum(population, na.rm = TRUE),
      total_workforce = sum(workforce_population, na.rm = TRUE),
      effective_workforce = sum(workforce_population_adj, na.rm = TRUE),
      avg_age_workforce = weighted.mean(age, workforce_population, na.rm = TRUE),
      avg_cognitive_productivity = weighted.mean(cognitive_productivity, workforce_population, na.rm = TRUE),

      .groups = "drop"
    ) %>%
    mutate(
      # Select primary EPI based on weighting method
      epi_raw = case_when(
        weighting_method == "population" ~ epi_population,
        weighting_method == "workforce" ~ epi_workforce,
        weighting_method == "hours" ~ epi_hours,
        TRUE ~ epi_workforce
      ),

      # Include policy adjustments if available
      epi_raw = ifelse(!is.null(policy_adjustments) & weighting_method == "workforce",
                       epi_workforce_policy, epi_raw),
      epi_raw = ifelse(!is.null(policy_adjustments) & weighting_method == "hours",
                       epi_hours_policy, epi_raw),

      # Normalize EPI (mean = 1)
      epi_normalized = epi_raw / mean(epi_raw, na.rm = TRUE),

      # Calculate growth rates
      epi_growth = (epi_normalized - lag(epi_normalized)) / lag(epi_normalized),

      # Standardized version for regression
      epi_standardized = as.numeric(scale(epi_normalized))
    )

  # Summary statistics
  epi_stats <- list(
    range = c(min(epi_results$epi_normalized), max(epi_results$epi_normalized)),
    sd = sd(epi_results$epi_normalized),
    cv = sd(epi_results$epi_normalized) / mean(epi_results$epi_normalized),
    time_correlation = cor(epi_results$epi_normalized, epi_results$year),
    trend_r2 = summary(lm(epi_normalized ~ poly(year, 2), data = epi_results))$r.squared
  )

  cat("✓ Advanced EPI calculated\n")
  cat("  EPI range:", round(epi_stats$range[1], 4), "to", round(epi_stats$range[2], 4), "\n")
  cat("  EPI SD:", round(epi_stats$sd, 4), "\n")
  cat("  EPI coefficient of variation:", round(epi_stats$cv, 4), "\n")
  cat("  EPI-time correlation:", round(epi_stats$time_correlation, 3), "\n")
  cat("  Time trend R²:", round(epi_stats$trend_r2, 3), "\n")

  return(list(
    epi_data = epi_results,
    epi_stats = epi_stats,
    cognitive_weights = weights
  ))
}

# ===== CROSS-COUNTRY EPI CALCULATION =====

#' Calculate EPI for Cross-Country Panel
#'
#' Calculates EPI across multiple countries for improved identification
#'
#' @param panel_data Cross-country panel dataset
#' @param cognitive_curves Cognitive aging curves
#' @param country_adjustments Country-specific adjustments (optional)
#' @return Cross-country EPI dataset
calculate_cross_country_epi <- function(panel_data, cognitive_curves, country_adjustments = NULL) {

  cat("Calculating cross-country EPI for", length(unique(panel_data$country)), "countries\n")

  # Create synthetic age structure for each country-year
  # (In real application, would use actual demographic data)

  cross_country_epi <- panel_data %>%
    group_by(country, year) %>%
    summarise(
      # Simulate age structure based on old_share and participation_rate
      .groups = "drop"
    ) %>%
    rowwise() %>%
    mutate(
      # Create synthetic workforce age distribution
      age_structure = list({
        # Simplified: assume workforce concentrated in 25-65 range
        ages <- 25:65
        # Age distribution shifts with old_share
        age_weights <- dnorm(ages, mean = 45 - 5 * (old_share - 0.15), sd = 12)
        age_weights <- age_weights / sum(age_weights)

        tibble(
          age = ages,
          workforce_share = age_weights * participation_rate
        )
      })
    ) %>%
    unnest(age_structure) %>%
    left_join(cognitive_curves, by = "age") %>%
    mutate(
      # Interpolate cognitive values
      across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
             ~ ifelse(is.na(.), approx(cognitive_curves$age, .x, age, rule = 2)$y, .))
    ) %>%
    group_by(country, year) %>%
    summarise(
      # Calculate workforce-weighted EPI
      epi_workforce = sum(workforce_share * (
        0.30 * fluid_intelligence +
        0.30 * crystallized_intelligence +
        0.20 * processing_speed +
        0.20 * working_memory
      ), na.rm = TRUE),

      # Normalize by total workforce share
      workforce_total = sum(workforce_share, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    mutate(
      epi_normalized = epi_workforce / workforce_total
    ) %>%
    group_by(country) %>%
    mutate(
      # Country-specific normalization (mean = 1 within country)
      epi_country_normalized = epi_normalized / mean(epi_normalized, na.rm = TRUE),

      # Calculate growth rates
      epi_growth = (epi_country_normalized - lag(epi_country_normalized)) / lag(epi_country_normalized)
    ) %>%
    ungroup()

  # Add back to main panel
  enhanced_panel <- panel_data %>%
    left_join(cross_country_epi %>% select(country, year, epi_normalized, epi_country_normalized, epi_growth),
              by = c("country", "year"))

  cat("✓ Cross-country EPI calculated\n")
  cat("  EPI variation across countries/years - SD:", round(sd(enhanced_panel$epi_normalized, na.rm = TRUE), 4), "\n")
  cat("  Within-country variation - mean SD:",
      round(mean(enhanced_panel %>% group_by(country) %>%
                summarise(sd = sd(epi_normalized, na.rm = TRUE), .groups = "drop") %>%
                pull(sd), na.rm = TRUE), 4), "\n")

  return(enhanced_panel)
}

cat("✓ Enhanced productivity index functions created\n")
cat("Available functions:\n")
cat("  - create_enhanced_cognitive_curves(): More sophisticated cognitive aging curves\n")
cat("  - define_sector_cognitive_profiles(): Sector-specific cognitive requirements\n")
cat("  - calculate_advanced_epi(): Workforce-weighted EPI with policy adjustments\n")
cat("  - calculate_cross_country_epi(): Cross-country panel EPI calculation\n")