const fs = require('fs-plus')
const { CompositeDisposable } = require('atom')

let AtomPlantumlPreviewView = null

const isPlantumlPreviewView = function (object) {
  if (AtomPlantumlPreviewView == null) {
    AtomPlantumlPreviewView = require('./atom-plantuml-preview-view')
  }
  return object instanceof AtomPlantumlPreviewView
}

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable()
    this.commandSubscriptions = new CompositeDisposable()

    const previewFile = this.previewFile.bind(this)
    for (const extension of [
      'plantuml',
      'uml',
      'puml',
    ]) {
      this.disposables.add(
        atom.commands.add(
          `.tree-view .file .name[data-name$=\\.${extension}]`,
          'atom-plantuml-preview:preview-plantuml',
          previewFile
        )
      )
    }

    this.disposables.add(atom.commands.add('atom-workspace', {
      'atom-plantuml-preview:toggle': () => this.toggle()
    }))

    this.disposables.add(
      atom.workspace.addOpener(uriToOpen => {
        let [protocol, path] = uriToOpen.split('://')
        if (protocol !== 'atom-plantuml-preview') {
          return
        }

        try {
          path = decodeURI(path)
        } catch (error) {
          return
        }

        if (path.startsWith('editor/')) {
          return this.createPlantumlPreviewView({ editorId: path.substring(7) })
        } else {
          return this.createPlantumlPreviewView({ filePath: path })
        }
      })
    )
  },

  deactivate() {
    this.disposables.dispose()
    this.commandSubscriptions.dispose()
  },

  createPlantumlPreviewView(state) {
    if (state.editorId || fs.isFileSync(state.filePath)) {
      if (AtomPlantumlPreviewView == null) {
        AtomPlantumlPreviewView = require('./atom-plantuml-preview-view')
      }
      return new AtomPlantumlPreviewView(state)
    }
  },

  toggle() {
    if (isPlantumlPreviewView(atom.workspace.getActivePaneItem())) {
      atom.workspace.destroyActivePaneItem()
      return
    }
    const editor = atom.workspace.getActiveTextEditor()
    if (editor == null) {
      return
    }
    if (!this.removePreviewForEditor(editor)) {
      return this.addPreviewForEditor(editor)
    }
  },

  uriForEditor(editor) {
    return `atom-plantuml-preview://editor/${editor.id}`
  },

  removePreviewForEditor(editor) {
    const uri = this.uriForEditor(editor)
    const previewPane = atom.workspace.paneForURI(uri)
    if (previewPane != null) {
      previewPane.destroyItem(previewPane.itemForURI(uri))
      return true
    } else {
      return false
    }
  },

  addPreviewForEditor(editor) {
    const uri = this.uriForEditor(editor)
    const previousActivePane = atom.workspace.getActivePane()
    const options = { searchAllPanes: true, split: 'right' }

    return atom.workspace
      .open(uri, options)
      .then(function (plantumlPreviewView) {
        if (isPlantumlPreviewView(plantumlPreviewView)) {
          previousActivePane.activate()
        }
      })
  },

  previewFile({ target }) {
    console.log('previewFile 1')
    const filePath = target.dataset.path
    if (!filePath) {
      return
    }

    console.log('previewFile 2')
    for (const editor of atom.workspace.getTextEditors()) {
      if (editor.getPath() === filePath) {
        console.log('previewFile 3')
        return this.addPreviewForEditor(editor)
      }
    }
    console.log('previewFile 555')
    atom.workspace.open(`atom-plantuml-preview://${encodeURI(filePath)}`, {
      searchAllPanes: true
    })
  },

}
