'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var childProcess = _interopRequireWildcard(_child_process);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _babelCore = require('babel-core');

var babel = _interopRequireWildcard(_babelCore);

var _optimist = require('optimist');

var optimist = _interopRequireWildcard(_optimist);

var _chokidar = require('chokidar');

var chokidar = _interopRequireWildcard(_chokidar);

var _glob = require('glob');

var glob = _interopRequireWildcard(_glob);

var _uuid = require('uuid');

var uuid = _interopRequireWildcard(_uuid);

var _daemonize2 = require('daemonize2');

var _daemonize = _interopRequireWildcard(_daemonize2);

var _jsYaml = require('js-yaml');

var yaml = _interopRequireWildcard(_jsYaml);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _module = require('module');

var _module2 = _interopRequireDefault(_module);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function camelize(string) {
  return string.trim().replace(/(\-|_|\s)+(.)?/g, function (m, s, c) {
    return c ? c.toUpperCase() : '';
  });
}

var Kua = function () {
  function Kua() {
    _classCallCheck(this, Kua);
  }

  _createClass(Kua, [{
    key: 'initialize',
    value: function initialize(root) {
      if (['start', 'stop'].includes(optimist.argv._[0])) {
        this.daemonizeAction = optimist.argv._.shift();
      }
      this.config = { color: true };
      this.root = fs.realpathSync(root || optimist.argv.root || process.cwd());
      this.option = {};
      this.glob = glob.sync;
      this.task = camelize(optimist.argv._[0] || '');
      this.subtask = camelize(optimist.argv._[1] || optimist.argv._[0] || '');
      this.uuid = uuid;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(optimist.argv)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          this.option[camelize(key)] = optimist.argv[key];
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (this.option.logfile) {
        var log = fs.createWriteStream(this.option.logfile, { flags: 'a+' });
        process.stdout.write = process.stderr.write = log.write.bind(log);
        process.on('uncaughtException', function (error) {
          /* eslint-disable no-console */
          console.error(error && error.stack ? error.stack : error);
          /* eslint-enable no-console */
        });
      }
      if (fs.existsSync(this.root + '/config.yml')) {
        (0, _deepExtend2.default)(this.config, yaml.load(fs.readFileSync(this.root + '/config.yml', 'utf8')));
      }
      if (fs.existsSync(this.root + '/host.yml')) {
        (0, _deepExtend2.default)(this.config, yaml.load(fs.readFileSync(this.root + '/host.yml', 'utf8')));
      }
      this.addNodePath(this.root + '/lib');
    }
  }, {
    key: 'addNodePath',
    value: function addNodePath(nodePath) {
      _module2.default.globalPaths.push(nodePath);
    }
  }, {
    key: 'exec',
    value: function exec(command) {
      return childProcess.execSync(command).toString();
    }
  }, {
    key: 'spawn',
    value: function spawn(command) {
      var _command$match = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g);

      var _command$match2 = _toArray(_command$match);

      var head = _command$match2[0];

      var tail = _command$match2.slice(1);

      return childProcess.spawnSync(head, tail, { stdio: 'inherit' });
    }
  }, {
    key: 'spawnAsync',
    value: function spawnAsync(command) {
      var _command$match3 = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g);

      var _command$match4 = _toArray(_command$match3);

      var head = _command$match4[0];

      var tail = _command$match4.slice(1);

      return childProcess.spawn(head, tail, { stdio: 'inherit' });
    }
  }, {
    key: 'spawnPromise',
    value: function spawnPromise(command) {
      return new _bluebird2.default(function (resolve, reject) {
        var _command$match5 = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g);

        var _command$match6 = _toArray(_command$match5);

        var head = _command$match6[0];

        var tail = _command$match6.slice(1);

        var child = childProcess.spawn(head, tail, { stdio: 'inherit' });
        child.on('close', resolve);
        child.on('error', reject);
      });
    }
  }, {
    key: 'color',
    value: function color(xterm256Color, text) {
      return this.config.color && '\u001b[38;5;' + xterm256Color + 'm' + text + '\u001b[0m' || text;
    }
  }, {
    key: 'loadModule',
    value: function loadModule(modulePath) {
      var originalDir = process.cwd();
      process.chdir(__dirname + '/..');
      var module = new _module2.default();
      module.paths = [this.root + '/node_modules', this.root + '/lib'];
      /* eslint-disable no-underscore-dangle */
      module._compile(babel.transform(fs.readFileSync(modulePath, 'utf8'), {
        /* eslint-enable no-underscore-dangle */
        presets: ['es2015']
      }).code, modulePath);
      process.chdir(originalDir);
      return module.exports;
    }
  }, {
    key: 'watch',
    value: function watch(_watch) {
      var _this = this;

      var command = [optimist.argv.$0].concat(process.argv.slice(2)).join(' ').replace(' --watch', '');
      this.child = this.spawnAsync(command);
      chokidar.watch(_watch || [], { persistent: true, ignoreInitial: true }).on('all', function (_, p) {
        _this.info('Change detected in ' + p + '...');
        _this.child.kill();
        _this.child = _this.spawnAsync(command);
      });
      process.on('SIGTERM', function () {
        _this.child.kill();
        process.exit();
      });
    }
  }, {
    key: 'daemonize',
    value: function daemonize() {
      var _this2 = this;

      var daemon = _daemonize.setup({
        main: optimist.argv.$0,
        pidfile: '/tmp/kua-' + path.basename(this.root) + '-' + this.task + '-' + this.subtask + '.pid',
        name: ['kua'].concat(optimist.argv._).join(' '),
        argv: process.argv.slice(3).concat(['--logfile', 'kua.log']),
        cwd: this.root
      });
      daemon.on('error', function (e) {
        return _this2.error(e);
      });
      daemon[this.daemonizeAction]();
    }
  }, {
    key: 'run',
    value: function run(root) {
      this.initialize(root);
      process.chdir(this.root);
      var module = this.loadModule(this.root + '/task/' + this.task + '.js');
      var task = module[this.subtask];
      if (this.daemonizeAction) {
        this.daemonize();
      } else if (this.option.watch) {
        this.watch(module.watch);
      } else {
        task();
      }
    }
  }]);

  return Kua;
}();

exports.default = new Kua();