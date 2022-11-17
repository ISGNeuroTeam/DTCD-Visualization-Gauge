<template>
  <div ref="mainContainer" class="VisualizationGauge">
    <div class="title" ref="title" v-text="computedTitle" />
    <div v-if="value === null" class="NoData">
      <span class="FontIcon name_infoCircleOutline Icon"></span>
       Нет данных для отображения
    </div>
    <div v-show="value" ref="svgContainer" class="svg-container"/>
  </div>
</template>

<script>
export default {
  name: 'PluginComponent',
  data: ({ $root }) => ({
    notificationSystem: $root.notificationSystem,
    guid: $root.guid,
    /** Gauge technical data. */
    svg: null,
    radius: 0,
    scale: [],
    valueColor: '',
    valueRange: [],
    dataAttr: '',
    arrowLength: 0,
    segmentWidth: 30,
    /** Gauge user data. */
    title: '',
    units: '',
    colValue: 'value',
    segments: [],
    dataset: [],
    panelSize: {
      height:200,
      width:200
    },
  }),
  computed: {
    computedTitle() {
      const units = this.units !== '' ? ` (${this.units})` : '';
      return this.title + units;
    },

    value() {
      if (this.dataset.length < 1) return null;
      const value = this.dataset[0][this.colValue];
      return typeof value === 'undefined' ? null : value;
    },
  },
  mounted() {
    const { svgContainer } = this.$refs;
    const rect = svgContainer.getBoundingClientRect()
    this.panelSize =  {
      width: rect.width,
      height: rect.height,
    }
    const attrs = svgContainer.getAttributeNames();
    this.dataAttr = attrs.find(attr => attr.startsWith('data-'));
  },
  watch: {
    panelSize: {
      deep: true,
      handler(val, old) {
        if (JSON.stringify(val) !== JSON.stringify(old)) {
          this.render()
        }
      },
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

    setColValue(col = 'value') {
      this.colValue = col;
      this.render();
    },

    setSegments(segments = []) {
      this.segments = segments;
      this.render();
    },
    setPanelSize(panelSize) {
      this.panelSize = panelSize
    },
    setDataset(data = []) {
      this.dataset = data;
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

      const floatValue = Number.parseFloat(this.value);
      if (!isNaN(floatValue) && (floatValue < min || floatValue > max)) {
        this.$root.createNotification(
          `Gauge: ${this.guid}`,
          'Значение вышло за пределы шкалы',
          {
            floatMode: true,
            tag: `${this.guid}-outside-value`,
            type: 'warning',
          }
        )
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

      let { width, height } = this.panelSize;
      const isContainerSizesEqual = width === height;

      if (isContainerSizesEqual) {
        width -= sizeCutting;
        height -= sizeCutting;
      }
      if(this.$refs.title && this.computedTitle) {
        height -= this.$refs.title.getBoundingClientRect().height
      }
      const translateWidth = isContainerSizesEqual ? width + sizeCutting : width;
      const translateHeight = isContainerSizesEqual ? height + sizeCutting : height;
      this.svg = d3
        .select(svgContainer)
        .append('svg')
        .attr(this.dataAttr, '')
        .attr('class', 'content')
        .append('g')
        .attr('transform', `translate(${translateWidth / 2}, ${(translateHeight / 2) * 1.5})`);

      const endAngle = Math.PI / 2;
      const angles = [-endAngle, endAngle];

      this.valueRange = d3.extent(this.segments.map(s => s.range).flat());

      this.radius = Math.min(width, height) / 2;

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
        .attr(this.dataAttr, '')
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
      this.svg.append('path')
        .attr('fill', color)
        .attr('d', arc)
        .on('click', () => {
          this.$root.publishEventClicked({ range, color })
        });
    },

    addTextElement({ x, y, text, className }) {
      const el = this.svg
        .append('text')
        .attr(this.dataAttr, '')
        .attr('class', className);
      el.attr('x', x).attr('y', y).text(text);
      if (className === 'cur-value') {
        if (this.valueRange[1] >= text){
          el.attr('fill', this.valueColor);
        } else {
          el.attr('fill', "#000000");
        }
      }
    },

    getState() {
      const returnedState = {
        title: this.title,
      };
      return returnedState;
    },
  },
};
</script>

<style lang="sass" scoped>
*
  box-sizing: border-box
  margin: 0
  padding: 0

.VisualizationGauge
  width: 100%
  height: 100%
  display: flex
  flex-direction: column
  font-family: 'Proxima Nova', serif

  .NoData
    flex-grow: 1
    display: flex
    align-items: center
    justify-content: center
    flex-direction: column
    color: var(--text_secondary)

    .Icon
      color: var(--border_secondary)
      font-size: 100px
      margin-bottom: 8px

  .title
    max-height: 60px
    padding: 10px 16px 0
    color: var(--text_main)
    font-size: 18px
    font-weight: 700
    line-height: 23px
    overflow: auto

  .svg-container
    flex-grow: 1
    overflow: hidden

    .content
      width: 100%
      height: 100%

      .arrow
        fill: var(--title)

      .cur-value, .range-value
        font-size: 22px
        font-weight: 700
        text-anchor: middle

      .range-value
        fill: var(--text_main)
        font-size: 18px
</style>
