# Test Setup Script for Productivity Modeling Blog Post
# Author: Generated for scholzmx blog
# Date: 2025-09-26

# This script tests all components to ensure they work together

library(here)
library(tidyverse)

# Set working directory to blog post
blog_dir <- here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population")
setwd(blog_dir)

cat("=== TESTING PRODUCTIVITY MODELING BLOG POST SETUP ===\n\n")

# Test 1: Load all required libraries
cat("1. Testing library imports...\n")
required_packages <- c("tidyverse", "here", "plotly", "DT", "brms", "tidybayes", "readr", "lubridate")

for (pkg in required_packages) {
  tryCatch({
    library(pkg, character.only = TRUE)
    cat("  ✓", pkg, "loaded successfully\n")
  }, error = function(e) {
    cat("  ✗", pkg, "failed to load:", e$message, "\n")
  })
}

# Test 2: Load data functions
cat("\n2. Testing data loading functions...\n")
tryCatch({
  source("R/data_loading.R")
  cat("  ✓ data_loading.R sourced successfully\n")
}, error = function(e) {
  cat("  ✗ Error loading data_loading.R:", e$message, "\n")
})

# Test 3: Validate data integrity
cat("\n3. Validating data files...\n")
tryCatch({
  validate_data()
  cat("  ✓ Data validation completed\n")
}, error = function(e) {
  cat("  ✗ Data validation failed:", e$message, "\n")
})

# Test 4: Load datasets
cat("\n4. Testing dataset loading...\n")
tryCatch({
  productivity_data <- load_productivity_data()
  demographic_data <- load_demographic_data()
  cognitive_data <- load_cognitive_data()

  cat("  ✓ Productivity data:", nrow(productivity_data), "rows\n")
  cat("  ✓ Demographic data:", nrow(demographic_data), "rows\n")
  cat("  ✓ Cognitive data:", nrow(cognitive_data), "rows\n")
}, error = function(e) {
  cat("  ✗ Error loading datasets:", e$message, "\n")
})

# Test 5: Load visualization functions
cat("\n5. Testing visualization functions...\n")
tryCatch({
  source("R/visualization_helpers.R")
  cat("  ✓ visualization_helpers.R sourced successfully\n")
}, error = function(e) {
  cat("  ✗ Error loading visualization_helpers.R:", e$message, "\n")
})

# Test 6: Test visualization creation
cat("\n6. Testing visualization creation...\n")
tryCatch({
  # Test age competency plot
  age_plot <- create_age_competency_plot(cognitive_data)
  cat("  ✓ Age competency plot created\n")

  # Test technology progress plot
  tech_plot <- create_tech_progress_plot()
  cat("  ✓ Technology progress plot created\n")

  # Test demographic plot
  demo_plot <- create_demographic_plot(demographic_data)
  cat("  ✓ Demographic evolution plot created\n")

}, error = function(e) {
  cat("  ✗ Error creating visualizations:", e$message, "\n")
})

# Test 7: Load modeling functions
cat("\n7. Testing Bayesian modeling functions...\n")
tryCatch({
  source("R/bayesian_modeling.R")
  cat("  ✓ bayesian_modeling.R sourced successfully\n")
}, error = function(e) {
  cat("  ✗ Error loading bayesian_modeling.R:", e$message, "\n")
})

# Test 8: Prepare modeling data
cat("\n8. Testing data preparation for modeling...\n")
tryCatch({
  modeling_data <- prepare_modeling_data()
  cat("  ✓ Modeling data prepared:", nrow(modeling_data), "rows\n")
  cat("  ✓ Variables:", paste(names(modeling_data), collapse = ", "), "\n")
}, error = function(e) {
  cat("  ✗ Error preparing modeling data:", e$message, "\n")
})

# Test 9: Check directory structure
cat("\n9. Checking directory structure...\n")
required_dirs <- c("data", "R", "models")
for (dir_name in required_dirs) {
  if (dir.exists(dir_name)) {
    cat("  ✓", dir_name, "directory exists\n")
    files_in_dir <- list.files(dir_name)
    if (length(files_in_dir) > 0) {
      cat("    Files:", paste(files_in_dir, collapse = ", "), "\n")
    }
  } else {
    cat("  ✗", dir_name, "directory missing\n")
  }
}

# Test 10: Check data sources documentation
cat("\n10. Checking documentation...\n")
doc_file <- "data/data_sources.md"
if (file.exists(doc_file)) {
  cat("  ✓ Data sources documentation exists\n")
  cat("    File size:", file.size(doc_file), "bytes\n")
} else {
  cat("  ✗ Data sources documentation missing\n")
}

cat("\n=== SETUP TEST COMPLETE ===\n")
cat("Blog post directory:", getwd(), "\n")
cat("Ready for Quarto rendering!\n\n")

# Print system information for debugging
cat("System Information:\n")
cat("R version:", R.version.string, "\n")
cat("Platform:", R.version$platform, "\n")
cat("Working directory:", getwd(), "\n")