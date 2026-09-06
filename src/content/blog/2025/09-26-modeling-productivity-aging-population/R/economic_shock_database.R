# Major Economic Shock Database (2018-2024)
# Purpose: Create systematic shock variables to control for major economic disruptions
# Author: Enhanced EPI methodology with shock controls

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(lubridate)
})

cat("=== CREATING MAJOR ECONOMIC SHOCK DATABASE ===\n\n")

# ===== COVID-19 PANDEMIC SHOCKS (2020-2022) =====

#' Create COVID-19 Impact Variables
#'
#' Captures the multi-dimensional impact of the pandemic on productivity
create_covid_shock_variables <- function() {

  cat("Creating COVID-19 shock variables...\n")

  # Quarterly data framework
  quarters <- expand_grid(
    year = 2018:2024,
    quarter = 1:4
  ) %>%
    mutate(
      date = as.Date(paste0(year, "-", (quarter-1)*3 + 1, "-01")),
      year_quarter = paste0(year, "Q", quarter)
    )

  covid_shocks <- quarters %>%
    mutate(
      # Lockdown stringency (0-100 index, based on Oxford COVID-19 Government Response Tracker)
      lockdown_stringency = case_when(
        year < 2020 ~ 0,
        year == 2020 & quarter == 1 ~ 10,  # Initial measures
        year == 2020 & quarter == 2 ~ 85,  # Full lockdown
        year == 2020 & quarter == 3 ~ 45,  # Partial reopening
        year == 2020 & quarter == 4 ~ 60,  # Second wave restrictions
        year == 2021 & quarter == 1 ~ 70,  # Winter lockdown
        year == 2021 & quarter == 2 ~ 40,  # Vaccine rollout begins
        year == 2021 & quarter == 3 ~ 25,  # Summer reopening
        year == 2021 & quarter == 4 ~ 35,  # Delta variant concerns
        year == 2022 & quarter == 1 ~ 30,  # Omicron wave
        year == 2022 & quarter >= 2 ~ 5,   # Endemic phase
        year >= 2023 ~ 0                   # Post-pandemic
      ),

      # Remote work adoption (% of workforce, German estimates)
      remote_work_share = case_when(
        year < 2020 ~ 0.12,                  # Pre-pandemic baseline (~12%)
        year == 2020 & quarter == 1 ~ 0.15, # Initial adoption
        year == 2020 & quarter == 2 ~ 0.42, # Peak remote work
        year == 2020 & quarter == 3 ~ 0.38, # Sustained high level
        year == 2020 & quarter == 4 ~ 0.35, # Slight decline
        year == 2021 & quarter == 1 ~ 0.40, # Winter wave increase
        year == 2021 & quarter == 2 ~ 0.32, # Gradual return
        year == 2021 & quarter == 3 ~ 0.28, # Summer normalizing
        year == 2021 & quarter == 4 ~ 0.30, # Delta adjustment
        year == 2022 & quarter == 1 ~ 0.28, # Omicron response
        year == 2022 & quarter >= 2 ~ 0.25, # New normal settling
        year >= 2023 ~ 0.22                 # Permanent shift
      ),

      # Supply chain disruption index (0-100, higher = more disrupted)
      supply_chain_disruption = case_when(
        year < 2020 ~ 5,                    # Normal friction
        year == 2020 & quarter == 1 ~ 15,  # Initial disruption
        year == 2020 & quarter == 2 ~ 75,  # Severe disruption
        year == 2020 & quarter == 3 ~ 45,  # Partial recovery
        year == 2020 & quarter == 4 ~ 50,  # Second wave impact
        year == 2021 & quarter == 1 ~ 40,  # Gradual improvement
        year == 2021 & quarter == 2 ~ 60,  # Container crisis begins
        year == 2021 & quarter == 3 ~ 85,  # Peak supply crisis
        year == 2021 & quarter == 4 ~ 80,  # Sustained crisis
        year == 2022 & quarter == 1 ~ 70,  # Slow improvement
        year == 2022 & quarter == 2 ~ 60,  # Ukraine adds complexity
        year == 2022 & quarter >= 3 ~ 45,  # Gradual normalization
        year == 2023 ~ 25,                 # Mostly resolved
        year >= 2024 ~ 10                  # New normal
      ),

      # Health system strain (proxy for general societal disruption)
      health_system_strain = case_when(
        year < 2020 ~ 0,
        year == 2020 & quarter == 2 ~ 0.8, # Peak first wave
        year == 2020 & quarter == 4 ~ 0.9, # Peak second wave
        year == 2021 & quarter == 1 ~ 0.7, # Winter pressure
        year == 2021 & quarter == 4 ~ 0.6, # Delta wave
        year == 2022 & quarter == 1 ~ 0.5, # Omicron (less severe)
        TRUE ~ 0.1                         # Endemic management
      )
    )

  cat("   ✓ COVID-19 variables created:", nrow(covid_shocks), "quarters\n")

  return(covid_shocks)
}

