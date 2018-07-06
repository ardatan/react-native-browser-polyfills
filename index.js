const {
    Dimensions,
    Linking,
    NetInfo
} = require("react-native");
const localStorage = require('react-native-sync-localstorage');

let currentUrl = '';
let onLine;

const promises = [
    localStorage.getAllFromLocalStorage(),
    Linking.getInitialURL().then(url => (url && (currentUrl = url))),
    NetInfo.getConnectionInfo().then(info => onLine = (info.type && info.type !== 'none'))
];

const allPromises = Promise.all(promises).then(() => {
    this.readyState = 'complete';
});

window.self = global;

window.localStorage = localStorage;
window.sessionStorage = localStorage;

window.document = {
    readyState: 'loading',
    addEventListener(eventName, callback) {
        switch (eventName) {
            case 'deviceready':
            case 'DOMContentLoaded':
                allPromises.then(callback);
                break;
        }
    },
    getElementsByTagName() {
        return {
            item() {}
        };
    }
};

Linking.addEventListener('url', event => (event.url && (currentUrl = event.url)));

function parseUrl(url) {
    const urlArr = url.split('#');
    return {
        get href() {
            return urlArr[0];
        },
        set href(url) {
            return Linking.openURL(url);
        },
        get hash() {
            return urlArr[1] ? `#${urlArr[1]}` : ""
        },
        set hash(hash) {
            return Linking.openURL(this.href + '#' + hash);
        },
        replace() {

        },
        toString() {
            return url;
        }
    }
}
Object.defineProperty(self || window, 'navigator', {
    get() {
        return {
            get onLine() {
                return onLine;
            }
        }
    }
})
Object.defineProperty(self || window, 'location', {
    configurable: true,
    get() {
        return parseUrl(currentUrl);
    },
    set(url) {
        return Linking.openURL(url);
    }
});
Object.defineProperties(window, {
    self: {
        configurable: true,
        value: global
    },
    addEventListener: {
        configurable: true,
        value(eventName, callback) {
            switch (eventName) {
                case 'load':
                    allPromises.then(callback);
                    break;
                case 'online':
                    NetInfo.addEventListener(
                        'connectionChange',
                        callback
                    );
                    break;
            }
        }
    },
    attachEvent: {
        configurable: true,
        value(...args) {
            console.log(args)
        }
    },
    outerWidth: {
        configurable: true,
        get() {
            return Dimensions.get('window').width;
        }
    },
    outerHeight: {
        configurable: true,
        get() {
            return Dimensions.get('window').height;
        }
    }
});