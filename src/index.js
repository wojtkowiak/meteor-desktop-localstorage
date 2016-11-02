import { app } from 'electron';
import fs from 'fs';
import path from 'path';

 /**
 * Settings object.
 * @typedef {Object} PluginSettings
 * @property {boolean} fileName - the name of the json file
 */

/**
 * Implements a simple localstorage replacement for Meteor Desktop.
 *
 * @class
 */
export default class LocalStorage {

    /**
     * @param {Object} log              - Winston logger
     * @param {Object} eventsBus        - event emitter for listening or emitting events on the
     *                                    desktop side
     * @param {PluginSettings} settings - plugin settings
     * @param {Object} Module           - reference to Module class
     */
    constructor({
        log,
        eventsBus,
        settings,
        Module
    }) {
        const storageModule = new Module('localStorage');

        const { fileName = 'localstorage.json' } = settings;

        this.storageFile = path.join(app.getPath('userData'), fileName);
        this.storage = {};
        this.initDone = false;
        this.eventsBus = eventsBus;
        this.log = log;

        eventsBus.on('desktopLoaded', () => {
            this.init();
        });

        storageModule.on('set', (event, key, value) => {
            this.storage[key] = value;
            if (this.initDone) {
                this.flush();
            }
        });

        storageModule.on('clear', () => {
            this.storage = {};
            if (this.initDone) {
                this.flush();
            }
        });

        storageModule.on('remove', (event, key) => {
            delete this.storage[key];
            if (this.initDone) {
                this.flush();
            }
        });

        storageModule.on('getAll', (event, fetchId) => {
            this.log.verbose('getAll received');
            if (this.initDone) {
                this.log.verbose('sent storage to renderer');
                storageModule.respond('getAll', fetchId, this.storage);
            }
        });
    }

    /**
     * Flushes the current storage to file.
     */
    flush() {
        fs.writeFile(this.storageFile, JSON.stringify(this.storage), 'utf8');
    }

    /**
     * Loads the storage json file. If there were any keys already set it merges them
     * with what has been loaded.
     */
    init() {
        let storage = {};
        fs.readFile(this.storageFile, 'utf8', (err, data) => {
            if (err) {
                this.flush();
            } else {
                try {
                    storage = JSON.parse(data);
                    this.log.info(`loaded storage file ${this.storageFile}`);
                } catch (e) {
                    this.log.warn(`could not parse the storage file ${this.storageFile}`);
                    // Nothing to do here. We will put a fresh file in place few lines below.
                }
                if (Object.keys(this.storage).length > 0) {
                    this.storage = Object.assign(storage, this.storage);
                } else {
                    this.storage = storage;
                }
                this.flush();
            }
            this.initDone = true;
            this.log.info(`have ${Object.keys(this.storage).length} keys`);
            this.eventsBus.emit('localStorage.loaded');
        });
    }
}
