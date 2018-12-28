import * as d3 from 'd3';
const d3tip = require('d3-tip');

const EPSILON = 1e-23;
const LEGEND_COLORS = 10;
const LEGEND_COLOR_SIZE = 20;
const LEGEND_PADDING = 4;

interface IUserScatterBin {
  readonly center: [ number, number ];
  readonly value: number;
}

interface IUserScatterInput {
  readonly offset: number;
  readonly range: number;
  readonly radius: number;
  readonly bins: ReadonlyArray<IUserScatterBin>;
}

export class UserScatter {
  private readonly width = 1000;
  private readonly height = 600;
  private readonly margin = { left: 36, top: 36, right: 56, bottom: 20 };

  constructor(private readonly selector: string) {
  }

  public async start() {
    const parent = d3.select(this.selector);

    const svg = parent
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const res = await fetch(parent.attr('data-url'));
    const input: IUserScatterInput = await res.json();

    const domain = [ input.offset, input.offset + input.range ];

    const x = d3.scaleLinear()
      .domain(domain)
      .range([ this.margin.left, this.width - this.margin.right ]);

    const yOff = input.range * Math.max(0, 1 - this.height / this.width);
    const y = d3.scaleLinear()
      .domain([ input.offset + yOff, input.offset + input.range ])
      .range([ this.height - this.margin.bottom, this.margin.top ]);

    const timeFormat = d3.timeFormat('%Y/%m/%d');
    const tickFormat = (value: number | { valueOf(): number },
                        index: number): string => {
      return timeFormat(new Date(value.valueOf()));
    };

    const xAxis = d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickSizeInner(this.height - this.margin.top - this.margin.bottom + 16)
      .tickFormat(tickFormat);
    const yAxis = d3.axisRight(y)
      .tickSizeOuter(0)
      .tickSizeInner(this.width - this.margin.left - this.margin.right + 16)
      .tickFormat(tickFormat);

    const maxValue = d3.max(input.bins, (bin) => bin.value)!;

    // XXX(indutny): use d3 API
    const bins = input.bins.map((bin): IUserScatterBin => {
      return {
        value: bin.value,
        center: [
          bin.center[0] * input.range + input.offset,
          bin.center[1] * input.range + input.offset,
        ],
      };
    });

    const color = d3.scaleSequential(d3.interpolateSpectral)
      .domain([ 0, 1 ]);

    // TODO(indutny): this is horrible
    const tip = (d3tip as any).default()
      .attr('class', 'd3-tip')
      .direction('s')
      .offset([ Math.sqrt(3) / 2 * this.width * input.radius, 0 ])
      .html((d: IUserScatterBin) => {
        return `Users: ${d.value}<br/>` +
          `Created at: ${tickFormat(d.center[0], 0)}<br/>` +
          `Last profile update: ${tickFormat(d.center[1], 0)}<br/>`;
      });

    svg.call(tip);

    const logValue = (d: IUserScatterBin) => {
      return Math.log(EPSILON + d.value) / Math.log(EPSILON + maxValue);
    };

    // Chart itself
    svg
      .append('g')
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.1)
      .selectAll('path')
      .data(bins)
      .enter().append('path')
        .attr('transform', (d) => {
          return `translate(${x(d.center[0])},${y(d.center[1])})`;
        })
        .attr('d', this.hexagon(this.width * input.radius))
        .attr('fill', d => color(logValue(d)))
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    // Axis and their titles
    svg
      .append('g')
      .attr('stroke-opacity', 0.2)
      .attr('transform', `translate(0, ${this.margin.top - 16})`)
      .call(xAxis);

    svg
      .append('g')
      .attr('stroke-opacity', 0.2)
      .attr('transform', `translate(${this.margin.left - 16}, 0)`)
      .call(yAxis);

    const xAxisMiddle =
      (this.width + this.margin.left - this.margin.right) / 2;
    const yAxisMiddle =
      (this.height + this.margin.top - this.margin.bottom) / 2;

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform',
        `translate(${this.margin.left - 24},${yAxisMiddle}) rotate(-90)`)
      .text('last profile update');

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform',
        `translate(${xAxisMiddle},${this.margin.top - 24})`)
      .text('created at');

    // Legend
    const legend = svg
      .append('g')
      .attr('transform', () => {
        const x = this.width - this.margin.right - 64 - LEGEND_COLOR_SIZE - 16;
        const y = this.height - this.margin.bottom -
          LEGEND_COLOR_SIZE * LEGEND_COLORS - 32;
        return `translate(${x}, ${y})`;
      });

    legend
      .append('rect')
      .attr('fill', '#fff')
      .attr('fill-opacity', 0.6)
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)
      .attr('width', LEGEND_COLOR_SIZE + 64 + 2 * LEGEND_PADDING)
      .attr('height', LEGEND_COLOR_SIZE * LEGEND_COLORS + 2 * LEGEND_PADDING);

    const legendCell = legend
      .append('g')
      .attr('transform', `translate(${LEGEND_PADDING}, ${LEGEND_PADDING})`)
      .selectAll('g')
      .data(d3.ticks(0, 1, LEGEND_COLORS - 1))
      .enter()
        .append('g')
        .attr('transform', (d) => {
          return `translate(0,${d * LEGEND_COLOR_SIZE * (LEGEND_COLORS - 1)})`
        });

    legendCell
      .append('rect')
      .attr('width', LEGEND_COLOR_SIZE)
      .attr('height', LEGEND_COLOR_SIZE)
      .attr('fill', (d) => color(d));

    legendCell
      .append('text')
      .attr('text-anchor', 'start')
      .attr('transform',
        `translate(${LEGEND_COLOR_SIZE + 6},${LEGEND_COLOR_SIZE - 4})`)
      .text((d) => Math.exp(d * Math.log(EPSILON + maxValue)).toFixed(0));
  }

  private hexagon(radius: number): string {
    const points: string[] = [];
    for (let corner = 0; corner < 6; corner++) {
      const angle = corner * Math.PI / 3;
      points.push(`${Math.sin(angle) * radius},${Math.cos(angle) * radius}`);
    }
    return 'm' + points.join('l') + 'z';
  }
}
