# Quick Test for Parameter Extraction Fix
# Purpose: Test that parameter extraction works for the best model
# Author: Generated for scholzmx blog

# Clear environment and load libraries
rm(list = ls())
library(tidyverse)
library(brms)
library(tidybayes)
library(here)

# Set working directory
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

cat("=== TESTING PARAMETER EXTRACTION FIX ===\n\n")

# Load functions
source("R/bayesian_modeling.R")

# Test with existing best model
best_model_path <- "models/productivity_model_epi_levels.rds"

if (file.exists(best_model_path)) {
  cat("Loading EPI levels model for parameter extraction test...\n")

  best_model <- readRDS(best_model_path)

  cat("Testing parameter extraction...\n")
  tryCatch({
    parameter_results <- extract_parameter_estimates(best_model, "epi_levels")

    cat("✅ SUCCESS! Parameter extraction working!\n")
    cat("Extracted", nrow(parameter_results$summary), "parameters\n")

    # Show parameter summary
    print(parameter_results$summary)

  }, error = function(e) {
    cat("❌ Parameter extraction failed:\n")
    cat("Error:", e$message, "\n")
    print(e)
  })

} else {
  cat("Best model file not found at:", best_model_path, "\n")
}

cat("\n=== TEST COMPLETE ===\n")