const width = 500;
const height = 500;
const margin = { left: 30, right: 30, top: 30, bottom: 30 };
const domain = d3.range(10);

let x_scale = d3.scalePoint()
  .domain(domain)
  .range([50, width-50]);
let y_scale = d3.scalePoint()
  .domain(domain)
  .range([50, height-50]);
let w_scale = d3.scaleLinear()
  .range([0, width]);
let h_scale = d3.scaleLinear()
  .range([0, height]);
let size_scale = d3.scaleLinear();
let color_scale = d3.scaleOrdinal(d3.schemeTableau10)
  .domain(domain);

const svg = d3.select('#chart')
  .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
const t = svg.transition().duration(750);

let x = d => {
  if (projections.default) {
    return x_scale(d.x) - Math.sqrt(size_scale(d.value))/2
  } else if (projections.x) {
    return w_scale(cum_sums.sums.x[d.x] - sums.x[d.x]);
  } else {
    return w_scale((cum_sums.y[d.y][d.x] - d.value)*sums.all/sums.y[d.y]);
  }
}
let y = d => {
  if (projections.default) {
    return y_scale(d.y) - Math.sqrt(size_scale(d.value))/2
  } else if (projections.y) {
    return h_scale(cum_sums.sums.y[d.y] - sums.y[d.y]);
  } else {
    return h_scale((cum_sums.x[d.x][d.y] - d.value)*sums.all/sums.x[d.x]);
  }
}
let w = d => {
  if (projections.default) {
    return Math.sqrt(size_scale(d.value));
  } else if (projections.x) {
    return w_scale(sums.x[d.x]);
  } else {
    return w_scale(d.value*sums.all/sums.y[d.y]);
  }
}
let h = d => {
  if (projections.default) {
    return Math.sqrt(size_scale(d.value));
  } else if (projections.y) {
    return h_scale(sums.y[d.y]);
  } else {
    return h_scale(d.value*sums.all/sums.x[d.x]);
  }
}

let rows;
let sums;
let cum_sums = {};
let draw = () => {
  svg.selectAll('.cell')
      .data(rows)
    .join(
      enter => enter.append('rect'),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'cell')
      .style('stroke', 'white')
    .transition(t)
      .attr('fill', d => color_scale(projections.y ? d.x : d.y))
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
  
  svg.selectAll('.text')
      .data(rows)
    .join(
      enter => enter.append('text'),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'text')
      .style('fill', 'white')
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .text(d => d.x+d.y)
    .transition(t)
      .attr('x', d => x(d) + w(d)/2)
      .attr('y', d => y(d) + h(d)/2)
}

const project_buttons = {
  default: d3.select('#project-button-default'),
  x: d3.select('#project-button-x'),
  y: d3.select('#project-button-y')
}
let projections = { default: true, x: false, y: false };
let project_along = axis => {
  if (!projections[axis]) {
    for (let key in projections) {
      projections[key] = false;
      project_buttons[key].classed("highlighted", false);
    }
    projections[axis] = true;
    project_buttons[axis].classed("highlighted", true);
    
    draw();
  }
}

d3.csv('data.csv').then(data => {
  rows = data;
  sums = {
    x: d3.nest().key(d => d.x).rollup(leaves => d3.sum(leaves, d => d.value)).object(data),
    y: d3.nest().key(d => d.y).rollup(leaves => d3.sum(leaves, d => d.value)).object(data)
  }
  sums.all = d3.sum(Object.values(sums.x));

  w_scale.domain([0, sums.all]);
  h_scale.domain([0, sums.all]);

  value_max = d3.max(data.map(d => d.value));
  size_scale
    .domain([0, value_max])
    .range([0, value_max*width*height/sums.all/2.5]);

  let cells = {}
  for (let d of data) {
    cells[d.x + d.y] = +d.value;
  }
  cum_sums.x = {};
  for (let x of domain) {
    cum_sums.x[x] = {}
    let values = [];
    for (let y of domain) {
      values.push(cells[`${x}${y}`]);
    }
    values.reduce((a, b, i) => cum_sums.x[x][domain[i]] = a + b, 0);
  }
  cum_sums.y = {};
  for (let y of domain) {
    cum_sums.y[y] = {}
    let values = [];
    for (let x of domain) {
      values.push(cells[`${x}${y}`]);
    }
    values.reduce((a, b, i) => cum_sums.y[y][domain[i]] = a + b, 0);
  }
  cum_sums.sums = {}
  for (let dim of ['x', 'y']) {
    cum_sums.sums[dim] = {};
    let values = [];
    for (let x of domain) {
      values.push(sums[dim][x]);
    }
    values.reduce((a, b, i) => cum_sums.sums[dim][domain[i]] = a + b, 0);
  }

  draw();
});