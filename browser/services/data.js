'use strict';

import InstallableItem from '../model/installable-item';
let os = require('os');
let path = require('path');

class InstallerDataService {
  constructor($state) {
	this.tmpDir = os.tmpdir();
	
	if (process.platform === 'win32') {
	  this.installRoot = 'c:\\DeveloperPlatform';
	} else {
	  this.installRoot = process.env.HOME + '/DeveloperPlatform';
	}  
	
    this.router = $state;

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.downloading = false;
    this.installing = false;

    this.vboxRoot = path.join(this.installRoot, 'VirtualBox');
    this.jdkRoot = path.join(this.installRoot, 'JDK8');
    this.jbdsRoot = path.join(this.installRoot, 'JBDS');
    this.vagrantRoot = path.join(this.installRoot, 'Vagrant');
    this.cygwinRoot = path.join(this.installRoot, 'cygwin');
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
  }

  getInstallable(key) {
    return this.installableItems.get(key);
  }

  allInstallables() {
    return this.installableItems;
  }

  virtualBoxDir() {
    return this.vboxRoot;
  }

  jdkDir() {
    return this.jdkRoot;
  }

  jbdsDir() {
    return this.jbdsRoot;
  }

  vagrantDir() {
    return this.vagrantRoot;
  }

  cygwinDir() {
    return this.cygwinRoot;
  }

  installDir() {
    return this.installRoot;
  }

  tempDir() {
    return this.tmpDir;
  }

  isDownloading() {
    return this.downloading;
  }

  isInstalling() {
    return this.installing;
  }

  startDownload(key) {
    if (!this.isDownloading()) {
      this.downloading = true;
    }
    this.toDownload.add(key);
  }

  downloadDone(progress, key) {
    let item = this.getInstallable(key);
    item.setDownloadComplete();

    this.toDownload.delete(key);
    if (this.isDownloading() && this.toDownload.size == 0) {
      this.downloading = false;
    }

    this.startInstall(key);
    return item.install(progress,
      () => {
        this.installDone(key);
      },
      (error) => {
        alert(error);
      }
    );
  }

  startInstall(key) {
    if (!this.isInstalling()) {
      this.installing = true;
    }
    this.toInstall.add(key);
  }

  installDone(key) {
    let item = this.getInstallable(key);
    item.setInstallComplete();

    this.toInstall.delete(key);
    if (!this.isDownloading() && this.isInstalling() && this.toInstall.size == 0) {
      this.installing = false;
      this.router.go('start');
    }
  }

  static factory($state) {
    return new InstallerDataService($state);
  }
}

InstallerDataService.factory.$inject = ['$state'];

export default InstallerDataService;