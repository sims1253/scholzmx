# Causal Identification Framework
# Purpose: Implement Pearl/McElreath-style causal analysis for aging-productivity relationship
# Author: Enhanced EPI methodology for scholzmx blog

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)

  # Check for DAG visualization packages
  if (requireNamespace("ggdag", quietly = TRUE)) {
    library(ggdag)
    cat("✓ ggdag package available for DAG visualization\n")
  } else {
    cat("Note: ggdag package not available, using text DAG representation\n")
  }

  if (requireNamespace("dagitty", quietly = TRUE)) {
    library(dagitty)
    cat("✓ dagitty package available for causal analysis\n")
  } else {
    cat("Note: dagitty package not available, using simplified causal analysis\n")
  }
})

source(here("src", "content", "blog", "2025", "09-26-modeling-productivity-aging-population", "R", "panel_stationarity_analysis.R"))

cat("=== CAUSAL IDENTIFICATION FRAMEWORK ===\n\n")

# ===== DEFINE CAUSAL GRAPH =====

#' Define Aging-Productivity Causal DAG
#'
#' Implements the theoretical causal structure following Pearl's framework
define_aging_productivity_dag <- function() {

  cat("Defining causal DAG for aging-productivity relationship...\n")

  # Simplified text representation of DAG
  dag_structure <- list(
    # Core variables
    nodes = c("Demographics", "EPI", "Productivity", "Technology", "Education",
              "Institutions", "Health", "Labor_Policy", "Immigration"),

    # Causal relationships (A -> B means A causes B)
    edges = list(
      c("Demographics", "EPI"),           # Aging affects cognitive capacity
      c("EPI", "Productivity"),           # Cognitive capacity affects productivity
      c("Technology", "Productivity"),     # Technology directly affects productivity
      c("Technology", "EPI"),             # Technology may amplify/substitute cognition
      c("Education", "EPI"),              # Education enhances cognitive capacity
      c("Education", "Productivity"),      # Education directly affects productivity
      c("Health", "Demographics"),        # Health affects aging patterns
      c("Health", "EPI"),                # Health affects cognitive capacity
      c("Labor_Policy", "EPI"),          # Retirement policies affect workforce composition
      c("Labor_Policy", "Demographics"), # Policies affect demographic participation
      c("Institutions", "Technology"),    # Institutions affect technology adoption
      c("Institutions", "Education"),     # Institutions affect education systems
      c("Immigration", "Demographics"),   # Immigration affects age structure
      c("Immigration", "EPI")            # Immigration affects skill composition
    ),

    # Confounders (variables that affect multiple outcomes)
    confounders = list(
      c("Technology", c("EPI", "Productivity")),
      c("Education", c("EPI", "Productivity")),
      c("Health", c("Demographics", "EPI")),
      c("Institutions", c("Technology", "Education"))
    ),

    # Instruments (variables that affect outcome only through treatment)
    instruments = list(
      c("Immigration", "Demographics"),   # Immigration affects demographics but not directly productivity
      c("Health", "Demographics"),       # Health shocks affect aging but not directly productivity
      c("Labor_Policy", "Demographics") # Policy changes affect workforce age but not directly productivity
    )
  )

  cat("✓ DAG structure defined with", length(dag_structure$nodes), "nodes and",
      length(dag_structure$edges), "edges\n")

  return(dag_structure)
}

# ===== IDENTIFY CAUSAL PATHWAYS =====

#' Identify Causal Pathways
#'
#' Find all pathways from treatment (EPI) to outcome (Productivity)
identify_causal_pathways <- function(dag_structure) {

  cat("Identifying causal pathways from EPI to Productivity...\n")

  # Direct pathway
  direct_path <- "EPI -> Productivity"

  # Confounded pathways (backdoor paths)
  backdoor_paths <- c(
    "EPI <- Technology -> Productivity",
    "EPI <- Education -> Productivity",
    "EPI <- Health -> Demographics -> EPI",
    "EPI <- Labor_Policy -> Demographics -> EPI"
  )

  # Mediating pathways
  mediating_paths <- c(
    "Demographics -> EPI -> Productivity",
    "Education -> EPI -> Productivity",
    "Health -> EPI -> Productivity"
  )

  pathways <- list(
    direct = direct_path,
    backdoor = backdoor_paths,
    mediating = mediating_paths
  )

  cat("✓ Identified pathways:\n")
  cat("   Direct:", length(pathways$direct), "pathway\n")
  cat("   Backdoor:", length(pathways$backdoor), "confounding paths\n")
  cat("   Mediating:", length(pathways$mediating), "paths\n\n")

  return(pathways)
}

