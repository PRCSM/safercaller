// Lightweight mock for @expo/vector-icons in unit tests.
// Any icon set (Ionicons, MaterialIcons, ...) resolves to a simple component
// so components that render icons can be tested without the native font layer.
const React = require('react');

const Icon = (props) => React.createElement('Icon', props, props.children);

module.exports = new Proxy(
  { __esModule: true },
  {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      return Icon;
    },
  },
);
