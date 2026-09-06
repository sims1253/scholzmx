# Enhanced Cognitive Curves with Technology Interactions
# Purpose: Create dynamic skill curves that evolve with technology and include cohort effects
# Author: Enhanced Bayesian EPI methodology

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(brms)
  library(rstanarm)
  library(bayesplot)
  library(loo)
})

cat("=== ENHANCED COGNITIVE CURVES WITH TECHNOLOGY INTERACTIONS ===\n\n")

# ===== TECHNOLOGY EVOLUTION DATA =====

#' Create Technology Adoption Timeline
#'
#' Maps major technological shifts that affect cognitive demands
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
    ),

    # Cognitive demand shifts
    routine_cognitive_demand = case_when(
      year <= 1990 ~ 0.7 - 0.1 * (year - 1970) / 20,  # Declining routine
      year <= 2010 ~ 0.6 - 0.2 * (year - 1990) / 20,  # Computer substitution
      year <= 2020 ~ 0.4 - 0.1 * (year - 2010) / 10,  # Software automation
      TRUE ~ 0.3 - 0.1 * (year - 2020) / 4            # AI substitution
    ),

    complex_cognitive_demand = case_when(
      year <= 1990 ~ 0.3 + 0.1 * (year - 1970) / 20,  # Rising complexity
      year <= 2010 ~ 0.4 + 0.2 * (year - 1990) / 20,  # Knowledge economy
      year <= 2020 ~ 0.6 + 0.15 * (year - 2010) / 10, # Innovation premium
      TRUE ~ 0.75 + 0.10 * (year - 2020) / 4          # AI collaboration
    ),

    # Social/collaboration skills demand
    social_skills_demand = case_when(
      year <= 2000 ~ 0.3 + 0.1 * (year - 1970) / 30,  # Service economy
      year <= 2010 ~ 0.4 + 0.15 * (year - 2000) / 10, # Team-based work
      year <= 2020 ~ 0.55 + 0.15 * (year - 2010) / 10, # Collaboration tools
      TRUE ~ 0.70 + 0.10 * (year - 2020) / 4          # Remote/hybrid work
    )
  )

  cat("   ✓ Technology timeline created:", nrow(technology_timeline), "years\n")
  return(technology_timeline)
}

# ===== COHORT EFFECTS =====

#' Create Birth Cohort Profiles
#'
#' Different generations have different tech adoption patterns and cognitive development
create_cohort_profiles <- function() {

  cat("Creating birth cohort profiles...\n")

  # Define major generational cohorts
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
      ),

      # Cognitive flexibility (adaptation to change)
      cognitive_flexibility = case_when(
        cohort == "Silent Generation" ~ 0.6,
        cohort == "Baby Boomers" ~ 0.7,
        cohort == "Generation X" ~ 0.8,
        cohort == "Millennials" ~ 0.9,
        cohort == "Generation Z" ~ 0.95
      ),

      # Digital nativity (grew up with technology)
      digital_nativity = case_when(
        cohort == "Silent Generation" ~ 0.1,
        cohort == "Baby Boomers" ~ 0.2,
        cohort == "Generation X" ~ 0.4,
        cohort == "Millennials" ~ 0.8,
        cohort == "Generation Z" ~ 1.0
      )
    )

  cat("   ✓ Cohort profiles created for", length(unique(cohort_profiles$cohort)), "generations\n")
  return(cohort_profiles)
}

# ===== SECTOR-SPECIFIC COGNITIVE PROFILES =====

