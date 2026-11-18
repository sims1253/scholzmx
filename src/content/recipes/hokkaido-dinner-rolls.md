---
title: 'Pumpkin Softies'
description: 'Fluffy dinner rolls with Hokkaido squash, spiced with cinnamon, cardamom and nutmeg. A perfect all-rounder to bring to any occasion.'
servings: '15 rolls'
time: '3 hours (2h rising)'
tags: ['Snack', 'Bread', 'Vegetarian']
heroImage: '../../assets/images/recipes/hokkaido-dinner-rolls/stack.jpg'
heroAlt: Torn-apart rolls stacked two rows high on a board, with dark brown tops over a bright yellow, fluffy crumb.
date: 2025-12-04
draft: false
makes: { amount: 15, unit: rolls }
prepMinutes: 10
equipment:
  - a baking sheet
  - { name: a 34 × 24 cm baking dish, doubled: two 34 × 24 cm baking dishes }
  - parchment paper
ingredients:
  - id: squash
    amount: 350
    unit: g
    name: Hokkaido squash
    prep: cut into small cubes, the skin can stay on
  - id: water
    amount: 120
    unit: ml
    name: water
    note: up to {180 ml} makes fluffier rolls that are harder to shape
  - id: flour
    amount: 400
    unit: g
    name: flour
  - id: sugar
    amount: 75
    unit: g
    name: brown sugar
    note: '{50 g} is a snack, {100 g} is dessert'
  - id: butter
    amount: 60
    unit: g
    name: butter
    prep: softened
    note: or a plant-based alternative to make them vegan
  - id: yeast
    amount: 7
    unit: g
    name: instant yeast
    note: '{1 bag}'
  - id: cinnamon
    amount: 1
    unit: tsp
    name: cinnamon
  - id: cardamom
    amount: 1
    unit: tsp
    name: cardamom
  - id: nutmeg
    name: a pinch of nutmeg
  - id: salt
    name: a pinch of salt
steps:
  - id: roast
    uses: [squash]
    do: Roast
    heat: 160 °C
    minutes: 25
    wait: true
    result: roasted squash
    detail: Spread the cubes on a baking sheet and roast at 160 °C (320 °F) for about 25 minutes, until soft enough to mash easily.
    notes:
      - You can't really over-roast the squash here, as you can just blend it with more water later. Just make sure it's soft enough to mash easily. I want to eventually try roasting it at a higher temperature for a shorter time to get some caramelization on top.
  - id: blend
    uses: [roast, water]
    do: Blend, then cool
    minutes: 5
    result: squash purée
    detail: Let the squash cool a little, then blend it with the water until smooth. Put aside and let it cool further while you prepare the rest. You want the squash to be around room temperature before mixing it into the dough.
    notes:
      - Depending on how comfy you are with sticky doughs, you can play with the water a little. I tend to use around {180 ml} as more water tends to make fluffier rolls. But shaping becomes harder. I'd suggest around {120 ml} as a starting point and then add more if you feel like it.
      - I've also experimented with weighing the squash after roasting and adding water until I reach around {420 g} total of squash + water, which also seems to work well.
  - id: knead
    uses: [blend, flour, sugar, butter, yeast, cinnamon, cardamom, nutmeg, salt]
    do: Knead
    minutes: 10
    result: dough
    detail: Combine the squash purée with the flour, sugar, soft butter, yeast and spices. Don't forget the salt! Knead the dough well until smooth.
    notes:
      - For our group of murder mystery grandmas, below 50 g sugar didn't give us the sweet-ish snack taste and above 100 g started to enter full dessert territory. 75 g hit the balance of slightly sweet but still rolls rather than cake. The molasses notes from raw cane sugar pair nicely with the squash.
      - Freshly grated lime, lemon or orange zest works wonderfully as well, especially combined with the cardamom.
  - id: rise
    uses: [knead]
    do: Rise, covered
    minutes: 60
    wait: true
    result: risen dough
    detail: Cover the dough and let it rise for an hour.
  - id: shape
    uses: [rise]
    do: Shape into balls
    minutes: 15
    result: shaped rolls
    detail: Line the baking dish with parchment paper. Divide the dough into 15 equal pieces, shape them into balls and place them in the dish in a 3 × 5 pattern, with a little space between them.
    halved: Line the baking dish with parchment paper. Divide the dough into 7 or 8 equal pieces, shape them into balls and place them in the dish with a little space between them. They fill about half of it.
    doubled: Line both baking dishes with parchment paper. Divide the dough into 30 equal pieces, shape them into balls and place 15 in each dish in a 3 × 5 pattern, with a little space between them.
    notes:
      - You can divide the dough into any number of equal pieces for the baking dish of your choice. I use a 34 × 24 cm IKEA form that neatly fits 15 rolls.
      - With higher hydration the dough gets clingy. Instead of fighting it with your hands you can use a bench scraper.
    photo:
      src: '../../assets/images/recipes/hokkaido-dinner-rolls/small_balls.jpg'
      alt: Fifteen pale yellow dough balls in three rows of five on parchment paper, with gaps between them.
      caption: Fifteen dough balls in a baking dish, before the second rise
  - id: proof
    uses: [shape]
    do: Rise again
    minutes: 60
    wait: true
    result: risen rolls
    detail: Cover and let rise for another hour, until the balls have puffed up and touch.
    notes:
      - As the cover I use a larger 40 × 32 cm IKEA form. It perfectly fits over the baking dish and has enough headroom for the rolls to rise.
    photo:
      src: '../../assets/images/recipes/hokkaido-dinner-rolls/large_balls.jpg'
      alt: The same dough balls, about twice the size, pressed against each other and filling the dish.
      caption: The dough balls after the second rise, puffed up and touching
  - id: bake
    uses: [proof]
    do: Bake
    heat: 220 → 200 °C
    minutes: 23
    wait: true
    result: softies
    timers:
      - { minutes: 8, cue: 'Turn the oven down to 200 °C (400 °F), or to 180 °C (350 °F) with convection' }
      - { minutes: 15 }
    detail: Put the softies in the oven at 220 °C (425 °F). After 8 minutes reduce the temperature to 200 °C (400 °F) and bake until golden brown on top, around 23 minutes in total. With convection, use 200 °C (400 °F), then 180 °C (350 °F).
    notes:
      - The initial high heat helps the oven spring and prevents the rolls from turning out mushy.
  - id: serve
    uses: [bake]
    do: Cool in the form
    detail: Let them cool in the form and enjoy with friends. Works well with cottage cheese and jam or just butter, as many things tend to.
    notes:
      - I find that the rolls store well in the (cooled) oven over night and make for a great weekend breakfast treat.
    photo:
      src: '../../assets/images/recipes/hokkaido-dinner-rolls/total.jpg'
      alt: The baked rolls in the dish, grown together into one sheet, with dark brown tops and golden yellow seams.
      caption: The golden, cottony crumb of the finished softies
meanwhile:
  - do: Preheat the oven to 220 °C (425 °F), or to 200 °C (400 °F) with convection
    during: proof
---

These dinner rolls have become a staple of the baking grandma in our Brindlewood Bay group and are perfect for any occasion where you want some easy-to-portion bread on the side. The squash gives them a lovely color and keeps them soft. The spices add a touch of autumn to them on top.
