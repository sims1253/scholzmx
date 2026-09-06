# Stationarity Analysis and Time Series Diagnostics
# Author: Generated for scholzmx blog
# Date: 2025-09-26
# Purpose: Test for unit roots and assess stationarity of productivity and EPI series

library(tidyverse)

# Optional packages with fallbacks
has_tseries <- requireNamespace("tseries", quietly = TRUE)
has_urca <- requireNamespace("urca", quietly = TRUE)
has_forecast <- requireNamespace("forecast", quietly = TRUE)
has_bcp <- requireNamespace("bcp", quietly = TRUE)
has_vars <- requireNamespace("vars", quietly = TRUE)

if (!has_tseries) {
  cat("Note: 'tseries' package not available. Some unit root tests will be skipped.\n")
}
if (!has_urca) {
  cat("Note: 'urca' package not available. Some unit root tests will be skipped.\n")
}
if (!has_forecast) {
  cat("Note: 'forecast' package not available. Some features will be limited.\n")
}

# Function to perform comprehensive stationarity tests
test_stationarity <- function(data, variable_name, max_lags = 4) {

  # Extract the time series
  ts_data <- data[[variable_name]]
  ts_data <- ts_data[!is.na(ts_data)]  # Remove any NAs

  if (length(ts_data) < 10) {
    stop("Insufficient data points for stationarity testing")
  }

  cat("=== STATIONARITY ANALYSIS FOR:", toupper(variable_name), "===\n\n")

  # 1. Augmented Dickey-Fuller (ADF) test
  cat("1. Augmented Dickey-Fuller Tests:\n")

  adf_trend <- NULL
  if (has_tseries) {
    # ADF with trend and intercept
    adf_trend <- tryCatch({
      tseries::adf.test(ts_data, alternative = "stationary", k = max_lags)
    }, error = function(e) NULL)

    if (!is.null(adf_trend)) {
      cat("   ADF (trend + intercept): statistic =", round(adf_trend$statistic, 4),
          ", p-value =", format(adf_trend$p.value, scientific = TRUE))
      cat(" -", ifelse(adf_trend$p.value < 0.05, "STATIONARY", "NON-STATIONARY"), "\n")
    }
  } else {
    cat("   ADF test skipped (tseries package not available)\n")
  }

  urca_adf <- NULL
  if (has_urca) {
    # ADF with intercept only
    urca_adf <- tryCatch({
      urca::ur.df(ts_data, type = "drift", lags = max_lags)
    }, error = function(e) NULL)

    if (!is.null(urca_adf)) {
      adf_stat <- urca_adf@teststat[1]
      adf_critical <- urca_adf@cval[1, 2]  # 5% critical value
      cat("   ADF (intercept only): statistic =", round(adf_stat, 4),
          ", critical value (5%) =", round(adf_critical, 4))
      cat(" -", ifelse(adf_stat < adf_critical, "STATIONARY", "NON-STATIONARY"), "\n")
    }
  } else {
    cat("   URCA ADF test skipped (urca package not available)\n")
  }

  # 2. Phillips-Perron test
  cat("\n2. Phillips-Perron Test:\n")
  pp_test <- NULL
  if (has_tseries) {
    pp_test <- tryCatch({
      tseries::pp.test(ts_data, alternative = "stationary")
    }, error = function(e) NULL)

    if (!is.null(pp_test)) {
      cat("   PP statistic =", round(pp_test$statistic, 4),
          ", p-value =", format(pp_test$p.value, scientific = TRUE))
      cat(" -", ifelse(pp_test$p.value < 0.05, "STATIONARY", "NON-STATIONARY"), "\n")
    }
  } else {
    cat("   PP test skipped (tseries package not available)\n")
  }

  # 3. KPSS test (null hypothesis: stationary)
  cat("\n3. KPSS Test (H0: stationary):\n")
  kpss_test <- NULL
  if (has_tseries) {
    kpss_test <- tryCatch({
      tseries::kpss.test(ts_data, null = "Trend")
    }, error = function(e) NULL)

    if (!is.null(kpss_test)) {
      cat("   KPSS statistic =", round(kpss_test$statistic, 4),
          ", p-value =", format(kpss_test$p.value, scientific = TRUE))
      cat(" -", ifelse(kpss_test$p.value > 0.05, "STATIONARY", "NON-STATIONARY"), "\n")
    }
  } else {
    cat("   KPSS test skipped (tseries package not available)\n")
  }

  # 4. Check for structural breaks
  cat("\n4. Structural Break Analysis:\n")
  if (length(ts_data) >= 15 && has_bcp) {  # Need sufficient data for break testing
    breaks <- tryCatch({
      bcp::bcp(ts_data, mcmc = 1000, burnin = 100)
    }, error = function(e) NULL)

    if (!is.null(breaks)) {
      prob_breaks <- which(breaks$posterior.prob > 0.5)
      if (length(prob_breaks) > 0) {
        cat("   Potential structural breaks at observations:", paste(prob_breaks, collapse = ", "), "\n")
      } else {
        cat("   No significant structural breaks detected\n")
      }
    }
  } else if (!has_bcp) {
    cat("   Structural break analysis skipped (bcp package not available)\n")
  } else {
    cat("   Insufficient data for structural break analysis\n")
  }

  # 5. Fallback analysis if formal tests unavailable
  if (!has_tseries && !has_urca) {
    cat("\n5. BASIC STATIONARITY INDICATORS:\n")

    # Simple trend test
    time_index <- 1:length(ts_data)
    trend_model <- lm(ts_data ~ time_index)
    trend_pvalue <- summary(trend_model)$coefficients[2, 4]

    cat("   Linear trend test: p-value =", format(trend_pvalue, scientific = TRUE))
    cat(" -", ifelse(trend_pvalue > 0.05, "NO TREND", "SIGNIFICANT TREND"), "\n")

    # Variance stability (first half vs second half)
    n <- length(ts_data)
    first_half_var <- var(ts_data[1:(n/2)])
    second_half_var <- var(ts_data[(n/2+1):n])
    var_ratio <- max(first_half_var, second_half_var) / min(first_half_var, second_half_var)

    cat("   Variance stability ratio:", round(var_ratio, 2))
    cat(" -", ifelse(var_ratio < 3, "STABLE", "UNSTABLE"), "\n")

    # ACF at lag 1 (persistence indicator)
    acf_result <- acf(ts_data, lag.max = 1, plot = FALSE)
    acf_lag1 <- acf_result$acf[2]

    cat("   ACF at lag 1:", round(acf_lag1, 3))
    cat(" -", ifelse(abs(acf_lag1) < 0.8, "LOW PERSISTENCE", "HIGH PERSISTENCE"), "\n")

    # Simple recommendation
    recommendation <- ifelse(trend_pvalue > 0.05 & var_ratio < 3 & abs(acf_lag1) < 0.8,
                           "LIKELY STATIONARY - proceed with levels",
                           "LIKELY NON-STATIONARY - consider differencing")
  }

  # 6. Summary and recommendations
  cat("\n6. SUMMARY AND RECOMMENDATIONS:\n")

  # Count stationary results
  stationary_count <- 0
  total_tests <- 0

  if (!is.null(adf_trend)) {
    stationary_count <- stationary_count + ifelse(adf_trend$p.value < 0.05, 1, 0)
    total_tests <- total_tests + 1
  }
  if (!is.null(pp_test)) {
    stationary_count <- stationary_count + ifelse(pp_test$p.value < 0.05, 1, 0)
    total_tests <- total_tests + 1
  }
  if (!is.null(kpss_test)) {
    stationary_count <- stationary_count + ifelse(kpss_test$p.value > 0.05, 1, 0)
    total_tests <- total_tests + 1
  }

  if (total_tests > 0) {
    prop_stationary <- stationary_count / total_tests
    cat("   ", stationary_count, "out of", total_tests, "tests suggest stationarity\n")

    if (prop_stationary >= 0.67) {
      recommendation <- "STATIONARY - proceed with levels specification"
    } else if (prop_stationary >= 0.33) {
      recommendation <- "MIXED EVIDENCE - consider both levels and first differences"
    } else {
      recommendation <- "NON-STATIONARY - use first differences or error correction model"
    }
    cat("   Recommendation:", recommendation, "\n")
  }

  # Return results for further analysis
  results <- list(
    variable = variable_name,
    data = ts_data,
    adf = adf_trend,
    pp = pp_test,
    kpss = kpss_test,
    breaks = if (exists("breaks")) breaks else NULL,
    recommendation = if (exists("recommendation")) recommendation else "Insufficient evidence"
  )

  return(results)
}