#' Create Sector-Specific Cognitive Demands
#'
#' Different industries have different cognitive requirements that change over time
create_sector_cognitive_profiles <- function() {

  cat("Creating sector-specific cognitive profiles...\n")

  sectors <- c("Manufacturing", "Services", "Knowledge_Work", "Healthcare", "Education", "Government")

  sector_profiles <- expand_grid(
    sector = sectors,
    year = 1970:2024
  ) %>%
    mutate(
      # Fluid intelligence importance (problem-solving, adaptation)
      fluid_weight = case_when(
        sector == "Manufacturing" ~ 0.20 + 0.10 * (year - 1970) / 54,     # Rising automation
        sector == "Services" ~ 0.30 + 0.05 * (year - 1970) / 54,          # Customer problems
        sector == "Knowledge_Work" ~ 0.40 + 0.20 * (year - 1970) / 54,    # Innovation premium
        sector == "Healthcare" ~ 0.35 + 0.15 * (year - 1970) / 54,        # Complex diagnostics
        sector == "Education" ~ 0.30 + 0.10 * (year - 1970) / 54,         # Pedagogical adaptation
        sector == "Government" ~ 0.25 + 0.05 * (year - 1970) / 54         # Policy complexity
      ),

      # Crystallized intelligence importance (knowledge, experience)
      crystallized_weight = case_when(
        sector == "Manufacturing" ~ 0.35 - 0.05 * (year - 1970) / 54,     # Automation reduces craft
        sector == "Services" ~ 0.25 + 0.05 * (year - 1970) / 54,          # Experience premium
        sector == "Knowledge_Work" ~ 0.30 + 0.05 * (year - 1970) / 54,    # Domain expertise
        sector == "Healthcare" ~ 0.40 + 0.05 * (year - 1970) / 54,        # Medical knowledge
        sector == "Education" ~ 0.45 + 0.05 * (year - 1970) / 54,         # Subject mastery
        sector == "Government" ~ 0.40 + 0.05 * (year - 1970) / 54         # Institutional knowledge
      ),

      # Processing speed importance (reaction time, efficiency)
      speed_weight = case_when(
        sector == "Manufacturing" ~ 0.30 - 0.10 * (year - 1970) / 54,     # Automation substitutes
        sector == "Services" ~ 0.25 - 0.05 * (year - 1970) / 54,          # Tech helps speed
        sector == "Knowledge_Work" ~ 0.15 + 0.05 * (year - 1970) / 54,    # Info processing
        sector == "Healthcare" ~ 0.15 + 0.05 * (year - 1970) / 54,        # Emergency response
        sector == "Education" ~ 0.10 + 0.00 * (year - 1970) / 54,         # Stable importance
        sector == "Government" ~ 0.15 + 0.00 * (year - 1970) / 54         # Stable processes
      ),

      # Working memory importance (multitasking, complex operations)
      memory_weight = case_when(
        sector == "Manufacturing" ~ 0.15 + 0.05 * (year - 1970) / 54,     # Complex systems
        sector == "Services" ~ 0.20 + 0.10 * (year - 1970) / 54,          # Multi-customer
        sector == "Knowledge_Work" ~ 0.15 + 0.10 * (year - 1970) / 54,    # Complex projects
        sector == "Healthcare" ~ 0.10 + 0.10 * (year - 1970) / 54,        # Multiple patients
        sector == "Education" ~ 0.15 + 0.05 * (year - 1970) / 54,         # Classroom mgmt
        sector == "Government" ~ 0.20 + 0.05 * (year - 1970) / 54         # Multiple priorities
      )
    ) %>%
    # Normalize weights to sum to 1
    mutate(
      total_weight = fluid_weight + crystallized_weight + speed_weight + memory_weight,
      fluid_weight = fluid_weight / total_weight,
      crystallized_weight = crystallized_weight / total_weight,
      speed_weight = speed_weight / total_weight,
      memory_weight = memory_weight / total_weight
    ) %>%
    select(-total_weight)

  cat("   ✓ Sector profiles created for", length(sectors), "sectors over",
      length(unique(sector_profiles$year)), "years\n")
  return(sector_profiles)
}

# ===== ENHANCED COGNITIVE CURVES =====

