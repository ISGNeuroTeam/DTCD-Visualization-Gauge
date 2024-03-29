import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  NotificationSystemAdapter,
  EventSystemAdapter,
  StorageSystemAdapter,
  DataSourceSystemAdapter,
} from '../../DTCD-SDK';

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
    isSettingsFromDatasource: false,
    ...this.defaultConfig,
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
    this.#eventSystem.registerPluginInstance(this, ['Clicked']);
    this.#storageSystem = new StorageSystemAdapter('0.5.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.2.0');
    this.#notificationSystem = new NotificationSystemAdapter('0.1.0', guid, pluginMeta.name);

    this.#dataSourceSystemGUID = this.getGUID(this.getSystem('DataSourceSystem', '0.2.0'));

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({
        guid: this.#guid,
      }),
      render: h => h(PluginComponent),
      methods: {
        publishEventClicked: (value) => {
          this.#eventSystem.publishEvent('Clicked', value);
        },
        createNotification: (title, body, options) => {
          this.#notificationSystem.create(title, body, options);
        },
      },
    }).$mount(selector);

    this.#vueComponent = view.$children[0];

    this.setResizeObserver(this.#vueComponent.$el, this.#vueComponent.setPanelSize);

    this.#logSystem.debug(`${this.#id} initialization complete`);
    this.#logSystem.info(`${this.#id} initialization complete`);
  }

  setVueComponentPropValue(prop, value) {
    const methodName = `set${prop.charAt(0).toUpperCase() + prop.slice(1)}`;
    if (this.#vueComponent[methodName]) {
      this.#vueComponent[methodName](value);
    } else {
      throw new Error(`В компоненте отсутствует метод ${methodName} для присвоения свойства ${prop}`);
    }
  }

  setPluginConfig(config = {}) {
    this.#logSystem.debug(`Set new config to ${this.#id}`);
    this.#logSystem.info(`Set new config to ${this.#id}`);

    const configProps = Object.keys(this.#config);

    for (const [prop, value] of Object.entries(config)) {
      if (!configProps.includes(prop)) continue;
      if (prop !== 'dataSource') {
        if(!(['segments', 'title', 'units'].includes(prop) && config.isSettingsFromDatasource || prop === 'isSettingsFromDatasource')) {
          this.setVueComponentPropValue(prop, value);
        }
      } else if (value) {
        if (this.#config[prop]) {
          this.#logSystem.debug(
            `Unsubscribing ${this.#id} from DataSourceStatusUpdate({ dataSource: ${
              this.#config[prop]
            }, status: success })`
          );
          this.#eventSystem.unsubscribe(
            this.#dataSourceSystemGUID,
            'DataSourceStatusUpdate',
            this.#guid,
            'processDataSourceEvent',
            { dataSource: this.#config[prop], status: 'success' }
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
          { dataSource: dsNewName, status: 'success' }
        );

        const ds = this.#dataSourceSystem.getDataSource(dsNewName);

        if (ds && ds.status === 'success') {
          const data = this.#storageSystem.session.getRecord(dsNewName);

          if (this.#config.isSettingsFromDatasource) {
            if (data.length > 0 && data[0]?.title) {
              this.setVueComponentPropValue('title', data[0]?.title)
              this.#config.title = data[0]?.title;
            }
            if (data.length > 0 && data[0]?.metadata) {
              const metadata = eval(data[0]?.metadata)
              this.setVueComponentPropValue('segments', metadata)
              this.#config.segments = eval(data[0]?.metadata);
            }
            if (data.length > 0 && data[0]?.units) {
              this.setVueComponentPropValue('units', data[0]?.units)
              this.#config.units = data[0]?.units;
            }

          }

          this.loadData(data);
        }
      }

      this.#config[prop] = value;
      this.#logSystem.debug(`${this.#id} config prop value "${prop}" set to "${value}"`);
    }
  }

  getPluginConfig() {
    return { ...this.#config };
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

    if (this.#config.isSettingsFromDatasource) {
      if (data.length > 0 && data[0]?.title) {
        this.setVueComponentPropValue('title', data[0]?.title)
        this.#config.title = data[0]?.title;
      }
      if (data.length > 0 && data[0]?.metadata) {
        const metadata = eval(data[0]?.metadata)
        this.setVueComponentPropValue('segments', metadata)
        this.#config.segments = eval(data[0]?.metadata);
      }
      if (data.length > 0 && data[0]?.units) {
        this.setVueComponentPropValue('units', data[0]?.units)
        this.#config.units = data[0]?.units;
      }

    }

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
          component: 'switch',
          propName: 'isSettingsFromDatasource',
          attrs: {
            label: 'Подставлять настройки из источника данных',
            propValue: false,
          },
        },
        ...this.defaultFields,
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

  getState() {
    return Object.assign(
      this.getPluginConfig(),
      { dataset: this.#vueComponent.dataset },
    );
  }

  setState(newState) {
    if (typeof newState !== 'object' ) return;

    this.setPluginConfig(newState);

    const vueNamesFields = [
      'dataset',
    ];

    for (const [prop, value] of Object.entries(newState)) {
      if (!vueNamesFields.includes(prop)) continue;
      this.#vueComponent[prop] = value;
    }
  }
}
