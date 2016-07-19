/* eslint-disable no-underscore-dangle */

import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as babel from 'babel-core'
import * as optimist from 'optimist'
import * as chokidar from 'chokidar'
import * as glob from 'glob'
import * as Promise from 'bluebird'
import * as co from 'co'
import * as uuid from 'uuid'
import * as daemonize from 'daemonize2'
import * as yaml from 'js-yaml'
import Module from 'module'
import extend from 'deep-extend'
import inflectFactory from 'i'

const inflect = inflectFactory()

class Kua {
  initialize(root) {
    if (['start', 'stop'].includes(optimist.argv._[0])) {
      this.daemonize = optimist.argv._.shift()
    }
    this.config = { color: true }
    this.root = fs.realpathSync(root || optimist.argv.root || process.cwd())
    this.option = {}
    this.glob = glob.sync
    this.task = inflect.camelize(optimist.argv._[0] || '', false)
    this.subtask = inflect.camelize(optimist.argv._[1] || optimist.argv._[0] || '', false)
    this.uuid = uuid
    for (const key of Object.keys(optimist.argv)) {
      this.option[inflect.camelize(key, false)] = optimist.argv[key]
    }
    const log = this.option.logfile && fs.openSync(this.option.logfile, 'a+')
    for (const level of ['log', 'info', 'warn', 'error']) {
      if (log) {
        this[level] = (...rest) => {
          fs.write(log, rest.join(' '))
          fs.write(log, '\n')
        }
      } else {
        this[level] = (...rest) => console[level](...rest)
      }
    }
    if (fs.existsSync(`${this.root}/config.yml`)) {
      extend(this.config, yaml.load(fs.readFileSync(`${this.root}/config.yml`, 'utf8')))
    }
    if (fs.existsSync(`${this.root}/host.yml`)) {
      extend(this.config, yaml.load(fs.readFileSync(`${this.root}/host.yml`, 'utf8')))
    }
    this.addNodePath(`${this.root}/lib`)
  }

  addNodePath(nodePath) {
    Module.globalPaths.push(nodePath)
  }

  exec(command) {
    return childProcess.execSync(command).toString()
  }

  spawn(command, options = {}) {
    const resolvedOptions = Object.assign({}, options)
    resolvedOptions.stdio = options.stdio || 'inherit'
    return new Promise((resolve) => {
      const [head, ...tail] = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g)
      return childProcess.spawn(head, tail, resolvedOptions).on('close', resolve)
    })
  }

  color(xterm256Color, text) {
    return (this.config.color && `\x1b[38;5;${xterm256Color}m${text}\x1b[0m`) || text
  }

  loadModule(modulePath) {
    const originalDir = process.cwd()
    process.chdir(`${__dirname}/..`)
    const module = new Module()
    module.paths = [`${this.root}/node_modules`, `${this.root}/lib`]
    module._compile(babel.transform(fs.readFileSync(modulePath, 'utf8'), {
      presets: ['es2015'],
    }).code, modulePath)
    process.chdir(originalDir)
    return module.exports
  }

  run(root) {
    this.initialize(root)
    process.chdir(this.root)
    const task = this.loadModule(`${this.root}/task/${this.task}.js`)[this.subtask]
    if (this.daemonize) {
      const daemon = daemonize.setup({
        main: optimist.argv.$0,
        pidfile: `/tmp/kua-${path.basename(this.root)}-${this.task}-${this.subtask}.pid`,
        name: ['kua'].concat(optimist.argv._).join(' '),
        argv: optimist.argv._.concat(['--logfile', 'kua.log']),
        cwd: this.root,
      })
      daemon.on('error', (e) => this.error(e))
      daemon[this.daemonize]()
      process.exit()
    }
    task()
  }
}


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

export default new Kua()
