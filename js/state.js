document.getElementById('start').addEventListener('click', onButtonStart);
document.getElementById('stop').addEventListener('click', onButtonStop);

let port = chrome.runtime.connect({name: "state"});
chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener(stateMessageHandler);
});

function onButtonStart() {
    port.postMessage({action: 'start'});
}


function onButtonStop() {
    port.postMessage({action: 'stop'});
}


function stateMessageHandler(message) {
    console.log(message);
}