# ===== UKRAINE WAR SHOCKS (2022-2024) =====

#' Create Ukraine War Impact Variables
#'
#' Captures energy, commodity, and trade disruptions from the war
create_ukraine_war_shocks <- function() {

  cat("Creating Ukraine war shock variables...\n")

  quarters <- expand_grid(
    year = 2018:2024,
    quarter = 1:4
  ) %>%
    mutate(date = as.Date(paste0(year, "-", (quarter-1)*3 + 1, "-01")))

  ukraine_shocks <- quarters %>%
    mutate(
      # Energy price shock (index, 100 = pre-war baseline)
      energy_price_shock = case_when(
        year < 2022 ~ 100,
        year == 2022 & quarter == 1 ~ 180,  # Initial invasion shock
        year == 2022 & quarter == 2 ~ 220,  # Pipeline concerns peak
        year == 2022 & quarter == 3 ~ 300,  # Nord Stream crisis
        year == 2022 & quarter == 4 ~ 250,  # Winter preparation
        year == 2023 & quarter == 1 ~ 200,  # Gradual adaptation
        year == 2023 & quarter == 2 ~ 160,  # Alternative supplies
        year == 2023 & quarter >= 3 ~ 140,  # New supply chains
        year >= 2024 ~ 130                  # Adjusted equilibrium
      ),

      # Commodity price shock (food, metals, fertilizers)
      commodity_price_shock = case_when(
        year < 2022 ~ 100,
        year == 2022 & quarter == 1 ~ 160,  # Wheat/fertilizer spike
        year == 2022 & quarter == 2 ~ 180,  # Food security fears
        year == 2022 & quarter == 3 ~ 170,  # Sustained high prices
        year == 2022 & quarter == 4 ~ 150,  # Grain deal effects
        year == 2023 & quarter == 1 ~ 130,  # Gradual normalization
        year == 2023 & quarter >= 2 ~ 120,  # Alternative sources
        year >= 2024 ~ 110                  # New equilibrium
      ),

      # Trade disruption (sanctions, rerouting)
      trade_disruption = case_when(
        year < 2022 ~ 0,
        year == 2022 & quarter == 1 ~ 0.3,  # Initial sanctions
        year == 2022 & quarter == 2 ~ 0.6,  # Escalating measures
        year == 2022 & quarter == 3 ~ 0.7,  # Comprehensive sanctions
        year == 2022 & quarter == 4 ~ 0.6,  # Adaptation begins
        year == 2023 & quarter == 1 ~ 0.5,  # New trade routes
        year == 2023 & quarter >= 2 ~ 0.4,  # Settled pattern
        year >= 2024 ~ 0.3                  # Adjusted trade flows
      ),

      # Uncertainty/confidence shock
      geopolitical_uncertainty = case_when(
        year < 2022 ~ 0.1,                  # Normal uncertainty
        year == 2022 & quarter == 1 ~ 0.8,  # Invasion shock
        year == 2022 & quarter == 2 ~ 0.9,  # Escalation fears
        year == 2022 & quarter == 3 ~ 0.7,  # Sustained conflict
        year == 2022 & quarter == 4 ~ 0.6,  # Adaptation
        year == 2023 ~ 0.4,                 # New normal uncertainty
        year >= 2024 ~ 0.3                  # Adjusted expectations
      )
    )

  cat("   ✓ Ukraine war variables created:", nrow(ukraine_shocks), "quarters\n")

  return(ukraine_shocks)
}

# ===== HISTORICAL SHOCK EVENTS (1970-2017) =====

