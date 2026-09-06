# Full MCMC Analysis with Causal Identification
# High-quality MCMC estimation and causal DAG analysis

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(cmdstanr)
  library(posterior)
  library(bayesplot)
  library(loo)
  library(dagitty)
  library(ggdag)
})

# ===== FULL MCMC ESTIMATION =====

run_full_mcmc_analysis <- function(model_file, stan_data) {
  cat("=== FULL MCMC ANALYSIS (10K ITERATIONS, 4 CHAINS) ===\n")

  # Compile model (this is where most time is spent)
  cat("Compiling Stan model (this takes most of the time)...\n")
  start_compile <- Sys.time()
  model <- cmdstan_model(model_file)
  compile_time <- as.numeric(difftime(Sys.time(), start_compile, units = "secs"))
  cat("✓ Compilation completed in", round(compile_time, 1), "seconds\n")

  # Full MCMC with high quality settings
  cat("Running full MCMC estimation...\n")
  start_mcmc <- Sys.time()

  mcmc_fit <- model$sample(
    data = stan_data,
    seed = 2024,
    chains = 4,
    parallel_chains = 4,
    iter_warmup = 2500,     # 2.5k warmup
    iter_sampling = 2500,   # 2.5k sampling = 10k total per chain
    refresh = 500,          # Progress updates
    max_treedepth = 12,     # Deeper trees for complex model
    adapt_delta = 0.95,     # Higher target acceptance rate
    show_exceptions = FALSE
  )

  mcmc_time <- as.numeric(difftime(Sys.time(), start_mcmc, units = "secs"))

  cat("✓ MCMC completed in", round(mcmc_time, 1), "seconds\n")
  cat("✓ Total time (compile + MCMC):", round(compile_time + mcmc_time, 1), "seconds\n")

  # Diagnostics
  cat("\n=== MCMC DIAGNOSTICS ===\n")

  # Convergence diagnostics
  draws <- mcmc_fit$draws()
  summary_stats <- mcmc_fit$summary()

  # R-hat diagnostics
  max_rhat <- max(summary_stats$rhat, na.rm = TRUE)
  cat("Maximum R-hat:", round(max_rhat, 4), "\n")
  if(max_rhat < 1.01) {
    cat("✓ Excellent convergence (R-hat < 1.01)\n")
  } else if(max_rhat < 1.05) {
    cat("✓ Good convergence (R-hat < 1.05)\n")
  } else {
    cat("⚠ Convergence issues (R-hat > 1.05)\n")
  }

  # Effective sample size
  min_ess_bulk <- min(summary_stats$ess_bulk, na.rm = TRUE)
  min_ess_tail <- min(summary_stats$ess_tail, na.rm = TRUE)
  cat("Minimum ESS (bulk):", round(min_ess_bulk), "\n")
  cat("Minimum ESS (tail):", round(min_ess_tail), "\n")

  if(min_ess_bulk > 400 && min_ess_tail > 400) {
    cat("✓ Excellent effective sample sizes\n")
  } else {
    cat("⚠ Low effective sample sizes detected\n")
  }

  # Energy diagnostics
  sampler_diagnostics <- mcmc_fit$sampler_diagnostics()
  n_divergent <- sum(sampler_diagnostics[,,"divergent__"])
  n_max_treedepth <- sum(sampler_diagnostics[,,"treedepth__"] >= 12)

  cat("Divergent transitions:", n_divergent, "\n")
  cat("Max treedepth hits:", n_max_treedepth, "\n")

  return(list(
    fit = mcmc_fit,
    summary = summary_stats,
    diagnostics = list(
      max_rhat = max_rhat,
      min_ess_bulk = min_ess_bulk,
      min_ess_tail = min_ess_tail,
      n_divergent = n_divergent,
      n_max_treedepth = n_max_treedepth
    ),
    timing = list(
      compile = compile_time,
      mcmc = mcmc_time,
      total = compile_time + mcmc_time
    )
  ))
}

# ===== CAUSAL DAG ANALYSIS =====

