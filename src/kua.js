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

// daemon-action = null

export class Kua {
  constructor(root) {
    this.config = { color: true }
    this.root = fs.realpathSync(root || optimist.argv.root || process.cwd())
    this.option = {}
    this.glob = glob.sync
    this.task = optimist.argv._[0]
    this.subtask = optimist.argv._[1]
    this.uuid = uuid
    for (const key of Object.keys(optimist.argv)) {
      this.option[inflect.camelize(key, false)] = optimist.argv[key]
    }
    const log = this.option.daemon && fs.openSync('kua.log', 'a+')
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

  logUsage() {

  }

  locateTask() {
    const primaryTaskNames = this.glob('task/*.js').map(it => path.basename(it, '.js'))
    console.log(primaryTaskNames)
    let task;
    if (this.task) {
      if (primaryTaskNames.includes(this.task)) {
        console.log(`${this.root}/task/${this.task}.js`)
        const taskModule = this.loadModule(`${this.root}/task/${this.task}.js`)
        console.log(taskModule)
        if (this.subtask) {
          // secondaryTaskNames =
        }
      }
    }
  }

  run() {
    process.chdir(this.root)
    const task = this.locateTask()
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

// export run = ->
//   # Load plugin and project tasks.  Project tasks will mask plugins of the same name.
//   task-modules = pairs-to-obj (((glob.sync "#{project-root}/node_modules/mix*/task/*") ++ glob.sync("#{project-root}/task/*")) |> map ->
//     [ (camelize fs.path.basename(it).replace //#{fs.path.extname it}$//, ''), it ]
//   )

//   if (process.argv.index-of '--daemon') >= 0
//     mix.task.shift!

//   # Print list of tasks if none given, or task does not exist.
//   if !mix.task.0 or !task-modules[camelize mix.task.0]
//     if !(keys task-modules).length
//       info 'No tasks defined'
//       process.exit!
//     info 'Tasks:'
//     keys task-modules |> each -> info "  #it"
//     process.exit!

//   task-module = new Module.Module
//   task-module.paths = [ "#{project-root}/node_modules", "#{project-root}/lib", "#__dirname/../lib" ]
//   task-module.paths.push "#__dirname/../node_modules" if fs.exists-sync "#__dirname/../node_modules"
//   task-module._compile (livescript.compile ([
//     (fs.read-file-sync task-modules[camelize mix.task.0] .to-string!)
//   ].join '\n'), { +bare }), task-modules[camelize mix.task.0]
//   task-module = task-module.exports

//   # Print list of subtasks if one is acceptable and none given, or subtask does not exist.
//   if !(mix.task.1 and task = task-module[camelize mix.task.1.to-string!]) and !(task = task-module[camelize mix.task.0])
//     info 'Subtasks:'
//     keys task-module
//     |> filter -> it != camelize mix.task.0
//     |> each -> info "  #{dasherize it}"
//     process.exit!

//   if daemon-action
//     daemon = daemonize2.setup do
//       main:    "#__dirname/../run.js"
//       name:    "MIX: #{project-root} [#{mix.task.0}]"
//       pidfile: "/tmp/mix-#{fs.path.basename project-root}-#{mix.task.0}.pid"
//       argv:    process.argv.slice(2) ++ [ '--daemon' ]
//       cwd:     project-root
//     daemon.on \error, ->
//       info ...&
//     daemon[daemon-action]!
//     process.exit!

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
