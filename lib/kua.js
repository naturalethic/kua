'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _optimist = require('optimist');

var _optimist2 = _interopRequireDefault(_optimist);

var _chokidar = require('chokidar');

var _chokidar2 = _interopRequireDefault(_chokidar);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _daemonize2 = require('daemonize2');

var _daemonize3 = _interopRequireDefault(_daemonize2);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _objectPath = require('object-path');

var _objectPath2 = _interopRequireDefault(_objectPath);

var _inflection = require('inflection');

var _inflection2 = _interopRequireDefault(_inflection);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

require('babel-polyfill');

require('babel-register');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

global.Promise = _bluebird2.default;

var Kua = function () {
  function Kua() {
    _classCallCheck(this, Kua);
  }

  _createClass(Kua, [{
    key: 'initialize',
    value: function initialize(root) {
      this.config = { color: true };
      this.root = _fs2.default.realpathSync(root || _optimist2.default.argv.root || process.cwd());
      var babelPath = _path2.default.join(this.root, '.babelrc');
      var eslintPaths = [_path2.default.join(this.root, '.eslint.js'), _path2.default.join(this.root, '.eslint.json')];
      var kuaPackage = require(_path2.default.join(__dirname, '..', 'package.json'));
      var projectPackage = require(_path2.default.join(this.root, 'package.json'));
      if (!projectPackage.babel && !_fs2.default.existsSync(babelPath)) {
        console.log('Creating .babelrc');
        _fs2.default.writeFileSync(babelPath, JSON.stringify(kuaPackage.babel, null, 2));
      }
      if (!projectPackage.eslintConfig && !(_fs2.default.existsSync(eslintPaths[0]) || !_fs2.default.existsSync(eslintPaths[1]))) {
        console.log('Creating .eslintrc.json');
        _fs2.default.writeFileSync(eslintPaths[1], JSON.stringify(kuaPackage.eslintConfig, null, 2));
      }
      if (['start', 'stop'].includes(_optimist2.default.argv._[0])) {
        this.daemonizeAction = _optimist2.default.argv._.shift();
      }
      this.glob = _glob2.default.sync;
      this.task = this.camelize(_optimist2.default.argv._[0] || '');
      this.args = _optimist2.default.argv._;
      this.uuid = _uuid2.default;
      this.extend = _deepExtend2.default;
      this.fp = _ramda2.default;
      this.params = this.args.slice(1);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(_optimist2.default.argv)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          if (key !== '_' && key[0] !== '$') {
            _objectPath2.default.set(this.config, this.camelize(key).replace(/:/g, '.'), _optimist2.default.argv[key]);
          }
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

      if (this.config.log) {
        var log = _fs2.default.createWriteStream(this.config.log, { flags: 'a+' });
        process.stdout.write = process.stderr.write = log.write.bind(log);
        process.on('uncaughtException', function (error) {
          process.stderr.write(error && error.stack ? error.stack : error);
          process.stderr.write('\n');
        });
      }
      if (_fs2.default.existsSync(this.root + '/config.yml')) {
        (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/config.yml'));
      }
      if (_fs2.default.existsSync(this.root + '/secret.yml')) {
        (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/secret.yml'));
      }
      if (this.config.host) {
        if (_fs2.default.existsSync(this.root + '/' + this.config.host + '.yml')) {
          (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/' + this.config.host + '.yml'));
        } else {
          this.print('Specified host config \'' + this.config.host + '.yml\' does not exist.');
          process.exit();
        }
      } else if (_fs2.default.existsSync(this.root + '/host.yml')) {
        (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/host.yml'));
      }
      if (this.config.dotfile) {
        this.dotfile = _os2.default.homedir() + '/.' + this.config.dotfile;
        this.config.dotfile = {};
        if (_fs2.default.existsSync(this.dotfile)) {
          (0, _deepExtend2.default)(this.config.dotfile, this.loadYaml(this.dotfile));
        }
      } else {
        this.config.dotfile = {};
      }
    }
  }, {
    key: 'saveDotfile',
    value: function saveDotfile() {
      this.saveYaml(this.dotfile, this.config.dotfile);
    }
  }, {
    key: 's',
    value: function s(strings) {
      for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        values[_key - 1] = arguments[_key];
      }

      return this.leftAlign(strings.reduce(function (memo, s, i) {
        return '' + memo + s + (values[i] === undefined ? '' : values[i]);
      }, ''));
    }
  }, {
    key: 'leftAlign',
    value: function leftAlign() {
      var string = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      var lines = _ramda2.default.filter(_ramda2.default.identity, string.split('\n'));
      var indent = /^(\s*)/.exec(lines[0])[1].length;
      return _ramda2.default.filter(_ramda2.default.identity, _ramda2.default.map(function (l) {
        return l.substr(indent);
      }, lines)).join('\n');
    }
  }, {
    key: 'print',
    value: function print() {
      var _console;

      (_console = console).log.apply(_console, arguments); // eslint-disable-line no-console
    }
  }, {
    key: 'inspect',
    value: function inspect(obj) {
      console.dir(obj, { colors: true, depth: null }); // eslint-disable-line no-console
    }
  }, {
    key: 'camelize',
    value: function camelize(string) {
      return string.trim().replace(/(-|_|\s)+(.)?/g, function (m, s, c) {
        return c ? c.toUpperCase() : '';
      });
    }
  }, {
    key: 'dasherize',
    value: function dasherize(string) {
      return string.trim().replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1').replace(/-+/g, '-').toLowerCase();
    }
  }, {
    key: 'capitalize',
    value: function capitalize(string) {
      return '' + string[0].toUpperCase() + string.substr(1);
    }
  }, {
    key: 'pluralize',
    value: function pluralize(string) {
      return _inflection2.default.pluralize(string);
    }
  }, {
    key: 'singularize',
    value: function singularize(string) {
      return _inflection2.default.singularize(string);
    }
  }, {
    key: 'loadYaml',
    value: function loadYaml(filePath) {
      return _jsYaml2.default.load(_fs2.default.readFileSync(filePath, 'utf8'));
    }
  }, {
    key: 'saveYaml',
    value: function saveYaml(filePath, object) {
      _fs2.default.writeFileSync(filePath, _jsYaml2.default.dump(object));
    }
  }, {
    key: 'exec',
    value: function exec(command) {
      return _child_process2.default.execSync(command).toString();
    }
  }, {
    key: 'spawn',
    value: function spawn(command) {
      var _command$match = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g),
          _command$match2 = _toArray(_command$match),
          head = _command$match2[0],
          tail = _command$match2.slice(1);

      return _child_process2.default.spawnSync(head, tail, { stdio: 'inherit' });
    }
  }, {
    key: 'spawnAsync',
    value: function spawnAsync(command) {
      var _command$match3 = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g),
          _command$match4 = _toArray(_command$match3),
          head = _command$match4[0],
          tail = _command$match4.slice(1);

      return _child_process2.default.spawn(head, tail, { stdio: 'inherit' });
    }
  }, {
    key: 'spawnPromise',
    value: function spawnPromise(command) {
      return new _bluebird2.default(function (resolve, reject) {
        var _command$match5 = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g),
            _command$match6 = _toArray(_command$match5),
            head = _command$match6[0],
            tail = _command$match6.slice(1);

        var child = _child_process2.default.spawn(head, tail, { stdio: 'inherit' });
        child.on('close', resolve);
        child.on('error', reject);
      });
    }
  }, {
    key: 'color',
    value: function color(xterm256Color, text) {
      if (text) {
        return this.config.color && '\x1B[38;5;' + xterm256Color + 'm' + text + '\x1B[0m' || text;
      }
      return this.config.color && '\x1B[38;5;' + xterm256Color + 'm' || '';
    }
  }, {
    key: 'colorend',
    value: function colorend() {
      return '\x1b[0m';
    }
  }, {
    key: 'compileLibs',
    value: function compileLibs() {}
  }, {
    key: 'loadModule',
    value: function loadModule(modulePath) {
      return require(modulePath);
    }
  }, {
    key: 'watch',
    value: function watch(_watch) {
      var _this = this;

      var command = [_optimist2.default.argv.$0].concat(process.argv.slice(2)).join(' ').replace(' --watch', '');
      this.child = this.spawnAsync(command);
      _chokidar2.default.watch(_watch || [], { persistent: true, ignoreInitial: true }).on('all', function (_, p) {
        _this.print('Change detected in ' + p + '...');
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

      var daemon = _daemonize3.default.setup({
        main: this.root + '/node_modules/kua/bin/kua',
        pidfile: '/tmp/kua-' + _path2.default.basename(this.root) + '-' + this.task + '-' + this.subtask + '.pid',
        name: ['kua'].concat(_optimist2.default.argv._).join(' '),
        argv: process.argv.slice(3).concat(['--log', 'kua.log']),
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
      if (!this.task) {
        this.task = 'index';
      }
      var taskPath = this.root + '/task/' + this.task + '.js';
      if (!_fs2.default.existsSync(taskPath)) {
        process.stdout.write('Task file not exist: \'' + taskPath + '\'\n');
      } else {
        var module = this.loadModule(this.root + '/task/' + this.task + '.js');
        if (!module.default) {
          process.stdout.write('Task module does not export default.\n');
        } else if (this.daemonizeAction) {
          this.daemonize();
        } else if (this.config.watch) {
          this.print('Watching for changes...');
          this.watch(module.watch);
        } else {
          module.default.apply(module, _toConsumableArray(this.params));
        }
      }
    }
  }]);

  return Kua;
}();

exports.default = new Kua();