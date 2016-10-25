/* eslint-disable no-param-reassign, no-console */
import test from 'ava';
import { Application } from 'spectron';
import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import {
    getElectronPath, constructPlugin, createTestApp, send, fetch,
    fireEventsBusEventAndWaitForAnother
} from
    'meteor-desktop-plugin-test-suite';

let userData;
let storageFile;

async function getApp(t) {
    const app = t.context.app;
    await app.client.waitUntilWindowLoaded();
    t.is(await app.client.getWindowCount(), 1);
    return app;
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}

const appDir = path.join(__dirname, '..', '.testApp');

test.before(
    async () => {
        await createTestApp(appDir, 'meteor-desktop-localstorage');
    }
);

test.after(
    () => {
        shell.rm('-rf', userData);
        shell.rm('-rf', appDir);
    }
);

test.beforeEach(async (t) => {
    t.context.app = new Application({
        path: getElectronPath(),
        args: [appDir],
        env: { ELECTRON_ENV: 'test' }
    });
    await t.context.app.start();
    userData = await t.context.app.electron.remote.app.getPath('userData');
});

test.afterEach.always(async (t) => {
    if (storageFile) {
        shell.rm('-f', path.join(userData, storageFile));
    }
    if (t.context.app && t.context.app.isRunning()) {
        await t.context.app.stop();
    }
});

function readLocalStorageFile(filename = 'localstorage.json') {
    return fs.readFileSync(path.join(userData, filename), 'utf8');
}

test('the test app', async t => await getApp(t));

test.serial('if storage file is initialized', async (t) => {
    const app = await getApp(t);
    storageFile = 'localstorage.json';
    await constructPlugin(app);
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    const localstorage = readLocalStorageFile();
    t.is(localstorage, '{}');
});

test.serial('if custom filename can be passed', async (t) => {
    const app = await getApp(t);
    storageFile = 'test.json';
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: 'test.json'
    });
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    t.is(readLocalStorageFile('test.json'), JSON.stringify({ key: 'value' }));
});

// TODO: figure out running test apps with unique chromedriver port so that we could
// run the test below concurrently.

test('set', async (t) => {
    const app = await getApp(t);
    storageFile = 'test_set.json';
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    let localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({ key: 'value' }));
});

test('clear', async (t) => {
    const app = await getApp(t);
    storageFile = 'test_clear.json';
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    let localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({ key: 'value' }));
    await send(app, 'localStorage', 'clear');
    await wait(100);
    localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
});

test('remove', async (t) => {
    const app = await getApp(t);
    storageFile = 'test_remove.json';
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    let localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({ key: 'value' }));
    await send(app, 'localStorage', 'remove', 'key');
    await wait(100);
    localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
});

test('getAll', async (t) => {
    const app = await getApp(t);
    storageFile = 'test_getAll.json';
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'afterLoading', 'localStorage.loaded');
    await send(app, 'localStorage', 'set', 'key', 'value');
    const result = await fetch(app, 'localStorage', 'getAll');
    t.deepEqual(result[2], { key: 'value' });
});
