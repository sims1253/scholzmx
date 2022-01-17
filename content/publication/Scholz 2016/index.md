---
title: 'A Line Based Approach for Bugspots'

abstract: "Code review is an important aspect of modern software development but time consuming.
In 2011, Google proposed the Bugspots algorithm to help reviewers to focus on files that
are more bug prone. The algorithm ranks the files based on the number of bug-fixes they
received in the past, weighted by the age of the corresponding commit. A higher score
equals more bug-fixes in recent times and indicates that there will be more bugs in that
file.
In this thesis we propose Linespots, a modified version of the Bugspots algorithm that
ranks the individual lines of code instead of whole files. Linespots gathers information by
scoring every line involved in a bug-fix commit. Using these scores, Linespots can either
give a list of ranked lines as a result or instead project the individual line scores back to
file scores, offering the same result format as Bugspots this way.
An evaluation process was setup, comparing both kinds of Linespots’ results to the
results of Bugspots using hit density and the area under the hit density curve (AUCEC)
as metrics. Both were proposed by Rahman et al. [5] in their work that served as a
foundation for Bugspots.
The evaluation finds that the projected results are less consistent than the original
Bugspots algorithm and do not improve the hit density or AUCEC. The line-based results
have worse AUCEC values by design but could improve the hit density across all tested
projects and most parameter configurations."

authors:
- admin

date: "2016-10-01"
doi: ""
featured: false
image:
  caption: ''
  focal_point: ""
  preview_only: false

projects: [Linespots]

publication: "Hamburg University of Technology"
publication_short: "TUHH"
publication_types:
- "7"
publishDate: "2016-10-01"

slides: ''
summary: ''
tags:
- Linespots
- Fault Prediction
- Past Faults
- Bugspots

url_code: https://github.com/sims1253/linespots-analysis/
url_dataset:
url_pdf: "pdf/scholz16.pdf"
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
