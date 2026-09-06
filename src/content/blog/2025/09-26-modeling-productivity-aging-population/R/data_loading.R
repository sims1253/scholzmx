# Data Loading Functions for Productivity Modeling Blog Post
# Author: Generated for scholzmx blog
# Date: 2025-09-26

library(tidyverse)
library(here)
library(readr)

# Function to load German productivity data
load_productivity_data <- function() {
  productivity_path <- here("src", "content", "blog", "2025",
                           "09-26-modeling-productivity-aging-population",
                           "data", "germany_productivity.csv")

  if (!file.exists(productivity_path)) {
    stop("Productivity data file not found. Please ensure germany_productivity.csv exists in the data directory.")
  }

  read_csv(productivity_path, comment = "#", show_col_types = FALSE) %>%
    # Convert to real values (adjust for inflation, etc.)
    mutate(
      productivity_per_hour = as.numeric(productivity_per_hour),
      year = as.integer(year)
    ) %>%
    arrange(year)
}

# Function to load German demographic data
load_demographic_data <- function(yearly = TRUE) {
  if (yearly) {
    # Use the enhanced yearly dataset (1971-2023)
    demographics_path <- here("src", "content", "blog", "2025",
                             "09-26-modeling-productivity-aging-population",
                             "data", "germany_demographics_yearly.csv")
  } else {
    # Use the original decennial dataset (1970-2020)
    demographics_path <- here("src", "content", "blog", "2025",
                             "09-26-modeling-productivity-aging-population",
                             "data", "germany_demographics.csv")
  }

  if (!file.exists(demographics_path)) {
    stop("Demographics data file not found. Please ensure the demographics file exists in the data directory.")
  }

  read_csv(demographics_path, comment = "#", show_col_types = FALSE) %>%
    mutate(
      age = as.integer(age),
      population = as.numeric(population),
      total_pop = as.numeric(total_pop),
      weighted_avg_age = as.numeric(weighted_avg_age),
      pop_over_50 = as.numeric(pop_over_50),
      proportion = as.numeric(proportion)
    ) %>%
    arrange(year, age)
}

# Function to load cognitive ability curves data
load_cognitive_data <- function() {
  cognitive_path <- here("src", "content", "blog", "2025",
                        "09-26-modeling-productivity-aging-population",
                        "data", "cognitive_curves.csv")

  if (!file.exists(cognitive_path)) {
    stop("Cognitive data file not found. Please ensure cognitive_curves.csv exists in the data directory.")
  }

  read_csv(cognitive_path, comment = "#", show_col_types = FALSE) %>%
    mutate(
      age = as.integer(age),
      fluid_intelligence = as.numeric(fluid_intelligence),
      crystallized_intelligence = as.numeric(crystallized_intelligence),
      processing_speed = as.numeric(processing_speed),
      working_memory = as.numeric(working_memory)
    ) %>%
    # Normalize to 0-1 scale for modeling
    mutate(
      fluid_norm = fluid_intelligence / 100,
      crystallized_norm = crystallized_intelligence / 125,
      speed_norm = processing_speed / 100,
      memory_norm = working_memory / 100,
      # Create composite competency score
      composite_competency = (fluid_norm * 0.3 + crystallized_norm * 0.3 +
                             speed_norm * 0.2 + memory_norm * 0.2)
    ) %>%
    arrange(age)
}

# Function to create age distribution for a given year
get_age_distribution <- function(year, demographic_data = NULL, use_yearly = TRUE) {
  if (is.null(demographic_data)) {
    demographic_data <- load_demographic_data(yearly = use_yearly)
  }

  # With yearly data, we should have exact matches for most years
  year_data <- demographic_data %>%
    filter(year == !!year)

  if (nrow(year_data) == 0) {
    # Fallback interpolation for missing years (should be rare with yearly data)
    available_years <- unique(demographic_data$year)

    if (year < min(available_years)) {
      # Use earliest available year
      year_data <- demographic_data %>%
        filter(year == min(available_years)) %>%
        mutate(year = !!year)
    } else if (year > max(available_years)) {
      # Use latest available year
      year_data <- demographic_data %>%
        filter(year == max(available_years)) %>%
        mutate(year = !!year)
    } else {
      # Interpolate between closest years
      closest_years <- sort(available_years)[which.min(abs(available_years - year)) + c(0, 1)]

      if (length(closest_years) >= 2) {
        weight <- (year - closest_years[1]) / (closest_years[2] - closest_years[1])

        year1_data <- demographic_data %>% filter(year == closest_years[1])
        year2_data <- demographic_data %>% filter(year == closest_years[2])

        year_data <- year1_data %>%
          mutate(
            population = population * (1 - weight) + (year2_data$population * weight),
            total_pop = total_pop * (1 - weight) + (year2_data$total_pop * weight),
            weighted_avg_age = weighted_avg_age * (1 - weight) + (year2_data$weighted_avg_age * weight),
            pop_over_50 = pop_over_50 * (1 - weight) + (year2_data$pop_over_50 * weight),
            year = !!year
          ) %>%
          mutate(proportion = population / total_pop)
      } else {
        # Use closest available year
        closest_year <- available_years[which.min(abs(available_years - year))]
        year_data <- demographic_data %>%
          filter(year == closest_year) %>%
          mutate(year = !!year)
      }
    }
  }

  return(year_data)
}

