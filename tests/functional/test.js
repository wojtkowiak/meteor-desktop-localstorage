/* eslint-disable no-param-reassign, no-console */
import test from 'ava';
import { Application } from 'spectron';
import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import electron from 'electron';
import {
    constructPlugin, createTestApp, send, fetch,
    fireEventsBusEventAndWaitForAnother
} from
    'meteor-desktop-test-suite';

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
        path: electron,
        args: [appDir],
        env: { ELECTRON_ENV: 'test' }
    });
    await t.context.app.start();
    userData = await t.context.app.electron.remote.app.getPath('userData');
});

test.afterEach.always(async (t) => {
    try {
        // Test app saves an error.txt file if it encounters an uncaught exception.
        // It is good to see it's contents if it is present.
        const errorFile = path.join(appDir, 'error.txt');
        console.log(
            'error caught in the test app:',
            fs.readFileSync(errorFile, 'utf8')
        );
        fs.unlinkSync(errorFile);
    } catch (e) {
    }
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

async function prepareTest(app, t, fileName) {
    storageFile = fileName;
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'desktopLoaded', 'localStorage.loaded');
    const localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
}

test('the test app', async t => await getApp(t));

test.serial('if storage file is initialized', async (t) => {
    const app = await getApp(t);
    storageFile = 'localstorage.json';
    await constructPlugin(app);
    await fireEventsBusEventAndWaitForAnother(app, 'desktopLoaded', 'localStorage.loaded');
    const localstorage = readLocalStorageFile();
    t.is(localstorage, '{}');
});

test.serial('if custom filename can be passed', async (t) => {
    const app = await getApp(t);
    await prepareTest(app, t, 'test.json');
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    t.is(readLocalStorageFile(storageFile), JSON.stringify({ key: 'value' }));
});

// TODO: figure out running test apps with unique chromedriver port so that we could
// run the test below concurrently.

test('set', async (t) => {
    const app = await getApp(t);
    await prepareTest(app, t, 'test_set.json');
    await send(app, 'localStorage', 'set', 'key', 'value');
    await wait(100);
    const localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({ key: 'value' }));
});

async function prepareTestAndSetKey(app, t, fileName, key, value) {
    await prepareTest(app, t, fileName);
    await send(app, 'localStorage', 'set', key, value);
    await wait(100);
    const localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({ [key]: value }));
}

test('clear', async (t) => {
    const app = await getApp(t);
    await prepareTestAndSetKey(app, t, 'local_clear.json', 'key', 'value');
    await send(app, 'localStorage', 'clear');
    await wait(100);
    const localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
});

test('remove', async (t) => {
    const app = await getApp(t);
    await prepareTestAndSetKey(app, t, 'test_remove.json', 'key', 'value');
    await send(app, 'localStorage', 'remove', 'key');
    await wait(100);
    const localstorage = readLocalStorageFile(storageFile);
    t.is(localstorage, JSON.stringify({}));
});

test('getAll', async (t) => {
    const app = await getApp(t);
    await prepareTest(app, t, 'test_getAll.json');
    await constructPlugin(app, undefined, undefined, undefined, undefined, undefined, {
        fileName: storageFile
    });
    await fireEventsBusEventAndWaitForAnother(app, 'desktopLoaded', 'localStorage.loaded');
    await send(app, 'localStorage', 'set', 'key', 'value');
    const result = await fetch(app, 'localStorage', 'getAll');
    t.deepEqual(result[0], { key: 'value' });
});
