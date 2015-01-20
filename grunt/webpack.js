var path = require('path');

module.exports = {
  dev: {
    entry: {
      DemoExample: './examples/DemoExample.jsx',
      UserInput: './examples/UserInput.jsx',
      SimpleDemo: './examples/SimpleDemo.jsx',
      SimpleUserInput: './examples/SimpleUserInput.jsx',
    },
    output: {
      path: path.join(__dirname,'../examples'),
      filename: '[name].js'
    },
    stats: {
      // Configure the console output
      colors: true,
      modules: true,
      reasons: true
    },
    module: {
      loaders: [
        { jsx: /.*\.js/, loader: 'jsx-loader?harmony' } // loaders can take parameters as a querystring
      ]
    },
    resolve: {
      // you can now require('file') instead of require('file.jsx')
      extensions: ['', '.js', '.jsx', '.json']
    },
    progress: true,
    keepalive: true,
    watch: true,
    watchDelay: 3000
  }
};
