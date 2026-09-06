# Effective Productivity Index (EPI) Calculation Functions
# Author: Generated for scholzmx blog
# Date: 2025-09-26
# Purpose: Calculate age-weighted productivity indices based on cognitive ability curves

library(tidyverse)
library(splines)

# Function to calculate Effective Productivity Index (EPI)
calculate_epi <- function(demographics_data, cognitive_curves, method = "composite") {

  # First, interpolate cognitive curves to match demographic age groups
  demo_ages <- sort(unique(demographics_data$age))

  # Interpolate cognitive data for demographic ages
  cognitive_interpolated <- tibble(age = demo_ages) %>%
    mutate(
      fluid_intelligence = approx(cognitive_curves$age, cognitive_curves$fluid_intelligence, age, rule = 2)$y,
      crystallized_intelligence = approx(cognitive_curves$age, cognitive_curves$crystallized_intelligence, age, rule = 2)$y,
      processing_speed = approx(cognitive_curves$age, cognitive_curves$processing_speed, age, rule = 2)$y,
      working_memory = approx(cognitive_curves$age, cognitive_curves$working_memory, age, rule = 2)$y
    )

  # Merge demographic data with interpolated cognitive curves
  demo_cognitive <- demographics_data %>%
    left_join(cognitive_interpolated, by = "age") %>%
    filter(!is.na(fluid_intelligence))

  if (method == "composite") {
    # Composite cognitive ability index
    demo_cognitive <- demo_cognitive %>%
      mutate(
        # Normalize each cognitive measure (0-1 scale)
        fluid_norm = fluid_intelligence / max(cognitive_curves$fluid_intelligence, na.rm = TRUE),
        crystallized_norm = crystallized_intelligence / max(cognitive_curves$crystallized_intelligence, na.rm = TRUE),
        speed_norm = processing_speed / max(cognitive_curves$processing_speed, na.rm = TRUE),
        memory_norm = working_memory / max(cognitive_curves$working_memory, na.rm = TRUE),

        # Weighted composite (fluid and speed decline more with age, crystallized increases)
        # Weight fluid intelligence and processing speed more heavily for productivity
        cognitive_productivity = 0.35 * fluid_norm + 0.25 * crystallized_norm +
                               0.25 * speed_norm + 0.15 * memory_norm
      )
  } else if (method == "fluid_only") {
    # Use only fluid intelligence (most relevant for novel problem solving)
    demo_cognitive <- demo_cognitive %>%
      mutate(cognitive_productivity = fluid_intelligence / max(cognitive_curves$fluid_intelligence, na.rm = TRUE))
  } else if (method == "parametric") {
    # Use parametric age-productivity curve from your original model
    demo_cognitive <- demo_cognitive %>%
      mutate(
        cognitive_productivity = case_when(
          age <= 42 ~ 1 - 0.3 * exp(-(age - 18) / 8),  # Rising phase
          age > 42 ~ 1 - 0.015 * (age - 42)             # Declining phase
        ),
        cognitive_productivity = pmax(cognitive_productivity, 0.1)  # Floor at 0.1
      )
  }

  # Calculate EPI for each year
  epi_data <- demo_cognitive %>%
    group_by(year) %>%
    summarise(
      # Population-weighted average cognitive productivity
      epi = sum(population * cognitive_productivity, na.rm = TRUE) / sum(population, na.rm = TRUE),

      # Additional summary measures
      total_population = sum(population, na.rm = TRUE),
      avg_age = sum(population * age, na.rm = TRUE) / sum(population, na.rm = TRUE),

      # Age distribution measures
      pop_under_30 = sum(population[age < 30], na.rm = TRUE) / sum(population, na.rm = TRUE),
      pop_30_to_50 = sum(population[age >= 30 & age < 50], na.rm = TRUE) / sum(population, na.rm = TRUE),
      pop_over_50 = sum(population[age >= 50], na.rm = TRUE) / sum(population, na.rm = TRUE),

      # Cognitive ability distribution
      high_cognitive_share = sum(population[cognitive_productivity > 0.8], na.rm = TRUE) / sum(population, na.rm = TRUE),
      low_cognitive_share = sum(population[cognitive_productivity < 0.5], na.rm = TRUE) / sum(population, na.rm = TRUE),

      .groups = "drop"
    ) %>%
    mutate(
      # Normalize EPI to have mean=1 over the time series for interpretability
      epi_normalized = epi / mean(epi, na.rm = TRUE),

      # Calculate growth rates
      epi_growth = (epi - lag(epi)) / lag(epi),
      avg_age_growth = avg_age - lag(avg_age)
    )

  return(epi_data)
}

