# Create Figures for Final Report
# Two key visualizations requested by GPT feedback

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(patchwork)
  library(scales)
})

theme_set(theme_minimal(base_size = 12))

# ===== FIGURE 1: PRODUCTIVITY DECOMPOSITION OVER TIME =====

create_productivity_decomposition <- function() {
  cat("Creating Figure 1: Productivity Decomposition...\n")

  # Load Model 3 results
  results_file <- here("src", "content", "blog", "2025",
                      "09-26-modeling-productivity-aging-population",
                      "model3_results.RData")

  load(results_file)

  # Extract posterior means for decomposition
  # Try different possible object names
  if(exists("fit")) {
    model3_summary <- fit$summary()
  } else if(exists("model3_fit")) {
    model3_summary <- model3_fit$summary()
  } else if(exists("mcmc_fit")) {
    model3_summary <- mcmc_fit$summary()
  } else {
    stop("Could not find model fit object in RData file")
  }

  # Get parameter estimates
  alpha <- model3_summary %>% filter(variable == "alpha") %>% pull(mean)
  beta_time <- model3_summary %>% filter(variable == "beta_time") %>% pull(mean)
  beta_epi <- model3_summary %>% filter(variable == "beta_epi") %>% pull(mean)
  beta_financial <- model3_summary %>% filter(variable == "beta_financial") %>% pull(mean)
  beta_energy <- model3_summary %>% filter(variable == "beta_energy") %>% pull(mean)

  # Calculate decomposition components
  decomposition <- model3_data %>%
    mutate(
      baseline = alpha,
      time_trend_component = beta_time * time_index,
      aging_component = beta_epi * epi_normalized,
      financial_shock_component = beta_financial * financial_shock,
      energy_shock_component = beta_energy * energy_shock,
      predicted_growth = baseline + time_trend_component + aging_component +
                        financial_shock_component + energy_shock_component
    )

  # Create stacked area plot
  decomp_long <- decomposition %>%
    select(year, baseline, time_trend_component, aging_component,
           financial_shock_component, energy_shock_component) %>%
    pivot_longer(-year, names_to = "component", values_to = "contribution") %>%
    mutate(
      component = factor(component,
                        levels = c("baseline", "time_trend_component", "aging_component",
                                  "financial_shock_component", "energy_shock_component"),
                        labels = c("Baseline Growth", "Time Trend", "Aging Effect",
                                  "Financial Shocks", "Energy Shocks"))
    )

  p1 <- ggplot(decomp_long, aes(x = year, y = contribution, fill = component)) +
    geom_area(alpha = 0.7) +
    geom_line(data = decomposition, aes(x = year, y = productivity_growth, fill = NULL),
             color = "black", size = 1, linetype = "dashed") +
    scale_fill_brewer(palette = "Set2", name = "Component") +
    scale_y_continuous(labels = percent_format(scale = 1)) +
    labs(
      title = "Productivity Growth Decomposition (1972-2023)",
      subtitle = "Model 3 posterior means | Dashed line = observed growth",
      x = "Year",
      y = "Annual Productivity Growth (%)",
      caption = "Negative contributions from aging and shocks reduce overall growth"
    ) +
    theme_minimal(base_size = 11) +
    theme(
      legend.position = "bottom",
      plot.title = element_text(face = "bold"),
      panel.grid.minor = element_blank()
    )

  ggsave(
    here("src", "content", "blog", "2025",
         "09-26-modeling-productivity-aging-population",
         "figure1_productivity_decomposition.png"),
    p1, width = 10, height = 6, dpi = 300
  )

  cat("✓ Figure 1 saved\n")
  return(p1)
}

# ===== FIGURE 2: COGNITIVE-AGE PROFILE AND EPI WEIGHTS =====