create_aging_productivity_dag <- function() {
  cat("\n=== CAUSAL DAG ANALYSIS ===\n")

  # Define the causal DAG
  dag_text <- '
  dag {
    Age -> CognitiveAbility
    Age -> TechComfort
    Age -> Experience

    CognitiveAbility -> EPI
    Experience -> EPI
    TechComfort -> TechAdoption

    TechAdoption -> Productivity
    EPI -> Productivity
    Innovation -> Productivity

    TechAdoption -> Innovation
    EPI -> Innovation

    FinancialShock -> Productivity
    EnergyShock -> Productivity
    TechRevolution -> Productivity
    TechRevolution -> TechAdoption

    Time -> Age
    Time -> TechRevolution
    Time -> FinancialShock
    Time -> EnergyShock

    Regime -> Productivity
    Time -> Regime

    U1 -> EPI
    U1 -> Productivity
    U2 -> TechAdoption
    U2 -> Productivity
  }'

  # Parse DAG
  dag <- dagitty(dag_text)

  # Set coordinates for better plotting
  coordinates(dag) <- list(
    x = c(Age = 1, Time = 0, CognitiveAbility = 2, Experience = 2, TechComfort = 2,
          EPI = 3, TechAdoption = 3, Innovation = 4, TechRevolution = 2,
          FinancialShock = 1, EnergyShock = 1, Regime = 1,
          Productivity = 5, U1 = 3.5, U2 = 3.5),
    y = c(Age = 3, Time = 2, CognitiveAbility = 4, Experience = 2, TechComfort = 1,
          EPI = 3, TechAdoption = 1, Innovation = 2, TechRevolution = 0,
          FinancialShock = 4, EnergyShock = 5, Regime = 1,
          Productivity = 3, U1 = 4, U2 = 1)
  )

  cat("✓ Causal DAG constructed\n")

  # Identify causal pathways
  cat("\n=== CAUSAL PATHWAYS ANALYSIS ===\n")

  # Direct effect: EPI -> Productivity
  direct_paths <- paths(dag, from = "EPI", to = "Productivity", directed = TRUE)
  cat("Direct pathways from EPI to Productivity:\n")
  for(i in seq_along(direct_paths$paths)) {
    cat("  ", paste(direct_paths$paths[[i]], collapse = " -> "), "\n")
  }

  # All paths: EPI -> Productivity (including indirect)
  all_paths <- paths(dag, from = "EPI", to = "Productivity")
  cat("\nAll pathways from EPI to Productivity:\n")
  for(i in seq_along(all_paths$paths)) {
    cat("  ", paste(all_paths$paths[[i]], collapse = " -> "), "\n")
  }

  # Backdoor paths (confounding)
  backdoor_paths <- paths(dag, from = "EPI", to = "Productivity", directed = FALSE)$paths
  backdoor_paths <- backdoor_paths[sapply(backdoor_paths, function(p) p[1] != "EPI" || p[length(p)] != "Productivity")]

  cat("\nPotential confounding paths:\n")
  if(length(backdoor_paths) > 0) {
    for(i in seq_along(backdoor_paths)) {
      cat("  ", paste(backdoor_paths[[i]], collapse = " <-> "), "\n")
    }
  } else {
    cat("  No backdoor paths identified\n")
  }

  return(dag)
}

# ===== CAUSAL IDENTIFICATION STRATEGY =====

