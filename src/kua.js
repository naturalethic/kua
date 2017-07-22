import childProcess from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

import optimist from 'optimist'
import chokidar from 'chokidar'
import glob from 'glob'
import daemonize from 'daemonize2'
import yaml from 'js-yaml'
import fp from 'ramda'
import op from 'object-path'
import inflection from 'inflection'
import extend from 'deep-extend'
import uuid from 'uuid'
import Promise from 'bluebird'
import 'babel-polyfill'
import 'babel-register'

global.Promise = Promise

class Kua {
  initialize(root) {
    this.config = { color: true }
    this.root = fs.realpathSync(root || optimist.argv.root || process.cwd())
    const kuaPackage = require(path.join(__dirname, '..', 'package.json'))
    const projectPackage = require(path.join(this.root, 'package.json'))
    if (!projectPackage.babel && !fs.existsSync('.babelrc')) {
      console.log('Creating .babelrc')
      fs.writeFileSync('.babelrc', JSON.stringify(kuaPackage.babel, null, 2))
    }
    if (!projectPackage.eslintConfig &&
        !(fs.existsSync('.eslint.js') || !fs.existsSync('.eslint.json'))) {
      console.log('Creating .eslintrc.json')
      fs.writeFileSync('.eslintrc.json', JSON.stringify(kuaPackage.eslintConfig, null, 2))
    }
    if (['start', 'stop'].includes(optimist.argv._[0])) {
      this.daemonizeAction = optimist.argv._.shift()
    }
    this.glob = glob.sync
    this.task = this.camelize(optimist.argv._[0] || '')
    this.args = optimist.argv._
    this.uuid = uuid
    this.extend = extend
    this.fp = fp
    this.params = this.args.slice(1)
    for (const key of Object.keys(optimist.argv)) {
      if (key !== '_' && key[0] !== '$') {
        op.set(this.config, this.camelize(key).replace(/:/g, '.'), optimist.argv[key])
      }
    }
    if (this.config.log) {
      const log = fs.createWriteStream(this.config.log, { flags: 'a+' })
      process.stdout.write = process.stderr.write = log.write.bind(log)
      process.on('uncaughtException', (error) => {
        process.stderr.write((error && error.stack) ? error.stack : error)
        process.stderr.write('\n')
      })
    }
    if (fs.existsSync(`${this.root}/config.yml`)) {
      extend(this.config, this.loadYaml(`${this.root}/config.yml`))
    }
    if (fs.existsSync(`${this.root}/secret.yml`)) {
      extend(this.config, this.loadYaml(`${this.root}/secret.yml`))
    }
    if (this.config.host) {
      if (fs.existsSync(`${this.root}/${this.config.host}.yml`)) {
        extend(this.config, this.loadYaml(`${this.root}/${this.config.host}.yml`))
      } else {
        this.print(`Specified host config '${this.config.host}.yml' does not exist.`)
        process.exit()
      }
    } else if (fs.existsSync(`${this.root}/host.yml`)) {
      extend(this.config, this.loadYaml(`${this.root}/host.yml`))
    }
    if (this.config.dotfile) {
      this.dotfile = `${os.homedir()}/.${this.config.dotfile}`
      this.config.dotfile = {}
      if (fs.existsSync(this.dotfile)) {
        extend(this.config.dotfile, this.loadYaml(this.dotfile))
      }
    } else {
      this.config.dotfile = {}
    }
  }

  saveDotfile() {
    this.saveYaml(this.dotfile, this.config.dotfile)
  }

  s(strings, ...values) {
    return this.leftAlign(strings.reduce((memo, s, i) =>
      `${memo}${s}${values[i] === undefined ? '' : values[i]}`, ''))
  }

  leftAlign(string = '') {
    const lines = fp.filter(fp.identity, string.split('\n'))
    const indent = /^(\s*)/.exec(lines[0])[1].length
    return fp.filter(fp.identity, fp.map(l => l.substr(indent), lines)).join('\n')
  }

  print(...args) {
    console.log(...args) // eslint-disable-line no-console
  }

  inspect(obj) {
    console.dir(obj, { colors: true, depth: null }) // eslint-disable-line no-console
  }

  camelize(string) {
    return string.trim().replace(/(-|_|\s)+(.)?/g, (m, s, c) => (c ? c.toUpperCase() : ''))
  }

  dasherize(string) {
    return string.trim().replace(/[_\s]+/g, '-').replace(/([A-Z])/g, '-$1')
                 .replace(/-+/g, '-').toLowerCase()
  }

  capitalize(string) {
    return `${string[0].toUpperCase()}${string.substr(1)}`
  }

  pluralize(string) {
    return inflection.pluralize(string)
  }

  singularize(string) {
    return inflection.singularize(string)
  }

  loadYaml(filePath) {
    return yaml.load(fs.readFileSync(filePath, 'utf8'))
  }

  saveYaml(filePath, object) {
    fs.writeFileSync(filePath, yaml.dump(object))
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

  compileLibs() {
  }

  loadModule(modulePath) {
    return require(modulePath)
  }

  watch(watch) {
    const command =
      [optimist.argv.$0].concat(process.argv.slice(2)).join(' ').replace(' --watch', '')
    this.child = this.spawnAsync(command)
    chokidar.watch(watch || [], { persistent: true, ignoreInitial: true }).on('all', (_, p) => {
      this.print(`Change detected in ${p}...`)
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
      main: `${this.root}/node_modules/kua/bin/kua`,
      pidfile: `/tmp/kua-${path.basename(this.root)}-${this.task}-${this.subtask}.pid`,
      name: ['kua'].concat(optimist.argv._).join(' '),
      argv: process.argv.slice(3).concat(['--log', 'kua.log']),
      cwd: this.root,
    })
    daemon.on('error', e => this.error(e))
    daemon[this.daemonizeAction]()
  }

  run(root) {
    this.initialize(root)
    process.chdir(this.root)
    if (!this.task) {
      this.task = 'index'
    }
    const taskPath = `${this.root}/task/${this.task}.js`
    if (!fs.existsSync(taskPath)) {
      process.stdout.write(`Task file not exist: '${taskPath}'\n`)
    } else {
      const module = this.loadModule(`${this.root}/task/${this.task}.js`)
      if (!module.default) {
        process.stdout.write('Task module does not export default.\n')
      } else if (this.daemonizeAction) {
        this.daemonize()
      } else if (this.config.watch) {
        this.print('Watching for changes...')
        this.watch(module.watch)
      } else {
        module.default(...this.params)
      }
    }
  }
}

export default new Kua()
