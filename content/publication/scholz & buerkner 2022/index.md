---
title: "Prediction can be safely used as a proxy for explanation in causally consistent Bayesian generalized linear models"

abstract: Bayesian modeling provides a principled approach to quantifying uncertainty in model parameters and structure and has seen a surge of applications in recent years. Despite a lot of existing work on an overarching Bayesian workflow, many individual steps still require more research to optimize the related decision processes. In this paper, we present results from a large simulation study of Bayesian generalized linear models for double- and lower-bounded data, where we analyze metrics on convergence, parameter recoverability, and predictive performance. We specifically investigate the validity of using predictive performance as a proxy for parameter recoverability in Bayesian model selection. Results indicate that -- for a given, causally consistent predictor term -- better out-of-sample predictions imply lower parameter RMSE, lower false positive rate, and higher true positive rate. In terms of initial model choice, we make recommendations for default likelihoods and link functions. We also find that, despite their lacking structural faithfulness for bounded data, Gaussian linear models show error calibration that is on par with structural faithful alternatives. 

authors:
- admin
- Paul-Christian Bürkner
date: "2022-10-13"
doi: "10.48550/ARXIV.2210.06927"

# Schedule page publish date (NOT publication's date).
publishDate: "2022-10-13"

# Publication type.
# Legend: 0 = Uncategorized; 1 = Conference paper; 2 = Journal article;
# 3 = Preprint / Working Paper; 4 = Report; 5 = Book; 6 = Book section;
# 7 = Thesis; 8 = Patent
publication_types: ["3"]

# Publication name and optional abbreviated publication name.
publication: "arxiv"
publication_short: ""

tags:
- Bayesian Workflow
- Causal Modeling
- Predictive Performance
- Parameter Recoverability
- Generalized Linear Models
- Simulation Study
featured: false

links:
url_pdf: https://arxiv.org/pdf/2210.06927.pdf
url_code: "https://doi.org/10.5281/zenodo.7099513"
url_dataset: "https://doi.org/10.17605/OSF.IO/XGKZV" 
url_poster: ""
url_project: ""
url_slides: ""
url_source: ""
url_video: ""

# Featured image
# To use, add an image named `featured.jpg/png` to your page's folder. 
#image:
#  caption: ''
#  focal_point: ""
#  preview_only: false

# Associated Projects (optional).
#   Associate this publication with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `internal-project` references `content/project/internal-project/index.md`.
#   Otherwise, set `projects: []`.
#projects:
#- internal-project

# Slides (optional).
#   Associate this publication with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides: "example"` references `content/slides/example/index.md`.
#   Otherwise, set `slides: ""`.
#slides: example
---
<!---
{{% callout note %}}
Create your slides in Markdown - click the *Slides* button to check out the example.
{{% /callout %}}

Supplementary notes can be added here, including [code, math, and images](https://wowchemy.com/docs/writing-markdown-latex/).
--->