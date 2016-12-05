var resDumpService = require('res-dump-service');
var transformSetup = resDumpService.transformSetup;
var fileTransform = resDumpService.fileTransform;
var getDependencies = resDumpService.getDependencies;
var rcss = resDumpService.rcss;
var cssLoader = resDumpService.cssLoader;
var glob = require('glob');
var config = require('config');
var dumpUtil = require('res-dump-util');

var path = require('path');
var fs = require('fs');

function ResDumpPlugin(options) {
  this.commonFile = options.commonFile;
}

var rtype = /\.(js|css|es6|scss|sass|vue|jsx|less)(?:$|\?)/;
ResDumpPlugin.prototype.apply = function(compiler) {
  var staticPath = config.path.staticServerPath;
  var commonFile = this.commonFile;
  var templateFiles = glob.sync(config.path.template + "/**/*.html");
  var entry = compiler.options.entry;
  var entryList = Object.assign({}, entry);
  entryList[commonFile] = [commonFile];
  transformSetup({entry: entryList}, config.path.publicPath);
  // do css complie
  compiler.plugin("emit", function(compilation, callback) {
    var promises = [];
    templateFiles.forEach(function(templateFile){
      var curDependencies = getDependencies(templateFile, staticPath);
      curDependencies.forEach(function(item){
        if(rcss.test(item.dep)){
          var sourceFile = dumpUtil.relative(item.dep);
          promises.push(new Promise(function(resolve, reject){
            cssLoader(sourceFile, staticPath)
              .then(function(css){
                try{
                  var destFile = dumpUtil.relative(item.rep);
                  dumpUtil.mkdirp(destFile.replace(/(^.*\/).*$/, '$1'));
                  fs.writeFileSync(dumpUtil.relative(item.rep), css);
                }catch(e){
                  throw new Error(e);
                }
                resolve();
              }, reject);
          }));
          
        }
      });
    });
    
    Promise.all(promises)
      .then(function(){
        callback();
      }, function(arg){
        console.error('css complied error!', arg);
      })
  });

  // add hash stuff
  compiler.plugin('done', function(statsData, callback) {
    // treat template/html file as entry not js.
    var stats = statsData.toJson();
    if (stats.errors.length) {
      stats.errors.forEach(console.error);
      throw new Error('error');
    }

    templateFiles.forEach(function(templateFile){
      var promises = [];
      var curDependencies = getDependencies(templateFile, staticPath);
      var content = fs.readFileSync(templateFile, 'utf8');
      curDependencies.forEach(function(item){
        var sourceFile = dumpUtil.relative(item.dep);
        if(!fs.existsSync(sourceFile)){
          sourceFile = dumpUtil.relative(item.rep);
        }
        var isPreprocessed = rtype.test(item.dep);
        
        var destFile = dumpUtil.relative(item.rep);
        
        //create dir
        dumpUtil.mkdirp(destFile.replace(/(^.*\/).*$/, '$1'));
        var hash = dumpUtil.getVersion(sourceFile);
        var finalFile = dumpUtil.makeHash(destFile, hash);
        if(isPreprocessed && fs.existsSync(destFile)){
          fs.renameSync(destFile, finalFile);
        }else{
          dumpUtil.copyFile(sourceFile, finalFile);
        }
        
        content = content.replace(item.raw, dumpUtil.makeHash(config.cdn ? item.cdn : item.rep, hash));
      });
      
      var templateOutputPath = templateFile.replace(config.path.client, config.path["static"]);
      dumpUtil.mkdirp(templateOutputPath.replace(/(.+\/).+$/, "$1"));
      fs.writeFileSync(templateOutputPath, content);
      
    })
  });
};

module.exports = ResDumpPlugin;