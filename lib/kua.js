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

var _optimist = require('optimist');

var optimist = _interopRequireWildcard(_optimist);

var _chokidar = require('chokidar');

var chokidar = _interopRequireWildcard(_chokidar);

var _glob = require('glob');

var glob = _interopRequireWildcard(_glob);

var _daemonize2 = require('daemonize2');

var _daemonize = _interopRequireWildcard(_daemonize2);

var _jsYaml = require('js-yaml');

var yaml = _interopRequireWildcard(_jsYaml);

var _ramda = require('ramda');

var fp = _interopRequireWildcard(_ramda);

var _objectPath = require('object-path');

var op = _interopRequireWildcard(_objectPath);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

require('babel-polyfill');

require('babel-register');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

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
      if (['start', 'stop'].includes(optimist.argv._[0])) {
        this.daemonizeAction = optimist.argv._.shift();
      }
      this.config = { color: true };
      this.root = fs.realpathSync(root || optimist.argv.root || process.cwd());
      this.glob = glob.sync;
      this.task = this.camelize(optimist.argv._[0] || '');
      this.args = optimist.argv._;
      this.uuid = _uuid2.default;
      this.extend = _deepExtend2.default;
      this.fp = fp;
      this.params = this.args.slice(1);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(optimist.argv)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          if (key !== '_' && key[0] !== '$') {
            op.set(this.config, this.camelize(key).replace(/:/g, '.'), optimist.argv[key]);
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
        var log = fs.createWriteStream(this.config.log, { flags: 'a+' });
        process.stdout.write = process.stderr.write = log.write.bind(log);
        process.on('uncaughtException', function (error) {
          process.stderr.write(error && error.stack ? error.stack : error);
          process.stderr.write('\n');
        });
      }
      if (fs.existsSync(this.root + '/config.yml')) {
        (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/config.yml'));
      }
      if (fs.existsSync(this.root + '/host.yml')) {
        (0, _deepExtend2.default)(this.config, this.loadYaml(this.root + '/host.yml'));
      }
    }
  }, {
    key: 'leftAlign',
    value: function leftAlign() {
      var string = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

      var lines = fp.filter(fp.identity, string.split('\n'));
      var indent = /^(\s*)/.exec(lines[0])[1].length;
      return fp.filter(fp.identity, fp.map(function (l) {
        return l.substr(indent);
      }, lines)).join('\n');
    }
  }, {
    key: 'print',
    value: function print() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = args[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var arg = _step2.value;

          process.stdout.write(arg);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      process.stdout.write('\n');
    }
  }, {
    key: 'camelize',
    value: function camelize(string) {
      return string.trim().replace(/(\-|_|\s)+(.)?/g, function (m, s, c) {
        return c ? c.toUpperCase() : '';
      });
    }
  }, {
    key: 'dasherize',
    value: function dasherize(string) {
      return string.trim().replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1').replace(/-+/g, '-').toLowerCase();
    }
  }, {
    key: 'loadYaml',
    value: function loadYaml(filePath) {
      return yaml.load(fs.readFileSync(filePath, 'utf8'));
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
      if (text) {
        return this.config.color && '\u001b[38;5;' + xterm256Color + 'm' + text + '\u001b[0m' || text;
      }
      return this.config.color && '\u001b[38;5;' + xterm256Color + 'm' || '';
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
      return require(modulePath); // eslint-disable-line global-require
    }
  }, {
    key: 'watch',
    value: function watch(_watch) {
      var _this = this;

      var command = [optimist.argv.$0].concat(process.argv.slice(2)).join(' ').replace(' --watch', '');
      this.child = this.spawnAsync(command);
      chokidar.watch(_watch || [], { persistent: true, ignoreInitial: true }).on('all', function (_, p) {
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

      var daemon = _daemonize.setup({
        main: optimist.argv.$0,
        pidfile: '/tmp/kua-' + path.basename(this.root) + '-' + this.task + '-' + this.subtask + '.pid',
        name: ['kua'].concat(optimist.argv._).join(' '),
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
        process.stdout.write('No task specified.\n');
      } else if (!fs.existsSync(this.root + '/task/' + this.task + '.js')) {
        process.stdout.write('Task does not exist.\n');
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