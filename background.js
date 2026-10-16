chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

chrome.contextMenus.create({
    id: "editMenu",
    title: "Edit Menu",
    contexts: ["all"],
    documentUrlPatterns: ["*://learn.uwaterloo.ca/*"]
});

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "editMenu") {
//         chrome.tabs.executeScript(tab.id, {
//             const :menuElement = document.querySelector('.d2l-navigation-s-course-menu');
//             if (menuElement) {
//                 menuElement.style.position = 'absolute';
//                 menuElement.style.top = '100px';
//                 menuElement.style.left = '100px';
//             }
//         });
//     }
// });