create_cognitive_age_profile <- function() {
  cat("Creating Figure 2: Cognitive-Age Profile and EPI Weights...\n")

  # Load enhanced cognitive curves
  enhanced_curves <- read_csv(
    here("src", "content", "blog", "2025",
         "09-26-modeling-productivity-aging-population",
         "data", "enhanced_cognitive_curves.csv"),
    show_col_types = FALSE
  )

  # Get representative year (2000) for visualization
  cognitive_profile_2000 <- enhanced_curves %>%
    filter(year == 2000) %>%
    select(age,
           fluid_enhanced,
           crystallized_enhanced,
           cognitive_composite_modern,
           human_capital_share)

  # Panel A: Cognitive components by age
  p2a <- cognitive_profile_2000 %>%
    select(age, fluid_enhanced, crystallized_enhanced, cognitive_composite_modern) %>%
    pivot_longer(-age, names_to = "component", values_to = "score") %>%
    mutate(
      component = factor(component,
                        levels = c("fluid_enhanced", "crystallized_enhanced",
                                  "cognitive_composite_modern"),
                        labels = c("Fluid Intelligence", "Crystallized Intelligence",
                                  "Composite Score"))
    ) %>%
    ggplot(aes(x = age, y = score, color = component, linetype = component)) +
    geom_line(size = 1.2) +
    scale_color_manual(
      values = c("Fluid Intelligence" = "#E41A1C",
                "Crystallized Intelligence" = "#377EB8",
                "Composite Score" = "#4DAF4A"),
      name = "Cognitive Component"
    ) +
    scale_linetype_manual(
      values = c("Fluid Intelligence" = "dashed",
                "Crystallized Intelligence" = "dotted",
                "Composite Score" = "solid"),
      name = "Cognitive Component"
    ) +
    labs(
      title = "A. Age-Cognitive Ability Profile",
      x = "Age (years)",
      y = "Cognitive Score (normalized)",
      subtitle = "Year 2000 cross-section"
    ) +
    theme_minimal(base_size = 10) +
    theme(
      legend.position = "bottom",
      panel.grid.minor = element_blank()
    )

  # Panel B: EPI weights (human capital shares)
  p2b <- cognitive_profile_2000 %>%
    ggplot(aes(x = age, y = human_capital_share)) +
    geom_area(fill = "#984EA3", alpha = 0.6) +
    geom_line(color = "#984EA3", size = 1) +
    scale_y_continuous(labels = percent_format()) +
    labs(
      title = "B. Population Weights for EPI Construction",
      x = "Age (years)",
      y = "Human Capital Share (%)",
      subtitle = "Demographic weights used in EPI calculation"
    ) +
    theme_minimal(base_size = 10) +
    theme(panel.grid.minor = element_blank())

  # Panel C: Weighted contribution to EPI
  p2c <- cognitive_profile_2000 %>%
    mutate(weighted_contribution = cognitive_composite_modern * human_capital_share) %>%
    ggplot(aes(x = age, y = weighted_contribution)) +
    geom_col(fill = "#FF7F00", alpha = 0.7) +
    labs(
      title = "C. Age-Specific Contribution to EPI",
      x = "Age (years)",
      y = "Weighted Contribution",
      subtitle = "Cognitive score × demographic weight",
      caption = "EPI = Sum of all bars (normalized)"
    ) +
    theme_minimal(base_size = 10) +
    theme(panel.grid.minor = element_blank())

  # Combine panels
  p2_combined <- (p2a / p2b / p2c) +
    plot_annotation(
      title = "Effective Productivity Index (EPI) Construction",
      subtitle = "How age-specific cognitive abilities and demographic weights create the EPI measure",
      theme = theme(plot.title = element_text(size = 14, face = "bold"))
    )

  ggsave(
    here("src", "content", "blog", "2025",
         "09-26-modeling-productivity-aging-population",
         "figure2_cognitive_age_profile.png"),
    p2_combined, width = 8, height = 10, dpi = 300
  )

  cat("✓ Figure 2 saved\n")
  return(p2_combined)
}

# ===== MAIN EXECUTION =====

cat("CREATING REPORT FIGURES\n")
cat(paste(rep("=", 40), collapse = ""), "\n\n")

# Check if Model 3 results exist
if(!file.exists(here("src", "content", "blog", "2025",
                     "09-26-modeling-productivity-aging-population",
                     "model3_results.RData"))) {
  cat("⚠ Warning: model3_results.RData not found\n")
  cat("Figures will be created with simulated decomposition\n\n")

  # Create simulated version for Figure 1
  create_simulated_decomposition <- function() {
    # Load the data that was used
    source(here("src", "content", "blog", "2025",
               "09-26-modeling-productivity-aging-population",
               "R", "real_epi_pathfinder_analysis.R"))

    data <- prepare_real_epi_data()

    # Use approximate parameter values from report
    decomposition <- data %>%
      mutate(
        baseline = 3.72,
        time_trend_component = 0.0191 * time_index,
        aging_component = -0.5461 * epi_normalized,
        financial_shock_component = -0.8959 * financial_shock,
        energy_shock_component = -0.4330 * energy_shock,
        predicted_growth = baseline + time_trend_component + aging_component +
                          financial_shock_component + energy_shock_component
      )

    decomp_long <- decomposition %>%
      select(year, baseline, time_trend_component, aging_component,
             financial_shock_component, energy_shock_component) %>%
      pivot_longer(-year, names_to = "component", values_to = "contribution") %>%
      mutate(
        component = factor(component,
                          levels = c("baseline", "time_trend_component", "aging_component",
                                    "financial_shock_component", "energy_shock_component"),
                          labels = c("Baseline Growth", "Time Trend", "Aging Effect",
                                    "Financial Shocks", "Energy Shocks"))
      )

    p1 <- ggplot(decomp_long, aes(x = year, y = contribution, fill = component)) +
      geom_area(alpha = 0.7) +
      geom_line(data = decomposition, aes(x = year, y = productivity_growth, fill = NULL),
               color = "black", size = 1, linetype = "dashed") +
      scale_fill_brewer(palette = "Set2", name = "Component") +
      scale_y_continuous(labels = percent_format(scale = 1)) +
      labs(
        title = "Productivity Growth Decomposition (1972-2023)",
        subtitle = "Model 3 estimates | Dashed line = observed growth",
        x = "Year",
        y = "Annual Productivity Growth (%)",
        caption = "Negative contributions from aging and shocks reduce overall growth"
      ) +
      theme_minimal(base_size = 11) +
      theme(
        legend.position = "bottom",
        plot.title = element_text(face = "bold"),
        panel.grid.minor = element_blank()
      )

    ggsave(
      here("src", "content", "blog", "2025",
           "09-26-modeling-productivity-aging-population",
           "figure1_productivity_decomposition.png"),
      p1, width = 10, height = 6, dpi = 300
    )

    cat("✓ Figure 1 saved (using parameter estimates from report)\n")
    return(p1)
  }

  fig1 <- create_simulated_decomposition()
} else {
  fig1 <- create_productivity_decomposition()
}

fig2 <- create_cognitive_age_profile()

cat("\n", paste(rep("=", 40), collapse = ""), "\n")
cat("FIGURE CREATION COMPLETE\n")
cat("✓ Figure 1: Productivity decomposition over time\n")
cat("✓ Figure 2: Cognitive-age profile and EPI weights\n")
cat("\nFigures saved to:\n")
cat("  - figure1_productivity_decomposition.png\n")
cat("  - figure2_cognitive_age_profile.png\n")