var contexts = ["page"];
var menuItems = {};

// create the menu items
menuItems.ThisWindow = createMenuItem('This Window');
menuItems.AllWindows = createMenuItem('All Windows');
menuItems.SortInCurrent = createMenuItem("Sort tabs", onSortInCurrentClicked, menuItems.ThisWindow);
menuItems.GroupLocalInNew = createMenuItem("Group similar tabs into new window", onGroupLocalInNewClicked, menuItems.ThisWindow);
menuItems.CloseInCurrent = createMenuItem("Close similar tabs", onCloseInCurrentClicked, menuItems.ThisWindow);
menuItems.GroupInNew = createMenuItem("Group all similar tabs into new window", onGroupInNewClicked, menuItems.AllWindows);
menuItems.CloseAllSimilar = createMenuItem("Close similar tabs", onCloseAllSimilarClicked, menuItems.AllWindows);

/**
 * Create a Chrome Context Menu item
 * @param title
 * @param onClickHandler
 */
function createMenuItem(title, onClickHandler, parentID) {
    var opt = {
        "title": title,
        "contexts": contexts
    };

    if ( onClickHandler ) {
        opt.onclick = onClickHandler;
    }

    if ( parentID ) {
        opt.parentId = parentID;
    }

    return chrome.contextMenus.create(opt);
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
        if ( allWindows ) {
            queryObj.currentWindow = false;
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

function closeSimilarTabs(tab, tabArray) {
    var refHost = crackURL(tab.url).host;
    var tabsToClose = [];

    for ( var i = 0, len = tabArray.length; i < len; i++ ) {
        if ( crackURL(tabArray[i].url).host.localeCompare(refHost) == 0 ) {
            tabsToClose.push(tabArray[i].id);
        }
    }

    if ( tabsToClose.length ) {
        chrome.tabs.remove(tabsToClose);
    }
}

/**
 * Handle the SortInCurrent menu item click
 * @param info
 * @param tab
 */
function onSortInCurrentClicked(info, tab) {
    var host1, host2;
    enumAllTabs(false, function(tabs) {
        // sort tabs by host
        tabs.sort(function(a, b) {
            host1 = crackURL(a.url).host;
            host2 = crackURL(b.url).host;
            return host1.localeCompare(host2);
        });

        for ( var i = 0, len = tabs.length; i < len; i++ ) {
            chrome.tabs.move(tabs[i].id, {index:i});
        }
    });
}

/**
 * Handle the GroupLocalInNew menu item click
 * @param info
 * @param tab
 */
function onGroupLocalInNewClicked(info, tab) {
    enumAllTabs(false, function(tabs) {
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

/**
 * Handle the CloseInCurrent menu item click
 * @param info
 * @param tab
 */
function onCloseInCurrentClicked(info, tab) {
    enumAllTabs(false, function(tabs) {
        closeSimilarTabs(tab, tabs);
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

/**
 * Handle the CloseAllSimilar menu item click
 * @param info
 * @param tab
 */
function onCloseAllSimilarClicked(info, tab) {
    enumAllTabs(true, function(tabs) {
        closeSimilarTabs(tab, tabs);
    });
}
