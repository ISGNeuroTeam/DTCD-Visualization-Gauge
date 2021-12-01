import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  StorageSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {
  #title;
  #units;
  #segments;
  #dataSourceName;
  #storageSystem;
  #guid;
  #eventSystem;
  #dataSourceSystemGUID;

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    const logSystem = new LogSystemAdapter(guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter(guid);

    eventSystem.registerPluginInstance(this);
    this.#guid = guid;
    this.#eventSystem = eventSystem;
    this.#storageSystem = new StorageSystemAdapter();
    this.#dataSourceSystemGUID = this.getGUID(this.getSystem('DataSourceSystem'));

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

    if (!dataSource) {
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

      const DS = this.getSystem('DataSourceSystem').getDataSource(this.#dataSourceName);
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

  setFormSettings() {}

  getFormSettings() {}
}
