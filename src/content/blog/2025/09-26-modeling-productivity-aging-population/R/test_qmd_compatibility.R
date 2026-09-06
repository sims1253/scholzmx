# Test Script for Quarto Document Compatibility
# Purpose: Check if key functions exist and can be called
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
library(tidyverse)
library(brms)
library(here)

# Set working directory
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

cat("=== TESTING QUARTO DOCUMENT COMPATIBILITY ===\n\n")

# Test all source files
cat("Step 1: Testing source files...\n")
source_files <- c(
  "R/data_loading.R",
  "R/visualization_helpers.R",
  "R/bayesian_modeling.R",
  "R/productivity_index.R",
  "R/stationarity_analysis.R",
  "R/model_validation.R"
)

for (file in source_files) {
  tryCatch({
    source(file)
    cat("✓", basename(file), "\n")
  }, error = function(e) {
    cat("✗", basename(file), "- Error:", e$message, "\n")
  })
}

# Test data loading
cat("\nStep 2: Testing data loading...\n")
tryCatch({
  germany_productivity <- load_productivity_data()
  germany_demographics <- load_demographic_data()
  cognitive_curves <- load_cognitive_data()
  cat("✓ All data loaded successfully\n")
}, error = function(e) {
  cat("✗ Data loading failed:", e$message, "\n")
})

# Test key visualization functions
cat("\nStep 3: Testing visualization functions...\n")
viz_functions <- list(
  create_epi_plots = c("epi_data", "epi_comparison"),
  create_stationarity_plots = c("germany_productivity", "productivity_per_hour"),
  create_age_competency_plot = c("cognitive_curves"),
  create_tech_progress_plot = c(),
  create_demographic_plot = c("germany_demographics")
)

for (func_name in names(viz_functions)) {
  if (exists(func_name)) {
    cat("✓", func_name, "exists\n")
  } else {
    cat("✗", func_name, "missing\n")
  }
}

# Test model functions
cat("\nStep 4: Testing model functions...\n")
model_functions <- c(
  "calculate_epi",
  "prepare_model_data",
  "fit_productivity_model",
  "perform_model_selection",
  "extract_parameter_estimates",
  "create_scenario_projections"
)

for (func_name in model_functions) {
  if (exists(func_name)) {
    cat("✓", func_name, "exists\n")
  } else {
    cat("✗", func_name, "missing\n")
  }
}

cat("\n=== COMPATIBILITY TEST COMPLETE ===\n")
cat("If all functions show ✓, the Quarto document should render\n")