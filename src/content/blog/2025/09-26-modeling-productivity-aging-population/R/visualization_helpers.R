# Visualization Helper Functions for Interactive Productivity Modeling
# Author: Generated for scholzmx blog
# Date: 2025-09-26

library(plotly)
library(tidyverse)
library(DT)

# Function to create interactive age-competency curve with parameter controls
create_age_competency_plot <- function(cognitive_data = NULL) {
  if (is.null(cognitive_data)) {
    cognitive_data <- load_cognitive_data()
  }

  # Create dynamic age-competency function that responds to parameters
  create_competency_curve <- function(ages, peak_age = 42, peak_value = 1,
                                    decline_rate = 0.015, young_penalty = 0.3) {
    ifelse(ages <= peak_age,
           # Rising phase: exponential approach to peak
           peak_value * (1 - young_penalty * exp(-(ages - 18) / 8)),
           # Declining phase: linear decline
           peak_value * (1 - decline_rate * (ages - peak_age))
    ) %>% pmax(0.1) # minimum competency floor
  }

  ages <- seq(18, 70, by = 0.5)

  # Create multiple parameter scenarios
  scenarios <- list(
    list(name = "Conservative Aging", peak_age = 38, decline_rate = 0.020, young_penalty = 0.4),
    list(name = "Standard Model", peak_age = 42, decline_rate = 0.015, young_penalty = 0.3),
    list(name = "Extended Peak", peak_age = 46, decline_rate = 0.012, young_penalty = 0.2),
    list(name = "Late Bloomer", peak_age = 50, decline_rate = 0.010, young_penalty = 0.5)
  )

  colors <- c("#8c564b", "#1f77b4", "#ff7f0e", "#2ca02c")

  p <- plot_ly() %>%
    # Add base empirical data as reference
    add_trace(
      data = cognitive_data,
      x = ~age, y = ~composite_competency,
      type = "scatter", mode = "markers",
      name = "Empirical Data",
      marker = list(color = "gray", size = 6, opacity = 0.6),
      hovertemplate = "Age: %{x}<br>Empirical Score: %{y:.3f}<extra></extra>"
    )

  # Add scenario curves with interactive toggles
  for (i in seq_along(scenarios)) {
    scenario <- scenarios[[i]]
    curve_data <- tibble(
      age = ages,
      competency = create_competency_curve(ages,
                                          peak_age = scenario$peak_age,
                                          decline_rate = scenario$decline_rate,
                                          young_penalty = scenario$young_penalty)
    )

    # Show only standard model initially
    is_visible <- (scenario$name == "Standard Model")

    p <- p %>%
      add_trace(
        data = curve_data,
        x = ~age, y = ~competency,
        type = "scatter", mode = "lines",
        name = scenario$name,
        line = list(color = colors[i], width = 3),
        visible = if (is_visible) TRUE else "legendonly",
        hovertemplate = paste0(scenario$name, "<br>Age: %{x}<br>Competency: %{y:.3f}<br>",
                              "Peak Age: ", scenario$peak_age, "<br>",
                              "Decline Rate: ", scenario$decline_rate, "<extra></extra>")
      )
  }

  p <- p %>%
    layout(
      title = list(
        text = "Interactive Age-Competency Models",
        font = list(size = 18)
      ),
      xaxis = list(
        title = "Age (years)",
        range = c(18, 70),
        tickmode = "linear",
        dtick = 5
      ),
      yaxis = list(
        title = "Competency Score",
        range = c(0.1, 1.0)
      ),
      hovermode = "x unified",
      legend = list(x = 0.02, y = 0.98),
      showlegend = TRUE,
      plot_bgcolor = "rgba(240,240,240,0.3)",
      paper_bgcolor = "rgba(0,0,0,0)",
      width = 800,
      height = 500,
      annotations = list(
        list(
          text = "Click legend items to compare different aging models<br>Gray points show empirical cognitive research data",
          x = 0.02, y = 0.02,
          xref = "paper", yref = "paper",
          showarrow = FALSE,
          font = list(size = 11, color = "gray"),
          align = "left"
        )
      )
    )

  return(p)
}

