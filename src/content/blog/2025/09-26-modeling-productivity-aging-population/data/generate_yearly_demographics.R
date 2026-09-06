# Script to Generate Yearly Interpolated German Demographics Data
# Expands 6 decennial observations to 53 yearly observations (1971-2023)

library(tidyverse)
library(here)

# Read original demographics data
original_data <- read_csv(
  here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population",
       "data", "germany_demographics.csv"),
  comment = "#",
  show_col_types = FALSE
)

# Function to interpolate between two years
interpolate_demographics <- function(data, target_years) {
  available_years <- unique(data$year)
  available_years <- available_years[order(available_years)]

  # Limit target years to available range
  min_year <- min(available_years)
  max_year <- max(available_years)
  target_years <- target_years[target_years >= min_year & target_years <= max_year]

  result <- tibble()

  for (target_year in target_years) {
    if (target_year %in% available_years) {
      # Use exact data if available
      year_data <- data %>% filter(year == target_year)
    } else {
      # Find bounding years for interpolation
      lower_candidates <- available_years[available_years < target_year]
      upper_candidates <- available_years[available_years > target_year]

      if (length(lower_candidates) == 0 || length(upper_candidates) == 0) {
        # Can't interpolate, skip this year
        next
      }

      lower_year <- max(lower_candidates)
      upper_year <- min(upper_candidates)

      # Calculate interpolation weight
      weight <- (target_year - lower_year) / (upper_year - lower_year)

      # Get data for bounding years
      lower_data <- data %>% filter(year == lower_year)
      upper_data <- data %>% filter(year == upper_year)

      # Interpolate each variable
      year_data <- lower_data %>%
        mutate(
          year = target_year,
          population = population * (1 - weight) + upper_data$population * weight,
          total_pop = total_pop * (1 - weight) + upper_data$total_pop * weight,
          weighted_avg_age = weighted_avg_age * (1 - weight) + upper_data$weighted_avg_age * weight,
          pop_over_50 = pop_over_50 * (1 - weight) + upper_data$pop_over_50 * weight
        ) %>%
        # Recalculate proportion after interpolation
        mutate(proportion = population / total_pop)
    }

    result <- bind_rows(result, year_data)
  }

  return(result)
}

# Generate yearly data from 1970 to 2020 (available range)
target_years_base <- 1970:2020
yearly_demographics <- interpolate_demographics(original_data, target_years_base)

# Extend to match productivity data coverage (1971-2023)
# Add projections for 2021-2023 based on trends
trend_years <- 2021:2023
base_year <- 2020
base_data <- yearly_demographics %>% filter(year == base_year)

# Calculate trends from 2010-2020
trend_data_2010 <- yearly_demographics %>% filter(year == 2010)
trend_data_2020 <- yearly_demographics %>% filter(year == 2020)

# Annual change rates
pop_change_rate <- ((trend_data_2020$total_pop[1] / trend_data_2010$total_pop[1])^(1/10)) - 1
age_change_rate <- (trend_data_2020$weighted_avg_age[1] - trend_data_2010$weighted_avg_age[1]) / 10

for (proj_year in trend_years) {
  years_ahead <- proj_year - base_year

  proj_data <- base_data %>%
    mutate(
      year = proj_year,
      total_pop = total_pop * (1 + pop_change_rate)^years_ahead,
      weighted_avg_age = weighted_avg_age + age_change_rate * years_ahead,
      # Age distribution shifts - older cohorts grow faster
      population = case_when(
        age >= 55 ~ population * 1.02^years_ahead,  # Aging population growth
        age >= 35 ~ population * 1.005^years_ahead, # Middle age stable
        TRUE ~ population * 0.995^years_ahead       # Young cohorts shrink slightly
      )
    ) %>%
    # Recalculate derived variables
    mutate(
      total_pop = sum(population),  # Recalculate total from age groups
      proportion = population / total_pop,
      pop_over_50 = sum(population[age >= 50])
    )

  yearly_demographics <- bind_rows(yearly_demographics, proj_data)
}

# Filter to match productivity data range (1971-2023)
yearly_demographics <- yearly_demographics %>%
  filter(year >= 1971 & year <= 2023)

# Clean and validate the interpolated data
yearly_demographics <- yearly_demographics %>%
  arrange(year, age) %>%
  # Ensure proportions sum to reasonable values per year
  group_by(year) %>%
  mutate(
    # Normalize proportions to sum to approximately 1
    proportion = population / sum(population),
    total_pop = sum(population),
    pop_over_50 = sum(population[age >= 50])
  ) %>%
  ungroup() %>%
  # Round to reasonable precision
  mutate(
    population = round(population, 0),
    total_pop = round(total_pop, 0),
    weighted_avg_age = round(weighted_avg_age, 2),
    pop_over_50 = round(pop_over_50, 0),
    proportion = round(proportion, 6)
  )

# Validate the results
cat("Generated yearly demographics data:\n")
cat("Years:", min(yearly_demographics$year), "to", max(yearly_demographics$year), "\n")
cat("Total observations:", nrow(yearly_demographics), "\n")
cat("Age groups per year:", length(unique(yearly_demographics$age)), "\n")

# Check data quality
yearly_summary <- yearly_demographics %>%
  group_by(year) %>%
  summarise(
    total_pop = first(total_pop),
    weighted_avg_age = first(weighted_avg_age),
    prop_sum = sum(proportion),
    .groups = "drop"
  )

cat("Proportion sums (should be ~1.0):", range(yearly_summary$prop_sum), "\n")
cat("Population range:", range(yearly_summary$total_pop), "\n")
cat("Age range:", range(yearly_summary$weighted_avg_age), "\n")

# Write the enhanced dataset
output_path <- here("src", "content", "blog", "2025",
                   "09-26-modeling-productivity-aging-population",
                   "data", "germany_demographics_yearly.csv")

# Create header with metadata
header <- c(
  "# German Demographics Data by Age Groups - Yearly Interpolated Dataset",
  "# Source: German Federal Statistical Office (Destatis), OECD Demographics Database",
  "# Coverage: 1971-2023, Germany (includes East Germany from 1990)",
  "# Method: Linear interpolation between decennial observations + trend extrapolation",
  "# Units: Population in thousands, ages in years",
  "# Original data points: 1970, 1980, 1990, 2000, 2010, 2020",
  "# Interpolated to yearly observations to match productivity data coverage"
)

# Write header and data
writeLines(header, output_path)
write.table(yearly_demographics, output_path,
           append = TRUE, sep = ",",
           row.names = FALSE, quote = FALSE)

cat("Yearly demographics data written to:", output_path, "\n")
cat("Ready for enhanced Bayesian modeling with", nrow(yearly_demographics) / length(unique(yearly_demographics$age)), "yearly observations!\n")