import * as d3 from 'd3';
const d3tip = require('d3-tip');

const DURATION = 700;

export interface IHexScatterBin {
  readonly center: [ number, number ];
  readonly value: number;
}

export interface IHexScatterInput {
  readonly offset: number;
  readonly range: number;
  readonly radius: number;
  readonly bins: ReadonlyArray<IHexScatterBin>;
}

export class HexScatter {
  private readonly width = 800;
  private readonly height = 480;
  private readonly margin = { left: 60, top: 30, right: 20, bottom: 20 };

  constructor(private readonly selector: string) {
  }

  public start(input: IHexScatterInput) {
    const svg = d3.select(this.selector)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

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

    const xAxis = d3.axisBottom(x).tickFormat(tickFormat);
    const yAxis = d3.axisRight(y).tickFormat(tickFormat);

    const maxValue = d3.max(input.bins, (bin) => bin.value)!;

    // XXX(indutny): use d3 API
    const bins = input.bins.map((bin): IHexScatterBin => {
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
      .html((d: IHexScatterBin) => {
        return `Count: ${d.value}<br/>` +
          `Created at: ${tickFormat(d.center[0], 0)}<br/>` +
          `Updated at: ${tickFormat(d.center[1], 0)}<br/>`;
      });

    svg.call(tip);

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
        .attr('fill', d => {
          return color(Math.log(1 + d.value) / Math.log(1 + maxValue));
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);

    svg
      .append('g')
      .call(xAxis);

    svg
      .append('g')
      .call(yAxis);
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
