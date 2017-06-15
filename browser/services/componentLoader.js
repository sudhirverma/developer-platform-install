'use strict';

const baseOrder = {
  'root': ['jdk'],
  'jdk':  ['virtualbox', 'devstudio', 'jbosseap'],
  'virtualbox': ['hyperv'],
  'hyperv': ['cygwin'],
  'cygwin': ['cdk'],
  'devstudio': ['fusetools'],
  'fusetools': [],
  'jbosseap': [],
  'cdk': [],
  'kompose': []
};

class ComponentLoader {
  constructor(installerDataSvc) {
    this.requirements = installerDataSvc.requirements;
    this.installerDataSvc = installerDataSvc;
  }

  loadComponents() {
    for (let key in this.requirements) {
      this.addComponent(key);
    }
    this.orderInstallation();
  }

  loadComponent(key) {
    this.addComponent(key);
    this.orderInstallation();
  }

  removeComponent(key) {
    this.installerDataSvc.allInstallables().delete(key);
    this.installerDataSvc.toDownload.delete(key);
    this.installerDataSvc.toInstall.delete(key);
    this.orderInstallation();
  }

  addComponent(key) {
    if (this.requirements[key] && this.requirements[key].bundle !== 'tools') {
      this.requirements[key].keyName = key;
      this.requirements[key].installerDataSvc = this.installerDataSvc;
      if(this.requirements[key].dmUrl) {
        this.requirements[key].downloadUrl = this.requirements[key].dmUrl;
      } else {
        this.requirements[key].downloadUrl = this.requirements[key].url;
      }
      let component = new DynamicClass(this.requirements[key].modulePath, this.requirements[key]);
      this.installerDataSvc.addItemToInstall(key, component);
    }
  }

  orderInstallation() {
    let newOrder = {};
    Object.assign(newOrder, baseOrder);
    let changed;

    do {
      changed = false;
      for (let item of Object.keys(newOrder)) {
        let children = newOrder[item];
        let finalChildren = [];
        for (let i = 0; i < children.length; i++) {
          if (this.installerDataSvc.getInstallable(children[i])) {
            finalChildren.push(children[i]);
          } else {
            if (newOrder[children[i]]) {
              finalChildren = finalChildren.concat(newOrder[children[i]]);
              newOrder[item] = finalChildren;
              changed = true;
            }
          }
        }
      }
    } while (changed);

    for (let [key, value] of this.installerDataSvc.allInstallables()) {
      for (let i = 0; i < newOrder[key].length; i++) {
        let nextItem = this.installerDataSvc.getInstallable(newOrder[key][i]);
        value.thenInstall(nextItem);
      }
    }
  }
}

class DynamicClass {
  constructor (modulePath, config) {
    let klass = require(`../${modulePath}`);
    let obj = klass.default.convertor.fromJson(config);
    return obj;
  }
}

export default ComponentLoader;
