# Phase 1: Real Data Integration Framework
# Implementation of the enhanced aging-productivity analysis plan
# Focus: SHARE data, OECD STAN/EU KLEMS, and German job market data

suppressPackageStartupMessages({
  library(tidyverse)
  library(here)
  library(httr)
  library(jsonlite)
  library(readxl)
  library(haven)
})

# ===== SHARE DATA ACQUISITION =====

#' Research SHARE data access requirements
#' SHARE = Survey of Health, Ageing and Retirement in Europe
research_share_access <- function() {
  cat("=== SHARE DATA ACCESS RESEARCH ===\n")

  share_info <- list(
    name = "Survey of Health, Ageing and Retirement in Europe (SHARE)",
    website = "http://www.share-project.org/",
    data_access = "http://www.share-project.org/data-access.html",
    key_variables = c(
      "Individual cognitive test scores over time",
      "Employment histories with productivity proxies",
      "Technology adoption patterns by age cohort",
      "Health and socioeconomic factors"
    ),
    waves = c(
      "Wave 1 (2004-2005): Baseline",
      "Wave 2 (2006-2007): Follow-up",
      "Wave 3 (2008-2009): SHARELIFE retrospective",
      "Wave 4 (2011-2012): Regular follow-up",
      "Wave 5 (2013): Regular follow-up",
      "Wave 6 (2015): Regular follow-up",
      "Wave 7 (2017): Regular follow-up",
      "Wave 8 (2020): COVID-19 special"
    ),
    german_sample = "~6,000 individuals aged 50+ per wave",
    registration_required = TRUE,
    cost = "Free for academic research",
    approval_time = "2-4 weeks for simple requests"
  )

  cat("Data Source: ", share_info$name, "\n")
  cat("Website: ", share_info$website, "\n")
  cat("German Sample Size: ", share_info$german_sample, "\n")
  cat("Registration Required: ", share_info$registration_required, "\n")
  cat("Cost: ", share_info$cost, "\n")
  cat("Approval Time: ", share_info$approval_time, "\n")

  cat("\nKey Variables Available:\n")
  for(var in share_info$key_variables) {
    cat("  -", var, "\n")
  }

  cat("\nWaves Available:\n")
  for(wave in share_info$waves) {
    cat("  -", wave, "\n")
  }

  # Save research results
  research_file <- here("src", "content", "blog", "2025",
                       "09-26-modeling-productivity-aging-population",
                       "data", "share_access_research.json")

  write_json(share_info, research_file, pretty = TRUE)
  cat("\n✓ Research results saved to:", research_file, "\n")

  return(share_info)
}

#' Prepare SHARE data acquisition checklist
prepare_share_checklist <- function() {
  checklist <- list(
    step1 = "Register at http://www.share-project.org/data-access.html",
    step2 = "Complete data user agreement form",
    step3 = "Specify required variables: cognitive tests, employment, technology use",
    step4 = "Request waves 1-8 for Germany (longitudinal analysis)",
    step5 = "Wait for approval (2-4 weeks)",
    step6 = "Download data in Stata/SPSS format",
    step7 = "Convert to R-compatible format",
    step8 = "Harmonize across waves for longitudinal analysis"
  )

  cat("SHARE Data Acquisition Checklist:\n")
  for(i in 1:length(checklist)) {
    cat(sprintf("%d. %s\n", i, checklist[[i]]))
  }

  return(checklist)
}

# ===== OECD STAN / EU KLEMS DATA =====

