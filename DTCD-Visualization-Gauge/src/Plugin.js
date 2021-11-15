import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor (guid, selector) {
    super();

    const logSystem = new LogSystemAdapter(guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter();

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
  }

  setPluginConfig(config = {}) {
    const { title, value, units, segments } = config;
    this.setTitle(title);
    this.setValue(value);
    this.setUnits(units);
    this.setSegments(segments);
  }

  getPluginConfig() {
    return this.vueComponent.getConfig();
  }

  setFormSettings() {}

  getFormSettings() {}

  setTitle(text = '') {
    this.vueComponent.setTitle(text);
  }

  setValue(value = '') {
    this.vueComponent.setValue(value);
  }

  setUnits(units = '') {
    this.vueComponent.setUnits(units);
  }

  setSegments(segments = []) {
    this.vueComponent.setSegments(segments);
  }

}