# Function to create interactive technology progress scenarios with parameter controls
create_tech_progress_plot <- function(start_year = 1970, end_year = 2050) {
  years <- start_year:end_year
  current_year <- 2023

  # Create comprehensive scenario matrix
  tech_scenarios <- expand_grid(
    base_rate = c(0.01, 0.015, 0.02, 0.025, 0.03, 0.035),
    acceleration = c(0, 0.0001, 0.0002), # Yearly acceleration
    disruption_year = c(2030, 2035, 2040),
    disruption_boost = c(0, 0.005, 0.01)
  ) %>%
    mutate(
      scenario_id = row_number(),
      scenario_name = paste0(
        "Base: ", base_rate*100, "% | ",
        "Accel: ", ifelse(acceleration > 0, "+", ""), acceleration*10000, "bp/yr | ",
        "Disruption: ", ifelse(disruption_boost > 0, paste0("+", disruption_boost*100, "% @", disruption_year), "None")
      )
    )

  # Select representative scenarios for display
  selected_scenarios <- tech_scenarios %>%
    filter(
      (base_rate == 0.015 & acceleration == 0 & disruption_boost == 0) | # Conservative baseline
      (base_rate == 0.02 & acceleration == 0 & disruption_boost == 0) |  # Standard
      (base_rate == 0.025 & acceleration == 0 & disruption_boost == 0) | # Optimistic
      (base_rate == 0.02 & acceleration == 0.0001 & disruption_boost == 0) | # Accelerating
      (base_rate == 0.02 & acceleration == 0 & disruption_boost == 0.01 & disruption_year == 2030) | # AI Disruption
      (base_rate == 0.035 & acceleration == 0.0002 & disruption_boost == 0.01 & disruption_year == 2030)  # Breakthrough
    ) %>%
    mutate(
      display_name = case_when(
        base_rate == 0.015 & acceleration == 0 & disruption_boost == 0 ~ "Conservative (1.5%)",
        base_rate == 0.02 & acceleration == 0 & disruption_boost == 0 ~ "Standard (2.0%)",
        base_rate == 0.025 & acceleration == 0 & disruption_boost == 0 ~ "Optimistic (2.5%)",
        base_rate == 0.02 & acceleration == 0.0001 & disruption_boost == 0 ~ "Accelerating Innovation",
        base_rate == 0.02 & disruption_boost == 0.01 & disruption_year == 2030 ~ "AI Revolution (2030)",
        TRUE ~ "Exponential Breakthrough"
      ),
      color = case_when(
        display_name == "Conservative (1.5%)" ~ "#8c564b",
        display_name == "Standard (2.0%)" ~ "#1f77b4",
        display_name == "Optimistic (2.5%)" ~ "#ff7f0e",
        display_name == "Accelerating Innovation" ~ "#2ca02c",
        display_name == "AI Revolution (2030)" ~ "#d62728",
        TRUE ~ "#9467bd"
      )
    )

  # Calculate technology multipliers for each scenario
  scenario_curves <- selected_scenarios %>%
    rowwise() %>%
    do({
      scenario_data <- .
      curve_data <- tibble(year = years) %>%
        mutate(
          # Base growth with potential acceleration
          effective_rate = scenario_data$base_rate +
                          scenario_data$acceleration * pmax(0, year - start_year),
          # Add disruption boost after disruption year
          effective_rate = ifelse(year >= scenario_data$disruption_year,
                                 effective_rate + scenario_data$disruption_boost,
                                 effective_rate),
          # Calculate cumulative multiplier
          tech_multiplier = cumprod(1 + effective_rate)^(1:length(years)),
          scenario_id = scenario_data$scenario_id,
          display_name = scenario_data$display_name,
          color = scenario_data$color
        )
      curve_data
    }) %>%
    ungroup()

  p <- plot_ly()

  # Add each scenario with interactive controls
  for (scenario in unique(scenario_curves$display_name)) {
    scenario_data <- scenario_curves %>% filter(display_name == scenario)
    is_visible <- scenario %in% c("Standard (2.0%)", "AI Revolution (2030)")

    p <- p %>%
      add_trace(
        data = scenario_data,
        x = ~year, y = ~tech_multiplier,
        type = "scatter", mode = "lines",
        name = scenario,
        line = list(
          color = scenario_data$color[1],
          width = ifelse(scenario == "Standard (2.0%)", 3, 2),
          dash = ifelse(grepl("AI|Breakthrough", scenario), "dash", "solid")
        ),
        visible = if (is_visible) TRUE else "legendonly",
        hovertemplate = paste0(
          "%{fullData.name}<br>",
          "Year: %{x}<br>",
          "Tech Multiplier: %{y:.2f}<br>",
          "<extra></extra>"
        )
      )
  }

  p <- p %>%
    layout(
      title = list(
        text = "Interactive Technology Progress Scenarios",
        font = list(size = 18)
      ),
      xaxis = list(
        title = "Year",
        range = c(start_year, end_year),
        showgrid = TRUE
      ),
      yaxis = list(
        title = "Technology Multiplier (1970 = 1.0)",
        type = "log",
        showgrid = TRUE
      ),
      hovermode = "x unified",
      legend = list(x = 0.02, y = 0.98),
      plot_bgcolor = "rgba(240,240,240,0.3)",
      paper_bgcolor = "rgba(0,0,0,0)",
      width = 800,
      height = 500,
      shapes = list(
        list(
          type = "line",
          line = list(color = "gray", dash = "dash", width = 2),
          xref = "x",
          yref = "paper",
          x0 = current_year,
          x1 = current_year,
          y0 = 0,
          y1 = 1
        )
      ),
      annotations = list(
        list(
          x = current_year,
          y = 0.85,
          text = "Present",
          showarrow = TRUE,
          arrowhead = 2,
          ax = 20,
          ay = -20,
          xref = "x",
          yref = "paper"
        ),
        list(
          text = "Click legend items to explore different scenarios<br>Dashed lines = disruptive technology scenarios",
          x = 0.02, y = 0.02,
          xref = "paper", yref = "paper",
          showarrow = FALSE,
          font = list(size = 11, color = "gray"),
          align = "left"
        )
      )
    )

  return(p)
}