# Function to compare different EPI calculation methods
compare_epi_methods <- function(demographics_data, cognitive_curves) {

  methods <- c("composite", "fluid_only", "parametric")

  epi_comparison <- map_dfr(methods, function(method) {
    calculate_epi(demographics_data, cognitive_curves, method = method) %>%
      select(year, epi, epi_normalized) %>%
      mutate(method = method)
  })

  return(epi_comparison)
}

# Function to interpolate cognitive curves for missing ages
interpolate_cognitive_curves <- function(cognitive_curves, age_range = 18:70) {

  # Fit smooth splines to each cognitive measure
  fluid_spline <- smooth.spline(cognitive_curves$age, cognitive_curves$fluid_intelligence, df = 8)
  crystallized_spline <- smooth.spline(cognitive_curves$age, cognitive_curves$crystallized_intelligence, df = 8)
  speed_spline <- smooth.spline(cognitive_curves$age, cognitive_curves$processing_speed, df = 8)
  memory_spline <- smooth.spline(cognitive_curves$age, cognitive_curves$working_memory, df = 8)

  # Generate interpolated values
  interpolated_curves <- tibble(
    age = age_range,
    fluid_intelligence = predict(fluid_spline, age_range)$y,
    crystallized_intelligence = predict(crystallized_spline, age_range)$y,
    processing_speed = predict(speed_spline, age_range)$y,
    working_memory = predict(memory_spline, age_range)$y
  ) %>%
    # Ensure no negative values
    mutate(across(c(fluid_intelligence, crystallized_intelligence, processing_speed, working_memory),
                  ~pmax(.x, 0)))

  return(interpolated_curves)
}

# Function to create EPI scenarios for forecasting
create_epi_scenarios <- function(base_epi, forecast_years = 2024:2050) {

  # Extract recent trend
  recent_years <- tail(base_epi, 10)
  avg_epi_change <- mean(diff(recent_years$epi_normalized), na.rm = TRUE)
  avg_age_change <- mean(diff(recent_years$avg_age), na.rm = TRUE)

  # Create scenario projections
  scenarios <- expand_grid(
    year = forecast_years,
    scenario = c("current_trends", "accelerated_aging", "tech_enhancement", "demographic_transition")
  ) %>%
    mutate(
      years_ahead = year - max(base_epi$year, na.rm = TRUE),

      # Project average age based on scenario
      avg_age = case_when(
        scenario == "current_trends" ~ max(base_epi$avg_age, na.rm = TRUE) + years_ahead * avg_age_change,
        scenario == "accelerated_aging" ~ max(base_epi$avg_age, na.rm = TRUE) + years_ahead * avg_age_change * 1.5,
        scenario == "tech_enhancement" ~ max(base_epi$avg_age, na.rm = TRUE) + years_ahead * avg_age_change * 0.8,
        scenario == "demographic_transition" ~ max(base_epi$avg_age, na.rm = TRUE) + years_ahead * avg_age_change * 1.2
      ),

      # Project EPI based on scenario assumptions
      epi_normalized = case_when(
        scenario == "current_trends" ~
          max(base_epi$epi_normalized, na.rm = TRUE) + years_ahead * avg_epi_change,
        scenario == "accelerated_aging" ~
          max(base_epi$epi_normalized, na.rm = TRUE) + years_ahead * avg_epi_change * 1.8, # Faster decline
        scenario == "tech_enhancement" ~
          max(base_epi$epi_normalized, na.rm = TRUE) + years_ahead * (avg_epi_change * 0.3 + 0.005), # Technology boost
        scenario == "demographic_transition" ~
          max(base_epi$epi_normalized, na.rm = TRUE) + years_ahead * avg_epi_change * 1.3 # Moderate aging
      ),

      # Ensure EPI stays within reasonable bounds
      epi_normalized = pmax(0.7, pmin(1.3, epi_normalized)),

      # Create readable labels
      scenario_label = case_when(
        scenario == "current_trends" ~ "Current Trends",
        scenario == "accelerated_aging" ~ "Accelerated Aging",
        scenario == "tech_enhancement" ~ "Technology Enhancement",
        scenario == "demographic_transition" ~ "Demographic Transition"
      )
    )

  return(scenarios)
}