# Function to analyze first differences if series is non-stationary
analyze_differences <- function(data, variable_name) {

  ts_data <- data[[variable_name]]
  ts_data <- ts_data[!is.na(ts_data)]

  cat("=== ANALYZING FIRST DIFFERENCES ===\n\n")

  # Calculate first differences
  diff_data <- diff(ts_data)

  cat("Original series length:", length(ts_data), "\n")
  cat("First differences length:", length(diff_data), "\n")
  cat("First differences mean:", round(mean(diff_data, na.rm = TRUE), 6), "\n")
  cat("First differences SD:", round(sd(diff_data, na.rm = TRUE), 6), "\n\n")

  # Test stationarity of first differences
  cat("Testing stationarity of first differences:\n")

  # ADF test on differences
  adf_diff <- tryCatch({
    adf.test(diff_data, alternative = "stationary")
  }, error = function(e) NULL)

  if (!is.null(adf_diff)) {
    cat("ADF on first differences: p-value =", format(adf_diff$p.value, scientific = TRUE))
    cat(" -", ifelse(adf_diff$p.value < 0.05, "STATIONARY", "NON-STATIONARY"), "\n")
  }

  # Create difference series for modeling
  diff_series <- tibble(
    year = data$year[-1],  # Remove first year due to differencing
    original = ts_data[-1],
    first_diff = diff_data,
    growth_rate = diff_data / ts_data[-length(ts_data)]  # Approximation to log growth
  )

  return(diff_series)
}