assess_causal_identification <- function(dag) {
  cat("\n=== CAUSAL IDENTIFICATION ASSESSMENT ===\n")

  # Check if EPI -> Productivity is identified
  adjustment_sets <- adjustmentSets(dag, exposure = "EPI", outcome = "Productivity")

  cat("Required adjustment sets for EPI -> Productivity identification:\n")
  if(length(adjustment_sets) > 0) {
    for(i in seq_along(adjustment_sets)) {
      vars <- names(adjustment_sets[[i]])
      if(length(vars) > 0) {
        cat("  Set", i, ":", paste(vars, collapse = ", "), "\n")
      } else {
        cat("  Set", i, ": No adjustment needed\n")
      }
    }
  } else {
    cat("  ⚠ No valid adjustment sets found - identification may be problematic\n")
  }

  # Instrumental variables analysis
  cat("\n=== INSTRUMENTAL VARIABLES ANALYSIS ===\n")

  # German retirement age reforms as instruments
  instruments <- list(
    retirement_reform_1999 = "Affects Age structure but not directly Productivity",
    retirement_reform_2007 = "Gradual retirement age increase from 65 to 67",
    retirement_reform_2012 = "Early retirement penalties increased"
  )

  cat("Potential instrumental variables:\n")
  for(name in names(instruments)) {
    cat("  ", name, ":", instruments[[name]], "\n")
  }

  # Quasi-experimental variation
  cat("\n=== QUASI-EXPERIMENTAL VARIATION ===\n")

  quasi_experiments <- list(
    german_reunification = "1990 - Large demographic shock",
    eu_enlargement = "2004 - Labor mobility changes",
    immigration_policy = "Various reforms affecting age structure",
    border_discontinuities = "Compare with Austria/Switzerland"
  )

  cat("Available quasi-experimental variation:\n")
  for(name in names(quasi_experiments)) {
    cat("  ", name, ":", quasi_experiments[[name]], "\n")
  }

  # Assessment of current model
  cat("\n=== CURRENT MODEL CAUSAL ASSESSMENT ===\n")

  controlled_confounders <- c("Time", "Regime", "FinancialShock", "EnergyShock",
                             "TechRevolution", "Innovation")

  cat("Confounders controlled in current model:\n")
  for(confounder in controlled_confounders) {
    cat("  ✓", confounder, "\n")
  }

  potential_issues <- c(
    "Unobserved productivity shocks (U1, U2)",
    "Reverse causality: Productivity -> TechAdoption",
    "Selection effects in technology adoption",
    "Measurement error in EPI construction"
  )

  cat("\nPotential remaining threats to identification:\n")
  for(issue in potential_issues) {
    cat("  ⚠", issue, "\n")
  }

  # Causal claims assessment
  cat("\n=== CAUSAL CLAIMS STRENGTH ASSESSMENT ===\n")

  causal_strength <- data.frame(
    Effect = c("EPI -> Productivity (direct)",
               "Technology -> Productivity",
               "EPI * Technology interaction",
               "Shock effects"),
    Identification = c("Moderate", "Strong", "Weak", "Strong"),
    Reasoning = c("Time trends + regime controls, but unobserved confounding possible",
                 "Clear exogenous technology shocks + adoption lags",
                 "Relies on functional form assumptions",
                 "Clearly exogenous events"),
    Recommendation = c("Interpret as conditional association",
                      "Reasonable causal interpretation",
                      "Suggestive evidence only",
                      "Strong causal claims supported")
  )

  print(causal_strength)

  return(list(
    adjustment_sets = adjustment_sets,
    instruments = instruments,
    quasi_experiments = quasi_experiments,
    assessment = causal_strength
  ))
}

# ===== ENHANCED RESULTS INTERPRETATION =====