# Function to create interactive demographic evolution plot with scenario projections
create_demographic_plot <- function(demographic_data = NULL) {
  if (is.null(demographic_data)) {
    demographic_data <- load_demographic_data()
  }

  # Historical age structure data
  demo_historical <- demographic_data %>%
    mutate(
      age_group = case_when(
        age <= 25 ~ "Young (18-25)",
        age <= 45 ~ "Prime Working (26-45)",
        age <= 65 ~ "Older Working (46-65)",
        TRUE ~ "Elderly (65+)"
      )
    ) %>%
    group_by(year, age_group) %>%
    summarise(
      population = sum(population),
      .groups = "drop"
    ) %>%
    group_by(year) %>%
    mutate(
      proportion = population / sum(population),
      total_pop = sum(population)
    )

  # Create future projection scenarios (2020-2050)
  future_years <- seq(2025, 2050, by = 5)
  aging_scenarios <- list(
    list(name = "Mild Aging", young_decline = 0.002, elderly_increase = 0.003),
    list(name = "Standard Aging", young_decline = 0.003, elderly_increase = 0.004),
    list(name = "Rapid Aging", young_decline = 0.004, elderly_increase = 0.005),
    list(name = "Immigration Boost", young_decline = 0.001, elderly_increase = 0.003)
  )

  # Get 2020 baseline proportions
  baseline_2020 <- demo_historical %>%
    filter(year == 2020) %>%
    select(age_group, proportion)

  # Generate projection scenarios
  demo_projections <- map_dfr(aging_scenarios, function(scenario) {
    scenario_data <- map_dfr(future_years, function(future_year) {
      years_forward <- (future_year - 2020) / 5

      baseline_2020 %>%
        mutate(
          year = future_year,
          proportion = case_when(
            age_group == "Young (18-25)" ~ proportion * (1 - scenario$young_decline)^years_forward,
            age_group == "Prime Working (26-45)" ~ proportion * 0.98^years_forward, # Slight decline
            age_group == "Older Working (46-65)" ~ proportion * 1.01^years_forward, # Slight increase
            age_group == "Elderly (65+)" ~ proportion * (1 + scenario$elderly_increase)^years_forward
          ),
          scenario_name = scenario$name
        )
    }) %>%
      # Normalize proportions to sum to 1
      group_by(year, scenario_name) %>%
      mutate(proportion = proportion / sum(proportion)) %>%
      ungroup()
  })

  colors <- c("#1f77b4", "#ff7f0e", "#2ca02c", "#d62728")

  p <- plot_ly()

  # Add historical data for each age group
  for (i in seq_along(unique(demo_historical$age_group))) {
    age_group <- unique(demo_historical$age_group)[i]
    group_data <- demo_historical %>% filter(age_group == !!age_group)

    p <- p %>%
      add_trace(
        data = group_data,
        x = ~year, y = ~proportion,
        type = "scatter", mode = "lines+markers",
        name = paste("Historical -", age_group),
        line = list(color = colors[i], width = 3),
        marker = list(color = colors[i], size = 8),
        hovertemplate = paste0("Historical<br>Year: %{x}<br>", age_group, ": %{y:.1%}<extra></extra>")
      )
  }

  # Add projection scenarios (initially hidden)
  for (scenario_name in unique(demo_projections$scenario_name)) {
    scenario_data <- demo_projections %>% filter(scenario_name == !!scenario_name)

    for (i in seq_along(unique(scenario_data$age_group))) {
      age_group <- unique(scenario_data$age_group)[i]
      group_proj_data <- scenario_data %>% filter(age_group == !!age_group)

      # Show only Standard Aging initially
      is_visible <- (scenario_name == "Standard Aging")

      p <- p %>%
        add_trace(
          data = group_proj_data,
          x = ~year, y = ~proportion,
          type = "scatter", mode = "lines",
          name = paste(scenario_name, "-", age_group),
          line = list(color = colors[i], width = 2, dash = "dash"),
          visible = if (is_visible) TRUE else "legendonly",
          hovertemplate = paste0(scenario_name, " Projection<br>Year: %{x}<br>",
                                age_group, ": %{y:.1%}<extra></extra>")
        )
    }
  }

  p <- p %>%
    layout(
      title = list(
        text = "Interactive German Demographics: History + Projections",
        font = list(size = 18)
      ),
      xaxis = list(
        title = "Year",
        range = c(1970, 2050),
        showgrid = TRUE
      ),
      yaxis = list(
        title = "Proportion of Population",
        tickformat = ".1%",
        range = c(0, 0.6)
      ),
      hovermode = "x unified",
      legend = list(
        x = 1.02, y = 0.98,
        font = list(size = 10)
      ),
      plot_bgcolor = "rgba(240,240,240,0.3)",
      paper_bgcolor = "rgba(0,0,0,0)",
      width = 900,
      height = 500,
      shapes = list(
        list(
          type = "line",
          line = list(color = "gray", dash = "dash", width = 2),
          xref = "x",
          yref = "paper",
          x0 = 2020,
          x1 = 2020,
          y0 = 0,
          y1 = 1
        )
      ),
      annotations = list(
        list(
          x = 2020,
          y = 0.9,
          text = "Historical | Projection",
          showarrow = TRUE,
          arrowhead = 2,
          ax = 0,
          ay = -30,
          xref = "x",
          yref = "paper"
        ),
        list(
          text = "Historical = solid lines | Projections = dashed lines<br>Click legend to explore different aging scenarios",
          x = 0.02, y = 0.02,
          xref = "paper", yref = "paper",
          showarrow = FALSE,
          font = list(size = 11, color = "gray"),
          align = "left"
        )
      )
    )

  return(p)
}

