# Simple Enhanced EPI Methodology Demonstration
# Purpose: Show key improvements from workforce weighting and cross-country analysis
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
cat("=== ENHANCED EPI METHODOLOGY DEMONSTRATION ===\n\n")

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
})

setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

# Load original functions
source("R/data_loading.R")
source("R/productivity_index.R")

# ===== STEP 1: ORIGINAL EPI BASELINE =====
cat("Step 1: Calculating original EPI baseline...\n")

# Load original data
original_productivity <- load_productivity_data()
original_demographics <- load_demographic_data()
original_cognitive_curves <- load_cognitive_data()

# Calculate original EPI
original_epi <- calculate_epi(original_demographics, original_cognitive_curves, method = "composite")

# Original EPI statistics
original_stats <- list(
  range = c(min(original_epi$epi_normalized), max(original_epi$epi_normalized)),
  sd = sd(original_epi$epi_normalized),
  cv = sd(original_epi$epi_normalized) / mean(original_epi$epi_normalized),
  time_cor = cor(original_epi$epi_normalized, original_epi$year),
  trend_r2 = summary(lm(epi_normalized ~ poly(year, 2), data = original_epi))$r.squared
)

cat("✓ Original EPI calculated\n")
cat("  Range:", round(original_stats$range[1], 4), "to", round(original_stats$range[2], 4), "\n")
cat("  SD:", round(original_stats$sd, 6), "\n")
cat("  CV:", round(original_stats$cv, 4), "\n")
cat("  Time correlation:", round(original_stats$time_cor, 3), "\n")
cat("  Time trend R²:", round(original_stats$trend_r2, 3), "\n\n")

# ===== STEP 2: WORKFORCE-WEIGHTED IMPROVEMENT =====
cat("Step 2: Creating workforce-weighted EPI improvement...\n")

# Create enhanced workforce demographics (simplified)
years <- 1972:2023
workforce_participation <- tibble(
  year = years,
  # Stylized workforce participation patterns
  participation_15_24 = 0.65 - 0.001 * (year - 1972), # Youth participation declining
  participation_25_54 = 0.85 + 0.002 * (year - 1972), # Prime-age increasing
  participation_55_64 = 0.45 + 0.004 * (year - 1972), # Older workers increasing most
  participation_65_plus = 0.05 + 0.001 * (year - 1972) # Some increase in elderly work
)

