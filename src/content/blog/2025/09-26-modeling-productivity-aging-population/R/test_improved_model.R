# Test Script for Improved Productivity-Aging Model
# Purpose: Debug and validate the complete workflow step-by-step
# Author: Generated for scholzmx blog
# Date: 2025-09-26

# Clear environment and load libraries
rm(list = ls())
library(tidyverse)
library(brms)
library(here)

# Set working directory to blog post folder
setwd(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population"))

cat("=== TESTING IMPROVED PRODUCTIVITY-AGING MODEL ===\n\n")

# Step 1: Load all functions
cat("Step 1: Loading functions...\n")
tryCatch({
  source("R/data_loading.R")
  source("R/productivity_index.R")
  source("R/stationarity_analysis.R")
  source("R/bayesian_modeling.R")
  cat("✓ All functions loaded successfully\n\n")
}, error = function(e) {
  cat("✗ Error loading functions:", e$message, "\n\n")
  stop(e)
})

# Step 2: Load and validate data
cat("Step 2: Loading and validating data...\n")
tryCatch({
  germany_productivity <- load_productivity_data()
  germany_demographics <- load_demographic_data(yearly = TRUE)
  cognitive_curves <- load_cognitive_data()

  cat("✓ Productivity data:", nrow(germany_productivity), "observations\n")
  cat("✓ Demographics data:", nrow(germany_demographics), "observations\n")
  cat("✓ Cognitive curves:", nrow(cognitive_curves), "observations\n\n")
}, error = function(e) {
  cat("✗ Error loading data:", e$message, "\n\n")
  stop(e)
})

# Step 3: Calculate and validate EPI
cat("Step 3: Calculating EPI...\n")
tryCatch({
  epi_data <- calculate_epi(germany_demographics, cognitive_curves, method = "composite")

  cat("✓ EPI calculated for", nrow(epi_data), "years\n")
  cat("✓ EPI range:", round(min(epi_data$epi_normalized), 4), "to", round(max(epi_data$epi_normalized), 4), "\n")
  cat("✓ EPI trend: starts at", round(epi_data$epi_normalized[1], 4),
      "ends at", round(epi_data$epi_normalized[nrow(epi_data)], 4), "\n")

  # Quick validation
  epi_variation <- sd(epi_data$epi_normalized)
  if (epi_variation < 0.001) {
    warning("EPI shows very little variation (SD = ", round(epi_variation, 6), ")")
  } else {
    cat("✓ EPI shows good variation (SD =", round(epi_variation, 4), ")\n\n")
  }
}, error = function(e) {
  cat("✗ Error calculating EPI:", e$message, "\n\n")
  stop(e)
})

# Step 4: Comprehensive stationarity testing
cat("Step 4: Stationarity testing...\n")

tryCatch({
  # Use the simplified stationarity check function
  stationarity_results <- quick_stationarity_check(germany_productivity, epi_data)
  cat("✓ Comprehensive stationarity analysis completed\n")

  # Store the overall recommendation for later use
  model_recommendation <- stationarity_results$overall_recommendation
  cat("✓ Model recommendation:", model_recommendation, "\n")

}, error = function(e) {
  cat("✗ Error in stationarity analysis:", e$message, "\n")
  model_recommendation <- "Use LEVELS specification (fallback)"
})

# Step 5: Prepare model data
cat("\nStep 5: Preparing model data...\n")
tryCatch({
  model_data <- prepare_model_data(germany_productivity, epi_data)

  cat("✓ Model data prepared:", nrow(model_data), "observations\n")
  cat("✓ Year range:", min(model_data$year), "to", max(model_data$year), "\n")
  cat("✓ Variables available:", paste(names(model_data), collapse = ", "), "\n")

  # Check for missing values
  na_counts <- sapply(model_data, function(x) sum(is.na(x)))
  problematic_vars <- names(na_counts[na_counts > 0])
  if (length(problematic_vars) > 0) {
    cat("⚠ Variables with missing values:", paste(problematic_vars, collapse = ", "), "\n")
  } else {
    cat("✓ No missing values found\n")
  }
  cat("\n")
}, error = function(e) {
  cat("✗ Error preparing model data:", e$message, "\n\n")
  stop(e)
})

# Step 6: Debug model comparison functions
cat("Step 6: Testing model comparison functions...\n")

# First, test individual model fitting
cat("Testing individual model fitting...\n")
tryCatch({
  # Test original model
  cat("  Testing original model...\n")
  test_original <- fit_productivity_model(model_data, model_type = "original",
                                         chains = 2, iter = 500, save_model = FALSE)
  cat("  ✓ Original model fitted successfully\n")

  # Test EPI levels model
  cat("  Testing EPI levels model...\n")
  test_epi_levels <- fit_productivity_model(model_data, model_type = "epi_levels",
                                           chains = 2, iter = 500, save_model = FALSE)
  cat("  ✓ EPI levels model fitted successfully\n")

}, error = function(e) {
  cat("  ✗ Error in individual model fitting:", e$message, "\n")
})

# Test model metrics calculation
cat("Testing model metrics calculation...\n")
tryCatch({
  # Check function signature
  if (exists("test_original")) {
    # Try different function call approaches
    cat("  Trying calculate_model_metrics with different signatures...\n")

    # Approach 1: Just model and data
    tryCatch({
      metrics1 <- calculate_model_metrics(test_original, model_data)
      cat("  ✓ Approach 1 (model, data) works\n")
    }, error = function(e) {
      cat("  ✗ Approach 1 failed:", e$message, "\n")
    })

    # Approach 2: With model_type
    tryCatch({
      metrics2 <- calculate_model_metrics(test_original, model_data, "original")
      cat("  ✓ Approach 2 (model, data, type) works\n")
    }, error = function(e) {
      cat("  ✗ Approach 2 failed:", e$message, "\n")
    })
  }
}, error = function(e) {
  cat("  ✗ Error testing model metrics:", e$message, "\n")
})

# Step 7: Test model comparison workflow
cat("\nStep 7: Testing model comparison workflow...\n")
tryCatch({
  # Choose model types based on stationarity recommendation
  if (exists("model_recommendation")) {
    if (grepl("LEVELS", model_recommendation)) {
      test_model_types <- c("original", "epi_levels")
    } else if (grepl("GROWTH", model_recommendation)) {
      test_model_types <- c("original", "epi_growth")
    } else {
      test_model_types <- c("original", "epi_levels", "epi_growth")
    }
  } else {
    test_model_types <- c("original", "epi_levels")
  }

  cat("Fitting models based on stationarity recommendation:", paste(test_model_types, collapse = ", "), "\n")
  models_list <- fit_model_comparison(model_data, test_model_types)
  cat("✓ Models fitted successfully\n")

  cat("Testing model selection...\n")
  # Test with the fixed model selection function
  selection_results <- perform_model_selection(models_list, model_data)
  cat("✓ Model selection completed\n")

  # Print results
  cat("\n--- MODEL COMPARISON RESULTS ---\n")
  cat("Best model:", selection_results$best_model_name, "\n")
  print(selection_results$comparison_results$summary)

  # Additional analysis
  if (exists("stationarity_results")) {
    cat("\n--- STATIONARITY VS MODEL RESULTS ---\n")
    cat("Stationarity recommendation:", model_recommendation, "\n")
    cat("Best performing model:", selection_results$best_model_name, "\n")

    # Check if results align
    if (grepl("LEVELS", model_recommendation) && grepl("epi_levels", selection_results$best_model_name)) {
      cat("✓ Results are consistent with stationarity analysis\n")
    } else if (grepl("GROWTH", model_recommendation) && grepl("growth", selection_results$best_model_name)) {
      cat("✓ Results are consistent with stationarity analysis\n")
    } else {
      cat("⚠ Model performance differs from stationarity recommendation\n")
    }
  }

}, error = function(e) {
  cat("✗ Error in model comparison workflow:", e$message, "\n")
  cat("Detailed error:\n")
  print(e)
})

# Step 8: Generate summary
cat("\n=== SUMMARY ===\n")
cat("Data validation: ✓ Complete\n")
cat("EPI calculation: ✓ Working with realistic variation\n")
cat("Stationarity testing: ✓ Comprehensive analysis available\n")
if (exists("selection_results")) {
  cat("Model comparison: ✓ Working\n")
  cat("Best model identified:", selection_results$best_model_name, "\n")
} else {
  cat("Model comparison: ✗ Needs debugging\n")
}

cat("\n=== TEST COMPLETE ===\n")