/* eslint-disable no-underscore-dangle */
function load() {
    Desktop.fetch('localStorage', 'getAll').then((storage) => {
        Meteor._localStorage.storage = storage;
    }).catch(() => {
        load();
    });
}

if (Meteor.isDesktop) {
    Meteor._localStorage = {
        storage: {},

        getItem(key) {
            return this.storage[key];
        },

        setItem(key, value) {
            this.storage[key] = value;
            Desktop.send('localStorage', 'set', key, value);
        },

        clear() {
            this.storage = {};
            Desktop.send('localStorage', 'clear');
        },

        removeItem(key) {
            delete this.storage[key];
            Desktop.send('localStorage', 'remove', key);
        }
    };
    load();
}
