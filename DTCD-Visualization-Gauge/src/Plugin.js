import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  NotificationSystemAdapter,
  EventSystemAdapter,
  StorageSystemAdapter,
  DataSourceSystemAdapter,
} from './../../DTCD-SDK';

export class VisualizationGauge extends PanelPlugin {

  #id;
  #guid;
  #logSystem;
  #eventSystem;
  #storageSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;
  #notificationSystem;
  #vueComponent;

  #config = {
    title: '',
    units: '',
    colValue: 'value',
    segments: [],
    dataSource: '',
  };

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    this.#guid = guid;
    this.#id = `${pluginMeta.name}[${guid}]`;
    this.#logSystem = new LogSystemAdapter('0.5.0', guid, pluginMeta.name);
    this.#eventSystem = new EventSystemAdapter('0.4.0', guid);
    this.#eventSystem.registerPluginInstance(this);
    this.#storageSystem = new StorageSystemAdapter('0.5.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.2.0');
    this.#notificationSystem = new NotificationSystemAdapter('0.1.0', guid, pluginMeta.name);

    this.#dataSourceSystemGUID = this.getGUID(
      this.getSystem('DataSourceSystem', '0.2.0')
    );

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({}),
      render: h => h(PluginComponent),
      methods: {
        createNotification: (title, body, options) => {
          this.#notificationSystem.create(title, body, options);
        }
      },
    }).$mount(selector);

    this.#vueComponent = view.$children[0];
    this.#logSystem.debug(`${this.#id} initialization complete`);
    this.#logSystem.info(`${this.#id} initialization complete`);
  }

  setPluginConfig(config = {}) {
    this.#logSystem.debug(`Set new config to ${this.#id}`);
    this.#logSystem.info(`Set new config to ${this.#id}`);

    const configProps = Object.keys(this.#config);

    for (const [prop, value] of Object.entries(config)) {
      if (!configProps.includes(prop)) continue;

      if (prop === 'title') this.#vueComponent.setTitle(value);
      if (prop === 'units') this.#vueComponent.setUnits(value);
      if (prop === 'segments') this.#vueComponent.setSegments(value);
      if (prop === 'colValue') this.#vueComponent.setColValue(value);

      if (prop === 'dataSource' && value) {
        if (this.#config[prop]) {
          this.#logSystem.debug(
            `Unsubscribing ${this.#id} from DataSourceStatusUpdate({ dataSource: ${this.#config[prop]}, status: success })`
          );
          this.#eventSystem.unsubscribe(
            this.#dataSourceSystemGUID,
            'DataSourceStatusUpdate',
            this.#guid,
            'processDataSourceEvent',
            { dataSource: this.#config[prop], status: 'success' },
            );
          }

        const dsNewName = value;

        this.#logSystem.debug(
          `Subscribing ${this.#id} for DataSourceStatusUpdate({ dataSource: ${dsNewName}, status: success })`
        );

        this.#eventSystem.subscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: dsNewName, status: 'success' },
        );

        const ds = this.#dataSourceSystem.getDataSource(dsNewName);

        if (ds && ds.status === 'success') {
          const data = this.#storageSystem.session.getRecord(dsNewName);
          this.loadData(data);
        }
      }

      this.#config[prop] = value;
      this.#logSystem.debug(`${this.#id} config prop value "${prop}" set to "${value}"`);
    }
  }

  getPluginConfig() {
    return { ...this.#config, segmnets: [...this.#config.segments] };
  }

  loadData(data) {
    this.#vueComponent.setDataset(data);
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    const data = this.#storageSystem.session.getRecord(dataSource);
    this.#logSystem.debug(
      `${this.#id} process DataSourceStatusUpdate({ dataSource: ${dataSource}, status: ${status} })`
    );
    this.loadData(data);
  }

  setFormSettings(config) {
    this.setPluginConfig(config);
  }

  getFormSettings() {
    return {
      fields: [
        {
          component: 'title',
          propValue: 'Общие настройки',
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
          component: 'text',
          propName: 'title',
          attrs: {
            label: 'Заголовок',
          },
        },
        {
          component: 'text',
          propName: 'units',
          attrs: {
            label: 'Единицы измерения',
          },
        },
        {
          component: 'text',
          propName: 'colValue',
          attrs: {
            label: 'Имя колонки со значением',
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