# Function to create productivity prediction plot with scenarios
create_productivity_predictions_plot <- function(historical_data, predictions_data) {
  current_year <- 2023

  p <- plot_ly() %>%
    # Historical data
    add_trace(
      data = historical_data,
      x = ~year, y = ~productivity_per_hour,
      type = "scatter", mode = "markers+lines",
      name = "Historical Data",
      marker = list(color = "black", size = 8),
      line = list(color = "black", width = 3),
      hovertemplate = "Year: %{x}<br>Productivity: $%{y:.1f}/hour<extra></extra>"
    ) %>%
    # Prediction scenarios (to be added dynamically)
    layout(
      title = list(
        text = "German Labor Productivity: History and Projections",
        font = list(size = 18)
      ),
      xaxis = list(
        title = "Year",
        range = c(1970, 2050)
      ),
      yaxis = list(
        title = "Productivity (USD per hour, PPP)",
        tickformat = "$.1f"
      ),
      hovermode = "x unified",
      plot_bgcolor = "rgba(0,0,0,0)",
      paper_bgcolor = "rgba(0,0,0,0)",
      shapes = list(
        list(
          type = "line",
          line = list(color = "gray", dash = "dash", width = 2),
          xref = "x",
          yref = "paper",
          x0 = current_year,
          x1 = current_year,
          y0 = 0,
          y1 = 1
        )
      ),
      annotations = list(
        list(
          x = current_year,
          y = 0.9,
          text = "Present",
          showarrow = TRUE,
          arrowhead = 2,
          ax = 20,
          ay = -20,
          xref = "x",
          yref = "paper"
        )
      )
    )

  return(p)
}

