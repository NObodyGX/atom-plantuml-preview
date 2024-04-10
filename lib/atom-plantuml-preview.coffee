url = require 'url'
{PLANTUML_PROTOCOL, PlantumlView} = require './atom-plantuml-preview-view'
{CompositeDisposable} = require 'atom'

module.exports = AtomPlantuml =
  modalPanel: null
  subscriptions: null

  activate: (state) ->

    @subscriptions = new CompositeDisposable
    @subscriptions.add(
      atom.commands.add('atom-workspace', 'atom-plantuml-preview:toggle': => @toggle()))

    atom.workspace.addOpener (uriToOpen) ->
      try
        {protocol, host, pathname} = url.parse(uriToOpen)
      catch error
        return

      return unless protocol is PLANTUML_PROTOCOL
      try
        pathname = decodeURI(pathname) if pathname
      catch error
        return

      if host is 'editor'
        new PlantumlView(editorId: pathname.substring(1))
      else
        new PlantumlView(filePath: pathname)

  deactivate: ->
    @subscriptions.dispose()

  serialize: ->
    dummy: 'dummy'

  toggle: ->
    editor = atom.workspace.getActiveTextEditor()
    return unless editor?

    uri = "#{PLANTUML_PROTOCOL}//editor/#{editor.id}"

    previewPane = atom.workspace.paneForURI(uri)
    if previewPane
      previewPane.destroyItem(previewPane.itemForURI(uri))
      return

    previousActivePane = atom.workspace.getActivePane()
    atom.workspace.open(uri, split: 'right', searchAllPanes: true)
      .then (plantumlView) ->
        if plantumlView instanceof PlantumlView
          plantumlView.renderAll()
          previousActivePane.activate()
