Package.describe({
    name: 'omega:meteor-desktop-localstorage',
    summary: 'Persistent localStorage for meteor-desktop',
    version: '0.0.1',
    git: 'https://github.com/wojtkowiak/meteor-desktop-localstorage',
    documentation: 'README.md'
});

Package.onUse(function onUse(api) { // eslint-disable-line prefer-arrow-callback
    api.use('ecmascript', 'client');
    api.addFiles('localstorage.js', 'client');
});