# Function to perform cointegration analysis between productivity and EPI
test_cointegration <- function(productivity_data, epi_data) {

  cat("=== COINTEGRATION ANALYSIS ===\n\n")

  # Merge datasets
  merged_data <- productivity_data %>%
    inner_join(epi_data, by = "year") %>%
    filter(!is.na(productivity_per_hour), !is.na(epi_normalized)) %>%
    mutate(
      log_productivity = log(productivity_per_hour)
    )

  if (nrow(merged_data) < 10) {
    cat("Insufficient overlapping data for cointegration analysis\n")
    return(NULL)
  }

  # Extract time series
  log_prod <- merged_data$log_productivity
  epi <- merged_data$epi_normalized

  cat("Testing cointegration between log(productivity) and EPI\n")
  cat("Sample size:", length(log_prod), "observations\n\n")

  # Engle-Granger two-step procedure
  cat("1. Engle-Granger Cointegration Test:\n")

  # Step 1: Estimate long-run relationship
  coint_model <- lm(log_prod ~ epi)
  residuals_coint <- residuals(coint_model)

  cat("   Long-run relationship: log(productivity) = ", round(coef(coint_model)[1], 4),
      " + ", round(coef(coint_model)[2], 4), " * EPI\n")
  cat("   R-squared:", round(summary(coint_model)$r.squared, 4), "\n")

  # Step 2: Test stationarity of residuals
  adf_residuals <- NULL
  if (has_tseries) {
    adf_residuals <- tryCatch({
      tseries::adf.test(residuals_coint, alternative = "stationary")
    }, error = function(e) NULL)

    if (!is.null(adf_residuals)) {
      cat("   ADF test on residuals: p-value =", format(adf_residuals$p.value, scientific = TRUE))
      cat(" -", ifelse(adf_residuals$p.value < 0.05, "COINTEGRATED", "NOT COINTEGRATED"), "\n")
    }
  } else {
    cat("   ADF test on residuals skipped (tseries package not available)\n")
  }

  # Johansen cointegration test (if vars package available)
  cat("\n2. Johansen Cointegration Test:\n")
  johan_test <- NULL
  if (has_vars) {
    johan_test <- tryCatch({
      var_data <- cbind(log_prod, epi)
      # Determine optimal lag
      lag_select <- vars::VARselect(var_data, lag.max = 4)
      optimal_lag <- lag_select$selection["AIC(n)"]
      # Johansen test
      vars::ca.jo(var_data, type = "trace", ecdet = "const", K = optimal_lag)
    }, error = function(e) {
      cat("   Error running Johansen test:", e$message, "\n")
      NULL
    })
  } else {
    cat("   Johansen test skipped (vars package not available)\n")
  }

  if (!is.null(johan_test)) {
    johan_summary <- summary(johan_test)
    cat("   Trace test results:\n")
    for (i in 1:nrow(johan_summary@teststat)) {
      cat("   r =", i-1, ": statistic =", round(johan_summary@teststat[i], 4),
          ", critical value (5%) =", round(johan_summary@cval[i, 2], 4))
      if (johan_summary@teststat[i] > johan_summary@cval[i, 2]) {
        cat(" - REJECT (cointegration)\n")
      } else {
        cat(" - FAIL TO REJECT\n")
      }
    }
  }

  # Prepare results
  results <- list(
    data = merged_data,
    long_run_model = coint_model,
    residuals = residuals_coint,
    adf_residuals = adf_residuals,
    johansen = johan_test,
    cointegrated = if (!is.null(adf_residuals)) adf_residuals$p.value < 0.05 else FALSE
  )

  return(results)
}