# Function to validate EPI calculation
validate_epi <- function(epi_data, productivity_data) {

  # Merge EPI with productivity data
  validation_data <- epi_data %>%
    inner_join(productivity_data, by = "year") %>%
    mutate(
      log_productivity = log(productivity_per_hour),
      epi_lag1 = lag(epi_normalized),
      productivity_growth = (productivity_per_hour - lag(productivity_per_hour)) / lag(productivity_per_hour)
    )

  # Calculate correlations
  correlations <- validation_data %>%
    summarise(
      epi_productivity_corr = cor(epi_normalized, log_productivity, use = "complete.obs"),
      epi_lag_productivity_corr = cor(epi_lag1, log_productivity, use = "complete.obs"),
      epi_growth_productivity_growth_corr = cor(epi_growth, productivity_growth, use = "complete.obs"),

      # Additional validation metrics
      avg_age_productivity_corr = cor(avg_age, log_productivity, use = "complete.obs"),
      high_cognitive_productivity_corr = cor(high_cognitive_share, log_productivity, use = "complete.obs")
    )

  # Simple regression for preliminary validation
  epi_model <- lm(log_productivity ~ epi_normalized + I(epi_normalized^2), data = validation_data)
  age_model <- lm(log_productivity ~ avg_age + I(avg_age^2), data = validation_data)

  # Model comparison
  epi_r2 <- summary(epi_model)$r.squared
  age_r2 <- summary(age_model)$r.squared

  validation_results <- list(
    correlations = correlations,
    epi_model = epi_model,
    age_model = age_model,
    epi_r2 = epi_r2,
    age_r2 = age_r2,
    improvement = epi_r2 - age_r2,
    data = validation_data
  )

  return(validation_results)
}

# Function to create EPI visualization data
create_epi_plots <- function(epi_data, comparison_data = NULL) {

  plots_list <- list()

  # 1. EPI time series
  plots_list$epi_timeseries <- ggplot(epi_data, aes(x = year, y = epi_normalized)) +
    geom_line(size = 1.2, color = "steelblue") +
    geom_point(size = 2, color = "steelblue") +
    geom_smooth(method = "loess", se = TRUE, alpha = 0.3, color = "red") +
    labs(
      title = "Effective Productivity Index Over Time",
      subtitle = "Population-weighted cognitive ability index (normalized to mean = 1)",
      x = "Year",
      y = "EPI (Normalized)",
      caption = "Higher values indicate more cognitively capable workforce"
    ) +
    theme_minimal() +
    theme(plot.title = element_text(size = 14, face = "bold"))

  # 2. EPI vs Average Age
  plots_list$epi_vs_age <- ggplot(epi_data, aes(x = avg_age, y = epi_normalized)) +
    geom_point(aes(color = year), size = 2.5) +
    geom_smooth(method = "lm", se = TRUE, alpha = 0.3) +
    scale_color_viridis_c(name = "Year") +
    labs(
      title = "EPI vs Population Average Age",
      subtitle = "Relationship between workforce aging and cognitive productivity",
      x = "Average Age",
      y = "EPI (Normalized)"
    ) +
    theme_minimal()

  # 3. Method comparison (if provided)
  if (!is.null(comparison_data)) {
    plots_list$method_comparison <- ggplot(comparison_data, aes(x = year, y = epi_normalized, color = method)) +
      geom_line(size = 1) +
      geom_point(size = 1.5) +
      scale_color_brewer(type = "qual", palette = "Set1", name = "EPI Method") +
      labs(
        title = "Comparison of EPI Calculation Methods",
        subtitle = "Different approaches to weighting cognitive abilities",
        x = "Year",
        y = "EPI (Normalized)"
      ) +
      theme_minimal() +
      theme(legend.position = "bottom")
  }

  # 4. Age distribution evolution
  age_dist_data <- epi_data %>%
    select(year, pop_under_30, pop_30_to_50, pop_over_50) %>%
    pivot_longer(cols = starts_with("pop_"), names_to = "age_group", values_to = "share") %>%
    mutate(
      age_group = case_when(
        age_group == "pop_under_30" ~ "Under 30",
        age_group == "pop_30_to_50" ~ "30-50",
        age_group == "pop_over_50" ~ "Over 50"
      ),
      age_group = factor(age_group, levels = c("Under 30", "30-50", "Over 50"))
    )

  plots_list$age_distribution <- ggplot(age_dist_data, aes(x = year, y = share, fill = age_group)) +
    geom_area(alpha = 0.7) +
    scale_fill_viridis_d(name = "Age Group") +
    labs(
      title = "Evolution of Age Distribution",
      subtitle = "Population shares by age group over time",
      x = "Year",
      y = "Population Share"
    ) +
    theme_minimal() +
    theme(legend.position = "bottom")

  return(plots_list)
}