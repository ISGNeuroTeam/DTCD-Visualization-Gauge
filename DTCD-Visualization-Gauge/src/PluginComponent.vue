<template>
  <div class="gauge-container">
    <div ref="title" class="title" v-text="title"/>
    <div ref="svgContainer" class="svg-container"/>
  </div>
</template>

<script>
export default {
  name: 'PluginComponent',
  data: (self) => ({
    logSystem: self.$root.logSystem,
    eventSystem: self.$root.eventSystem,
    /** Gauge technical data. */
    svg: null,
    radius: 0,
    scale: [],
    valueColor: '',
    valueRange: [],
    arrowLength: 0,
    segmentWidth: 30,
    /** Gauge user data. */
    title: '',
    units: '',
    value: 0,
    segments: [],
  }),
  methods: {
    setTitle(text = '') {
      this.title = text;
      this.render();
    },

    setUnits(units = '') {
      this.units = units;
      this.render();
    },

    setValue(value = 0) {
      this.value = value;
      this.calculateValueColor();
      this.render();
    },

    setSegments(segments = []) {
      this.segments = segments;
      this.calculateValueColor();
      this.render();
    },

    getConfig() {
      const { title, value, units, segments } = this;
      return { title, value, units, segments };
    },

    calculateValueColor() {
      this.segments.forEach(({ color, range }) => {
        const [min, max] = d3.extent(range);
        if (this.value >= min && this.value <= max) {
          this.valueColor = color;
        }
      });
    },

    render() {
      this.clearSvgContainer();
      this.prepareRenderData();
      this.createSegments();
      this.createArrow();
      this.createTextCaptions();
    },

    clearSvgContainer() {
      d3.select(this.$refs.svgContainer).select('svg').remove();
    },

    prepareRenderData() {
      const { svgContainer } = this.$refs;
      const { offsetWidth: width, offsetHeight: height } = svgContainer;

      this.svg = d3.select(svgContainer)
        .append('svg')
        .attr('class', 'content')
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2 * 1.5})`);

      const endAngle = Math.PI / 2;
      const angles = [-endAngle, endAngle];

      this.valueRange = this.segments.length <= 0
        ? [-1, 1]
        : d3.extent(this.segments.map(s => s.range).flat());

      this.radius = Math.min(width, height) / 2;
      this.radius += width > height ? 25 : - 25;

      this.arrowLength = this.radius - (this.segmentWidth / 2);
      this.scale = d3.scaleLinear().range(angles).domain(this.valueRange);
    },

    createSegments() {
      this.segments.forEach(s => this.addSegment(s));
    },

    createArrow() {
      const valRadians = this.scale(this.value);
      const valDegrees = valRadians * 180 / Math.PI;
      const halfWidth = 6;
      this.svg.append('path')
        .attr('class', 'arrow')
        .attr('transform', `rotate(${valDegrees})`)
        .attr('d', `M0 ${-this.arrowLength} L${-halfWidth} 0 L${halfWidth} 0`);
    },

    createTextCaptions() {
      const { valueRange, value, arrowLength } = this;
      const [min, max] = valueRange;
      const textCaptions = [
        { x: 0, y: 30, text: value, className: 'cur-value' },
        { x: arrowLength, y: 20, text: max, className: 'range-value' },
        { x: -arrowLength, y: 20, text: min, className: 'range-value' },
      ]
      textCaptions.forEach(c => this.addTextElement(c));
    },

    addSegment({ range, color }) {
      const [start, end] = range;
      const arc = d3.arc()
        .outerRadius(this.radius)
        .innerRadius(this.radius - this.segmentWidth)
        .startAngle(this.scale(start))
        .endAngle(this.scale(end));
      this.svg.append('path').attr('fill', color).attr('d', arc);
    },

    addTextElement({ x , y, text, className }) {
      const el = this.svg.append('text').attr('class', className);
      el.attr('x', x).attr('y', y).text(text + this.units);
      if (className === 'cur-value') el.attr('fill', this.valueColor);
    },
  },

};
</script>

<style lang="sass">
@import ./styles/component
</style>