#' Create Technology-Adjusted Cognitive Curves
#'
#' Adjusts base cognitive curves for technology interactions and cohort effects
create_enhanced_cognitive_curves <- function(base_curves, technology_data, cohort_data) {

  cat("Creating technology-adjusted cognitive curves...\n")

  # Expand base curves across years and birth cohorts
  enhanced_curves <- expand_grid(
    age = base_curves$age,
    year = 1970:2024
  ) %>%
    mutate(
      birth_year = year - age
    ) %>%
    filter(birth_year >= 1920, birth_year <= 2000) %>%  # Realistic birth years

    # Join base cognitive data
    left_join(base_curves, by = "age") %>%

    # Join technology data
    left_join(technology_data, by = "year") %>%

    # Join cohort data
    left_join(cohort_data, by = "birth_year") %>%

    # Calculate technology adjustments
    mutate(
      # Technology can substitute for or complement cognitive abilities

      # Fluid intelligence: AI/automation partly substitutes, but complex problems remain
      fluid_tech_adjustment = 1 + 0.3 * complex_cognitive_demand - 0.2 * automation_level,

      # Crystallized intelligence: Enhanced by information access
      crystallized_tech_adjustment = 1 + 0.4 * computer_adoption + 0.2 * ai_adoption,

      # Processing speed: Technology mostly substitutes
      speed_tech_adjustment = 1 - 0.3 * computer_adoption - 0.2 * automation_level,

      # Working memory: Mixed effects (external memory vs cognitive load)
      memory_tech_adjustment = 1 + 0.2 * computer_adoption - 0.15 * automation_level,

      # Apply cohort effects
      fluid_cohort_adjustment = 1 + 0.3 * cognitive_flexibility + 0.2 * digital_nativity,
      crystallized_cohort_adjustment = 1 + 0.2 * education_baseline,
      speed_cohort_adjustment = 1 + 0.4 * tech_comfort,
      memory_cohort_adjustment = 1 + 0.3 * cognitive_flexibility,

      # Final adjusted cognitive scores
      fluid_enhanced = fluid_intelligence * fluid_tech_adjustment * fluid_cohort_adjustment,
      crystallized_enhanced = crystallized_intelligence * crystallized_tech_adjustment * crystallized_cohort_adjustment,
      speed_enhanced = processing_speed * speed_tech_adjustment * speed_cohort_adjustment,
      memory_enhanced = working_memory * memory_tech_adjustment * memory_cohort_adjustment,

      # Normalize to maintain interpretability (optional)
      fluid_enhanced = pmax(20, pmin(140, fluid_enhanced)),
      crystallized_enhanced = pmax(20, pmin(160, crystallized_enhanced)),
      speed_enhanced = pmax(20, pmin(120, speed_enhanced)),
      memory_enhanced = pmax(20, pmin(120, memory_enhanced))
    ) %>%

    # Create composite measures
    mutate(
      # Traditional composite (equal weights)
      cognitive_composite_traditional = 0.25 * fluid_enhanced + 0.25 * crystallized_enhanced +
                                       0.25 * speed_enhanced + 0.25 * memory_enhanced,

      # Technology-era composite (emphasizes adaptation and knowledge)
      cognitive_composite_modern = 0.35 * fluid_enhanced + 0.35 * crystallized_enhanced +
                                  0.15 * speed_enhanced + 0.15 * memory_enhanced
    )

  cat("   ✓ Enhanced cognitive curves created:", nrow(enhanced_curves), "age-year-cohort combinations\n")

  # Summary statistics
  summary_stats <- enhanced_curves %>%
    group_by(year) %>%
    summarise(
      mean_fluid = mean(fluid_enhanced, na.rm = TRUE),
      mean_crystallized = mean(crystallized_enhanced, na.rm = TRUE),
      mean_composite = mean(cognitive_composite_modern, na.rm = TRUE),
      .groups = "drop"
    )

  cat("   ✓ Cognitive ability evolution summary:\n")
  cat("     Fluid intelligence (1970-2024):",
      round(summary_stats$mean_fluid[1], 1), "→",
      round(summary_stats$mean_fluid[nrow(summary_stats)], 1), "\n")
  cat("     Crystallized intelligence (1970-2024):",
      round(summary_stats$mean_crystallized[1], 1), "→",
      round(summary_stats$mean_crystallized[nrow(summary_stats)], 1), "\n")
  cat("     Modern composite (1970-2024):",
      round(summary_stats$mean_composite[1], 1), "→",
      round(summary_stats$mean_composite[nrow(summary_stats)], 1), "\n")

  return(enhanced_curves)
}

# ===== INDIVIDUAL HETEROGENEITY MODEL =====

