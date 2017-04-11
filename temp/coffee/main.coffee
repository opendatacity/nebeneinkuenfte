'use strict'

Viewport = width: 800, height: 400, center: {x: 400, y: 400}
Arc = innerR: 100, outerR: 400, phiMax: 180
Rep = r: 5, spacing: 12

Factions = [
  { name: 'Die Linke',             class: 'linke' }
  { name: 'SPD',                   class: 'spd' }
  { name: 'Bündnis 90/Die Grünen', class: 'gruene' }
  { name: 'FDP',                   class: 'fdp' } # It's better to be future-proof than optimistic.
  { name: 'CDU/CSU',               class: 'cducsu' }
]

T = (string) ->
  return dictionary[string] if dictionary[string]
  return string
Tp = (number, string) ->
  return dictionary[string+number] if dictionary[string+number]
  return number + ' ' + dictionary[string+'Plural'] if number != 1 and dictionary[string+'Plural']
  return number + ' ' + dictionary[string] if dictionary[string]
  return number + ' ' + string

NebeneinkunftMinAmounts = [ 0.01, 1000, 3500, 7000, 15000, 30000, 50000, 75000, 100000, 150000, 250000 ]

nebeneinkuenfteMinSum = (rep) ->
  return 0 if rep.nebeneinkuenfte.length == 0
  sum = rep.nebeneinkuenfte.reduce ((sum, einkunft) -> sum += NebeneinkunftMinAmounts[einkunft.level]), 0
  return Math.max parseInt(sum, 10), 1

formatCurrency = _.memoize (amount) ->
  amount = String Math.floor amount
  groups = []
  while amount.length > 0
    group = amount.substr -3, 3
    groups.unshift group
    amount = amount.substr 0, amount.length - 3
  return groups.join(' ') + ' €'

updateCheckboxLabelState = (checkbox) -> $(checkbox).parent('label').toggleClass 'active', $(checkbox).prop('checked')

repRadius = (rep) -> 0.07*Math.sqrt rep.nebeneinkuenfteMinSum

class RepInspector
  constructor: (selector) -> @tooltip = $(selector)

  field: (field) -> @tooltip.find ".#{field}"

  update: (rep) ->
    minSum = formatCurrency rep.nebeneinkuenfteMinSum
    @field('name')        .text rep.name
                          .attr 'href', rep.url
    @field('faction')     .text T rep.fraktion
                          .attr 'class', 'faction ' + _.find(Factions, name: rep.fraktion).class
    @field('land')        .text rep.land
    @field('mandate')     .text T rep.mandat
    @field('constituency').text rep.wahlkreis
    @field('minSum')      .text minSum
    
    @field('count')       .text Tp(rep.nebeneinkuenfte.length, 'Nebentaetigkeit')

    table = @tooltip.find 'table'
    tableBody = table.find 'tbody'
    tableRow = tableBody.find('tr').first().clone()
    tableBody.empty()

    for item in rep.nebeneinkuenfte
      row = tableRow.clone()
      row.addClass 'cat' + item.level
      row.find('.description').text item.text
      row.find('.minAmount').text formatCurrency NebeneinkunftMinAmounts[item.level]
      tableBody.append row

  measure: ->
    # If it's currently hidden, we'll first move it to [0, 0] to measure it
    # as the browser may otherwise interfere and do its own scaling.
    positionBackup = @position
    @moveTo x: 0, y: 0
    @width = @tooltip.width()
    @height = @tooltip.height()
    @moveTo positionBackup
  show: (position) ->
    @moveTo position if position
    @measure() unless @visible
    @tooltip.addClass('visible').removeClass('hidden')
    @visible = true
    @unfix()
  hide: ->
    @tooltip.addClass('hidden').removeClass('visible')
    @visible = false
    @unfix()
  moveTo: (@position) ->
    # See if the tooltip would extend beyond the side of the window.
    if @position.x + @width > windowSize.width
      @position.x = windowSize.width - @width
    @tooltip.css top: @position.y, left: @position.x unless @fixed
  unfix: ->
    @fixed = false
    @tooltip.addClass('moving').removeClass('fixed')
  fix: ->
    @fixed = true
    @tooltip.addClass('fixed').removeClass('moving')

