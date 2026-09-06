# Test Script for Fixed Model Comparison
# Purpose: Test the complete 3-model comparison with consistent sample sizes
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
library(tidyverse)
library(brms)
library(here)

# Set working directory to blog post folder
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

cat("=== TESTING FIXED 3-MODEL COMPARISON ===\n\n")

# Load functions
source("R/data_loading.R")
source("R/productivity_index.R")
source("R/bayesian_modeling.R")

# Load data
cat("Step 1: Loading data...\n")
germany_productivity <- load_productivity_data()
germany_demographics <- load_demographic_data(yearly = TRUE)
cognitive_curves <- load_cognitive_data()

# Calculate EPI
cat("Step 2: Calculating EPI...\n")
epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

# Prepare model data with CONSISTENT SAMPLE SIZE
cat("Step 3: Preparing model data with consistent sample size...\n")
model_data <- prepare_model_data(
  germany_productivity,
  epi_data,
  stationarity_results = NULL,
  ensure_consistent_sample = TRUE
)

cat("\nData consistency check:\n")
cat("- Total observations:", nrow(model_data), "\n")
cat("- Missing log_productivity:", sum(is.na(model_data$log_productivity)), "\n")
cat("- Missing productivity_growth:", sum(is.na(model_data$productivity_growth)), "\n")
cat("- Missing epi_growth:", sum(is.na(model_data$epi_growth)), "\n")

# Test data setup
if (sum(is.na(model_data$log_productivity)) > 0 ||
    sum(is.na(model_data$productivity_growth)) > 0 ||
    sum(is.na(model_data$epi_growth)) > 0) {
  stop("Data still has NAs - sample size consistency failed!")
}

cat("✓ All key variables have complete data\n\n")

# Test if we can run the model comparison
cat("Step 4: Testing model comparison with minimal sampling...\n")

# Create a simple test with existing models if available
models_dir <- "models"
if (dir.exists(models_dir)) {
  cat("Looking for existing models...\n")

  original_model_path <- file.path(models_dir, "productivity_model_original.rds")
  epi_levels_model_path <- file.path(models_dir, "productivity_model_epi_levels.rds")
  epi_growth_model_path <- file.path(models_dir, "productivity_model_epi_growth.rds")

  if (file.exists(original_model_path) &&
      file.exists(epi_levels_model_path) &&
      file.exists(epi_growth_model_path)) {

    cat("Loading existing models for comparison test...\n")

    models_list <- list(
      original = readRDS(original_model_path),
      epi_levels = readRDS(epi_levels_model_path),
      epi_growth = readRDS(epi_growth_model_path)
    )

    cat("Testing comparison function...\n")
    tryCatch({
      selection_results <- perform_model_selection(models_list, model_data)

      cat("\n🎉 SUCCESS! Fixed model comparison working!\n")
      cat("Best model:", selection_results$best_model_name, "\n")
      cat("Sample size consistent:", selection_results$sample_size_consistent, "\n")

      print(selection_results$comparison_results$summary)

    }, error = function(e) {
      cat("❌ Model comparison still failing:\n")
      cat("Error:", e$message, "\n")
      print(e)
    })

  } else {
    cat("Some model files missing - will need to fit new models\n")
  }
} else {
  cat("Models directory doesn't exist - will need to fit new models\n")
}

cat("\n=== TEST COMPLETE ===\n")