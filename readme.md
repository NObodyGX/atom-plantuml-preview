# atom-plantuml-preview

a preview for plantuml in atom text editor by plantuml.jar

## usage

```shell
# 1. clone repo
git clone ${REPO} ~/.atom/packages/

# 2. install package
cd ~/.atom/packages/atom-plantuml-preview && npm i

# 3. replace plantuml.jar in node_modules with lastest version
# lastest version support much more diagram syntax
# if lastest is v1.2024.4, you can download it from here
wget https://github.com/plantuml/plantuml/releases/download/v1.2024.4/plantuml.jar -O ~/.atom/packages/atom-plantuml-preview/node_modules/node-plantuml/vendor/plantuml.jar

# 4. open atom and enjoy!!!
```

## todo

- [x] preview plantuml file
- [x] save as svg file
- [x] save as png file
- [ ] preview plantuml file which contains many diagrams
- [ ] svg preview enhance
