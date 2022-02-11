import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StorageSystemAdapter,
  DataSourceSystemAdapter,
} from './../../DTCD-SDK';

export class VisualizationGauge extends PanelPlugin {

  #title;
  #units;
  #segments;
  #dataSourceName;
  #storageSystem;
  #guid;
  #eventSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    const logSystem = new LogSystemAdapter('0.4.0', guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter('0.3.0', guid);

    eventSystem.registerPluginInstance(this);
    this.#guid = guid;
    this.#eventSystem = eventSystem;
    this.#storageSystem = new StorageSystemAdapter('0.4.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.1.0');

    this.#dataSourceSystemGUID = this.getGUID(
      this.getSystem('DataSourceSystem', '0.1.0')
    );

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
    this.#title = '';
    this.#units = '';
    this.#segments = [];
    this.#dataSourceName = '';
  }

  setPluginConfig(config = {}) {
    const { title, units, segments, dataSource } = config;

    if (typeof title !== 'undefined') {
      this.#title = title;
      this.vueComponent.setTitle(title);
    }

    if (typeof units !== 'undefined') {
      this.#units = units;
      this.vueComponent.setUnits(units);
    }

    if (typeof segments !== 'undefined') {
      this.#segments = segments;
      this.vueComponent.setSegments(segments);
    }

    if (dataSource) {
      if (this.#dataSourceName) {
        this.#eventSystem.unsubscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: this.#dataSourceName, status: 'success' }
        );
      }

      this.#dataSourceName = dataSource;

      this.#eventSystem.subscribe(
        this.#dataSourceSystemGUID,
        'DataSourceStatusUpdate',
        this.#guid,
        'processDataSourceEvent',
        { dataSource, status: 'success' }
      );

      const DS = this.#dataSourceSystem.getDataSource(this.#dataSourceName);

      if (DS && DS.status === 'success') {
        const data = this.#storageSystem.session.getRecord(this.#dataSourceName);
        this.loadData(data);
      }
    }
  }

  getPluginConfig() {
    const config = {};
    if (typeof this.#title !== 'undefined') config.title = this.#title;
    if (typeof this.#units !== 'undefined') config.units = this.#units;
    if (typeof this.#segments !== 'undefined') config.segments = this.#segments;
    if (typeof this.#dataSourceName !== 'undefined') config.dataSource = this.#dataSourceName;
    return config;
  }

  loadData(data) {
    if (data.length > 0) {
      this.vueComponent.setValue(data[0].value);
    }
    this.vueComponent.render();
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    this.#dataSourceName = dataSource;
    const data = this.#storageSystem.session.getRecord(this.#dataSourceName);
    this.loadData(data);
  }

  setFormSettings(config) {
    this.setPluginConfig(config);
  }

  getFormSettings() {
    return {
      fields: [
        {
          component: 'text',
          propName: 'title',
          attrs: {
            label: 'Заголовок',
            placeholder: 'Компонент 1',
            hint: 'name: "Компонент-1"',
          },
        },
        {
          component: 'text',
          propName: 'units',
          attrs: {
            label: 'Единицы измерения',
            value: 'млн. рублей',
          },
        },
        {
          component: 'datasource',
          propName: 'dataSource',
          attrs: {
            label: 'Выберите источник данных',
            placeholder: 'Выберите значение',
            required: true,
          },
        },
        {
          component: 'title',
          propValue: 'Диапазон данных',
        },
        {
          component: 'gauge-segments',
          propName: 'segments',
        },
      ],
    };
  }

}
