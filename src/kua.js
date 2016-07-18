import * as childProcess from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as optimist from 'optimist'
import * as chokidar from 'chokidar'
import * as glob from 'glob'
import * as Promise from 'bluebird'
import * as co from 'co'
import * as uuid from 'uuid'
import * as Module from 'module'
import * as daemonize from 'daemonize2'
import * as yaml from 'js-yaml'
import extend from 'deep-extend'
import inflectFactory from 'i'

const inflect = inflectFactory()

// daemon-action = null

export function init(root) {
  const kua = {
    config: {
      color: true,
    },
    root: fs.realpathSync(root || optimist.argv.root || process.cwd()),
    option: {},
    pathify: it => Module.globalPaths.push(it),
    exec: it => childProcess.execSync(it).toString(),
    spawn: (command, options = {}) => {
      const resolvedOptions = Object.assign({}, options)
      resolvedOptions.stdio = options.stdio || 'inherit'
      return new Promise((resolve) => {
        const [head, ...tail] = command.match(/[^"'\s]+|"[^"]+"|'[^'']+'/g)
        return childProcess.spawn(head, tail, resolvedOptions).on('close', resolve)
      })
    },
    color: (c, v) => (kua.config.color && `\x1b[38;5;${c}m${v}\x1b[0m`) || v,
    glob: glob.sync,
    uuid,
  }
  for (const key of Object.keys(optimist.argv)) {
    kua.option[inflect.camelize(key, false)] = optimist.argv[key]
  }
  const log = kua.option.daemon && fs.openSync('kua.log', 'a+')
  for (const level of ['log', 'info', 'warn', 'error']) {
    if (log) {
      kua[level] = (...rest) => {
        fs.write(log, rest.join(' '))
        fs.write(log, '\n')
      }
    } else {
      kua[level] = (...rest) => console[level](...rest)
    }
  }
  // kua.pathify(kua.root)
  kua.pathify(`${kua.root}/lib`)
  if (fs.existsSync(`${root}/config.yml`)) {
    extend(kua.config, yaml.load(fs.readFileSync(`${root}/config.yml`, 'utf8')))
  }
  if (fs.existsSync(`${root}/host.yml`)) {
    extend(kua.config, yaml.load(fs.readFileSync(`${root}/host.yml`, 'utf8')))
  }
  extend(this, kua)
  return this
}

//   if mix.task.0 in <[ start stop ]>
//     daemon-action := mix.task.shift!

//   global.debounce = ->
//     return if &.length < 1
//     wait = 1
//     if is-type \Function &0
//       func = &0
//     else
//       wait = &0
//     if &.length > 1
//       if is-type \Function &1
//         func = &1
//       else
//         wait = &1
//     timeout = null
//     ->
//       args = arguments
//       clear-timeout timeout
//       timeout := set-timeout (~>
//         timeout := null
//         func.apply this, args
//       ), wait
//   this <<< mix
//   this

// # -----------------------------------------------------------------------------
// # End global assignments.
// # -----------------------------------------------------------------------------

// array-replace = (it, a, b) -> index = it.index-of(a); it.splice(index, 1, b) if index > -1; it

export function run() {
  process.chdir(this.root)
}

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
