---
title: "Some models are useful, but how do we know which ones? Towards a unified Bayesian model taxonomy"

abstract: Probabilistic (Bayesian) modeling has experienced a surge of applications in almost all quantitative sciences and industrial areas. This development is driven by a combination of several factors, including better probabilistic estimation algorithms, flexible software, increased computing power, and a growing awareness of the benefits of probabilistic learning. However, a principled Bayesian model building workflow is far from complete and many challenges remain. To aid future research and applications of a principled Bayesian workflow, we ask and provide answers for what we perceive as two fundamental questions of Bayesian modeling, namely (a) "What actually is a Bayesian model?" and (b) "What makes a good Bayesian model?". As an answer to the first question, we propose the PAD model taxonomy that defines four basic kinds of Bayesian models, each representing some combination of the assumed joint distribution of all (known or unknown) variables (P), a posterior approximator (A), and training data (D). As an answer to the second question, we propose ten utility dimensions according to which we can evaluate Bayesian models holistically, namely, (1) causal consistency, (2) parameter recoverability, (3) predictive performance, (4) fairness, (5) structural faithfulness, (6) parsimony, (7) interpretability, (8) convergence, (9) estimation speed, and (10) robustness. Further, we propose two example utility decision trees that describe hierarchies and trade-offs between utilities depending on the inferential goals that drive model building and testing. 

authors:
- Paul-Christian Bürkner
- admin
- Stefan T. Radev
date: "2022-10-20"
doi: "10.48550/ARXIV.2209.02439"

# Schedule page publish date (NOT publication's date).
publishDate: "2022-09-06"

# Publication type.
# Legend: 0 = Uncategorized; 1 = Conference paper; 2 = Journal article;
# 3 = Preprint / Working Paper; 4 = Report; 5 = Book; 6 = Book section;
# 7 = Thesis; 8 = Patent
publication_types: ["3"]

# Publication name and optional abbreviated publication name.
publication: "arxiv"
publication_short: ""

tags:
- Probabilistic Modeling
- Statistical Learning
- Bayesian Statistics
- Machine Learning
- Model Comparison
featured: false

links:
url_pdf: https://arxiv.org/pdf/2209.02439.pdf
url_code: ""
url_dataset: "" 
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