# Function to create model performance summary table
create_performance_table <- function(model_metrics) {
  datatable(
    model_metrics,
    caption = "Bayesian Model Performance Metrics",
    options = list(
      dom = 't',
      pageLength = 10,
      ordering = FALSE,
      searching = FALSE,
      info = FALSE
    ),
    rownames = FALSE
  ) %>%
    formatRound(columns = "Value", digits = 3) %>%
    formatStyle(
      columns = c("Metric", "Value"),
      backgroundColor = "rgba(240, 240, 240, 0.5)",
      border = "1px solid #ddd"
    )
}

# Function to create parameter posterior plots
create_posterior_plot <- function(posterior_draws) {
  # Reshape data for plotting
  posterior_long <- posterior_draws %>%
    select(-starts_with(".")) %>%
    pivot_longer(cols = everything(), names_to = "parameter", values_to = "value") %>%
    mutate(
      parameter = str_replace_all(parameter, c(
        "b_Intercept" = "Intercept",
        "b_time_trend" = "Time Trend",
        "b_weighted_age" = "Weighted Age",
        "b_pop_over_50_pct" = "Pop. Over 50%"
      ))
    )

  p <- plot_ly(
    posterior_long,
    x = ~value,
    color = ~parameter,
    type = "histogram",
    alpha = 0.7,
    nbinsx = 30
  ) %>%
    layout(
      title = "Parameter Posterior Distributions",
      xaxis = list(title = "Parameter Value"),
      yaxis = list(title = "Density"),
      showlegend = TRUE,
      barmode = "overlay"
    )

  return(p)
}
# Function to create fully interactive productivity model with real-time parameter adjustment
create_interactive_productivity_model <- function(fitted_model = NULL, model_data = NULL) {
  # Define parameter scenarios for interactive exploration
  productivity_scenarios <- list(
    list(
      name = "Conservative Growth",
      tech_growth = 0.015,
      aging_penalty = 0.08,
      base_productivity = 8.3,
      innovation_boost_year = 2035,
      innovation_magnitude = 0.005
    ),
    list(
      name = "Baseline Scenario",
      tech_growth = 0.02,
      aging_penalty = 0.1,
      base_productivity = 8.3,
      innovation_boost_year = 2030,
      innovation_magnitude = 0.01
    ),
    list(
      name = "Optimistic Growth",
      tech_growth = 0.025,
      aging_penalty = 0.06,
      base_productivity = 8.3,
      innovation_boost_year = 2028,
      innovation_magnitude = 0.015
    ),
    list(
      name = "AI Revolution",
      tech_growth = 0.02,
      aging_penalty = 0.04,
      base_productivity = 8.3,
      innovation_boost_year = 2025,
      innovation_magnitude = 0.025
    ),
    list(
      name = "Demographic Crisis",
      tech_growth = 0.015,
      aging_penalty = 0.15,
      base_productivity = 8.3,
      innovation_boost_year = 2040,
      innovation_magnitude = 0.005
    )
  )

  # Function to calculate productivity given parameters
  calculate_scenario_productivity <- function(years, tech_growth, aging_penalty,
                                           base_productivity, innovation_boost_year,
                                           innovation_magnitude, base_year = 1980) {

    # Technology component (exponential growth)
    tech_multiplier <- (1 + tech_growth)^(years - base_year)

    # Demographic aging effect (gradual penalty)
    aging_effect <- pmax(1 - aging_penalty * (years - base_year) / 100, 0.4)

    # Innovation boost (step function)
    innovation_effect <- ifelse(years >= innovation_boost_year,
                              1 + innovation_magnitude * (years - innovation_boost_year + 1),
                              1)

    # Combined productivity model
    productivity <- base_productivity * tech_multiplier * aging_effect * innovation_effect

    return(productivity)
  }

  # Generate data for all scenarios
  years_extended <- 1980:2050

  scenario_curves <- map_dfr(productivity_scenarios, function(scenario) {
    tibble(
      year = years_extended,
      productivity = calculate_scenario_productivity(
        years_extended,
        scenario$tech_growth,
        scenario$aging_penalty,
        scenario$base_productivity,
        scenario$innovation_boost_year,
        scenario$innovation_magnitude
      ),
      scenario_name = scenario$name,
      tech_growth = scenario$tech_growth,
      aging_penalty = scenario$aging_penalty,
      innovation_year = scenario$innovation_boost_year,
      innovation_magnitude = scenario$innovation_magnitude
    )
  })

  # Create the interactive plot
  colors <- c("#8c564b", "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728")

  p <- plot_ly()

  # Add historical data and fitted model predictions if available
  if (!is.null(model_data)) {
    p <- p %>%
      add_trace(
        data = model_data,
        x = ~year, y = ~exp(log_productivity),
        type = "scatter", mode = "markers+lines",
        name = "Historical Data",
        line = list(color = "black", width = 4),
        marker = list(color = "black", size = 10),
        hovertemplate = "Historical<br>Year: %{x}<br>Productivity: $%{y:.1f}/hour<extra></extra>"
      )
  }

  # Add fitted model predictions if available
  if (!is.null(fitted_model) && !is.null(model_data)) {
    tryCatch({
      cat("Adding fitted model predictions to plot...\n")

      # Generate fitted values for historical period
      fitted_values <- fitted(fitted_model, summary = TRUE)

      # Create fitted values dataframe
      fitted_df <- tibble(
        year = model_data$year,
        fitted_productivity = exp(fitted_values[,"Estimate"]),
        lower_ci = exp(fitted_values[,"Q2.5"]),
        upper_ci = exp(fitted_values[,"Q97.5"])
      )

      cat("Fitted values generated for", nrow(fitted_df), "years\n")

      # Add uncertainty band first (so it appears behind the line)
      p <- p %>%
        add_ribbons(
          data = fitted_df,
          x = ~year,
          ymin = ~lower_ci,
          ymax = ~upper_ci,
          fillcolor = "rgba(0,150,100,0.2)",
          line = list(color = "transparent"),
          name = "95% Credible Interval",
          hovertemplate = "95% CI<br>Year: %{x}<br>Lower: $%{ymin:.1f}/hour<br>Upper: $%{ymax:.1f}/hour<extra></extra>"
        ) %>%
        # Add fitted line
        add_trace(
          data = fitted_df,
          x = ~year, y = ~fitted_productivity,
          type = "scatter", mode = "lines",
          name = "Bayesian Model Fit",
          line = list(color = "#2ca02c", width = 4, dash = "solid"),
          hovertemplate = "Bayesian Model<br>Year: %{x}<br>Fitted: $%{y:.1f}/hour<extra></extra>"
        )

      cat("Bayesian model visualization added successfully\n")

    }, error = function(e) {
      cat("Error adding fitted model to plot:", e$message, "\n")
      cat("Continuing without fitted model visualization\n")
    })
  }

  # Add scenario curves with different visibility settings
  for (i in seq_along(productivity_scenarios)) {
    scenario_name <- productivity_scenarios[[i]]$name
    scenario_data <- scenario_curves %>% filter(scenario_name == !!scenario_name)

    # Show Baseline and AI Revolution initially
    is_visible <- scenario_name %in% c("Baseline Scenario", "AI Revolution")

    p <- p %>%
      add_trace(
        data = scenario_data,
        x = ~year, y = ~productivity,
        type = "scatter", mode = "lines",
        name = scenario_name,
        line = list(
          color = colors[i],
          width = ifelse(scenario_name == "Baseline Scenario", 3, 2),
          dash = ifelse(grepl("AI|Crisis", scenario_name), "dash", "solid")
        ),
        visible = if (is_visible) TRUE else "legendonly",
        hovertemplate = paste0(
          "%{fullData.name}<br>",
          "Year: %{x}<br>",
          "Productivity: $%{y:.1f}/hour<br>",
          "Tech Growth: ", unique(scenario_data$tech_growth)*100, "%<br>",
          "Aging Penalty: ", unique(scenario_data$aging_penalty)*100, "%<br>",
          "Innovation Boost: ", unique(scenario_data$innovation_year),
          "<extra></extra>"
        )
      )
  }

  p <- p %>%
    layout(
      title = list(
        text = "Interactive Productivity Model: Explore Parameter Impact",
        font = list(size = 18)
      ),
      xaxis = list(
        title = "Year",
        range = c(1980, 2050),
        showgrid = TRUE
      ),
      yaxis = list(
        title = "Productivity (USD/hour, PPP)",
        showgrid = TRUE,
        tickformat = "$.1f"
      ),
      hovermode = "x unified",
      legend = list(
        x = 0.02, y = 0.98,
        bgcolor = "rgba(255,255,255,0.8)"
      ),
      plot_bgcolor = "rgba(240,240,240,0.3)",
      paper_bgcolor = "rgba(0,0,0,0)",
      width = 900,
      height = 600,
      shapes = list(
        # Present day line
        list(
          type = "line",
          line = list(color = "gray", dash = "dash", width = 2),
          xref = "x", yref = "paper",
          x0 = 2023, x1 = 2023,
          y0 = 0, y1 = 1
        )
      ),
      annotations = list(
        list(
          x = 2023, y = 0.85,
          text = "Present",
          showarrow = TRUE, arrowhead = 2,
          ax = 20, ay = -20,
          xref = "x", yref = "paper"
        ),
        list(
          text = "Click legend items to compare scenarios<br>Each scenario shows different combinations of:<br>• Technology growth rates • Aging workforce penalties • Innovation timing",
          x = 0.02, y = 0.02,
          xref = "paper", yref = "paper",
          showarrow = FALSE,
          font = list(size = 11, color = "gray"),
          align = "left"
        )
      ),
      # Add interactive buttons for scenario comparison
      updatemenus = list(
        list(
          type = "buttons",
          direction = "down",
          showactive = TRUE,
          x = 0.65, y = 0.95,
          buttons = list(
            list(
              label = "Show All",
              method = "restyle",
              args = list("visible", c(TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE))
            ),
            list(
              label = "Model vs Data",
              method = "restyle",
              args = list("visible", c(TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE))
            ),
            list(
              label = "Conservative vs Optimistic",
              method = "restyle",
              args = list("visible", c(TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, FALSE))
            ),
            list(
              label = "AI vs Crisis",
              method = "restyle",
              args = list("visible", c(TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, FALSE, TRUE))
            )
          )
        )
      )
    )

  return(p)
}