#' Set up OECD STAN and EU KLEMS data acquisition pipeline
setup_oecd_klems_pipeline <- function() {
  cat("\n=== OECD STAN & EU KLEMS DATA PIPELINE ===\n")

  # OECD STAN database structure
  oecd_stan <- list(
    name = "OECD Structural Analysis Database (STAN)",
    api_base = "https://stats.oecd.org/restsdmx/sdmx.ashx/GetData/",
    dataset_code = "STANI4_2016",
    country_code = "DEU", # Germany
    variables = list(
      "PROD_H" = "Labour productivity (GDP per hour worked)",
      "PROD_E" = "Labour productivity (GDP per person employed)",
      "VA" = "Value added",
      "HRSW" = "Hours worked",
      "EMPN" = "Number of persons employed"
    ),
    sectors = list(
      "C10T12" = "Food products, beverages and tobacco",
      "C13T15" = "Textiles, clothing, leather",
      "C16" = "Wood and paper products",
      "C17" = "Printing and reproduction",
      "C19" = "Coke and refined petroleum",
      "C20" = "Chemicals and chemical products",
      "C21" = "Pharmaceuticals",
      "C22" = "Rubber and plastic products",
      "C23" = "Other non-metallic mineral products",
      "C24" = "Basic metals",
      "C25" = "Fabricated metal products",
      "C26" = "Computer, electronic and optical products",
      "C27" = "Electrical equipment",
      "C28" = "Machinery and equipment n.e.c.",
      "C29" = "Motor vehicles, trailers and semi-trailers",
      "C30" = "Other transport equipment"
    )
  )

  # EU KLEMS database structure
  eu_klems <- list(
    name = "EU KLEMS Growth and Productivity Accounts",
    website = "https://www.euklems.net/",
    data_release = "2019 release",
    variables = c(
      "Capital services growth",
      "Labour services growth",
      "TFP growth",
      "Technology adoption measures",
      "ICT capital intensity"
    ),
    time_period = "1970-2017",
    country = "Germany"
  )

  cat("OECD STAN Variables:\n")
  for(var_code in names(oecd_stan$variables)) {
    cat("  ", var_code, ":", oecd_stan$variables[[var_code]], "\n")
  }

  cat("\nSample Sectors (", length(oecd_stan$sectors), "total):\n")
  for(i in 1:min(5, length(oecd_stan$sectors))) {
    sector_code <- names(oecd_stan$sectors)[i]
    cat("  ", sector_code, ":", oecd_stan$sectors[[sector_code]], "\n")
  }
  cat("  ... and", length(oecd_stan$sectors) - 5, "more sectors\n")

  # Create data acquisition functions
  download_oecd_stan <- function(variable, sector, start_year = 1970, end_year = 2023) {
    # Construct OECD API URL
    url <- paste0(
      oecd_stan$api_base,
      oecd_stan$dataset_code, "/",
      oecd_stan$country_code, ".", sector, ".", variable,
      "/all?startTime=", start_year, "&endTime=", end_year
    )

    cat("Downloading:", variable, "for sector", sector, "\n")
    cat("URL:", url, "\n")

    # Note: Actual download would require proper API implementation
    cat("  (API implementation needed)\n")

    return(tibble(
      year = start_year:end_year,
      country = "DEU",
      sector = sector,
      variable = variable,
      value = NA_real_
    ))
  }

  # Save pipeline configuration
  pipeline_config <- list(
    oecd_stan = oecd_stan,
    eu_klems = eu_klems,
    download_function = "download_oecd_stan"
  )

  config_file <- here("src", "content", "blog", "2025",
                     "09-26-modeling-productivity-aging-population",
                     "data", "oecd_klems_pipeline_config.json")

  write_json(pipeline_config, config_file, pretty = TRUE)
  cat("\n✓ Pipeline configuration saved to:", config_file, "\n")

  return(pipeline_config)
}

# ===== GERMAN JOB MARKET SKILLS DATA =====

#' Set up German job market skills data acquisition
setup_german_job_skills_pipeline <- function() {
  cat("\n=== GERMAN JOB MARKET SKILLS PIPELINE ===\n")

  data_sources <- list(
    stepstone = list(
      name = "StepStone Job Portal",
      website = "https://www.stepstone.de/",
      approach = "Web scraping (with proper permissions)",
      variables = c(
        "Job title and description",
        "Required skills (technical/soft)",
        "Experience requirements",
        "Salary ranges",
        "Location",
        "Industry sector"
      ),
      time_period = "Current postings + historical if available",
      ethical_considerations = "Respect robots.txt, rate limiting, terms of service"
    ),

    xing = list(
      name = "XING Job Network",
      website = "https://www.xing.com/jobs",
      approach = "API access if available, otherwise ethical scraping",
      variables = "Similar to StepStone",
      focus = "Professional networking jobs"
    ),

    federal_employment_agency = list(
      name = "German Federal Employment Agency (Bundesagentur für Arbeit)",
      website = "https://statistik.arbeitsagentur.de/",
      data_type = "Official statistics",
      variables = c(
        "Historical skill demand by occupation",
        "Technology skill premiums",
        "Occupational employment trends",
        "Wage statistics by skill level"
      ),
      time_period = "1990-present",
      access = "Public statistics portal"
    )
  )

  # Skills categorization framework
  skills_framework <- list(
    technical_skills = c(
      "Programming languages",
      "Software proficiency",
      "Digital tools",
      "Data analysis",
      "Automation tools"
    ),

    cognitive_skills = c(
      "Problem solving",
      "Critical thinking",
      "Decision making",
      "Learning ability",
      "Creativity"
    ),

    social_skills = c(
      "Communication",
      "Teamwork",
      "Leadership",
      "Customer service",
      "Negotiation"
    ),

    age_adaptation = c(
      "Technology adoption",
      "Continuous learning",
      "Flexibility",
      "Mentoring abilities",
      "Experience-based insights"
    )
  )

  cat("Data Sources:\n")
  for(source in names(data_sources)) {
    cat("  -", data_sources[[source]]$name, "\n")
    cat("    Website:", data_sources[[source]]$website, "\n")
    cat("    Approach:", data_sources[[source]]$approach, "\n")
  }

  cat("\nSkills Framework Categories:\n")
  for(category in names(skills_framework)) {
    cat("  ", str_to_title(gsub("_", " ", category)), ":\n")
    for(skill in skills_framework[[category]]) {
      cat("    -", skill, "\n")
    }
  }

  # Save skills pipeline configuration
  skills_config <- list(
    data_sources = data_sources,
    skills_framework = skills_framework,
    ethical_guidelines = c(
      "Respect website terms of service",
      "Use rate limiting to avoid server overload",
      "Anonymize individual job postings",
      "Focus on aggregate skill trends",
      "Cite data sources appropriately"
    )
  )

  skills_file <- here("src", "content", "blog", "2025",
                     "09-26-modeling-productivity-aging-population",
                     "data", "german_job_skills_config.json")

  write_json(skills_config, skills_file, pretty = TRUE)
  cat("\n✓ Skills pipeline configuration saved to:", skills_file, "\n")

  return(skills_config)
}

