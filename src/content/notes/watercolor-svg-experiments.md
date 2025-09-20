---
title: 'Watercolor SVG Experiments'
description: 'Technical notes on creating organic, hand-painted effects with code'
type: 'draft'
tags: ['svg', 'design', 'technical', 'art']
created: 2025-01-27
connections: ['digital-gardens-philosophy']
---

Working on recreating watercolor painting effects using SVG paths and filters. The challenge is balancing mathematical precision with organic randomness.

## Current Approach

**Brush Strokes**

- Using Bézier curves with random control points
- Varying opacity and thickness along paths
- Layering multiple strokes for depth

**Paper Texture**

- Subtle noise filters to simulate paper grain
- Edge effects where paint "bleeds" into fibers

**Color Bleeding**

- Gaussian blur with variable radius
- Multiple filter layers for realistic color mixing

## Philosophical Connection

This relates to [[digital-gardens-philosophy]] - using digital tools to create something that feels hand-crafted and organic. Technology in service of humanity, not the other way around.

_Still figuring out how to make the randomness feel intentional rather than chaotic._

## Next Steps

- Experiment with pressure-sensitive brush widths
- Add water effects for realistic bleeding
- Create reusable component library
