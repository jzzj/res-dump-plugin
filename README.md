# res-dump-plugin
Build assets that are not import by js. See https://github.com/jzzj/res-dump-service

## Usage
```js
plugins: [
	new ResDumpPlugin({
	  	commonFile: "common"
	})
]
```

## What this for?
This plugin will do one thing: resolve all ${require('module')} to actually module, like this: '/path/to/your/resource.[filehash].js'  
If your want use cdn, you can indicate cdn field in your config/production.js, you will get result like this:
```js
${your-cdn}/${your-static-server-path/your-publich-path-for-js}/path/to/asset.[filehash].[original-suffix]
```

### How hash append to resource?
I first will determine file is exists, if it is i will try to use git commit hash code, may be the resource not in git commit hash, then go to md5. If not, i will try to find file in [build folder](depends on your config) then do hash thing.