# ===== DATA HARMONIZATION FRAMEWORK =====

#' Create framework for harmonizing longitudinal datasets
create_harmonization_framework <- function() {
  cat("\n=== DATA HARMONIZATION FRAMEWORK ===\n")

  harmonization_plan <- list(
    individual_level = list(
      source = "SHARE data",
      key_variables = c(
        "cognitive_score_fluid",
        "cognitive_score_crystallized",
        "employment_status",
        "hours_worked",
        "technology_use_index",
        "age",
        "education_level",
        "health_status"
      ),
      time_structure = "Individual-year panel",
      sample_period = "2004-2020"
    ),

    firm_level = list(
      source = "OECD STAN + EU KLEMS",
      key_variables = c(
        "productivity_per_hour",
        "capital_intensity",
        "technology_adoption_rate",
        "workforce_age_composition",
        "sector_code"
      ),
      time_structure = "Sector-year panel",
      sample_period = "1970-2020"
    ),

    sector_level = list(
      source = "EU KLEMS + German job skills data",
      key_variables = c(
        "tfp_growth",
        "technology_adoption_lag",
        "skill_requirements_index",
        "regulatory_intensity",
        "competition_measure"
      ),
      time_structure = "Sector-year panel",
      sample_period = "1990-2020"
    )
  )

  # Mapping strategy
  mapping_strategy <- list(
    cognitive_aging_trajectories = "Map SHARE cognitive scores to productivity weights",
    technology_exposure = "Link individual tech use to sector adoption rates",
    productivity_outcomes = "Connect workforce composition to sector productivity",
    causal_identification = "Exploit policy reforms as quasi-experiments"
  )

  cat("Harmonization Levels:\n")
  for(level in names(harmonization_plan)) {
    cat("  ", str_to_title(gsub("_", " ", level)), ":\n")
    cat("    Source:", harmonization_plan[[level]]$source, "\n")
    cat("    Period:", harmonization_plan[[level]]$sample_period, "\n")
    cat("    Structure:", harmonization_plan[[level]]$time_structure, "\n")
  }

  cat("\nMapping Strategy:\n")
  for(strategy in names(mapping_strategy)) {
    cat("  -", str_to_title(gsub("_", " ", strategy)), ":\n")
    cat("    ", mapping_strategy[[strategy]], "\n")
  }

  # Save harmonization framework
  harmony_file <- here("src", "content", "blog", "2025",
                      "09-26-modeling-productivity-aging-population",
                      "data", "harmonization_framework.json")

  harmonization_config <- list(
    plan = harmonization_plan,
    mapping = mapping_strategy,
    created = Sys.Date()
  )

  write_json(harmonization_config, harmony_file, pretty = TRUE)
  cat("\n✓ Harmonization framework saved to:", harmony_file, "\n")

  return(harmonization_config)
}

# ===== MAIN EXECUTION FUNCTION =====

#' Execute Phase 1 data acquisition setup
execute_phase1_setup <- function() {
  cat("EXECUTING PHASE 1: REAL DATA INTEGRATION SETUP\n")
  cat("=" %s% rep("=", 50) %s% "\n")

  # Step 1: SHARE data research
  cat("\n1. SHARE Data Access Research\n")
  share_info <- research_share_access()
  share_checklist <- prepare_share_checklist()

  # Step 2: OECD/KLEMS pipeline
  cat("\n2. OECD STAN & EU KLEMS Pipeline Setup\n")
  oecd_config <- setup_oecd_klems_pipeline()

  # Step 3: German job skills pipeline
  cat("\n3. German Job Skills Data Pipeline\n")
  skills_config <- setup_german_job_skills_pipeline()

  # Step 4: Harmonization framework
  cat("\n4. Data Harmonization Framework\n")
  harmony_config <- create_harmonization_framework()

  # Summary
  cat("\n" %s% rep("=", 60) %s% "\n")
  cat("PHASE 1 SETUP COMPLETE\n")
  cat("✓ SHARE data access requirements documented\n")
  cat("✓ OECD STAN & EU KLEMS pipeline configured\n")
  cat("✓ German job skills data pipeline designed\n")
  cat("✓ Data harmonization framework created\n")
  cat("\nNext Steps:\n")
  cat("1. Register for SHARE data access\n")
  cat("2. Implement OECD API connections\n")
  cat("3. Set up ethical job market data collection\n")
  cat("4. Begin data harmonization once sources acquired\n")

  return(list(
    share = share_info,
    oecd = oecd_config,
    skills = skills_config,
    harmony = harmony_config
  ))
}

# String concatenation helper
`%s%` <- function(x, y) paste0(x, y)

cat("Phase 1 Data Acquisition Framework Loaded\n")
cat("Run execute_phase1_setup() to begin setup process\n")