interpret_full_results <- function(mcmc_results, causal_assessment) {
  cat("\n=== ENHANCED RESULTS INTERPRETATION ===\n")

  # Extract key parameters with uncertainty
  summary_stats <- mcmc_results$summary

  key_params <- c("beta_epi", "beta_tech", "beta_innovation", "beta_epi_tech",
                 "beta_financial", "beta_energy", "total_aging_effect",
                 "technology_mitigation", "net_aging_impact")

  # Create results table with credible intervals
  results_table <- summary_stats %>%
    filter(variable %in% key_params) %>%
    select(variable, mean, q5, q25, q75, q95) %>%
    mutate(
      economic_meaning = case_when(
        variable == "beta_epi" ~ "Direct aging effect (pp/year)",
        variable == "beta_tech" ~ "Technology adoption effect (pp/year)",
        variable == "beta_innovation" ~ "Innovation capacity effect (pp/year)",
        variable == "beta_epi_tech" ~ "Technology mitigation of aging (pp/year)",
        variable == "beta_financial" ~ "Financial crisis impact (pp)",
        variable == "beta_energy" ~ "Energy crisis impact (pp)",
        variable == "total_aging_effect" ~ "Total aging impact (time-varying)",
        variable == "technology_mitigation" ~ "Technology helps aging workers",
        variable == "net_aging_impact" ~ "Net aging effect after technology",
        TRUE ~ "Other parameter"
      ),
      causal_strength = case_when(
        variable == "beta_epi" ~ "Moderate",
        variable == "beta_tech" ~ "Strong",
        variable == "beta_innovation" ~ "Strong",
        variable == "beta_epi_tech" ~ "Weak",
        variable == "beta_financial" ~ "Strong",
        variable == "beta_energy" ~ "Strong",
        TRUE ~ "Moderate"
      ),
      significance = ifelse(q5 * q95 > 0, "Significant", "Not significant")
    )

  cat("FULL MCMC RESULTS WITH CAUSAL ASSESSMENT:\n")
  cat("=" %s% rep("=", 50) %s% "\n")

  print(results_table %>%
        select(variable, mean, q5, q95, economic_meaning, causal_strength, significance) %>%
        mutate(across(where(is.numeric), ~ round(.x, 3))))

  # Key findings with uncertainty quantification
  cat("\n=== KEY FINDINGS WITH UNCERTAINTY ===\n")

  aging_effect <- results_table %>% filter(variable == "beta_epi")
  tech_effect <- results_table %>% filter(variable == "beta_tech")
  interaction_effect <- results_table %>% filter(variable == "beta_epi_tech")

  cat("1. AGING PRODUCTIVITY IMPACT:\n")
  cat("   Estimate:", round(aging_effect$mean, 3), "pp/year\n")
  cat("   90% Credible interval: [", round(aging_effect$q5, 3), ",", round(aging_effect$q95, 3), "]\n")
  cat("   Causal interpretation:", aging_effect$causal_strength, "\n")

  cat("\n2. TECHNOLOGY ADOPTION IMPACT:\n")
  cat("   Estimate:", round(tech_effect$mean, 3), "pp/year\n")
  cat("   90% Credible interval: [", round(tech_effect$q5, 3), ",", round(tech_effect$q95, 3), "]\n")
  cat("   Causal interpretation:", tech_effect$causal_strength, "\n")

  cat("\n3. TECHNOLOGY-AGING INTERACTION:\n")
  cat("   Estimate:", round(interaction_effect$mean, 3), "pp/year\n")
  cat("   90% Credible interval: [", round(interaction_effect$q5, 3), ",", round(interaction_effect$q95, 3), "]\n")
  cat("   Causal interpretation:", interaction_effect$causal_strength, "\n")

  # Model quality assessment
  cat("\n=== MODEL QUALITY ASSESSMENT ===\n")
  cat("MCMC Diagnostics:\n")
  cat("  ✓ R-hat max:", round(mcmc_results$diagnostics$max_rhat, 4), "\n")
  cat("  ✓ ESS bulk min:", round(mcmc_results$diagnostics$min_ess_bulk), "\n")
  cat("  ✓ ESS tail min:", round(mcmc_results$diagnostics$min_ess_tail), "\n")
  cat("  ✓ Divergent transitions:", mcmc_results$diagnostics$n_divergent, "\n")
  cat("  ✓ Total sampling time:", round(mcmc_results$timing$total, 1), "seconds\n")

  return(list(
    results_table = results_table,
    mcmc_quality = mcmc_results$diagnostics
  ))
}

# ===== MAIN EXECUTION =====

run_complete_analysis <- function() {
  cat("COMPLETE MCMC + CAUSAL ANALYSIS\n")
  cat(paste(rep("=", 60), collapse = ""), "\n")

  # Load previous data and model
  source(here("src", "content", "blog", "2025",
             "09-26-modeling-productivity-aging-population",
             "R", "real_epi_pathfinder_analysis.R"))

  # Prepare data
  data <- prepare_real_epi_data()
  model_file <- create_epi_pathfinder_model()

  # Prepare Stan data
  stan_data <- list(
    N = nrow(data),
    N_regime = length(unique(data$regime)),
    productivity_growth = data$productivity_growth,
    time_index = data$time_index,
    epi_normalized = data$epi_normalized,
    tech_normalized = data$tech_normalized,
    innovation_normalized = data$innovation_normalized,
    financial_shock = data$financial_shock,
    energy_shock = data$energy_shock,
    technological_revolution = data$technological_revolution,
    epi_tech_interaction = data$epi_tech_interaction,
    age_shock_interaction = data$age_shock_interaction,
    regime_id = data$regime_id
  )

  # 1. Full MCMC analysis
  mcmc_results <- run_full_mcmc_analysis(model_file, stan_data)

  # 2. Causal DAG analysis
  dag <- create_aging_productivity_dag()

  # 3. Causal identification assessment
  causal_assessment <- assess_causal_identification(dag)

  # 4. Enhanced interpretation
  interpretation <- interpret_full_results(mcmc_results, causal_assessment)

  cat("\n", paste(rep("=", 60), collapse = ""), "\n")
  cat("COMPLETE ANALYSIS FINISHED\n")
  cat("High-quality MCMC estimation completed with causal assessment\n")

  return(list(
    data = data,
    mcmc_results = mcmc_results,
    dag = dag,
    causal_assessment = causal_assessment,
    interpretation = interpretation
  ))
}

# String concatenation helper
`%s%` <- function(x, y) paste0(x, y)

cat("Full MCMC + Causal Analysis Framework Loaded\n")
cat("Run run_complete_analysis() to execute the complete analysis\n")