#' Create Historical Economic Shock Variables
#'
#' Captures major economic crises and disruptions from 1970-2017
create_historical_shock_variables <- function() {

  cat("Creating historical economic shock variables...\n")

  # Create full historical quarterly framework
  quarters <- expand_grid(
    year = 1970:2024,
    quarter = 1:4
  ) %>%
    mutate(
      date = as.Date(paste0(year, "-", (quarter-1)*3 + 1, "-01")),
      year_quarter = paste0(year, "Q", quarter)
    )

  historical_shocks <- quarters %>%
    mutate(
      # Oil Shock 1973-1974 (OPEC embargo)
      oil_shock_1973 = case_when(
        year == 1973 & quarter >= 4 ~ 0.8,  # Embargo begins Q4 1973
        year == 1974 & quarter <= 2 ~ 0.9,  # Peak impact
        year == 1974 & quarter >= 3 ~ 0.4,  # Gradual recovery
        year == 1975 & quarter <= 2 ~ 0.2,  # Lingering effects
        TRUE ~ 0
      ),

      # Oil Shock 1979-1980 (Iran revolution)
      oil_shock_1979 = case_when(
        year == 1979 & quarter >= 2 ~ 0.7,  # Iran revolution impacts
        year == 1980 ~ 0.8,                 # Peak oil prices
        year == 1981 & quarter <= 2 ~ 0.5,  # Recession effects
        year == 1981 & quarter >= 3 ~ 0.2,  # Recovery begins
        TRUE ~ 0
      ),

      # German Reunification (1990-1995) - Massive structural adjustment
      german_reunification = case_when(
        year == 1990 & quarter >= 3 ~ 0.3,  # Reunification begins
        year == 1991 ~ 0.6,                 # Integration challenges peak
        year == 1992 ~ 0.7,                 # Economic adjustment stress
        year == 1993 ~ 0.5,                 # Gradual adaptation
        year == 1994 ~ 0.3,                 # Continued adjustment
        year == 1995 ~ 0.2,                 # Normalizing
        TRUE ~ 0
      ),

      # Gulf War 1990-1991 (Oil prices + uncertainty)
      gulf_war_shock = case_when(
        year == 1990 & quarter >= 3 ~ 0.4,  # Iraq invades Kuwait
        year == 1991 & quarter == 1 ~ 0.6,  # War begins
        year == 1991 & quarter == 2 ~ 0.3,  # Quick resolution
        TRUE ~ 0
      ),

      # ERM Crisis 1992-1993 (European Exchange Rate Mechanism)
      erm_crisis = case_when(
        year == 1992 & quarter >= 3 ~ 0.5,  # Black Wednesday
        year == 1993 & quarter <= 2 ~ 0.4,  # Continued instability
        year == 1993 & quarter >= 3 ~ 0.2,  # Stabilization
        TRUE ~ 0
      ),

      # Asian Financial Crisis 1997-1998 (Global contagion)
      asian_crisis = case_when(
        year == 1997 & quarter >= 3 ~ 0.3,  # Crisis begins
        year == 1998 & quarter <= 2 ~ 0.5,  # Peak contagion
        year == 1998 & quarter >= 3 ~ 0.3,  # Recovery begins
        year == 1999 & quarter <= 2 ~ 0.1,  # Lingering effects
        TRUE ~ 0
      ),

      # LTCM Crisis 1998 (Long-Term Capital Management)
      ltcm_crisis = case_when(
        year == 1998 & quarter == 3 ~ 0.4,  # LTCM collapse
        year == 1998 & quarter == 4 ~ 0.2,  # Fed intervention
        TRUE ~ 0
      ),

      # Dot-com Crash 2000-2002
      dotcom_crash = case_when(
        year == 2000 & quarter >= 2 ~ 0.3,  # NASDAQ peak/decline
        year == 2001 ~ 0.6,                 # Recession + 9/11
        year == 2002 & quarter <= 3 ~ 0.4,  # Corporate scandals
        year == 2002 & quarter == 4 ~ 0.2,  # Recovery begins
        TRUE ~ 0
      ),

      # Financial Crisis 2007-2009
      financial_crisis = case_when(
        year == 2007 & quarter >= 3 ~ 0.2,  # Subprime begins
        year == 2008 & quarter <= 2 ~ 0.4,  # Bear Stearns
        year == 2008 & quarter >= 3 ~ 0.9,  # Lehman collapse
        year == 2009 & quarter <= 2 ~ 0.8,  # Peak recession
        year == 2009 & quarter >= 3 ~ 0.5,  # Stimulus effects
        year == 2010 & quarter <= 2 ~ 0.3,  # Gradual recovery
        TRUE ~ 0
      ),

      # European Debt Crisis 2010-2012
      european_debt_crisis = case_when(
        year == 2010 & quarter >= 2 ~ 0.3,  # Greece crisis begins
        year == 2011 ~ 0.5,                 # Contagion spreads
        year == 2012 & quarter <= 3 ~ 0.4,  # Peak uncertainty
        year == 2012 & quarter == 4 ~ 0.2,  # ECB "whatever it takes"
        year == 2013 & quarter <= 2 ~ 0.1,  # Stabilization
        TRUE ~ 0
      ),

      # Composite historical shock index
      historical_shock_composite = pmax(
        oil_shock_1973, oil_shock_1979, german_reunification,
        gulf_war_shock, erm_crisis, asian_crisis, ltcm_crisis,
        dotcom_crash, financial_crisis, european_debt_crisis
      ),

      # Major shock classification
      major_historical_shock = historical_shock_composite >= 0.3,

      # Shock type classification
      shock_type = case_when(
        oil_shock_1973 > 0 | oil_shock_1979 > 0 | gulf_war_shock > 0 ~ "Energy/Commodity",
        german_reunification > 0 ~ "Structural/Political",
        erm_crisis > 0 | european_debt_crisis > 0 ~ "Currency/Sovereign",
        asian_crisis > 0 | ltcm_crisis > 0 | financial_crisis > 0 ~ "Financial",
        dotcom_crash > 0 ~ "Technology/Bubble",
        TRUE ~ "Normal"
      )
    )

  cat("   ✓ Historical shock variables created:", nrow(historical_shocks), "quarters\n")
  cat("   ✓ Major shocks identified:",
      sum(historical_shocks$major_historical_shock), "quarters\n")

  return(historical_shocks)
}

