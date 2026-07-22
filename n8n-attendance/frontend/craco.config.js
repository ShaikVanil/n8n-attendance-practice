const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      if (env === 'production') {
        // Optimize bundle splitting
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\\/]node_modules[\\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true
            }
          }
        };
        
        // Enable tree shaking
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;
        
        // Minimize bundle size
        webpackConfig.resolve.alias = {
          ...webpackConfig.resolve.alias,
          '@': path.resolve(__dirname, 'src')
        };
      }
      
      return webpackConfig;
    }
  },
  babel: {
    plugins: [
      // Remove console.log in production
      process.env.NODE_ENV === 'production' && 'transform-remove-console'
    ].filter(Boolean)
  }
};