$.getJSON 'data/data.json', (data) ->
  data = data.data
  window._data = _(data)

  # Which of the possible factions are actually represented in parliament?
  factions = Factions.filter (faction) -> _data.find fraktion: faction.name

  _data.each (rep) ->
    rep.nebeneinkuenfteMinSum = nebeneinkuenfteMinSum rep
    rep.radius = repRadius rep
    rep.nebeneinkuenfte.sort (a, b) -> b.level - a.level
  # To distribute the reps evenly in the parliament,
  # we first have to establish where we should draw the boundaries
  # between their groups

  dataByFaction = _data.groupBy('fraktion').value()
  seats = _.mapValues dataByFaction, (f) -> f.length
  totalSeats = _.reduce seats, (sum, num) -> sum + num

  data = _data.where (rep) -> rep.nebeneinkuenfteMinSum > 1
  .value()
  console.log data
  # Recalculate dataByFaction from `data`
  dataByFaction = _.groupBy data, 'fraktion'


  tick = (e) ->
    alpha = e.alpha * e.alpha
    qt = d3.geom.quadtree data
    data.forEach (rep, i) ->
      dX = rep.x - Viewport.center.x
      dY = rep.y - Viewport.center.y
      r = Math.sqrt dX * dX + dY * dY

      # Angle of the line between the CENTRE of the rep and the centre of the parliament
      phi = Math.atan2 dX, -dY
      # Angle between - the line from the centre of parliament through the centre of the rep
      #               - and the the representative's tangent through the centre of parliament
      phiOffset = Math.atan2 rep.radius, r

      factionAngles = _.find seatsPie, (item) -> item.data.faction is rep.fraktion
      minAngle = factionAngles.startAngle
      maxAngle = factionAngles.endAngle

      # Ensure representatives stay outside the inner radius
      if r < Arc.innerR + rep.radius
        missing = (Arc.innerR + rep.radius - r) / r
        rep.x += dX * missing
        rep.y += dY * missing
      
      rep.phi = phi
      rep.wrongPlacement = false
      # …and ensure they stay within their factions
      if phi < minAngle + phiOffset
        destinationPhi = minAngle + phiOffset
        rep.wrongPlacement = true
      if phi > maxAngle - phiOffset
        destinationPhi = maxAngle - phiOffset
        rep.wrongPlacement = true
      if destinationPhi
        r = Math.max Arc.innerR + rep.radius, r
        dY = -r * Math.cos destinationPhi
        dX =  r * Math.sin destinationPhi
        destinationX = Viewport.center.x + dX
        destinationY = Viewport.center.y + dY
        rep.x = destinationX
        rep.y = destinationY

      collide(.25, qt)(rep)

    node.attr 'cx', (d) -> d.x
    node.attr 'cy', (d) -> d.y
    node.classed 'wrongPlacement', (d) -> d.wrongPlacement
    node.attr 'data-phi', (d) -> d.phi

  collide = (alpha, qt) ->
    return (d) ->
      r = d.radius
      nx1 = d.x - r
      nx2 = d.x + r
      ny1 = d.y - r
      ny2 = d.y + r
      qt.visit (quad, x1, y1, x2, y2) ->
        if quad.point and quad.point isnt d and quad.point.fraktion is d.fraktion
          w = d.x - quad.point.x
          h = d.y - quad.point.y
          l = Math.sqrt(w*w + h*h)
          r = d.radius + quad.point.radius
          if l < r
            deltaL = (l - r) / l * alpha
            d.x -= w *= deltaL
            d.y -= h *= deltaL
            quad.point.x += w
            quad.point.y += h
        return x1 > nx2 or x2 < nx1 or y1 > ny2 or y2 < ny1

  svg = d3.select 'svg'
  .attr 'width', Viewport.width
  .attr 'height', Viewport.height

  # Draw parliament wedges first
  pie = d3.layout.pie()
  .sort null
  .value (faction) -> faction.seats
  .startAngle Math.PI * -0.5
  .endAngle Math.PI * 0.5

  # We'll be needing this not only for the pie chart but also in the collision
  # detector to make sure that representatives stay inside their own faction
  seatsPie = pie _.map factions, (faction) -> faction: faction.name, seats: seats[faction.name]
  console.log seatsPie

  # Now we know where the factions are, we can initalize the representatives
  # with sensible values.
  initializeRepPositions = ->
    for faction in seatsPie
      console.log faction
      factionName = faction.data.faction

      # How many reps above the significance threshold are in this faction?
      # This is not the same as the number of seats!
      factionRepCount = dataByFaction[factionName].length
      deltaAngles = faction.endAngle - faction.startAngle
      height = 400
      _(dataByFaction[factionName]).sortBy('nebeneinkuenfteMinSum').each (rep, i) ->
        i = 2 * (i % 5) + 1
        height += 2.5 * rep.radius if i == 1
        rep.initialX = Viewport.center.x + height * Math.sin(faction.startAngle + deltaAngles * i * 0.1)
        rep.initialY = Viewport.center.y - height * Math.cos(faction.startAngle + deltaAngles * i * 0.1)

  parliament = svg.append 'g'
  .attr 'width', Viewport.width
  .attr 'height', Viewport.height
  .attr 'transform', "translate(#{Viewport.center.x}, #{Viewport.center.y})"

  g = parliament.selectAll '.faction'
  .data seatsPie
  .enter().append 'g'
  .attr 'class', (seats) -> 'arc ' + _.find(factions, name: seats.data.faction).class

  arc = d3.svg.arc()
  .outerRadius Arc.outerR
  .innerRadius Arc.innerR

  g.append 'path'
  .attr 'd', arc

  # Now draw circles for the representatives
  force = d3.layout.force()
  .nodes data
  .size [Viewport.width, Viewport.height*2]
  .gravity .07
  .charge (rep) -> -0.2 * rep.radius
  .friction .9
  .on 'tick', tick

  node = null
  initializeRepPositions()
  drawRepresentatives = ->
    node = svg.selectAll 'circle'
    .data data

    node.enter().append 'circle'
    .attr 'class', (rep) -> _.find(factions, name: rep.fraktion).class
    .attr 'data-name', (rep) -> rep.name
    .attr 'cx', (rep) -> rep.x = rep.initialX
    .attr 'cy', (rep) -> rep.y = rep.initialY

    node.transition()
    .attr 'r', (rep) -> rep.radius

    node.exit().remove()

    force.start()

  filterData = (filter) ->
    _(data).each (rep) ->
      visible = _.reduce filter, (sum, filterValues, filterProperty) ->
        keep = _.contains filterValues, rep[filterProperty]
        return Boolean(sum * keep)
      , true
      if visible
        rep.radius = repRadius rep
        rep.x = rep.initialX unless rep.previouslyVisible
        rep.y = rep.initialY unless rep.previouslyVisible
      else
        rep.radius = 1e-2
      rep.previouslyVisible = visible
      return null

  filterData {}

  drawRepresentatives()

  inspector = new RepInspector '#repInspector'
  inspector.hide()

  $('form').on 'submit', (event) ->
    form = $ this
    inputs = form.find 'input[name]:not(:checkbox), :checkbox:checked'
    event.preventDefault()

    filter = _(inputs.get())
    .groupBy('name')
    .mapValues (inputs) -> inputs.map (input) -> $(input).val()
    .value()

    filterData filter
    drawRepresentatives()
    #hideRepresentatives groupedData.false if groupedData.false

  $('form').on 'change', 'input', ->
    $(this).submit()
    updateCheckboxLabelState this

  $('svg').on 'mousemove', 'circle', (event) ->
    position = x: event.pageX, y: event.pageY
    rep = d3.select(this).datum()
    inspector.update rep
    inspector.show position unless inspector.fixed

  $('svg').on 'mouseleave', 'circle', -> inspector.hide() unless inspector.fixed

  $(document).on 'click', -> inspector.hide() if inspector.fixed

  $('svg').on 'click', 'circle', (event) ->
    event.stopPropagation() # Otherwise the click would fire on the document node and hide the inspector
    inspector.fix()

  updateCheckboxLabelState $(':checkbox')
    

  $(window).on 'resize', (event) ->
    window.windowSize = width: $(window).width(), height: $(window).height()
    scale = Math.min 1, (windowSize.width - 16) / Viewport.width
    # We can't set `.css height: Viewport.height * scale` because this
    # would apply the transform on the _scaled_ object, thus cutting off
    # the bottom. Instead we need to be clever with the bottom margin.
    $('#parliament').css transform: "scale(#{scale})", marginBottom: (-1 + scale) * Viewport.height

  $(window).trigger('resize')