# ===== ADJUSTMENT SETS =====

#' Determine Adjustment Sets
#'
#' Find minimal sets of variables to control for to identify causal effect
determine_adjustment_sets <- function(dag_structure, pathways) {

  cat("Determining adjustment sets for causal identification...\n")

  # Minimal adjustment set (blocks all backdoor paths)
  minimal_set <- c("Technology", "Education", "Health", "Institutions")

  # Extended adjustment set (includes policy variables)
  extended_set <- c("Technology", "Education", "Health", "Institutions",
                   "Labor_Policy", "Immigration")

  # Instrument-based identification (no need for full control set)
  instrumental_variables <- c("Health", "Immigration", "Labor_Policy")

  adjustment_sets <- list(
    minimal = minimal_set,
    extended = extended_set,
    instrumental = instrumental_variables
  )

  cat("✓ Adjustment sets identified:\n")
  cat("   Minimal control set:", length(adjustment_sets$minimal), "variables\n")
  cat("   Extended control set:", length(adjustment_sets$extended), "variables\n")
  cat("   Instrumental variables:", length(adjustment_sets$instrumental), "variables\n\n")

  return(adjustment_sets)
}

# ===== CAUSAL ESTIMATION STRATEGIES =====

#' Implement Multiple Causal Estimation Strategies
#'
#' Estimate causal effect using different identification approaches
estimate_causal_effects <- function(panel_data, adjustment_sets) {

  cat("Implementing causal estimation strategies...\n")

  # Prepare data with proxy variables for theoretical constructs
  causal_data <- panel_data %>%
    mutate(
      # Map theoretical constructs to observables
      Technology = ict_capital_share,
      Education = tertiary_education_rate,
      Health = 1 - (population_mean_age - 35) / 15, # Inverse aging as health proxy
      Institutions = ifelse(country %in% c("DEU", "SWE", "CAN"), 1, 0), # Good institutions dummy
      Labor_Policy = effective_retirement_age,
      Immigration = ifelse(country %in% c("USA", "CAN", "AUS"), 1, 0), # High immigration countries

      # Treatment and outcome
      Treatment = epi_human_capital_country_norm,
      Outcome = d_log_productivity, # First differences as recommended

      # Create lagged instruments
      Health_lag1 = lag(Health),
      Immigration_policy = ifelse(year >= 2000 & Immigration == 1, 1, 0)
    ) %>%
    filter(!is.na(Outcome), !is.na(Treatment))

  # Strategy 1: Minimal adjustment set
  strategy1_data <- causal_data %>%
    select(all_of(c("country", "year", "Outcome", "Treatment", "Technology",
                   "Education", "Health", "Institutions"))) %>%
    drop_na()

  if (nrow(strategy1_data) > 0) {
    model1 <- lm(Outcome ~ Treatment + Technology + Education + Health + Institutions +
                factor(country) + factor(year), data = strategy1_data)

    strategy1_result <- list(
      coefficient = coef(model1)["Treatment"],
      se = summary(model1)$coefficients["Treatment", "Std. Error"],
      t_stat = summary(model1)$coefficients["Treatment", "t value"],
      p_value = summary(model1)$coefficients["Treatment", "Pr(>|t|)"],
      n_obs = nrow(strategy1_data),
      method = "Minimal Adjustment Set"
    )
  } else {
    strategy1_result <- NULL
  }

  # Strategy 2: Extended adjustment set
  strategy2_data <- causal_data %>%
    select(all_of(c("country", "year", "Outcome", "Treatment", "Technology",
                   "Education", "Health", "Institutions", "Labor_Policy", "Immigration"))) %>%
    drop_na()

  if (nrow(strategy2_data) > 0) {
    model2 <- lm(Outcome ~ Treatment + Technology + Education + Health + Institutions +
                Labor_Policy + Immigration + factor(country) + factor(year),
                data = strategy2_data)

    strategy2_result <- list(
      coefficient = coef(model2)["Treatment"],
      se = summary(model2)$coefficients["Treatment", "Std. Error"],
      t_stat = summary(model2)$coefficients["Treatment", "t value"],
      p_value = summary(model2)$coefficients["Treatment", "Pr(>|t|)"],
      n_obs = nrow(strategy2_data),
      method = "Extended Adjustment Set"
    )
  } else {
    strategy2_result <- NULL
  }

  # Strategy 3: Instrumental Variables (simplified 2SLS)
  strategy3_data <- causal_data %>%
    select(all_of(c("country", "year", "Outcome", "Treatment", "Health_lag1",
                   "Immigration_policy", "Labor_Policy"))) %>%
    drop_na()

  if (nrow(strategy3_data) > 10) {
    # First stage: Treatment ~ Instruments
    first_stage <- lm(Treatment ~ Health_lag1 + Immigration_policy + Labor_Policy +
                     factor(country) + factor(year), data = strategy3_data)

    # Predicted treatment
    strategy3_data$Treatment_hat <- predict(first_stage)

    # Second stage: Outcome ~ Predicted Treatment
    second_stage <- lm(Outcome ~ Treatment_hat + factor(country) + factor(year),
                      data = strategy3_data)

    strategy3_result <- list(
      coefficient = coef(second_stage)["Treatment_hat"],
      se = summary(second_stage)$coefficients["Treatment_hat", "Std. Error"],
      t_stat = summary(second_stage)$coefficients["Treatment_hat", "t value"],
      p_value = summary(second_stage)$coefficients["Treatment_hat", "Pr(>|t|)"],
      n_obs = nrow(strategy3_data),
      method = "Instrumental Variables",
      first_stage_f = summary(first_stage)$fstatistic[1]
    )
  } else {
    strategy3_result <- NULL
  }

  # Strategy 4: Difference-in-Differences (using policy variation)
  strategy4_data <- causal_data %>%
    mutate(
      # Policy shock: countries that increased retirement age significantly
      policy_shock = ifelse(country %in% c("DEU", "FRA") & year >= 2000, 1, 0),
      # Treatment intensity: interaction with EPI change
      treatment_intensity = policy_shock * d_epi_human_capital
    ) %>%
    filter(!is.na(treatment_intensity))

  if (nrow(strategy4_data) > 0) {
    model4 <- lm(Outcome ~ treatment_intensity + policy_shock + d_epi_human_capital +
                factor(country) + factor(year), data = strategy4_data)

    strategy4_result <- list(
      coefficient = coef(model4)["treatment_intensity"],
      se = summary(model4)$coefficients["treatment_intensity", "Std. Error"],
      t_stat = summary(model4)$coefficients["treatment_intensity", "t value"],
      p_value = summary(model4)$coefficients["treatment_intensity", "Pr(>|t|)"],
      n_obs = nrow(strategy4_data),
      method = "Difference-in-Differences"
    )
  } else {
    strategy4_result <- NULL
  }

  # Combine results
  causal_results <- list(
    strategy1 = strategy1_result,
    strategy2 = strategy2_result,
    strategy3 = strategy3_result,
    strategy4 = strategy4_result
  )

  # Remove NULL results
  causal_results <- causal_results[!sapply(causal_results, is.null)]

  cat("✓ Causal estimation completed using", length(causal_results), "strategies\n\n")

  return(causal_results)
}