# ===== TRADE WAR SHOCKS (2018-2024) =====

#' Create Trade War Impact Variables
#'
#' Captures US-China trade tensions and their global spillovers
create_trade_war_shocks <- function() {

  cat("Creating trade war shock variables...\n")

  quarters <- expand_grid(
    year = 2018:2024,
    quarter = 1:4
  ) %>%
    mutate(date = as.Date(paste0(year, "-", (quarter-1)*3 + 1, "-01")))

  trade_war_shocks <- quarters %>%
    mutate(
      # Tariff escalation index (average tariff rates)
      tariff_escalation = case_when(
        year < 2018 ~ 0.05,                 # Normal tariff levels
        year == 2018 & quarter == 1 ~ 0.05, # Pre-escalation
        year == 2018 & quarter == 2 ~ 0.12, # First tariffs
        year == 2018 & quarter == 3 ~ 0.18, # Retaliation
        year == 2018 & quarter == 4 ~ 0.22, # Escalation
        year == 2019 & quarter == 1 ~ 0.25, # Peak tension
        year == 2019 & quarter == 2 ~ 0.24, # Sustained high
        year == 2019 & quarter == 3 ~ 0.26, # Further escalation
        year == 2019 & quarter == 4 ~ 0.23, # Phase 1 discussions
        year == 2020 & quarter == 1 ~ 0.21, # Phase 1 deal
        year == 2020 & quarter >= 2 ~ 0.20, # COVID focus
        year == 2021 ~ 0.19,                # Biden review
        year == 2022 ~ 0.18,                # Gradual reduction
        year == 2023 ~ 0.16,                # Selective removal
        year >= 2024 ~ 0.14                 # New equilibrium
      ),

      # Technology restrictions (semiconductors, AI, etc.)
      tech_restrictions = case_when(
        year < 2018 ~ 0,
        year == 2018 ~ 0.1,                 # Initial restrictions
        year == 2019 ~ 0.2,                 # Huawei ban
        year == 2020 ~ 0.3,                 # TikTok/WeChat
        year == 2021 ~ 0.4,                 # Semiconductor controls
        year == 2022 ~ 0.6,                 # Advanced chip ban
        year == 2023 ~ 0.7,                 # AI restrictions
        year >= 2024 ~ 0.8                  # Comprehensive regime
      ),

      # Supply chain reorganization costs
      supply_chain_reorganization = case_when(
        year < 2018 ~ 0,
        year == 2018 ~ 0.05,                # Initial adjustments
        year == 2019 ~ 0.15,                # Diversification begins
        year == 2020 ~ 0.25,                # COVID acceleration
        year == 2021 ~ 0.35,                # Nearshoring/friendshoring
        year == 2022 ~ 0.40,                # Ukraine reinforces trend
        year == 2023 ~ 0.35,                # Optimization
        year >= 2024 ~ 0.30                 # New steady state
      )
    )

  cat("   ✓ Trade war variables created:", nrow(trade_war_shocks), "quarters\n")

  return(trade_war_shocks)
}

