path                  = require 'path'
{CompositeDisposable, Disposable} = require 'atom'
{$, $$$, ScrollView}  = require 'atom-space-pen-views'
_                     = require 'underscore-plus'
fs                    = require 'fs-plus'
plantuml              = require 'node-plantuml'
svgPanZoom            = require 'svg-pan-zoom/src/svg-pan-zoom'
{dialog}              = require('electron').remote

module.exports =
  PLANTUML_PROTOCOL: "atom-plantuml-preview:"
  PlantumlView: class PlantumlView extends ScrollView
    
    atom.deserializers.add(this)

    editorSub           : null
    onDidChangeTitle    : -> new Disposable()
    onDidChangeModified : -> new Disposable()

    @deserialize: (state) ->
      new PlantumlView(state)

    @content: ->
      @div class: 'atom-plantuml-preview native-key-bindings', tabindex: -1

    constructor: ({@editorId, filePath}) ->
      @no_plantuml_errors = false # for scroll positions
      @top_position = 0
      @left_position = 0

      super
      if @editorId?
        @resolveEditor(@editorId)
      else
        if atom.workspace?
          @subscribeToFilePath(filePath)
        else
          atom.packages.onDidActivatePackage =>
            @subscribeToFilePath(filePath)

    serialize: ->
      deserializer : 'PlantumlView'

    destroy: ->
      @editorSub.dispose()

    subscribeToFilePath: (filePath) ->
      atom.commands.dispatch 'atom-plantuml-preview', 'title-changed'
      @handleEvents()
      @renderAll()

    resolveEditor: (editorId) ->
      resolve = =>
        @editor = @editorForId(editorId)

        if @editor?
          atom.commands.dispatch 'atom-plantuml-preview', 'title-changed'
          @handleEvents()
        else
          atom.workspace?.paneForItem(this)?.destroyItem(this)

      if atom.workspace?
        resolve()
      else
        atom.packages.onDidActivatePackage =>
          resolve()
          @renderAll()

    editorForId: (editorId) ->
      for editor in atom.workspace.getTextEditors()
        return editor if editor.id?.toString() is editorId.toString()
      null

    handleEvents: =>
      atom.commands.add @element,
        'atom-plantuml-preview:save-as-png': (event) =>
          event.stopPropagation()
          @saveAs("png")
        'atom-plantuml-preview:save-as-svg': (event) =>
          event.stopPropagation()
          @saveAs("svg")

      changeHandler = =>
        pane = atom.workspace.paneForURI(@getURI())
        if pane? and pane isnt atom.workspace.getActivePane()
          plantuml_item = pane.getActiveItem()

          if @no_plantuml_errors and plantuml_item
            @top_position = plantuml_item.scrollTop()
            @left_position = plantuml_item.scrollLeft()

          @renderAll()
          pane.activateItem(this)

          if plantuml_item
            plantuml_item.scrollTop(@top_position)
            plantuml_item.scrollLeft(@left_position)

      @editorSub = new CompositeDisposable

      if @editor?
        @editorSub.add @editor.onDidChange _.debounce(changeHandler, 700)
        @editorSub.add @editor.onDidChangePath ->
          atom.commands.dispatch 'atom-plantuml-preview', 'title-changed'

    renderAll: ->
      @loading = true
      @showLoading()
      @renderAllCode() if @editor?
      @loading = false

    renderAllCode: (text) ->
      options = 
        format: 'svg',
        include: path.dirname(@editor.getPath()),
        charset: 'utf-8'
      
      plantuml.generate @editor.getText(), options, (error, data) =>
        if error
          console.error "error when generate"
        else
          @html data.toString()
          svglist = document.getElementsByTagName 'svg'
          svg = svglist[0]
          svg.style = "width: 100%; height: 100%;"
          panZoom = svgPanZoom "svg",
            zoomEnabled: true
            controlIconsEnabled: true
            fit: true
            center: true
            minZoom: 0.2
            maxZoom: 5
          panZoom.resize()
          panZoom.fit()
          panZoom.center()
          @loading = false


    getTitle: ->
      if @editor?
        "#{@editor.getTitle()} Preview"
      else
        "Plantuml Preview"

    getURI: ->
      "atom-plantuml-preview://editor/#{@editorId}"

    getPath: ->
      @editor.getPath() if @editor?

    showError: (result) ->
      failureMessage = result?.message

      @html $$$ ->
        @h2 'Previewing Plantuml Failed!!'
        @h3 failureMessage if failureMessage?

    showLoading: ->
      @html $$$ ->
        @div class: 'atom-html-spinner', 'Loading Plantuml Preview\u2026'

    saveAs: (fileType)->
      return if @loading

      filePath = @getPath()
      title = 'Plantuml to Image File'
      if filePath
        title = path.parse(filePath).name
        filePath += ".#{fileType}"
      else
        filePath = "untitled.mmd.#{fileType}"
        if projectPath = atom.project.getPaths()[0]
          filePath = path.join(projectPath, filePath)

      filePath = dialog.showSaveDialogSync
        title: 'Save File'
        defaultPath: filePath

      if filePath
        @saveFile(fileType, filePath)

    saveFile: (fileType, imagePath)->
      return unless imagePath
      if fileType == "svg"
        options = 
          format: 'svg',
          include: path.dirname(@editor.getPath()),
          charset: 'utf-8'
      else
        options = 
          format: 'png',
          include: path.dirname(@editor.getPath()),
          charset: 'utf-8'
      plantuml.generate @editor.getText(), options, (error, data) =>
        if error
          console.error "error when generate"
        else
          @writeFile(imagePath, fileType, data)

    writeFile: (filePath, fileType, data)->
      fs.writeFileSync(filePath, data)
      atom.notifications.addSuccess "atom-plantuml-preview: Exported a #{fileType} file."
