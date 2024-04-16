const path = require('path')

const { Emitter, Disposable, CompositeDisposable, File } = require('atom')
const _ = require('underscore-plus')
const fs = require('fs-plus')
const plantuml = require('node-plantuml')

module.exports = class AtomPlantumlPreviewView {
  static deserialize(params) {
    return new AtomPlantumlPreviewView(params)
  }

  constructor({ editorId, filePath }) {
    this.editorId = editorId
    this.filePath = filePath
    this.element = document.createElement('div')
    this.element.classList.add('atom-plantuml-preview')
    this.element.tabIndex = -1
    this.emitter = new Emitter()
    this.loaded = false
    this.disposables = new CompositeDisposable()
    if (this.editorId != null) {
      this.resolveEditor(this.editorId)
    } else if (atom.packages.hasActivatedInitialPackages()) {
      this.subscribeToFilePath(this.filePath)
    } else {
      this.disposables.add(
        atom.packages.onDidActivateInitialPackages(() => {
          this.subscribeToFilePath(this.filePath)
        })
      )
    }
  }

  serialize() {
    return {
      deserializer: 'AtomPlantumlPreviewView',
      filePath: this.getPath() != null ? this.getPath() : this.filePath,
      editorId: this.editorId
    }
  }

  copy() {
    return new AtomPlantumlPreviewView({
      editorId: this.editorId,
      filePath: this.getPath() != null ? this.getPath() : this.filePath
    })
  }

  destroy() {
    this.disposables.dispose()
    this.element.remove()
  }

  onDidChangeTitle(callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidChangeModified(callback) {
    // No op to suppress deprecation warning
    return new Disposable()
  }

  onDidChangePlantuml(callback) {
    return this.emitter.on('did-change-plantuml', callback)
  }

  subscribeToFilePath(filePath) {
    this.file = new File(filePath)
    this.emitter.emit('did-change-title')
    this.disposables.add(
      this.file.onDidRename(() => this.emitter.emit('did-change-title'))
    )
    this.handleEvents()
    return this.renderPlantuml()
  }

  resolveEditor(editorId) {
    const resolve = () => {
      this.editor = this.editorForId(editorId)

      if (this.editor != null) {
        this.emitter.emit('did-change-title')
        this.disposables.add(
          this.editor.onDidDestroy(() =>
            this.subscribeToFilePath(this.getPath())
          )
        )
        this.handleEvents()
        this.renderPlantuml()
      } else {
        this.subscribeToFilePath(this.filePath)
      }
    }

    if (atom.packages.hasActivatedInitialPackages()) {
      resolve()
    } else {
      this.disposables.add(atom.packages.onDidActivateInitialPackages(resolve))
    }
  }

  editorForId(editorId) {
    for (const editor of atom.workspace.getTextEditors()) {
      if (editor.id != null && editor.id.toString() === editorId.toString()) {
        return editor
      }
    }
    return null
  }

  handleEvents() {
    const lazyRenderPlantuml = _.debounce(() => this.renderPlantuml(), 250)

    atom.commands.add(this.element, {
      'atom-plantuml-preview:save-as-svg'() {
        this.saveAs('svg')
      },
      'atom-plantuml-preview:save-as-svg'() {
        this.saveAs('png')
      }
    })

    const changeHandler = () => {
      this.renderPlantuml()

      const pane = atom.workspace.paneForItem(this)
      if (pane != null && pane !== atom.workspace.getActivePane()) {
        pane.activateItem(this)
      }
    }

    if (this.file) {
      this.disposables.add(this.file.onDidChange(changeHandler))
    } else if (this.editor) {
      this.disposables.add(
        this.editor.getBuffer().onDidStopChanging(function () {
          changeHandler()
        })
      )
      this.disposables.add(
        this.editor.onDidChangePath(() => this.emitter.emit('did-change-title'))
      )
      this.disposables.add(
        this.editor.getBuffer().onDidSave(function () {
          changeHandler()
        })
      )
      this.disposables.add(
        this.editor.getBuffer().onDidReload(function () {
          changeHandler()
        })
      )
    }
  }

  renderPlantuml() {
    if (!this.loaded) {
      this.showLoading()
    }
    return this.getTextSource()
      .then(source => {
        if (source != null) {
          return this.doRenderPlantuml(source)
        }
      })
      .catch(reason => this.showError({ message: reason }))
  }

  getTextSource() {
    if (this.file && this.file.getPath()) {
      return this.file
        .read()
        .then(source => {
          if (source === null) {
            return Promise.reject(
              new Error(`${this.file.getBaseName()} could not be found`)
            )
          } else {
            return Promise.resolve(source)
          }
        })
        .catch(reason => Promise.reject(reason))
    } else if (this.editor != null) {
      return Promise.resolve(this.editor.getText())
    } else {
      return Promise.reject(new Error('No editor found'))
    }
  }


  async doRenderPlantuml(text) {

    var options = {
      format: 'svg',
      include: path.dirname(this.getPath()),
      charset: 'utf-8'
    }

    var gen = plantuml.generate(text, options)

    var chunks = []
    gen.out.on('data', (chunk) => chunks.push(chunk))
    gen.out.on('end', () => {
      var data = Buffer.concat(chunks)

      this.element.textContent = ''
      const div = document.createElement('div')
      div.innerHTML = data.toString()
      this.element.appendChild(div)


      this.loading = false
    })


    this.emitter.emit('did-change-plantuml')
  }

  getTitle() {
    if (this.file != null && this.getPath() != null) {
      return `${path.basename(this.getPath())} Preview`
    } else if (this.editor != null) {
      return `${this.editor.getTitle()} Preview`
    } else {
      return 'Plantuml Preview'
    }
  }

  getIconName() {
    return 'plantuml'
  }

  getURI() {
    if (this.file != null) {
      return `atom-plantuml-preview://${this.getPath()}`
    } else {
      return `atom-plantuml-preview://editor/${this.editorId}`
    }
  }

  getPath() {
    if (this.file != null) {
      return this.file.getPath()
    } else if (this.editor != null) {
      return this.editor.getPath()
    }
  }

  showError(result) {
    this.element.textContent = ''
    const h2 = document.createElement('h2')
    h2.textContent = 'Previewing Plantuml Failed'
    this.element.appendChild(h2)
    if (result) {
      const h3 = document.createElement('h3')
      h3.textContent = result.message
      this.element.appendChild(h3)
    }
  }

  showLoading() {
    this.loading = true
    this.element.textContent = ''
    const div = document.createElement('div')
    div.classList.add('atom-plantuml-spinner')
    div.textContent = 'Loading Plantuml...'
    this.element.appendChild(div)
  }

  getSaveDialogOptions() {
    let defaultPath = this.getPath()
    if (defaultPath) {
      defaultPath += '.svg'
    } else {
      let projectPath
      defaultPath = 'untitled.svg'
      if ((projectPath = atom.project.getPaths()[0])) {
        defaultPath = path.join(projectPath, defaultPath)
      }
    }

    return { defaultPath }
  }

  async saveAs(fileType) {
    if (this.loading) {
      atom.notifications.addWarning(
        'Please wait until the Preview has finished loading before saving'
      )
      return
    }

  }
}
