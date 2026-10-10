---
title: 'Simple Pour-Over Coffee'
description: "While I don't like coffee, many people in my life tend to think something is wrong with me for that..."
servings: '1 cup'
time: '4 minutes'
tags: ['Drinks']
#heroImage: '../../assets/images/recipes/coffee-setup.jpg'
#heroImagePositionX: 0
#heroImagePositionY: 0.235
#heroImageScale: 3.5
draft: false
makes: { amount: 1, unit: cup }
equipment: [a kitchen scale, a pour-over or french press, something to heat your water]
ingredients:
  - id: water
    amount: 240
    unit: g
    name: water
  - id: coffee
    amount: 15
    unit: g
    name: ground coffee
    note: 1 part coffee to 16 parts water
steps:
  - id: heat
    uses: [water]
    do: Boil, then rest
    result: hot water
    detail: Bring the water to a boil, then let it sit for 30 seconds so it's just off boiling.
  - id: pour
    uses: [heat, coffee]
    do: Pour slowly
    result: coffee
    detail: Slowly pour the water over the coffee in your device of choice.
  - id: wait
    uses: [pour]
    do: Wait
    minutes: 4
    wait: true
    result: brewed coffee
    detail: Depending on your mood, this seems to be the hardest part.
  - id: skim
    uses: [wait]
    do: Skim
    detail: If you used a french press, skim off the foam on top.
---

<span class="dropcap dropcap--ornate dropcap--personal" data-first-letter="M" aria-hidden="true">M</span>aking good coffee is mostly about being consistent. This recipe uses a 1:16 ratio and simple timing that works reliably. Keep track of what you do and you'll figure out what you like.

Yes, this is kind of a joke recipe. But I was too lazy to go dig up my paper pile with notes and refine them. So for now so this is all you get.
