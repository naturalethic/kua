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

var _daemonize2 = require('daemonize2');

var _daemonize = _interopRequireWildcard(_daemonize2);

var _jsYaml = require('js-yaml');

var yaml = _interopRequireWildcard(_jsYaml);

var _ramda = require('ramda');

var fp = _interopRequireWildcard(_ramda);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _module = require('module');

var _module2 = _interopRequireDefault(_module);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Function.prototype.$asyncbind = function $asyncbind(self, catcher) {
  var resolver = this;

  if (catcher === true) {
    if (!Function.prototype.$asyncbind.EagerThenable) Function.prototype.$asyncbind.EagerThenable = function factory(tick) {
      var _tasks = [];

      if (!tick) {
        try {
          tick = process.nextTick;
        } catch (ex) {
          tick = function tick(p) {
            setTimeout(p, 0);
          };
        }
      }

      function _untask() {
        for (var i = 0; i < _tasks.length; i += 2) {
          var t = _tasks[i + 1],
              r = _tasks[i];

          for (var j = 0; j < t.length; j++) {
            t[j].call(null, r);
          }
        }

        _tasks = [];
      }

      function isThenable(obj) {
        return obj && obj instanceof Object && typeof obj.then === 'function';
      }

      function EagerThenable(resolver) {
        function done(inline) {
          var w;
          if (_sync || phase < 0 || (w = _thens[phase]).length === 0) return;

          _tasks.push(result, w);

          _thens = [[], []];
          if (_tasks.length === 2) inline ? _untask() : tick(_untask);
        }

        function resolveThen(x) {
          if (isThenable(x)) return x.then(resolveThen, rejectThen);
          phase = 0;
          result = x;
          done(true);
        }

        function rejectThen(x) {
          if (isThenable(x)) return x.then(resolveThen, rejectThen);
          phase = 1;
          result = x;
          done(true);
        }

        function settler(resolver, rejecter) {
          _thens[0].push(resolver);

          _thens[1].push(rejecter);

          done();
        }

        function toString() {
          return 'EagerThenable{' + {
            '-1': 'pending',
            0: 'resolved',
            1: 'rejected'
          }[phase] + '}=' + result.toString();
        }

        this.then = settler;
        this.toString = toString;
        var _thens = [[], []],
            _sync = true,
            phase = -1,
            result;
        resolver.call(null, resolveThen, rejectThen);
        _sync = false;
        done();
      }

      EagerThenable.resolve = function (v) {
        return isThenable(v) ? v : {
          then: function then(resolve, reject) {
            return resolve(v);
          }
        };
      };

      return EagerThenable;
    }();
    return new Function.prototype.$asyncbind.EagerThenable(boundThen);
  }

  if (catcher) {
    if (Function.prototype.$asyncbind.wrapAsyncStack) catcher = Function.prototype.$asyncbind.wrapAsyncStack(catcher);
    return then;
  }

  function then(result, error) {
    try {
      return result && result instanceof Object && typeof result.then === 'function' ? result.then(then, catcher) : resolver.call(self, result, error || catcher);
    } catch (ex) {
      return (error || catcher)(ex);
    }
  }

  function boundThen(result, error) {
    return resolver.call(self, result, error);
  }

  boundThen.then = boundThen;
  return boundThen;
};

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
      this.option = {};
      this.glob = glob.sync;
      this.task = this.camelize(optimist.argv._[0] || '');
      this.subtask = this.camelize(optimist.argv._[1] || optimist.argv._[0] || '');
      this.args = optimist.argv._;
      this.uuid = _uuid2.default;
      this.extend = _deepExtend2.default;
      this.fp = fp;
      if (this.subtask == this.task) {
        this.params = this.args.slice(1);
      } else {
        this.params = this.args.slice(2);
      }
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(optimist.argv)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          this.option[this.camelize(key)] = optimist.argv[key];
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
      this.addNodePath(this.root + '/lib');
    }
  }, {
    key: 'leftAlign',
    value: function leftAlign() {
      var string = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];

      var lines = fp.filter(fp.identity, string.split('\n'));
      var indent = /^(\s+)/.exec(lines[0])[1].length;
      return fp.filter(fp.identity, fp.map(function (l) {
        return l.substr(indent);
      }, lines)).join('\n');
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
    key: 'loadModule',
    value: function loadModule(modulePath) {
      var originalDir = process.cwd();
      process.chdir(__dirname + '/..');
      var module = new _module2.default();
      module.paths = [this.root + '/node_modules', this.root + '/lib'];
      /* eslint-disable no-underscore-dangle */
      module._compile(babel.transform(fs.readFileSync(modulePath, 'utf8'), {
        /* eslint-enable no-underscore-dangle */
        presets: ['es2015'],
        plugins: ['syntax-async-functions', 'fast-async']
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
      if (!this.task) {
        return process.stdout.write('No task specified.\n');
      }
      if (!fs.existsSync(this.root + '/task/' + this.task + '.js')) {
        return process.stdout.write('Task does not exist.\n');
      }
      var module = this.loadModule(this.root + '/task/' + this.task + '.js');
      if (!module[this.subtask]) {
        return process.stdout.write('Subtask does not exist.\n');
      }
      var task = module[this.subtask];
      if (this.daemonizeAction) {
        this.daemonize();
      } else if (this.option.watch) {
        this.watch(module.watch);
      } else {
        task.apply(undefined, _toConsumableArray(this.params));
      }
    }
  }]);

  return Kua;
}();

exports.default = new Kua();