# Function to recommend modeling approach based on stationarity results
recommend_modeling_approach <- function(stationarity_results) {

  cat("=== MODELING RECOMMENDATIONS ===\n\n")

  # Analyze results for each variable
  for (result in stationarity_results) {
    cat("Variable:", result$variable, "\n")
    cat("Recommendation:", result$recommendation, "\n\n")
  }

  # Overall recommendation
  non_stationary_vars <- sum(sapply(stationarity_results, function(x) {
    grepl("NON-STATIONARY", x$recommendation)
  }))

  total_vars <- length(stationarity_results)

  cat("OVERALL MODELING STRATEGY:\n")

  if (non_stationary_vars == 0) {
    strategy <- "Use LEVELS specification with AR terms"
    cat("All variables appear stationary - use levels specification with autoregressive terms\n")
  } else if (non_stationary_vars == total_vars) {
    strategy <- "Use FIRST DIFFERENCES or Vector Error Correction Model"
    cat("All variables appear non-stationary - consider:\n")
    cat("1. First differences specification\n")
    cat("2. Vector Error Correction Model (VECM) if cointegrated\n")
    cat("3. State-space model with explicit trend components\n")
  } else {
    strategy <- "Use MIXED approach"
    cat("Mixed stationarity - consider:\n")
    cat("1. Separate analysis for stationary vs non-stationary variables\n")
    cat("2. Error correction model if long-run relationships exist\n")
    cat("3. Robust specification with both levels and differences\n")
  }

  return(list(
    strategy = strategy,
    non_stationary_count = non_stationary_vars,
    total_variables = total_vars
  ))
}

