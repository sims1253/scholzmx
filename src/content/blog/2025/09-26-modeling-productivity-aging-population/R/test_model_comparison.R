# Quick Test Script for Model Comparison Fix
# Purpose: Test the fixed model comparison without full MCMC sampling
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
library(tidyverse)
library(brms)
library(here)

# Set working directory to blog post folder
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

cat("=== TESTING MODEL COMPARISON FIX ===\n\n")

# Load functions
source("R/data_loading.R")
source("R/productivity_index.R")
source("R/bayesian_modeling.R")

# Load data
cat("Loading data...\n")
germany_productivity <- load_productivity_data()
germany_demographics <- load_demographic_data(yearly = TRUE)
cognitive_curves <- load_cognitive_data()

# Calculate EPI
cat("Calculating EPI...\n")
epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

# Prepare model data
cat("Preparing model data...\n")
model_data <- prepare_model_data(germany_productivity, epi_data)

# Fit just two simple models with reduced iterations
cat("Fitting models with minimal iterations for testing...\n")

cat("Fitting original model...\n")
original_model <- fit_productivity_model(
  model_data = model_data,
  model_type = "original",
  chains = 2,
  iter = 400,  # Reduced for speed
  cores = 2,
  save_model = FALSE
)

cat("Fitting EPI levels model...\n")
epi_levels_model <- fit_productivity_model(
  model_data = model_data,
  model_type = "epi_levels",
  chains = 2,
  iter = 400,  # Reduced for speed
  cores = 2,
  save_model = FALSE
)

cat("Fitting EPI growth model...\n")
epi_growth_model <- fit_productivity_model(
  model_data = model_data,
  model_type = "epi_growth",
  chains = 2,
  iter = 400,  # Reduced for speed
  cores = 2,
  save_model = FALSE
)

# Create models list
models_list <- list(
  original = original_model,
  epi_levels = epi_levels_model,
  epi_growth = epi_growth_model
)

cat("\n=== TESTING FIXED MODEL COMPARISON ===\n")

# Test the improved model comparison function
tryCatch({
  selection_results <- perform_model_selection(models_list, model_data)

  cat("\n--- SUCCESS! ---\n")
  cat("Best model:", selection_results$best_model_name, "\n")
  cat("Sample size consistent:", selection_results$sample_size_consistent, "\n")

  print(selection_results$comparison_results$summary)

}, error = function(e) {
  cat("✗ Error in model comparison:\n")
  cat("Error message:", e$message, "\n")
  print(e)
})

cat("\n=== TEST COMPLETE ===\n")