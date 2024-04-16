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
    console.log('toggle 0')
    if (isPlantumlPreviewView(atom.workspace.getActivePaneItem())) {
      atom.workspace.destroyActivePaneItem()
      return
    }
    console.log('toggle 1')
    const editor = atom.workspace.getActiveTextEditor()
    if (editor == null) {
      return
    }
    console.log('toggle 2')
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
    console.log('addPreviewForEditor 0')
    const uri = this.uriForEditor(editor)
    const previousActivePane = atom.workspace.getActivePane()
    const options = { searchAllPanes: true, split: 'right' }

    return atom.workspace
      .open(uri, options)
      .then(function (markdownPreviewView) {
        if (isPlantumlPreviewView(markdownPreviewView)) {
          previousActivePane.activate()
        }
      })
  },

  previewFile({ target }) {
    const filePath = target.dataset.path
    if (!filePath) {
      return
    }

    for (const editor of atom.workspace.getTextEditors()) {
      if (editor.getPath() === filePath) {
        return this.addPreviewForEditor(editor)
      }
    }

    atom.workspace.open(`atom-plantuml-preview://${encodeURI(filePath)}`, {
      searchAllPanes: true
    })
  },

  saveAsSVG() {
    const activePaneItem = atom.workspace.getActivePaneItem()
    if (isPlantumlPreviewView(activePaneItem)) {
      atom.workspace.getActivePane().saveItemAs(activePaneItem)
      return
    }

    const editor = atom.workspace.getActiveTextEditor()
    if (editor == null) {
      return
    }

    const grammars = atom.config.get('atom-plantuml-preview.grammars') || []
    if (!grammars.includes(editor.getGrammar().scopeName)) {
      return
    }

    const uri = this.uriForEditor(editor)
    const plantumlPreviewPane = atom.workspace.paneForURI(uri)
    const plantumlPreviewPaneItem =
      plantumlPreviewPane != null
        ? plantumlPreviewPane.itemForURI(uri)
        : undefined

    if (isPlantumlPreviewView(plantumlPreviewPaneItem)) {
      return plantumlPreviewPane.saveItemAs(plantumlPreviewPaneItem)
    }
  }
}
