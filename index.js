/*jshint node: true, esversion: 5 */
'use strict';

var VersionChecker = require('ember-cli-version-checker');
var path = require('path');
var mergeTrees = require('broccoli-merge-trees');
var Funnel = require('broccoli-funnel');

module.exports = {
  name: 'liquid-fire',

  init: function() {
    if (this._super.init) {
      this._super.init.apply(this, arguments);
    }

    this.versionChecker = new VersionChecker(this);
    this.versionChecker.for('ember-cli', 'npm').assertAbove('0.2.0');
  },


  treeForAddon: function() {
    var tree = this._super.treeForAddon.apply(this, arguments);
    return this._versionSpecificTree('addon', tree);
  },

  treeForAddonTemplates: function() {
    var tree = this._super.treeForAddonTemplates.apply(this, arguments);
    return this._versionSpecificTree('templates', tree);
  },

  _getEmberVersion: function() {
    var emberVersionChecker = this.versionChecker.for('ember', 'bower');

    if (emberVersionChecker.version) {
      return emberVersionChecker;
    }

    return this.versionChecker.for('ember-source', 'npm');
  },

  _versionSpecificTree: function(which, tree) {
    var emberVersion = this._getEmberVersion();

    if ((emberVersion.gt('2.9.0-beta') && emberVersion.lt('2.9.0'))|| emberVersion.gt('2.10.0-alpha')) {
      return this._withVersionSpecific(which, tree, '2.9');
    } else if (!emberVersion.lt('1.13.0')) {
      return this._withVersionSpecific(which, tree, '1.13');
    } else {
      throw new Error("This version of liquid-fire supports Ember versions >= 1.13.0.");
    }
  },

  _withVersionSpecific: function(which, tree, version) {
    var versionSpecificPath = path.join(this.root, 'version-specific-' + version);
    var destDir;
    var include;
    if (which === 'templates') {
      destDir = 'version-specific';
      include = ["*.hbs"];
    } else {
      destDir = 'modules/liquid-fire/ember-internals/version-specific';
    }
    var funneled = new Funnel(versionSpecificPath, {
      include: include,
      destDir: destDir
    });
    return mergeTrees([tree, funneled]);
  },

  treeForVendor: function(tree){
    var velocityPath = path.dirname(require.resolve('velocity-animate'));
    var velocityTree = new Funnel(this.treeGenerator(velocityPath), {
      srcDir: '/',
      destDir: 'velocity'
    });

    var matchMediaPath = path.dirname(require.resolve('match-media'));
    var matchMediaTree = new Funnel(this.treeGenerator(matchMediaPath), {
      srcDir: '/',
      destDir: 'match-media'
    });

    return mergeTrees([tree, velocityTree, matchMediaTree]);
  },

  included: function(app){
    // see: https://github.com/ember-cli/ember-cli/issues/3718
    if (typeof app.import !== 'function' && app.app) {
      app = app.app;
    }

    if (process.env.EMBER_CLI_FASTBOOT) {
      // in fastboot we use the shim by itself, which will make
      // importing velocity a noop.
      app.import('vendor/shims/velocity.js');
    } else if (haveShimAMDSupport(app)) {
      // if this ember-cli is new enough to do amd imports
      // automatically, use that
      app.import('vendor/velocity/velocity.js', {
        using: [{
          transformation: 'amd', as: 'velocity'
        }]
      });
    } else {
      // otherwise apply our own amd shim
      app.import('vendor/velocity/velocity.js');
      app.import('vendor/shims/velocity.js');
    }

    if (!process.env.EMBER_CLI_FASTBOOT) {
      app.import('vendor/match-media/matchMedia.js');
    }

    app.import('vendor/liquid-fire.css');
  }

};

function haveShimAMDSupport(app) {
  return 'amdModuleNames' in app;
}
