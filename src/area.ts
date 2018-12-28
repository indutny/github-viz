import * as d3 from 'd3';

const LEGEND_COLOR_SIZE = 20;
const LEGEND_PADDING = 4;

interface IAreaRowPoint {
  readonly updatedAt: Date;
  readonly from: number;
  readonly to: number;
}

interface IAreaRow {
  readonly title: string;
  readonly index: number;
  readonly area: Array<IAreaRowPoint>;
}

interface IAreaInput {
  readonly legend: ReadonlyArray<string>;
  readonly columns: ReadonlyArray<[ number, ReadonlyArray<number> ]>;
}

export interface IAreaOptions {
  readonly maxKinds: number;
  readonly xTitle: string;
  readonly yTitle: string;
  readonly percentOffset?: number;
}

export class Area {
  private readonly width = 1000;
  private readonly height = 600;
  private readonly margin = { left: 20, top: 20, right: 56, bottom: 32 };

  constructor(private readonly selector: string,
              private readonly options: IAreaOptions) {
  }

  public async start() {
    const parent = d3.select(this.selector);

    const svg = parent
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    const res = await fetch(parent.attr('data-url'));
    const input: IAreaInput = await res.json();

    let rows: IAreaRow[] = input.legend.map((title, index) => {
      return { title, index, area: [] };
    }).slice(0, this.options.maxKinds);

    for (let [ updatedAt, stats ] of input.columns) {
      stats = stats.slice(0, rows.length);
      if (!stats.some((x) => x !== 0)) {
        continue;
      }

      const total = d3.sum(stats) + 1e-23;
      const percents = stats.map((value) => value / total);
      const rolling: Array<[ number, number ]> = [];

      const x = new Date(updatedAt);

      percents.reduce((prev, curr, i) => {
        const next = prev + curr;
        rows[i].area.push({ updatedAt: x, from: prev, to: next });
        return next;
      }, 0);
    }

    const [ minX, maxX ] = d3.extent(rows[0].area, (p) => p.updatedAt);

    const x = d3.scaleTime()
      .domain([ minX!, maxX! ])
      .range([ this.margin.left, this.width - this.margin.right ]);

    const y = d3.scaleLinear()
      .domain([ this.options.percentOffset || 0, 1 ])
      .range([ this.height - this.margin.bottom, this.margin.top ]);

    const xAxis = d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickSizeInner(this.height - this.margin.top - this.margin.bottom + 16);
    const yAxis = d3.axisRight(y)
      .tickSizeOuter(0)
      .tickSizeInner(this.width - this.margin.left - this.margin.right + 16)
      .ticks(10, '%');

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const area = d3.area<IAreaRowPoint>()
      .curve(d3.curveStep)
      .x((d) => x(d.updatedAt))
      .y0((d) => y(d.from))
      .y1((d) => y(d.to));

    svg
      .append('g')
      .selectAll('path')
      .data(rows)
      .enter()
        .append('path')
        .attr('fill', (d) => color(d.index.toString()))
        .attr('d', (d) => area(d.area))
        .append('title').text((d) => d.title);

    svg
      .append('g')
      .attr('stroke-opacity', 0.2)
      .attr('transform', `translate(0, ${this.margin.top})`)
      .call(xAxis);

    svg
      .append('g')
      .attr('stroke-opacity', 0.2)
      .attr('transform', `translate(${this.margin.left}, 0)`)
      .call(yAxis);

    const xAxisMiddle =
      (this.width + this.margin.left - this.margin.right) / 2;
    const yAxisMiddle =
      (this.height + this.margin.top - this.margin.bottom) / 2;

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform',
        `translate(${this.margin.left - 8},${yAxisMiddle}) rotate(-90)`)
      .text(this.options.yTitle);

    svg
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('transform',
        `translate(${xAxisMiddle},${this.margin.top - 8})`)
      .text(this.options.xTitle);

    // Legend
    const legendColors = rows.length;

    const legend = svg
      .append('g')
      .attr('transform', () => {
        const x = this.width - this.margin.right - 64 - LEGEND_COLOR_SIZE - 16;
        const y = this.height - this.margin.bottom -
          LEGEND_COLOR_SIZE * legendColors - 32;
        return `translate(${x}, ${y})`;
      });

    legend
      .append('rect')
      .attr('fill', '#fff')
      .attr('fill-opacity', 0.95)
      .attr('stroke', '#000')
      .attr('stroke-opacity', 0.2)
      .attr('width', LEGEND_COLOR_SIZE + 64 + 2 * LEGEND_PADDING)
      .attr('height', LEGEND_COLOR_SIZE * legendColors + 2 * LEGEND_PADDING);

    const legendCell = legend
      .append('g')
      .attr('transform', `translate(${LEGEND_PADDING}, ${LEGEND_PADDING})`)
      .selectAll('g')
      .data(d3.range(0, legendColors))
      .enter()
        .append('g')
        .attr('transform', (d) => {
          return `translate(0,${d * LEGEND_COLOR_SIZE})`
        });

    legendCell
      .append('rect')
      .attr('width', LEGEND_COLOR_SIZE)
      .attr('height', LEGEND_COLOR_SIZE)
      .attr('fill', (d) => color(d.toString()));

    legendCell
      .append('text')
      .attr('text-anchor', 'start')
      .attr('transform',
        `translate(${LEGEND_COLOR_SIZE + 6},${LEGEND_COLOR_SIZE - 4})`)
      .text((d) => rows[d].title);
  }
}
