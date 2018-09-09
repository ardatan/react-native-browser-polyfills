const {
    Dimensions,
    Linking,
    NetInfo,
    Vibrate,
    Alert,
    AppState
} = require("react-native");
const localStorage = require('react-native-sync-localstorage');

let currentUrl = '';
let readyState = 'loading';
let netInfo = {
    changeListeners: [],
    addEventListener(eventName, callback) {
        switch (eventName) {
            case 'change':
                this.changeListeners.push(callback);
                break;
        }
    },
    removeEventListener() {
        switch (eventName) {
            case 'change':
                this.changeListeners.splice(this.changeListeners.indexOf(callback), 1);
                break;
        }
    }
};

function handleConnectionUpdate(info) {
    netInfo = Object.assign(netInfo, info);
}

NetInfo.addEventListener('connectionChange', info => {
    handleConnectionUpdate(info);
    netInfo.changeListeners.forEach(callback => callback(info));
});

const promises = [
    localStorage.getAllFromLocalStorage(),
    Linking.getInitialURL().then(url => (url && (currentUrl = url))),
    NetInfo.getConnectionInfo().then(handleConnectionUpdate)
];

const allPromises = Promise.all(promises).then(() => {
    readyState = 'complete';
});

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
        get pathname(){
            return this.href;
        },
        get hash() {
            return urlArr[1] ? `#${urlArr[1]}` : ""
        },
        set hash(hash) {
            return Linking.openURL(this.href + '#' + hash);
        },
        replace(url) {
            return Linking.openURL(url);
        },
        toString() {
            return url;
        }
    }
}
Object.defineProperties(window, {
    localStorage: {
        get() {
            return localStorage;
        }
    },
    sessionStorage: {
        get() {
            return localStorage
        }
    },
    document: {
        get() {
            return {
                readyState,
                addEventListener(eventName, callback) {
                    switch (eventName) {
                        case 'deviceready':
                        case 'DOMContentLoaded':
                            if (this.readyState !== 'complete') {
                                allPromises.then(callback);
                            }
                            break;
                        case 'visibilitychange':
                            AppState.addEventListener('change', e => callback({
                                visibilitychange: e.match(/inactive|background/) ? 'hidden' : 'visible'
                            }));
                            break;
                    }
                },
                getElementsByTagName() {
                    return {
                        item() {
                            return {
                                appendChild() {}
                            }
                        }
                    };
                },
                createElement() {
                    return {
                        setAttribute() {},
                        get pathname(){
                            return '';
                        }
                    };
                },
                get hidden() {
                    return AppState.currentState.match(/inactive|background/);
                },
                get visibilityState() {
                    return this.hidden ? 'hidden' : 'visible';
                }
            }
        }
    },
    self: {
        configurable: true,
        value: global
    },
    addEventListener: {
        configurable: true,
        value(eventName, callback) {
            switch (eventName) {
                case 'load':
                    if (this.document, readyState !== 'complete') {
                        allPromises.then(callback);
                    }
                    break;
                case 'online':
                    netInfo.changeListeners.push(callback);
                    break;
                case 'hashchange':
                    let oldHash = location.hash;
                    Linking.addEventListener('url', event => {
                        const {
                            hash
                        } = parseUrl(event.url);
                        if (hash !== oldHash) {
                            callback(event);
                        }
                        oldHash = hash;
                    });
                    break;
            }
        }
    },
    attachEvent: {
        configurable: true,
        value(eventNameWithOn, callback) {
            const eventName = eventNameWithOn.replace('on', '');
            return this.addEventListener(eventName, callback);
        }
    },
    onload: {
        set(callback) {
            return this.addEventListener('load', callback);
        }
    },
    onhashchange: {
        set(callback) {
            return this.addEventListener('hashchange', callback);
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
    },
    alert: {
        get() {
            return Alert.alert.bind(Alert);
        }
    }
});

const Geolocation = navigator.geolocation;

Object.defineProperty(self || window, 'navigator', {
    get() {
        return {
            get onLine() {
                return !!netInfo.type;
            },
            get vibrate() {
                return Vibrate.vibrate.bind(Vibrate);
            },
            get geolocation() {
                return Geolocation;
            },
            get connection() {
                return netInfo;
            }
        }
    }
});

Object.defineProperty(self || window, 'location', {
    configurable: true,
    get() {
        return parseUrl(currentUrl);
    },
    set(url) {
        return Linking.openURL(url);
    }
});