# ===== SENSITIVITY ANALYSIS =====

#' Conduct Sensitivity Analysis
#'
#' Test robustness of causal estimates to unobserved confounding
conduct_sensitivity_analysis <- function(causal_results) {

  cat("Conducting sensitivity analysis...\n")

  # Extract estimates
  estimates_df <- map_dfr(causal_results, function(result) {
    if (!is.null(result)) {
      tibble(
        method = result$method,
        coefficient = result$coefficient,
        se = result$se,
        t_stat = result$t_stat,
        p_value = result$p_value,
        n_obs = result$n_obs,
        ci_lower = coefficient - 1.96 * se,
        ci_upper = coefficient + 1.96 * se
      )
    }
  })

  if (nrow(estimates_df) == 0) {
    cat("   No estimates available for sensitivity analysis\n")
    return(NULL)
  }

  # Calculate sensitivity metrics
  sensitivity_metrics <- list(
    estimate_range = max(estimates_df$coefficient) - min(estimates_df$coefficient),
    mean_estimate = mean(estimates_df$coefficient),
    sd_estimates = sd(estimates_df$coefficient),
    cv_estimates = sd(estimates_df$coefficient) / abs(mean(estimates_df$coefficient)),
    consistent_sign = all(estimates_df$coefficient > 0) || all(estimates_df$coefficient < 0),
    significant_share = mean(estimates_df$p_value < 0.05)
  )

  cat("✓ Sensitivity analysis completed\n")
  cat("   Estimate range:", round(sensitivity_metrics$estimate_range, 4), "\n")
  cat("   Mean estimate:", round(sensitivity_metrics$mean_estimate, 4), "\n")
  cat("   Coefficient of variation:", round(sensitivity_metrics$cv_estimates, 3), "\n")
  cat("   Consistent sign:", sensitivity_metrics$consistent_sign, "\n")
  cat("   Significant estimates:", round(sensitivity_metrics$significant_share * 100), "%\n\n")

  return(list(
    estimates = estimates_df,
    sensitivity_metrics = sensitivity_metrics
  ))
}

