/* eslint-disable no-param-reassign, no-console */
import test from 'ava';
import { Application } from 'spectron';
import path from 'path';
import fs from 'fs';
import shell from 'shelljs';
import {
    getElectronPath, createTestApp, sendIpc, sendModuleEvent
} from
    'meteor-desktop-plugin-test-suite';

let userData;

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

const appDir = path.join(__dirname, '..', 'testApp');

test.before(
    async() => {
        await createTestApp(appDir, 'meteor-desktop-localstorage');
    }
);

test.after(
    () => {
        shell.rm('-rf', userData);
        shell.rm('-rf', appDir);
    }
);

test.beforeEach(async(t) => {
    t.context.app = new Application({
        path: getElectronPath(),
        args: [path.join(__dirname, '..', 'testApp')],
        env: { ELECTRON_ENV: 'test' }
    });
    await t.context.app.start();
    userData = await t.context.app.electron.remote.app.getPath('userData');
});

test.afterEach.always(async(t) => {
    shell.rm('-f', path.join(userData, 'localstorage.json'));
    if (t.context.app && t.context.app.isRunning()) {
        await t.context.app.stop();
    }
});

function readLocalStorageFile() {
    return fs.readFileSync(path.join(userData, 'localstorage.json'), 'utf8');
}

test('the test app', async t => await getApp(t));

test('if storage file is initialized', async(t) => {
    const app = await getApp(t);
    await sendIpc(app, 'constructPlugin');
    await sendIpc(app, 'fireSystemEvent', 'afterLoading');
    await wait(500);
    const localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
});

test('set', async(t) => {
    const app = await getApp(t);
    await sendIpc(app, 'constructPlugin');
    await sendIpc(app, 'fireSystemEvent', 'afterLoading');
    await wait(500);
    let localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
    await sendModuleEvent(app, 'localStorage', 'set', 'key', 'value');
    await wait(500);
    localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({ key: 'value' }));
});

test('clear', async(t) => {
    const app = await getApp(t);
    await sendIpc(app, 'constructPlugin');
    await sendIpc(app, 'fireSystemEvent', 'afterLoading');
    await wait(500);
    let localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
    await sendModuleEvent(app, 'localStorage', 'set', 'key', 'value');
    await wait(500);
    localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({ key: 'value' }));
    await sendModuleEvent(app, 'localStorage', 'clear');
    await wait(500);
    localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
});

test('remove', async(t) => {
    const app = await getApp(t);
    await sendIpc(app, 'constructPlugin');
    await sendIpc(app, 'fireSystemEvent', 'afterLoading');
    await wait(500);
    let localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
    await sendModuleEvent(app, 'localStorage', 'set', 'key', 'value');
    await wait(500);
    localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({ key: 'value' }));
    await sendModuleEvent(app, 'localStorage', 'remove', 'key');
    await wait(500);
    localstorage = readLocalStorageFile();
    t.is(localstorage, JSON.stringify({}));
});

test('getAll', async() => {
    // We can not test ipc responses yet...
    // https://github.com/electron/spectron/issues/98
});
