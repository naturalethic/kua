import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as babel from 'babel-core'
import * as optimist from 'optimist'
import * as chokidar from 'chokidar'
import * as glob from 'glob'
import * as daemonize from 'daemonize2'
import * as yaml from 'js-yaml'
import * as fp from 'ramda'
import Promise from 'bluebird'
import Module from 'module'
import extend from 'deep-extend'
import uuid from 'uuid'

global.Promise = Promise

class Kua {
  initialize(root) {
    if (['start', 'stop'].includes(optimist.argv._[0])) {
      this.daemonizeAction = optimist.argv._.shift()
    }
    this.config = { color: true }
    this.root = fs.realpathSync(root || optimist.argv.root || process.cwd())
    this.option = {}
    this.glob = glob.sync
    this.task = this.camelize(optimist.argv._[0] || '')
    this.subtask = this.camelize(optimist.argv._[1] || optimist.argv._[0] || '')
    this.args = optimist.argv._
    this.uuid = uuid
    this.extend = extend
    this.fp = fp
    if (this.subtask == this.task) {
      this.params = this.args.slice(1)
    } else {
      this.params = this.args.slice(2)
    }
    for (const key of Object.keys(optimist.argv)) {
      this.option[this.camelize(key)] = optimist.argv[key]
    }
    if (this.option.logfile) {
      const log = fs.createWriteStream(this.option.logfile, { flags: 'a+' })
      process.stdout.write = process.stderr.write = log.write.bind(log)
      process.on('uncaughtException', (error) => {
        process.stderr.write((error && error.stack) ? error.stack : error)
        process.stderr.write('\n')
      })
    }
    if (fs.existsSync(`${this.root}/config.yml`)) {
      extend(this.config, this.loadYaml(`${this.root}/config.yml`))
    }
    if (fs.existsSync(`${this.root}/host.yml`)) {
      extend(this.config, this.loadYaml(`${this.root}/host.yml`))
    }
    this.addNodePath(`${this.root}/lib`)
  }

  leftAlign(string = '') {
    const lines = fp.filter(fp.identity, string.split('\n'))
    const indent = /^(\s+)/.exec(lines[0])[1].length
    return fp.filter(fp.identity, fp.map(l => l.substr(indent), lines)).join('\n')
  }

  camelize(string) {
    return string.trim().replace(/(\-|_|\s)+(.)?/g, (m, s, c) => (c ? c.toUpperCase() : ''))
  }

  dasherize(string) {
    return string.trim().replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1')
                 .replace(/-+/g, '-').toLowerCase()
  }

  loadYaml(filePath) {
    return yaml.load(fs.readFileSync(filePath, 'utf8'))
  }

  addNodePath(nodePath) {
    Module.globalPaths.push(nodePath)
  }

  exec(command) {
    return childProcess.execSync(command).toString()
  }

  spawn(command) {
    const [head, ...tail] = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g)
    return childProcess.spawnSync(head, tail, { stdio: 'inherit' })
  }

  spawnAsync(command) {
    const [head, ...tail] = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g)
    return childProcess.spawn(head, tail, { stdio: 'inherit' })
  }

  spawnPromise(command) {
    return new Promise((resolve, reject) => {
      const [head, ...tail] = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g)
      const child = childProcess.spawn(head, tail, { stdio: 'inherit' })
      child.on('close', resolve)
      child.on('error', reject)
    })
  }

  color(xterm256Color, text) {
    if (text) {
      return (this.config.color && `\x1b[38;5;${xterm256Color}m${text}\x1b[0m`) || text
    }
    return (this.config.color && `\x1b[38;5;${xterm256Color}m`) || ''
  }

  colorend() {
    return '\x1b[0m'
  }

  loadModule(modulePath) {
    const originalDir = process.cwd()
    process.chdir(`${__dirname}/..`)
    const module = new Module()
    module.paths = [`${this.root}/node_modules`, `${this.root}/lib`]
    /* eslint-disable no-underscore-dangle */
    module._compile(babel.transform(fs.readFileSync(modulePath, 'utf8'), {
    /* eslint-enable no-underscore-dangle */
      presets: ['es2015'],
      plugins: [
        'syntax-async-functions',
        'fast-async',
      ]
    }).code, modulePath)
    process.chdir(originalDir)
    return module.exports
  }

  watch(watch) {
    const command =
      [optimist.argv.$0].concat(process.argv.slice(2)).join(' ').replace(' --watch', '')
    this.child = this.spawnAsync(command)
    chokidar.watch(watch || [], { persistent: true, ignoreInitial: true }).on('all', (_, p) => {
      this.info(`Change detected in ${p}...`)
      this.child.kill()
      this.child = this.spawnAsync(command)
    })
    process.on('SIGTERM', () => {
      this.child.kill()
      process.exit()
    })
  }

  daemonize() {
    const daemon = daemonize.setup({
      main: optimist.argv.$0,
      pidfile: `/tmp/kua-${path.basename(this.root)}-${this.task}-${this.subtask}.pid`,
      name: ['kua'].concat(optimist.argv._).join(' '),
      argv: process.argv.slice(3).concat(['--logfile', 'kua.log']),
      cwd: this.root,
    })
    daemon.on('error', (e) => this.error(e))
    daemon[this.daemonizeAction]()
  }

  run(root) {
    this.initialize(root)
    process.chdir(this.root)
    if (!this.task) {
      return process.stdout.write('No task specified.\n')
    }
    if (!fs.existsSync(`${this.root}/task/${this.task}.js`)) {
      return process.stdout.write('Task does not exist.\n')
    }
    const module = this.loadModule(`${this.root}/task/${this.task}.js`)
    if (!module[this.subtask]) {
      return process.stdout.write('Subtask does not exist.\n')
    }
    const task = module[this.subtask]
    if (this.daemonizeAction) {
      this.daemonize()
    } else if (this.option.watch) {
      this.watch(module.watch)
    } else {
      task(...this.params)
    }
  }
}

export default new Kua()