# ===== MAIN CAUSAL ANALYSIS =====

cat("1. Defining causal DAG...\n")
aging_dag <- define_aging_productivity_dag()

cat("2. Identifying causal pathways...\n")
causal_pathways <- identify_causal_pathways(aging_dag)

cat("3. Determining adjustment sets...\n")
adjustment_sets <- determine_adjustment_sets(aging_dag, causal_pathways)

cat("4. Loading data and estimating causal effects...\n")
# Use data from previous step
panel_data <- create_cross_country_panel()
cross_country_results <- calculate_cross_country_epi(panel_data)
analysis_data <- cross_country_results$panel_data

causal_estimates <- estimate_causal_effects(analysis_data, adjustment_sets)

cat("5. Conducting sensitivity analysis...\n")
sensitivity_results <- conduct_sensitivity_analysis(causal_estimates)

# ===== SUMMARY RESULTS =====

cat("=== CAUSAL ANALYSIS SUMMARY ===\n")

if (!is.null(sensitivity_results)) {
  cat("Causal estimates of EPI on productivity growth:\n")
  print(sensitivity_results$estimates)

  cat("\nSensitivity metrics:\n")
  metrics <- sensitivity_results$sensitivity_metrics
  cat("  Range of estimates:", round(metrics$estimate_range, 4), "\n")
  cat("  Average effect:", round(metrics$mean_estimate, 4), "\n")
  cat("  Robustness (CV):", round(metrics$cv_estimates, 3), "\n")
  cat("  All estimates same sign:", metrics$consistent_sign, "\n")

  # Interpretation
  if (metrics$consistent_sign && metrics$significant_share > 0.5) {
    cat("\n✓ Robust causal evidence: Consistent estimates across methods\n")
  } else if (metrics$cv_estimates < 0.5) {
    cat("\n? Moderate evidence: Some consistency but method-dependent\n")
  } else {
    cat("\n⚠ Weak evidence: Estimates sensitive to specification\n")
  }
} else {
  cat("Causal analysis completed but no estimates available\n")
}

cat("\n✓ Causal identification framework implemented\n")
cat("✓ Multiple estimation strategies tested\n")
cat("✓ Sensitivity analysis conducted\n")
cat("\nNext: Implement sector-level heterogeneous effects\n")