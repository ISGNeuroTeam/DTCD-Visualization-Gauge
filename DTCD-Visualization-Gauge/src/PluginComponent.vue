<template>
  <div ref="mainContainer" class="gauge-container">
    <div class="title" v-text="computedTitle" />
    <div ref="svgContainer" class="svg-container" />
  </div>
</template>

<script>
export default {
  name: 'PluginComponent',
  data: self => ({
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
  computed: {
    computedTitle() {
      const units = this.units !== '' ? ` (${this.units})` : '';
      return this.title + units;
    },
  },
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
      this.render();
    },

    setSegments(segments = []) {
      this.segments = segments;
      this.render();
    },

    calculateValueColor() {
      this.segments.forEach(({ color, range }) => {
        const [min, max] = d3.extent(range);
        if (this.value >= min && this.value <= max) {
          this.valueColor = color;
        }
      });

      const [min, max] = this.valueRange;

      if (this.value <= min) {
        const segment = this.segments.find(s => s.range[0] === min);
        this.valueColor = segment.color;
      }

      if (this.value >= max) {
        const segment = this.segments.find(s => s.range[1] === max);
        this.valueColor = segment.color;
      }
    },

    render() {
      this.$nextTick(() => {
        this.clearSvgContainer();
        this.prepareRenderData();
        this.calculateValueColor();
        this.createSegments();
        this.createArrow();
        this.createTextCaptions();
      });
    },

    clearSvgContainer() {
      d3.select(this.$refs.svgContainer).select('svg').remove();
    },

    prepareRenderData() {
      const { mainContainer, svgContainer } = this.$refs;
      const sizeCutting = this.computedTitle.length <= 0 ? 70 : 50;
      const isContainerSizesEqual = mainContainer.offsetWidth === mainContainer.offsetHeight;

      let { offsetWidth: width, offsetHeight: height } = svgContainer;

      if (isContainerSizesEqual) {
        width -= sizeCutting;
        height -= sizeCutting;
      }

      const translateWidth = isContainerSizesEqual ? width + sizeCutting : width;
      const translateHeight = isContainerSizesEqual ? height + sizeCutting : height;

      this.svg = d3
        .select(svgContainer)
        .append('svg')
        .attr('class', 'content')
        .append('g')
        .attr('transform', `translate(${translateWidth / 2}, ${(translateHeight / 2) * 1.5})`);

      const endAngle = Math.PI / 2;
      const angles = [-endAngle, endAngle];

      this.valueRange = d3.extent(this.segments.map(s => s.range).flat());

      this.radius = Math.min(width, height) / 2;
      this.radius += width > height ? 25 : -25;

      this.arrowLength = this.radius - this.segmentWidth / 2;
      this.scale = d3.scaleLinear().range(angles).domain(this.valueRange);
    },

    createSegments() {
      this.segments.forEach(s => this.addSegment(s));
    },

    createArrow() {
      const valRadians = this.scale(this.value);
      const valDegrees = (valRadians * 180) / Math.PI;
      const halfWidth = 6;

      const [minVal, maxVal] = this.valueRange;

      let rotate = Number.isNaN(valDegrees) ? 0 : valDegrees;

      if (this.value <= minVal) rotate = (this.scale(minVal) * 180) / Math.PI;
      if (this.value >= maxVal) rotate = (this.scale(maxVal) * 180) / Math.PI;

      this.svg
        .append('path')
        .attr('class', 'arrow')
        .attr('transform', `rotate(${rotate})`)
        .attr('d', `M0 ${-this.arrowLength} L${-halfWidth} 0 L${halfWidth} 0`);
    },

    createTextCaptions() {
      const { valueRange, value, arrowLength } = this;
      const [min, max] = valueRange;

      const textCaptions = [{ x: 0, y: 30, text: value, className: 'cur-value' }];

      if (typeof min === 'number') {
        textCaptions.push({
          x: -arrowLength,
          y: 20,
          text: min,
          className: 'range-value',
        });
      }

      if (typeof max === 'number') {
        textCaptions.push({
          x: arrowLength,
          y: 20,
          text: max,
          className: 'range-value',
        });
      }

      textCaptions.forEach(c => this.addTextElement(c));
    },

    addSegment({ range, color }) {
      const [start, end] = range;
      const arc = d3
        .arc()
        .outerRadius(this.radius)
        .innerRadius(this.radius - this.segmentWidth)
        .startAngle(this.scale(start))
        .endAngle(this.scale(end));
      this.svg.append('path').attr('fill', color).attr('d', arc);
    },

    addTextElement({ x, y, text, className }) {
      const el = this.svg.append('text').attr('class', className);
      el.attr('x', x).attr('y', y).text(text);
      if (className === 'cur-value') el.attr('fill', this.valueColor);
    },
  },
};
</script>

<style lang="sass">
@import ./styles/component
</style>
