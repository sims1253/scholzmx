# Working Enhanced Cognitive Curves with Technology Interactions
# Purpose: Create dynamic skill curves that actually run with available packages
# Author: Enhanced Bayesian EPI methodology

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
})

cat("=== WORKING ENHANCED COGNITIVE CURVES ===\n\n")

# ===== TECHNOLOGY EVOLUTION DATA =====

create_technology_timeline <- function() {
  cat("Creating technology adoption timeline...\n")

  technology_timeline <- tibble(
    year = 1970:2024,

    # Computer/ICT adoption (0-1 scale)
    computer_adoption = case_when(
      year <= 1980 ~ 0.05,                           # Minimal computer use
      year <= 1990 ~ 0.05 + 0.15 * (year - 1980) / 10, # Early adoption
      year <= 2000 ~ 0.20 + 0.50 * (year - 1990) / 10, # PC revolution
      year <= 2010 ~ 0.70 + 0.20 * (year - 2000) / 10, # Internet era
      year <= 2020 ~ 0.90 + 0.08 * (year - 2010) / 10, # Mobile/cloud
      TRUE ~ 0.98                                    # Near-universal
    ),

    # Automation level (proportion of routine tasks automated)
    automation_level = case_when(
      year <= 1990 ~ 0.10 + 0.10 * (year - 1970) / 20, # Industrial automation
      year <= 2000 ~ 0.20 + 0.15 * (year - 1990) / 10, # Computer automation
      year <= 2010 ~ 0.35 + 0.15 * (year - 2000) / 10, # Software automation
      year <= 2020 ~ 0.50 + 0.20 * (year - 2010) / 10, # AI beginning
      TRUE ~ 0.70 + 0.15 * (year - 2020) / 4          # AI acceleration
    ),

    # AI/ML adoption (enterprise and individual)
    ai_adoption = case_when(
      year <= 2000 ~ 0.01,                           # Experimental
      year <= 2010 ~ 0.01 + 0.04 * (year - 2000) / 10, # Early ML
      year <= 2020 ~ 0.05 + 0.15 * (year - 2010) / 10, # Big data/ML
      year <= 2022 ~ 0.20 + 0.20 * (year - 2020) / 2,  # Deep learning
      year == 2023 ~ 0.60,                           # ChatGPT revolution
      TRUE ~ 0.80                                    # Widespread adoption
    )
  )

  cat("   ✓ Technology timeline created:", nrow(technology_timeline), "years\n")
  return(technology_timeline)
}

# ===== COHORT EFFECTS =====

create_cohort_profiles <- function() {
  cat("Creating birth cohort profiles...\n")

  cohort_profiles <- tibble(
    birth_year = 1920:2000
  ) %>%
    mutate(
      cohort = case_when(
        birth_year <= 1945 ~ "Silent Generation",
        birth_year <= 1964 ~ "Baby Boomers",
        birth_year <= 1980 ~ "Generation X",
        birth_year <= 1996 ~ "Millennials",
        TRUE ~ "Generation Z"
      ),

      # Technology comfort (how well they adapt to new tech)
      tech_comfort = case_when(
        cohort == "Silent Generation" ~ 0.3,
        cohort == "Baby Boomers" ~ 0.5,
        cohort == "Generation X" ~ 0.8,
        cohort == "Millennials" ~ 0.95,
        cohort == "Generation Z" ~ 1.0
      ),

      # Education baseline (higher for later cohorts)
      education_baseline = case_when(
        cohort == "Silent Generation" ~ 0.15,
        cohort == "Baby Boomers" ~ 0.25,
        cohort == "Generation X" ~ 0.35,
        cohort == "Millennials" ~ 0.45,
        cohort == "Generation Z" ~ 0.55
      )
    )

  cat("   ✓ Cohort profiles created for", length(unique(cohort_profiles$cohort)), "generations\n")
  return(cohort_profiles)
}

# ===== ENHANCED COGNITIVE CURVES =====

