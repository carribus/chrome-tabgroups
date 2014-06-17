var contexts = ["page"];
var menuItems = {};

// create the menu items
menuItems.GroupInCurrent = createMenuItem("Group similar tabs in this window", onGroupInCurrentClicked);
menuItems.GroupInNew = createMenuItem("Group similar tabs into new window", onGroupInNewClicked);

/**
 * Create a Chrome Context Menu item
 * @param title
 * @param onClickHandler
 */
function createMenuItem(title, onClickHandler) {
    return chrome.contextMenus.create({
        "title": title,
        "contexts": contexts,
        "onclick": onClickHandler
    });
}

function crackURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return {
        protocol: a.protocol,
        host: a.hostname,
        port: a.port
    };
}

function createNewWindowForTab(tab, callback) {
    chrome.windows.create({
        focused: true
    }, function(window) {
        callback(window.id);
    })
}

function enumAllTabs(allWindows, callback) {
    var resultArray = [];
    var queryObj = {
        currentWindow: true
    };

    chrome.tabs.query(queryObj, function(tabArray) {
        resultArray = tabArray;
        queryObj.currentWindow = false;
        if ( allWindows ) {
            chrome.tabs.query(queryObj, function(tabArray) {
                resultArray = resultArray.concat(tabArray);
                callback(resultArray);
            })
        } else {
            callback(resultArray);
        }
    });
}

function removeUnrelatedTabs(tabArray, refTab) {
    var refHost = crackURL(refTab.url).host;
    var tabHost;
    var resultArray = [];

    for ( var i = 0, len = tabArray.length; i < len; i++ ) {
        tabHost = crackURL(tabArray[i].url).host;
        if ( refHost == tabHost ) {
            resultArray.push(tabArray[i].id);
        }
    }

    return resultArray;
}

/**
 * Handle the GroupInCurrent menu item click
 * @param info
 * @param tab
 */
function onGroupInCurrentClicked(info, tab) {
    var host1, host2;
    enumAllTabs(false, function(tabs) {
        // sort tabs by host
        tabs.sort(function(a, b) {
            host1 = crackURL(a.url).host;
            host2 = crackURL(b.url).host;
            console.log('comparing: %s to %s', host1, host2);
            return host1.localeCompare(host2);
        });

        for ( var i = 0, len = tabs.length; i < len; i++ ) {
            chrome.tabs.move(tabs[i].id, {index:i});
        }
    });
}

/**
 * Handle the GroupInNew menu item click
 * @param info
 * @param tab
 */
function onGroupInNewClicked(info, tab) {
    enumAllTabs(true, function(tabs) {
        tabs = removeUnrelatedTabs(tabs, tab);
        createNewWindowForTab(tabs[0], function(windowId) {
            chrome.tabs.move(tabs, {"index": -1, "windowId": windowId}, function() {
                // when move complete, we need to remove the first 'new page' tab
                chrome.tabs.query({index:0, "windowId": windowId}, function(tabs) {
                    chrome.tabs.remove(tabs[0].id);
                })
            });
        });
    });
}