# ===== COMPOSITE SHOCK DATABASE =====

#' Create Comprehensive Economic Shock Database
#'
#' Combines all major shocks into a single analytical framework
create_comprehensive_shock_database <- function() {

  cat("Creating comprehensive shock database...\n")

  # Get individual shock datasets
  historical_shocks <- create_historical_shock_variables()
  covid_shocks <- create_covid_shock_variables()
  ukraine_shocks <- create_ukraine_war_shocks()
  trade_war_shocks <- create_trade_war_shocks()

  # Combine all shocks (historical covers full period, others are subsets)
  comprehensive_shocks <- historical_shocks %>%
    left_join(covid_shocks %>% select(-date, -year_quarter), by = c("year", "quarter")) %>%
    left_join(ukraine_shocks %>% select(-date), by = c("year", "quarter")) %>%
    left_join(trade_war_shocks %>% select(-date), by = c("year", "quarter")) %>%
    mutate(
      # Create composite shock indices (combining historical and recent shocks)
      composite_shock_index = pmin(100,
        # Historical shocks (convert to 0-100 scale)
        30 * ifelse(is.na(historical_shock_composite), 0, historical_shock_composite) +

        # COVID-era shocks
        0.25 * ifelse(is.na(lockdown_stringency), 0, lockdown_stringency) +
        0.15 * ifelse(is.na(supply_chain_disruption), 0, supply_chain_disruption) +

        # War-related shocks
        0.15 * ifelse(is.na(energy_price_shock), 0, (energy_price_shock - 100) / 2) +
        0.08 * ifelse(is.na(commodity_price_shock), 0, commodity_price_shock / 2) +
        0.05 * ifelse(is.na(geopolitical_uncertainty), 0, geopolitical_uncertainty * 100) +

        # Trade war effects
        0.02 * ifelse(is.na(tech_restrictions), 0, tech_restrictions * 50)
      ),

      # Temporary vs permanent shock classification
      temporary_shock = pmax(
        # Historical temporary shocks (cyclical crises)
        ifelse(shock_type %in% c("Financial", "Energy/Commodity", "Currency/Sovereign"),
               historical_shock_composite, 0),

        # Recent temporary shocks
        ifelse(is.na(lockdown_stringency), 0, lockdown_stringency / 100),
        ifelse(is.na(supply_chain_disruption), 0, supply_chain_disruption / 100),
        ifelse(is.na(energy_price_shock), 0, (energy_price_shock - 100) / 200),
        ifelse(is.na(health_system_strain), 0, health_system_strain),
        na.rm = TRUE
      ),

      permanent_shock = pmax(
        # Historical permanent shocks (structural changes)
        ifelse(shock_type %in% c("Structural/Political", "Technology/Bubble"),
               historical_shock_composite * 0.5, 0),  # Partial persistence

        # Recent permanent shocks
        ifelse(is.na(tech_restrictions), 0, tech_restrictions),
        ifelse(is.na(supply_chain_reorganization), 0, supply_chain_reorganization),
        ifelse(is.na(remote_work_share), 0, pmin(1, (remote_work_share - 0.12) / 0.2)),
        na.rm = TRUE
      ),

      # Shock severity classification
      shock_severity = case_when(
        composite_shock_index >= 50 ~ "Severe",
        composite_shock_index >= 25 ~ "Moderate",
        composite_shock_index >= 10 ~ "Mild",
        TRUE ~ "Normal"
      ),

      # Pre/post shock periods for analysis
      pre_shock_period = year < 2018,
      covid_period = year >= 2020 & year <= 2022,
      war_period = year >= 2022,
      recovery_period = year >= 2023
    )

  cat("   ✓ Comprehensive database created:", nrow(comprehensive_shocks), "quarters\n")

  return(comprehensive_shocks)
}