create_enhanced_cognitive_curves <- function() {
  cat("Creating technology-adjusted cognitive curves...\n")

  # Load base cognitive curves
  base_curves <- read_csv(here("src", "content", "blog", "2025",
    "09-26-modeling-productivity-aging-population", "data", "cognitive_curves.csv"),
    show_col_types = FALSE, skip = 4)

  technology_data <- create_technology_timeline()
  cohort_data <- create_cohort_profiles()

  # Create enhanced curves
  enhanced_curves <- expand_grid(
    age = base_curves$age,
    year = 1970:2024
  ) %>%
    mutate(
      birth_year = year - age
    ) %>%
    filter(birth_year >= 1920, birth_year <= 2000) %>%

    # Join base cognitive data
    left_join(base_curves, by = "age") %>%

    # Join technology data
    left_join(technology_data, by = "year") %>%

    # Join cohort data
    left_join(cohort_data, by = "birth_year") %>%

    # Calculate technology adjustments
    mutate(
      # Technology effects on cognitive abilities
      fluid_tech_adjustment = 1 + 0.2 * computer_adoption - 0.1 * automation_level,
      crystallized_tech_adjustment = 1 + 0.3 * computer_adoption + 0.1 * ai_adoption,
      speed_tech_adjustment = 1 - 0.2 * computer_adoption - 0.1 * automation_level,
      memory_tech_adjustment = 1 + 0.1 * computer_adoption - 0.05 * automation_level,

      # Apply cohort effects
      fluid_cohort_adjustment = 1 + 0.2 * tech_comfort,
      crystallized_cohort_adjustment = 1 + 0.1 * education_baseline,

      # Final adjusted cognitive scores
      fluid_enhanced = fluid_intelligence * fluid_tech_adjustment * fluid_cohort_adjustment,
      crystallized_enhanced = crystallized_intelligence * crystallized_tech_adjustment * crystallized_cohort_adjustment,
      speed_enhanced = processing_speed * speed_tech_adjustment,
      memory_enhanced = working_memory * memory_tech_adjustment,

      # Ensure realistic bounds
      fluid_enhanced = pmax(20, pmin(140, fluid_enhanced)),
      crystallized_enhanced = pmax(20, pmin(160, crystallized_enhanced)),
      speed_enhanced = pmax(20, pmin(120, speed_enhanced)),
      memory_enhanced = pmax(20, pmin(120, memory_enhanced)),

      # Create composite measure
      cognitive_composite_modern = 0.35 * fluid_enhanced + 0.35 * crystallized_enhanced +
                                  0.15 * speed_enhanced + 0.15 * memory_enhanced,

      # Add workforce participation for weighting
      workforce_participation = case_when(
        age < 25 ~ 0.6,
        age <= 54 ~ 0.85,
        age <= 64 ~ 0.6,
        TRUE ~ 0.1
      ),

      # Human capital weighting
      tertiary_education = education_baseline + 0.1 * (year - 1970) / 54,
      human_capital_weight = workforce_participation * (1 + 0.4 * tertiary_education)
    ) %>%
    group_by(year) %>%
    mutate(
      human_capital_share = human_capital_weight / sum(human_capital_weight, na.rm = TRUE)
    ) %>%
    ungroup()

  cat("   ✓ Enhanced cognitive curves created:", nrow(enhanced_curves), "observations\n")
  return(enhanced_curves)
}

# ===== MAIN EXECUTION =====

cat("1. Creating enhanced cognitive curves...\n")
enhanced_curves <- create_enhanced_cognitive_curves()

cat("\n2. Summary statistics...\n")
summary_stats <- enhanced_curves %>%
  group_by(year) %>%
  summarise(
    mean_fluid = mean(fluid_enhanced, na.rm = TRUE),
    mean_crystallized = mean(crystallized_enhanced, na.rm = TRUE),
    mean_composite = mean(cognitive_composite_modern, na.rm = TRUE),
    .groups = "drop"
  )

cat("   Cognitive ability evolution:\n")
cat("   Fluid intelligence (1970-2024):",
    round(summary_stats$mean_fluid[1], 1), "→",
    round(summary_stats$mean_fluid[nrow(summary_stats)], 1), "\n")
cat("   Crystallized intelligence (1970-2024):",
    round(summary_stats$mean_crystallized[1], 1), "→",
    round(summary_stats$mean_crystallized[nrow(summary_stats)], 1), "\n")

cat("\n3. Saving results...\n")
write_csv(enhanced_curves, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "enhanced_cognitive_curves.csv"))

cat("   ✓ Enhanced cognitive curves saved\n")

cat("\n=== ENHANCED COGNITIVE FRAMEWORK COMPLETE ===\n")
cat("✓ Technology-adjusted cognitive abilities calculated\n")
cat("✓ Cohort effects incorporated\n")
cat("✓ Human capital weighting added\n")
cat("✓ Data ready for Bayesian modeling\n")