#' Add Individual Heterogeneity to Cognitive Curves
#'
#' Creates realistic individual differences in cognitive aging patterns
add_individual_heterogeneity <- function(enhanced_curves, n_individuals = 1000) {

  cat("Adding individual heterogeneity to cognitive curves...\n")

  # Create individual profiles
  individual_profiles <- enhanced_curves %>%
    distinct(birth_year, cohort) %>%
    slice_sample(n = n_individuals, replace = TRUE) %>%
    mutate(
      individual_id = row_number(),

      # Individual differences in cognitive aging rates (random effects)
      fluid_aging_rate = rnorm(n(), 0, 0.3),       # Individual variation in fluid decline
      crystallized_aging_rate = rnorm(n(), 0, 0.2), # Individual variation in crystallized
      speed_aging_rate = rnorm(n(), 0, 0.4),        # Individual variation in speed decline
      memory_aging_rate = rnorm(n(), 0, 0.3),       # Individual variation in memory

      # Individual baseline differences
      fluid_baseline_adj = rnorm(n(), 0, 10),
      crystallized_baseline_adj = rnorm(n(), 0, 12),
      speed_baseline_adj = rnorm(n(), 0, 8),
      memory_baseline_adj = rnorm(n(), 0, 8),

      # Health and lifestyle factors
      health_factor = rbeta(n(), 8, 2),             # Generally good health, some variation
      education_years = case_when(
        cohort == "Silent Generation" ~ rnorm(n(), 12, 3),
        cohort == "Baby Boomers" ~ rnorm(n(), 13, 3),
        cohort == "Generation X" ~ rnorm(n(), 14, 3),
        cohort == "Millennials" ~ rnorm(n(), 15, 3),
        cohort == "Generation Z" ~ rnorm(n(), 16, 3)
      ),
      education_years = pmax(8, pmin(20, education_years))
    )

  # Create individual-level trajectories
  individual_trajectories <- individual_profiles %>%
    select(individual_id, birth_year, cohort, everything()) %>%
    cross_join(tibble(age = 25:65)) %>%
    mutate(
      year = birth_year + age,
      age_centered = age - 45  # Center around middle age
    ) %>%
    filter(year >= 1970, year <= 2024) %>%

    # Apply individual aging patterns
    mutate(
      # Non-linear aging effects
      fluid_individual = 100 + fluid_baseline_adj +
                        fluid_aging_rate * age_centered -
                        0.5 * (age_centered^2) / 10 +
                        5 * health_factor,

      crystallized_individual = 100 + crystallized_baseline_adj +
                               crystallized_aging_rate * age_centered +
                               0.2 * age_centered +  # Slight growth with age
                               3 * education_years,

      speed_individual = 100 + speed_baseline_adj +
                        speed_aging_rate * age_centered -
                        0.8 * (age_centered^2) / 10 +
                        4 * health_factor,

      memory_individual = 100 + memory_baseline_adj +
                         memory_aging_rate * age_centered -
                         0.6 * (age_centered^2) / 10 +
                         4 * health_factor
    ) %>%

    # Ensure realistic bounds
    mutate(
      across(c(fluid_individual, crystallized_individual,
               speed_individual, memory_individual),
             ~ pmax(20, pmin(160, .)))
    )

  cat("   ✓ Individual heterogeneity added for", n_individuals, "individuals\n")
  cat("   ✓ Individual trajectory dataset:", nrow(individual_trajectories), "observations\n")

  return(individual_trajectories)
}

# ===== MAIN EXECUTION =====

cat("1. Loading base cognitive curves...\n")
base_cognitive_curves <- read_csv(here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "cognitive_curves.csv"),
  show_col_types = FALSE, skip = 4)

cat("2. Creating technology timeline...\n")
technology_data <- create_technology_timeline()

cat("3. Creating cohort profiles...\n")
cohort_data <- create_cohort_profiles()

cat("4. Creating sector-specific profiles...\n")
sector_profiles <- create_sector_cognitive_profiles()

cat("5. Creating enhanced cognitive curves...\n")
enhanced_cognitive_curves <- create_enhanced_cognitive_curves(
  base_cognitive_curves, technology_data, cohort_data)

cat("6. Adding individual heterogeneity...\n")
individual_trajectories <- add_individual_heterogeneity(enhanced_cognitive_curves, n_individuals = 1000)

# ===== SAVE RESULTS =====

cat("7. Saving enhanced cognitive data...\n")

# Save main datasets
write_csv(technology_data, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "technology_timeline.csv"))

write_csv(cohort_data, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "cohort_profiles.csv"))

write_csv(sector_profiles, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "sector_cognitive_profiles.csv"))

write_csv(enhanced_cognitive_curves, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "enhanced_cognitive_curves.csv"))

write_csv(individual_trajectories, here("src", "content", "blog", "2025",
  "09-26-modeling-productivity-aging-population", "data", "individual_cognitive_trajectories.csv"))

cat("   ✓ All enhanced cognitive data saved\n")

# ===== SUMMARY =====

cat("\n=== ENHANCED COGNITIVE CURVES SUMMARY ===\n")
cat("✓ Technology timeline: Computer/AI adoption, automation levels\n")
cat("✓ Cohort effects: 5 generational profiles with tech comfort\n")
cat("✓ Sector profiles: 6 industries with evolving cognitive demands\n")
cat("✓ Enhanced curves: Technology and cohort adjusted cognitive abilities\n")
cat("✓ Individual variation: 1000 individuals with heterogeneous aging\n")
cat("✓ Ready for Bayesian hierarchical modeling\n")

cat("\nKey innovations:\n")
cat("• Dynamic cognitive demands that evolve with technology\n")
cat("• Cohort-specific technology adoption and learning patterns\n")
cat("• Sector-specific cognitive requirements over time\n")
cat("• Individual heterogeneity in aging trajectories\n")
cat("• Foundation for multi-level Bayesian models\n")

cat("\n=== ENHANCED COGNITIVE FRAMEWORK COMPLETE ===\n")