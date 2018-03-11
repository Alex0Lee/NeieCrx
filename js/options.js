function saveOptions() {
    let config = {
        server: document.getElementById("server").value,
        userName: document.getElementById("userName").value,
        password: document.getElementById("password").value,
        type: document.getElementById('type').value,
        level: document.getElementById("level").value,
        end: document.getElementById("end").value,
        maxTime: document.getElementById("maxTime").value,
        minTime: document.getElementById("minTime").value,
        maxScore: document.getElementById("maxScore").value,
        minScore: document.getElementById("minScore").value,
    };
    chrome.storage.sync.set({
        config: config
    }, function () {
        let status = document.getElementById('saveState');
        let date = new Date();
        status.innerText = 'Options saved at ' + date.toLocaleTimeString();
        setTimeout(function () {
            status.innerText = '';
        }, 3000);
    });
}

function restoreOptions() {
    getOptions((config) => {
        document.getElementById("server").value = config.server;
        document.getElementById("userName").value = config.userName;
        document.getElementById("password").value = config.password;
        document.getElementById("type").value = config.type;
        document.getElementById("level").value = config.level;
        document.getElementById("end").value = config.end;
        document.getElementById("maxTime").value = config.maxTime;
        document.getElementById("minTime").value = config.minTime;
        document.getElementById("maxScore").value = config.maxScore;
        document.getElementById("minScore").value = config.minScore;
    });
}


function getOptions(callback) {
    chrome.storage.sync.get({
        config: {
            server: '',
            userName: '',
            password: '',
            type: '',
            level: '',
            end: '',
            maxTime: '',
            minTime: '',
            maxScore: '',
            minScore: '',
        }
    }, async (items) => {
        await callback(items.config);
    });
}

function helpActivate() {
    let needActivate = document.getElementById('needActivation').checked;
    document.getElementById('serialNumber').disabled = !needActivate;
    document.getElementById('licenseNumber').disabled = !needActivate;
    document.getElementById('activationCode').disabled = !needActivate;
    console.log(needActivate);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('needActivation').addEventListener('change', helpActivate);
