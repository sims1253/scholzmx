---
title: 'An Analysis of Linespots and its Utility in Realistic Scenarios'

abstract: "Fault prediction is a promising technique that can potentially help developers build
software with fewer faults. Bugspots is an algorithm developed by Google, that
is used for its simplicity and short run times and is used as a baseline for other
fault prediction algorithms. Linespots is a variant of Bugspots that works on lines
instead of files, thus potentially improving performance through higher precision. In
this thesis, we analyzed the effect different weighting-functions and age-calculations
have on the performance of Linespots, investigated the possibility to turn Linespots
into a classifier and compared the performance and results of Linespots to those of
Bugspots. Based on the algorithms, weighting-functions and age-calculations, we
used a full factorial experiment design where we evaluated a total of 65 revisions
of 23 open source projects from GitHub and analyzed the resulting 780 samples
using Bayesian data analysis. We found that none of the weighting-functions or
age-calculation variants had any reliable effect on the performance of Linespots and
that the classification performance of Linespots makes it unsuited for production use.
Furthermore, we found that while the ranked result lists differ between Bugspots
and Linespots, the averaged predictive performance is similar. However, Linespots
tends to outperform Bugspots for the early parts of the result list. These findings
implicate that Linespots could be a better baseline choice for fault prediction than
Bugspots, but there is more work needed to identify the optimal parameters for
Linespots. Moreover, additional investigations are needed into interactions between
different parameters and both the weighting-function and age-calculations, as well
as the methodology of using a pseudo future for evaluation."

authors:
- admin
- Richard Torkar

date: "2019-08-01"
doi: ""
featured: false
image:
  caption: ''
  focal_point: ""
  preview_only: false

projects: [Linespots]

publication: '*Software Testing, Verification and Reliability*'
publication_short: "STVR"
publication_types:
- "2"
publishDate: "2019-08-01"

slides: ''
summary: ''
tags:
- Linespots
- Fault Prediction
- Past Faults
- Bugspots
- Bayesian Data Analysis
- Directed Acyclic Graphs

url_code: https://github.com/sims1253/linespots-analysis/
url_dataset:
url_pdf: "pdf/scholz19.pdf"
url_poster: ""
url_project: ""
url_slides: ""
url_source: ""
url_video: ""
---

<!---
{{% callout note %}}
Click the *Cite* button above to demo the feature to enable visitors to import publication metadata into their reference management software.
{{% /callout %}}

{{% callout note %}}
Create your slides in Markdown - click the *Slides* button to check out the example.
{{% /callout %}}

Supplementary notes can be added here, including [code, math, and images](https://wowchemy.com/docs/writing-markdown-latex/).
--->
