'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable no-underscore-dangle */

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

var _bluebird = require('bluebird');

var Promise = _interopRequireWildcard(_bluebird);

var _co = require('co');

var co = _interopRequireWildcard(_co);

var _uuid = require('uuid');

var uuid = _interopRequireWildcard(_uuid);

var _daemonize = require('daemonize2');

var daemonize = _interopRequireWildcard(_daemonize);

var _jsYaml = require('js-yaml');

var yaml = _interopRequireWildcard(_jsYaml);

var _module = require('module');

var _module2 = _interopRequireDefault(_module);

var _deepExtend = require('deep-extend');

var _deepExtend2 = _interopRequireDefault(_deepExtend);

var _i2 = require('i');

var _i3 = _interopRequireDefault(_i2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var inflect = (0, _i3.default)();

var Kua = function () {
  function Kua() {
    _classCallCheck(this, Kua);
  }

  _createClass(Kua, [{
    key: 'initialize',
    value: function initialize(root) {
      var _this = this;

      if (['start', 'stop'].includes(optimist.argv._[0])) {
        this.daemonize = optimist.argv._.shift();
      }
      this.config = { color: true };
      this.root = fs.realpathSync(root || optimist.argv.root || process.cwd());
      this.option = {};
      this.glob = glob.sync;
      this.task = inflect.camelize(optimist.argv._[0] || '', false);
      this.subtask = inflect.camelize(optimist.argv._[1] || optimist.argv._[0] || '', false);
      this.uuid = uuid;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = Object.keys(optimist.argv)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          this.option[inflect.camelize(key, false)] = optimist.argv[key];
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

      var log = this.option.logfile && fs.openSync(this.option.logfile, 'a+');
      var _arr = ['log', 'info', 'warn', 'error'];

      var _loop = function _loop() {
        var level = _arr[_i];
        if (log) {
          _this[level] = function () {
            for (var _len = arguments.length, rest = Array(_len), _key = 0; _key < _len; _key++) {
              rest[_key] = arguments[_key];
            }

            fs.write(log, rest.join(' '));
            fs.write(log, '\n');
          };
        } else {
          _this[level] = function () {
            var _console;

            return (_console = console)[level].apply(_console, arguments);
          };
        }
      };

      for (var _i = 0; _i < _arr.length; _i++) {
        _loop();
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
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var resolvedOptions = Object.assign({}, options);
      resolvedOptions.stdio = options.stdio || 'inherit';
      return new Promise(function (resolve) {
        var _command$match = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g);

        var _command$match2 = _toArray(_command$match);

        var head = _command$match2[0];

        var tail = _command$match2.slice(1);

        return childProcess.spawn(head, tail, resolvedOptions).on('close', resolve);
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
      module._compile(babel.transform(fs.readFileSync(modulePath, 'utf8'), {
        presets: ['es2015']
      }).code, modulePath);
      process.chdir(originalDir);
      return module.exports;
    }
  }, {
    key: 'run',
    value: function run(root) {
      var _this2 = this;

      this.initialize(root);
      process.chdir(this.root);
      var task = this.loadModule(this.root + '/task/' + this.task + '.js')[this.subtask];
      if (this.daemonize) {
        var daemon = daemonize.setup({
          main: optimist.argv.$0,
          pidfile: '/tmp/kua-' + path.basename(this.root) + '-' + this.task + '-' + this.subtask + '.pid',
          name: ['kua'].concat(optimist.argv._).join(' '),
          argv: optimist.argv._.concat(['--logfile', 'kua.log']),
          cwd: this.root
        });
        daemon.on('error', function (e) {
          return _this2.error(e);
        });
        daemon[this.daemonize]();
        process.exit();
      }
      task();
    }
  }]);

  return Kua;
}();

// //   if mix.task.0 in <[ start stop ]>
// //     daemon-action := mix.task.shift!

// //   global.debounce = ->
// //     return if &.length < 1
// //     wait = 1
// //     if is-type \Function &0
// //       func = &0
// //     else
// //       wait = &0
// //     if &.length > 1
// //       if is-type \Function &1
// //         func = &1
// //       else
// //         wait = &1
// //     timeout = null
// //     ->
// //       args = arguments
// //       clear-timeout timeout
// //       timeout := set-timeout (~>
// //         timeout := null
// //         func.apply this, args
// //       ), wait
// //   this <<< mix
// //   this

//   if (process.argv.index-of '--daemon') >= 0
//     mix.task.shift!

//   # Provide watch capability to all tasks.
//   if mix.option.watch and task-module.watch
//       process.argv.shift!
//       process.argv.shift!
//       argv = mix.task ++ process.argv
//       array-replace argv, '--watch', '--supervised'
//       while true
//         child = process.spawn-sync fs.path.resolve('node_modules/.bin/mix'), argv, { stdio: 'inherit' }
//         if child.error
//           info child.error
//           process.exit!
//   else if mix.option.supervised
//     watcher.watch (task-module.watch or []), persistent: true, ignore-initial: true .on 'all', (event, path) ->
//       info "Change detected in '#path'..."
//       process.exit!

//   co task ...(mix.task.1 and mix.task[((task-module[camelize mix.task.1.to-string!] and 2) or 1) til mix.task.length] or [])
//   .catch ->
//     error (it.stack or it)

exports.default = new Kua();