# Function to prepare data for modeling
prepare_modeling_data <- function(use_yearly_data = TRUE) {
  productivity <- load_productivity_data()
  demographics <- load_demographic_data(yearly = use_yearly_data)

  cat("Preparing modeling data...\n")
  cat("Productivity data:", nrow(productivity), "observations from", min(productivity$year), "to", max(productivity$year), "\n")
  cat("Demographics data:", length(unique(demographics$year)), "years from", min(demographics$year), "to", max(demographics$year), "\n")

  # Aggregate demographics by year
  demo_summary <- demographics %>%
    group_by(year) %>%
    summarise(
      weighted_avg_age = first(weighted_avg_age),
      total_pop = first(total_pop),
      pop_over_50 = first(pop_over_50),
      pop_over_50_pct = pop_over_50 / total_pop,
      # Calculate working age population (25-64)
      working_age_pop = sum(population[age >= 25 & age <= 64]),
      working_age_pct = working_age_pop / total_pop,
      .groups = "drop"
    )

  # Combine with productivity data
  combined_data <- productivity %>%
    left_join(demo_summary, by = "year") %>%
    filter(!is.na(weighted_avg_age)) %>%  # Remove years without demo data
    mutate(
      log_productivity = log(productivity_per_hour),
      time_trend = year - min(year),
      time_trend_sq = time_trend^2,
      # Rename for consistency with model
      weighted_age = weighted_avg_age
    )

  cat("Combined dataset:", nrow(combined_data), "matched observations\n")
  cat("Year range:", min(combined_data$year), "to", max(combined_data$year), "\n")

  return(combined_data)
}

# Function to validate data integrity
validate_data <- function(check_yearly = TRUE) {
  cat("Validating data files...\n")

  # Check productivity data
  tryCatch({
    prod_data <- load_productivity_data()
    cat("✓ Productivity data loaded:", nrow(prod_data), "observations\n")
    cat("  Year range:", min(prod_data$year), "-", max(prod_data$year), "\n")
  }, error = function(e) {
    cat("✗ Error loading productivity data:", e$message, "\n")
  })

  # Check demographic data (both versions)
  if (check_yearly) {
    tryCatch({
      demo_yearly <- load_demographic_data(yearly = TRUE)
      cat("✓ Yearly demographic data loaded:", nrow(demo_yearly), "observations\n")
      cat("  Year range:", min(demo_yearly$year), "-", max(demo_yearly$year), "\n")
      cat("  Unique years:", length(unique(demo_yearly$year)), "\n")
      cat("  Age range:", min(demo_yearly$age), "-", max(demo_yearly$age), "\n")
    }, error = function(e) {
      cat("✗ Error loading yearly demographic data:", e$message, "\n")
    })
  }

  tryCatch({
    demo_original <- load_demographic_data(yearly = FALSE)
    cat("✓ Original demographic data loaded:", nrow(demo_original), "observations\n")
    cat("  Year range:", min(demo_original$year), "-", max(demo_original$year), "\n")
    cat("  Unique years:", length(unique(demo_original$year)), "\n")
  }, error = function(e) {
    cat("✗ Error loading original demographic data:", e$message, "\n")
  })

  # Check cognitive data
  tryCatch({
    cog_data <- load_cognitive_data()
    cat("✓ Cognitive data loaded:", nrow(cog_data), "observations\n")
    cat("  Age range:", min(cog_data$age), "-", max(cog_data$age), "\n")
  }, error = function(e) {
    cat("✗ Error loading cognitive data:", e$message, "\n")
  })

  # Test modeling data preparation
  if (check_yearly) {
    tryCatch({
      model_data <- prepare_modeling_data(use_yearly_data = TRUE)
      cat("✓ Modeling data prepared successfully with yearly demographics\n")
      cat("  Final dataset:", nrow(model_data), "observations\n")
    }, error = function(e) {
      cat("✗ Error preparing yearly modeling data:", e$message, "\n")
    })
  }

  cat("Data validation complete.\n")
}