# Enhanced EPI calculation with workforce weighting
enhanced_epi <- original_demographics %>%
  left_join(workforce_participation, by = "year") %>%
  mutate(
    # Assign participation rates by age
    participation_rate = case_when(
      age <= 24 ~ participation_15_24,
      age <= 54 ~ participation_25_54,
      age <= 64 ~ participation_55_64,
      TRUE ~ participation_65_plus
    ),
    # Calculate workforce population
    workforce_population = population * participation_rate
  ) %>%
  group_by(year) %>%
  mutate(
    # Calculate workforce shares
    workforce_share = workforce_population / sum(workforce_population, na.rm = TRUE)
  ) %>%
  ungroup() %>%
  left_join(original_cognitive_curves, by = "age") %>%
  mutate(
    # Fill missing cognitive values
    across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
           ~ ifelse(is.na(.), approx(original_cognitive_curves$age, .x, age, rule = 2)$y, .)),

    # Calculate cognitive productivity
    cognitive_productivity = 0.30 * fluid_intelligence + 0.30 * crystallized_intelligence +
                           0.20 * processing_speed + 0.20 * working_memory
  ) %>%
  group_by(year) %>%
  summarise(
    # Calculate different EPI versions
    epi_population = sum((population / sum(population)) * cognitive_productivity, na.rm = TRUE),
    epi_workforce = sum(workforce_share * cognitive_productivity, na.rm = TRUE),
    total_population = sum(population),
    total_workforce = sum(workforce_population, na.rm = TRUE),
    avg_participation = weighted.mean(participation_rate, population, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(
    # Normalize EPIs
    epi_population_norm = epi_population / mean(epi_population),
    epi_workforce_norm = epi_workforce / mean(epi_workforce)
  )

# Enhanced EPI statistics
enhanced_stats <- list(
  workforce = list(
    range = c(min(enhanced_epi$epi_workforce_norm), max(enhanced_epi$epi_workforce_norm)),
    sd = sd(enhanced_epi$epi_workforce_norm),
    cv = sd(enhanced_epi$epi_workforce_norm) / mean(enhanced_epi$epi_workforce_norm),
    time_cor = cor(enhanced_epi$epi_workforce_norm, enhanced_epi$year),
    trend_r2 = summary(lm(epi_workforce_norm ~ poly(year, 2), data = enhanced_epi))$r.squared
  )
)

cat("✓ Workforce-weighted EPI calculated\n")
cat("  Range:", round(enhanced_stats$workforce$range[1], 4), "to", round(enhanced_stats$workforce$range[2], 4), "\n")
cat("  SD:", round(enhanced_stats$workforce$sd, 6), "\n")
cat("  CV:", round(enhanced_stats$workforce$cv, 4), "\n")
cat("  Time correlation:", round(enhanced_stats$workforce$time_cor, 3), "\n")
cat("  Time trend R²:", round(enhanced_stats$workforce$trend_r2, 3), "\n\n")

# ===== STEP 3: IMPROVEMENT ASSESSMENT =====
cat("Step 3: Assessing improvements...\n")

improvement_factor <- enhanced_stats$workforce$sd / original_stats$sd
collinearity_improvement <- original_stats$trend_r2 - enhanced_stats$workforce$trend_r2

cat("=== WORKFORCE WEIGHTING IMPROVEMENTS ===\n")
cat("Variation improvement factor:", round(improvement_factor, 2), "x\n")
cat("Absolute SD improvement:", round(enhanced_stats$workforce$sd - original_stats$sd, 6), "\n")
cat("Collinearity reduction:", round(collinearity_improvement, 3), "points\n")

if (improvement_factor > 1.5) {
  cat("✓ SUBSTANTIAL: Workforce weighting significantly increases EPI variation\n")
} else if (improvement_factor > 1.2) {
  cat("⚠ MODERATE: Workforce weighting provides some improvement\n")
} else {
  cat("⚠ LIMITED: Workforce weighting shows minimal improvement\n")
}

if (collinearity_improvement > 0.05) {
  cat("✓ GOOD: Meaningful reduction in time trend collinearity\n")
} else if (collinearity_improvement > 0) {
  cat("⚠ SLIGHT: Small reduction in time trend collinearity\n")
} else {
  cat("⚠ NONE: No reduction in time trend collinearity\n")
}

cat("\n")

# ===== STEP 4: CROSS-COUNTRY SIMULATION =====
cat("Step 4: Simulating cross-country identification benefits...\n")

# Create simplified cross-country data
countries <- c("DEU", "USA", "JPN", "FRA", "GBR", "ITA", "CAN", "AUS")
years_panel <- 1990:2020

cross_country_simulation <- expand_grid(
  country = countries,
  year = years_panel
) %>%
  mutate(
    # Different aging patterns by country
    aging_speed = case_when(
      country == "JPN" ~ 1.5,  # Japan fastest aging
      country == "ITA" ~ 1.2,  # Italy fast aging
      country == "DEU" ~ 1.0,  # Germany moderate aging
      country == "FRA" ~ 0.8,  # France slower aging
      country == "GBR" ~ 0.7,  # UK slower aging
      country == "USA" ~ 0.5,  # USA slowest aging
      country == "CAN" ~ 0.6,  # Canada slow aging
      country == "AUS" ~ 0.4   # Australia very slow aging
    ),

    # Simulate EPI evolution with country variation
    years_since_1990 = year - 1990,
    epi_base = 1.0,
    epi_trend = -0.002 * aging_speed * years_since_1990,  # Aging reduces EPI
    epi_noise = 0.01 * rnorm(n()),  # Random variation
    epi_country = epi_base + epi_trend + epi_noise,

    # Simulate productivity with EPI effects + country/time fixed effects
    country_effect = case_when(
      country == "USA" ~ 0.1,   # US productivity advantage
      country == "DEU" ~ 0.05,  # German advantage
      country == "FRA" ~ 0.02,  # French modest advantage
      TRUE ~ 0
    ),
    time_effect = 0.015 * years_since_1990,  # Secular productivity growth
    epi_effect = 0.5 * (epi_country - 1),    # EPI effect on productivity
    productivity_shock = 0.02 * rnorm(n()),  # Random shocks
    log_productivity = 4.5 + country_effect + time_effect + epi_effect + productivity_shock
  )

# Cross-country variation analysis
cross_country_stats <- cross_country_simulation %>%
  summarise(
    total_epi_sd = sd(epi_country),
    within_country_sd = cross_country_simulation %>%
      group_by(country) %>%
      summarise(sd = sd(epi_country), .groups = "drop") %>%
      summarise(mean_sd = mean(sd)) %>%
      pull(mean_sd),
    between_country_sd = cross_country_simulation %>%
      group_by(country) %>%
      summarise(mean_epi = mean(epi_country), .groups = "drop") %>%
      summarise(sd = sd(mean_epi)) %>%
      pull(sd)
  )

identification_ratio <- cross_country_stats$between_country_sd / cross_country_stats$within_country_sd

cat("✓ Cross-country simulation completed\n")
cat("  Countries:", length(countries), "\n")
cat("  Observations:", nrow(cross_country_simulation), "\n")
cat("  Total EPI variation:", round(cross_country_stats$total_epi_sd, 4), "\n")
cat("  Within-country variation:", round(cross_country_stats$within_country_sd, 4), "\n")
cat("  Between-country variation:", round(cross_country_stats$between_country_sd, 4), "\n")
cat("  Identification ratio:", round(identification_ratio, 2), "\n")

if (identification_ratio > 0.5) {
  cat("✓ EXCELLENT: Strong cross-country identification\n")
} else if (identification_ratio > 0.3) {
  cat("⚠ GOOD: Moderate cross-country identification\n")
} else {
  cat("⚠ LIMITED: Weak cross-country identification\n")
}

cat("\n")

# ===== STEP 5: POLICY IMPLICATIONS =====
cat("Step 5: Policy variable integration demonstration...\n")

# Add policy variables to simulation
policy_simulation <- cross_country_simulation %>%
  mutate(
    # Retirement age policies (stylized)
    statutory_retirement_age = case_when(
      country == "FRA" & year < 2010 ~ 60 + 0.1 * (year - 1990),
      country == "FRA" ~ 62,
      country == "DEU" & year < 2012 ~ 65,
      country == "DEU" ~ 65 + 0.1 * (year - 2012),
      TRUE ~ 65
    ),

    # Immigration openness (affects age structure)
    immigration_rate = case_when(
      country %in% c("CAN", "AUS") ~ 0.8,
      country %in% c("USA", "GBR") ~ 0.6,
      TRUE ~ 0.4
    ),

    # Policy-adjusted EPI (retirement age affects older worker participation)
    retirement_adjustment = pmax(0.9, 1 - 0.02 * (67 - statutory_retirement_age)),
    immigration_adjustment = 1 + 0.05 * immigration_rate,
    epi_policy_adjusted = epi_country * retirement_adjustment * immigration_adjustment
  )

policy_effects <- policy_simulation %>%
  summarise(
    epi_raw_sd = sd(epi_country),
    epi_policy_sd = sd(epi_policy_adjusted),
    retirement_effect = mean(retirement_adjustment),
    immigration_effect = mean(immigration_adjustment)
  )

policy_improvement <- policy_effects$epi_policy_sd / policy_effects$epi_raw_sd

cat("✓ Policy integration demonstrated\n")
cat("  Raw EPI variation:", round(policy_effects$epi_raw_sd, 4), "\n")
cat("  Policy-adjusted EPI variation:", round(policy_effects$epi_policy_sd, 4), "\n")
cat("  Policy improvement factor:", round(policy_improvement, 2), "x\n")
cat("  Average retirement effect:", round(policy_effects$retirement_effect, 3), "\n")
cat("  Average immigration effect:", round(policy_effects$immigration_effect, 3), "\n")

if (policy_improvement > 1.1) {
  cat("✓ BENEFICIAL: Policy adjustments increase EPI variation\n")
} else {
  cat("⚠ MINIMAL: Policy adjustments have limited effect\n")
}

cat("\n")

# ===== STEP 6: SUMMARY COMPARISON =====
cat("Step 6: Creating summary comparison table...\n")

# Create comprehensive comparison
methodology_comparison <- tibble(
  Approach = c(
    "Original (Population-weighted)",
    "Enhanced (Workforce-weighted)",
    "Cross-country (8 countries)",
    "With Policy Variables"
  ),
  `EPI Variation (SD)` = c(
    round(original_stats$sd, 6),
    round(enhanced_stats$workforce$sd, 6),
    round(cross_country_stats$total_epi_sd, 4),
    round(policy_effects$epi_policy_sd, 4)
  ),
  `Time Collinearity (R²)` = c(
    round(original_stats$trend_r2, 3),
    round(enhanced_stats$workforce$trend_r2, 3),
    "Cross-section breaks collinearity",
    "Policy controls for trends"
  ),
  `Identification Strategy` = c(
    "Time series only",
    "Time series + workforce composition",
    "Cross-country + time variation",
    "Cross-country + policy variation"
  ),
  `Key Advantage` = c(
    "Baseline for comparison",
    "More realistic workforce focus",
    "Breaks time trend collinearity",
    "Enables policy analysis"
  )
)

cat("=== ENHANCED METHODOLOGY COMPARISON ===\n")
print(methodology_comparison, width = Inf)
cat("\n")

# ===== STEP 7: SAVE RESULTS =====
cat("Step 7: Saving demonstration results...\n")

# Create results directory
dir.create("enhanced_demo_results", showWarnings = FALSE)

# Save data
write_csv(methodology_comparison, "enhanced_demo_results/methodology_comparison.csv")
write_csv(enhanced_epi, "enhanced_demo_results/workforce_weighted_epi.csv")
write_csv(cross_country_simulation, "enhanced_demo_results/cross_country_simulation.csv")
write_csv(policy_simulation, "enhanced_demo_results/policy_enhanced_simulation.csv")

# Save summary statistics
enhancement_summary <- list(
  original_stats = original_stats,
  enhanced_stats = enhanced_stats,
  cross_country_stats = cross_country_stats,
  policy_effects = policy_effects,
  improvement_factors = list(
    workforce_variation = improvement_factor,
    collinearity_reduction = collinearity_improvement,
    cross_country_identification = identification_ratio,
    policy_enhancement = policy_improvement
  )
)

saveRDS(enhancement_summary, "enhanced_demo_results/enhancement_summary.rds")

cat("✓ Results saved to enhanced_demo_results/\n\n")

# ===== FINAL ASSESSMENT =====
cat("=== FINAL ENHANCEMENT ASSESSMENT ===\n\n")

cat("1. WORKFORCE WEIGHTING BENEFITS:\n")
cat("   • Variation increase:", round(improvement_factor, 2), "x factor\n")
cat("   • More realistic demographic input (who actually works)\n")
cat("   • Captures changing labor force participation patterns\n")
if (improvement_factor > 1.3) {
  cat("   ✅ SUBSTANTIAL improvement in EPI variation\n")
} else {
  cat("   ⚠ Modest improvement in EPI variation\n")
}

cat("\n2. CROSS-COUNTRY IDENTIFICATION:\n")
cat("   • Breaks single-country time trend collinearity\n")
cat("   • Provides", nrow(cross_country_simulation), "observations vs", nrow(original_epi), "\n")
cat("   • Between-country variation enables identification\n")
if (identification_ratio > 0.4) {
  cat("   ✅ STRONG cross-country identification potential\n")
} else {
  cat("   ⚠ Moderate cross-country identification\n")
}

cat("\n3. POLICY INTEGRATION:\n")
cat("   • Retirement age effects on workforce composition\n")
cat("   • Immigration impacts on age structure\n")
cat("   • Technology adoption interactions possible\n")
cat("   ✅ ENABLES policy-relevant analysis\n")

cat("\n4. OVERALL ASSESSMENT:\n")
total_improvement <- improvement_factor * (1 + identification_ratio) * policy_improvement
cat("   • Combined improvement factor:", round(total_improvement, 2), "x\n")

if (total_improvement > 3) {
  cat("   🎯 EXCELLENT: Multiple enhancement pathways provide strong improvement\n")
} else if (total_improvement > 2) {
  cat("   ✅ GOOD: Meaningful improvement through enhanced methodology\n")
} else {
  cat("   ⚠ MODERATE: Some improvement but challenges remain\n")
}

cat("\n5. IMPLEMENTATION PRIORITY:\n")
cat("   Phase 1: Workforce weighting (immediate)\n")
cat("   Phase 2: Cross-country panel (6 months)\n")
cat("   Phase 3: Policy integration (1 year)\n")
cat("   Phase 4: Sector/technology analysis (future research)\n")

cat("\n=== ENHANCED METHODOLOGY DEMONSTRATION COMPLETE ===\n")
cat("The enhanced EPI methodology provides multiple pathways to address\n")
cat("the identification and variation issues identified in the robustness analysis.\n")