# Function to create visual diagnostics for stationarity
create_stationarity_plots <- function(data, variable_name, stationarity_result = NULL) {

  ts_data <- data[[variable_name]]
  years <- data$year

  plots_list <- list()

  # 1. Time series plot
  plots_list$timeseries <- ggplot(data, aes(x = year, y = .data[[variable_name]])) +
    geom_line(size = 1, color = "steelblue") +
    geom_point(size = 2, color = "steelblue", alpha = 0.7) +
    labs(
      title = paste("Time Series:", str_to_title(variable_name)),
      x = "Year",
      y = str_to_title(variable_name)
    ) +
    theme_minimal()

  # 2. First differences
  diff_data <- diff(ts_data)
  diff_years <- years[-1]

  plots_list$first_differences <- ggplot(data.frame(year = diff_years, diff = diff_data),
                                        aes(x = year, y = diff)) +
    geom_line(size = 1, color = "red") +
    geom_point(size = 2, color = "red", alpha = 0.7) +
    geom_hline(yintercept = 0, linetype = "dashed", alpha = 0.5) +
    labs(
      title = paste("First Differences:", str_to_title(variable_name)),
      x = "Year",
      y = "First Difference"
    ) +
    theme_minimal()

  # 3. ACF and PACF plots
  if (length(ts_data) > 10) {
    acf_data <- acf(ts_data, plot = FALSE, lag.max = min(20, length(ts_data)/4))
    pacf_data <- pacf(ts_data, plot = FALSE, lag.max = min(20, length(ts_data)/4))

    # ACF plot
    acf_df <- data.frame(
      lag = acf_data$lag[-1],  # Remove lag 0
      acf = acf_data$acf[-1]
    )

    plots_list$acf <- ggplot(acf_df, aes(x = lag, y = acf)) +
      geom_col(fill = "steelblue", alpha = 0.7) +
      geom_hline(yintercept = c(-1.96/sqrt(length(ts_data)), 1.96/sqrt(length(ts_data))),
                 linetype = "dashed", color = "red") +
      labs(title = "Autocorrelation Function", x = "Lag", y = "ACF") +
      theme_minimal()

    # PACF plot
    pacf_df <- data.frame(
      lag = pacf_data$lag,
      pacf = pacf_data$acf
    )

    plots_list$pacf <- ggplot(pacf_df, aes(x = lag, y = pacf)) +
      geom_col(fill = "darkgreen", alpha = 0.7) +
      geom_hline(yintercept = c(-1.96/sqrt(length(ts_data)), 1.96/sqrt(length(ts_data))),
                 linetype = "dashed", color = "red") +
      labs(title = "Partial Autocorrelation Function", x = "Lag", y = "PACF") +
      theme_minimal()
  }

  return(plots_list)
}

# Simplified function for quick stationarity assessment
quick_stationarity_check <- function(productivity_data, epi_data) {

  cat("=== QUICK STATIONARITY ASSESSMENT ===\n\n")

  results <- list()

  # Test productivity
  cat("1. PRODUCTIVITY SERIES:\n")
  productivity_result <- test_stationarity(productivity_data, "productivity_per_hour", max_lags = 3)
  results$productivity <- productivity_result

  # Test EPI
  cat("\n2. EPI SERIES:\n")
  epi_result <- test_stationarity(epi_data, "epi_normalized", max_lags = 3)
  results$epi <- epi_result

  # Test cointegration
  cat("\n3. COINTEGRATION:\n")
  coint_result <- test_cointegration(productivity_data, epi_data)
  results$cointegration <- coint_result

  # Summary recommendations
  cat("\n=== MODELING RECOMMENDATIONS ===\n")

  # Extract recommendations
  prod_rec <- results$productivity$recommendation
  epi_rec <- results$epi$recommendation

  cat("Productivity:", prod_rec, "\n")
  cat("EPI:", epi_rec, "\n")

  # Overall recommendation
  if (grepl("STATIONARY", prod_rec) && grepl("STATIONARY", epi_rec)) {
    overall_rec <- "Use LEVELS specification (both series stationary)"
  } else if (grepl("NON-STATIONARY", prod_rec) && grepl("NON-STATIONARY", epi_rec)) {
    if (!is.null(coint_result) && !is.null(coint_result$cointegrated) && coint_result$cointegrated) {
      overall_rec <- "Use ERROR CORRECTION MODEL (cointegrated)"
    } else {
      overall_rec <- "Use GROWTH RATES specification (non-stationary, not cointegrated)"
    }
  } else {
    overall_rec <- "Use MIXED approach (different stationarity properties)"
  }

  cat("Overall recommendation:", overall_rec, "\n\n")

  results$overall_recommendation <- overall_rec
  return(results)
}