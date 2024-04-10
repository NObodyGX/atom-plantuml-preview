Atomplantuml = require '../lib/atom-plantuml-preview'

describe "AtomPlantuml", ->
  [workspaceElement, activationPromise] = []

  beforeEach ->
    workspaceElement = atom.views.getView(atom.workspace)
    activationPromise = atom.packages.activatePackage('atom-plantuml-preview')

  describe "when the atom-plantuml-preview:toggle event is triggered", ->
    it "hides and shows the modal panel", ->
      expect(workspaceElement.querySelector('.atom-plantuml-preview')).not.toExist()
      atom.commands.dispatch workspaceElement, 'atom-plantuml-preview:toggle'

      waitsForPromise ->
        activationPromise

      runs ->
        expect(workspaceElement.querySelector('.atom-plantuml-preview')).toExist()

        atomplantumlElement = workspaceElement.querySelector('.atom-plantuml-preview')
        expect(atomplantumlElement).toExist()

        atomplantumlPanel = atom.workspace.panelForItem(atomplantumlElement)
        expect(atomplantumlPanel.isVisible()).toBe true
        atom.commands.dispatch workspaceElement, 'atom-plantuml-preview:toggle'
        expect(atomplantumlPanel.isVisible()).toBe false

    it "hides and shows the view", ->
      jasmine.attachToDOM(workspaceElement)

      expect(workspaceElement.querySelector('.atom-plantuml-preview')).not.toExist()

      atom.commands.dispatch workspaceElement, 'atom-plantuml-preview:toggle'

      waitsForPromise ->
        activationPromise

      runs ->
        atomplantumlElement = workspaceElement.querySelector('.atom-plantuml-preview')
        expect(atomplantumlElement).toBeVisible()
        atom.commands.dispatch workspaceElement, 'atom-plantuml-preview:toggle'
        expect(atomplantumlElement).not.toBeVisible()
