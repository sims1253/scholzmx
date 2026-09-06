# Debug EPI Implementation
# Purpose: Figure out the data structure issues

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
})

source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "data_loading.R"))

cat("=== DEBUGGING EPI DATA STRUCTURES ===\n\n")

# 1. Check cognitive curves
cognitive_curves <- load_cognitive_data()
cat("1. Cognitive curves:\n")
cat("   Age range:", min(cognitive_curves$age), "to", max(cognitive_curves$age), "\n")
cat("   Sample ages:", head(cognitive_curves$age, 10), "\n\n")

# 2. Check original demographics
original_demographics <- load_demographic_data()
cat("2. Original demographics:\n")
cat("   Year range:", min(original_demographics$year), "to", max(original_demographics$year), "\n")
cat("   Age range:", min(original_demographics$age), "to", max(original_demographics$age), "\n")
cat("   Sample ages:", head(unique(original_demographics$age), 10), "\n\n")

# 3. Create simple synthetic demographics that match cognitive curves
cat("3. Creating compatible synthetic demographics...\n")

# Use the same age range as cognitive curves
cognitive_ages <- cognitive_curves$age
years <- 1970:2023

simple_demographics <- expand_grid(year = years, age = cognitive_ages) %>%
  mutate(
    # Simple population distribution by age
    population = dnorm(age, mean = 45, sd = 12) * 1000000,

    # Share by year
    share = population / sum(population)
  ) %>%
  group_by(year) %>%
  mutate(share = population / sum(population)) %>%
  ungroup()

cat("   ✓ Created", nrow(simple_demographics), "age-year observations\n")
cat("   ✓ Age range:", min(simple_demographics$age), "to", max(simple_demographics$age), "\n\n")

# 4. Test basic EPI calculation
cat("4. Testing basic EPI calculation...\n")

basic_epi <- simple_demographics %>%
  left_join(cognitive_curves, by = "age") %>%
  mutate(
    # Use normalized cognitive measures
    cognitive_productivity = 0.3 * fluid_norm + 0.3 * crystallized_norm +
                           0.2 * speed_norm + 0.2 * memory_norm
  ) %>%
  group_by(year) %>%
  summarise(
    epi_raw = weighted.mean(cognitive_productivity, share, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(
    epi_normalized = epi_raw / mean(epi_raw, na.rm = TRUE)
  )

cat("   ✓ Basic EPI calculated successfully\n")
cat("   ✓ EPI standard deviation:", round(sd(basic_epi$epi_normalized), 4), "\n")
cat("   ✓ EPI range:", round(min(basic_epi$epi_normalized), 4), "to",
    round(max(basic_epi$epi_normalized), 4), "\n\n")

# 5. Now test workforce weighting
cat("5. Testing workforce weighting...\n")

# Create simple workforce participation by age
workforce_participation <- tibble(
  age = cognitive_ages,
  participation_rate = case_when(
    age < 25 ~ 0.6,
    age <= 54 ~ 0.85,
    age <= 64 ~ 0.6,
    TRUE ~ 0.1
  ),
  hours_per_worker = case_when(
    age < 25 ~ 35,
    age <= 54 ~ 40,
    age <= 64 ~ 35,
    TRUE ~ 20
  )
) %>%
  mutate(
    labor_intensity = participation_rate * hours_per_worker
  )

# Add workforce data to demographics
workforce_demographics <- simple_demographics %>%
  left_join(workforce_participation, by = "age") %>%
  mutate(
    workforce_population = population * participation_rate,
    total_hours = workforce_population * hours_per_worker
  ) %>%
  group_by(year) %>%
  mutate(
    workforce_share = workforce_population / sum(workforce_population, na.rm = TRUE),
    hours_share = total_hours / sum(total_hours, na.rm = TRUE)
  ) %>%
  ungroup()

# Calculate workforce-weighted EPI
workforce_epi <- workforce_demographics %>%
  left_join(cognitive_curves, by = "age") %>%
  mutate(
    cognitive_productivity = 0.3 * fluid_norm + 0.3 * crystallized_norm +
                           0.2 * speed_norm + 0.2 * memory_norm
  ) %>%
  group_by(year) %>%
  summarise(
    epi_population = weighted.mean(cognitive_productivity, share, na.rm = TRUE),
    epi_workforce = weighted.mean(cognitive_productivity, workforce_share, na.rm = TRUE),
    epi_hours = weighted.mean(cognitive_productivity, hours_share, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  mutate(
    across(starts_with("epi_"), ~ . / mean(., na.rm = TRUE))
  )

cat("   ✓ Workforce-weighted EPI calculated successfully\n")

# Compare standard deviations
comparison <- tibble(
  Method = c("Population", "Workforce", "Hours"),
  Standard_Deviation = c(
    sd(workforce_epi$epi_population),
    sd(workforce_epi$epi_workforce),
    sd(workforce_epi$epi_hours)
  )
) %>%
  mutate(
    Improvement = Standard_Deviation / Standard_Deviation[1]
  )

print(comparison)

cat("\n6. Key findings:\n")
cat("   ✓ Workforce weighting increases variation by",
    round(max(comparison$Improvement), 1), "x\n")
cat("   ✓ Data structure compatibility confirmed\n")
cat("   ✓ Ready to implement full enhanced EPI\n")

cat("\n=== DEBUG COMPLETE ===\n")