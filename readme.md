# atom-plantuml-preview

a preview for plantuml in atom/pulsar text editor by using plantuml.jar

## usage

```shell
# if using atom
plocate="~/.atom"
# if using pulsar
plocate="~/.pulsar"
# 1. clone repo
git clone https://github.com/nobodygx/atom-plantuml-preview ${plocate}/packages/

# 2. install package
cd ${plocate}/packages/atom-plantuml-preview && npm i

# 3. replace plantuml.jar in node_modules with latest version (if you want, skip it)
download_url=$(curl -H "Accept: application/vnd.github.v3+json" -k https://api.github.com/repos/plantuml/plantuml/releases/latest | grep "browser_download_url" | grep 'plantuml.jar"' | awk '{print $2}' | tr -d ',"')
mv $plocate/packages/atom-plantuml-preview/node_modules/node-plantuml/vendor/plantuml.jar $plocate/packages/atom-plantuml-preview/node_modules/node-plantuml/vendor/plantuml_old.jar
curl -k $download_url -o $plocate/packages/atom-plantuml-preview/node_modules/node-plantuml/vendor/plantuml.jar

# 4. open atom/pulsar and enjoy!!!
```

## todo

- [x] preview plantuml file
- [x] save as svg file
- [x] save as png file
- [x] preview plantuml file which contains many diagrams
- [x] svg preview enhance