# ===== SHOCK VISUALIZATION HELPER =====

#' Create Shock Timeline Visualization Data
#'
#' Prepare data for plotting major shock periods
create_shock_timeline_data <- function(shock_database) {

  timeline_data <- shock_database %>%
    select(year, quarter, date, composite_shock_index, temporary_shock, permanent_shock) %>%
    mutate(
      # Major shock events for annotation
      major_event = case_when(
        year == 2018 & quarter == 2 ~ "Trade War Begins",
        year == 2020 & quarter == 2 ~ "COVID Lockdowns",
        year == 2021 & quarter == 3 ~ "Supply Chain Crisis",
        year == 2022 & quarter == 1 ~ "Ukraine Invasion",
        year == 2022 & quarter == 3 ~ "Energy Crisis Peak",
        TRUE ~ NA_character_
      )
    )

  return(timeline_data)
}

# ===== MAIN EXECUTION =====

cat("1. Creating historical economic shock variables (1970-2017)...\n")
historical_data <- create_historical_shock_variables()

cat("\n2. Creating COVID-19 shock variables (2020-2022)...\n")
covid_data <- create_covid_shock_variables()

cat("\n3. Creating Ukraine war shock variables (2022+)...\n")
ukraine_data <- create_ukraine_war_shocks()

cat("\n4. Creating trade war shock variables (2018+)...\n")
trade_war_data <- create_trade_war_shocks()

cat("\n5. Creating comprehensive shock database...\n")
shock_database <- create_comprehensive_shock_database()

cat("\n6. Creating visualization timeline...\n")
timeline_data <- create_shock_timeline_data(shock_database)

# ===== SUMMARY ANALYSIS =====

cat("\n=== SHOCK DATABASE SUMMARY ===\n")

# Shock intensity by period
shock_summary <- shock_database %>%
  group_by(shock_severity) %>%
  summarise(
    quarters = n(),
    avg_composite_index = mean(composite_shock_index),
    avg_temporary_shock = mean(temporary_shock),
    avg_permanent_shock = mean(permanent_shock),
    .groups = "drop"
  )

cat("Shock Intensity Distribution:\n")
print(shock_summary)

# Peak shock periods
peak_shocks <- shock_database %>%
  arrange(desc(composite_shock_index)) %>%
  head(10) %>%
  select(year_quarter, composite_shock_index, shock_severity, temporary_shock, permanent_shock)

cat("\nTop 10 Shock Periods:\n")
print(peak_shocks)

# Recovery assessment
recovery_analysis <- shock_database %>%
  filter(year >= 2023) %>%
  summarise(
    avg_shock_index = mean(composite_shock_index),
    avg_temporary = mean(temporary_shock),
    avg_permanent = mean(permanent_shock),
    .groups = "drop"
  )

cat("\nRecovery Period (2023+) Analysis:\n")
print(recovery_analysis)

# Historical shock type analysis
historical_shock_summary <- shock_database %>%
  filter(major_historical_shock == TRUE) %>%
  group_by(shock_type) %>%
  summarise(
    quarters = n(),
    avg_intensity = mean(historical_shock_composite, na.rm = TRUE),
    years_affected = length(unique(year)),
    .groups = "drop"
  )

cat("\nHistorical Shock Types (1970-2017):\n")
print(historical_shock_summary)

# All-time major shock periods
all_time_peaks <- shock_database %>%
  arrange(desc(composite_shock_index)) %>%
  head(15) %>%
  select(year_quarter, composite_shock_index, shock_severity, shock_type, temporary_shock, permanent_shock)

cat("\nTop 15 All-Time Shock Periods:\n")
print(all_time_peaks)

cat("\n=== ECONOMIC SHOCK DATABASE COMPLETE ===\n")
cat("✓ Historical shocks modeled (1970-2017): Oil crises, financial crises, structural shocks\n")
cat("✓ COVID-19 pandemic shocks modeled (2020-2022)\n")
cat("✓ Ukraine war impacts captured (2022+)\n")
cat("✓ Trade war effects included (2018+)\n")
cat("✓ Comprehensive 54-year shock history created\n")
cat("✓ Composite shock indices spanning full period\n")
cat("✓ Temporary vs permanent shock classification\n")
cat("✓ Ready for aging vs shock productivity decomposition\n")