class Learner {
    constructor(config) {
        this.config = config;
        this.prefix = '';
        if (this.config.type === 'RWT') {
            this.prefix = 'Reading';
        }
        else {
            this.prefix = 'Listening';
        }
        this.encryptedConfig = [];
        this.encoder = new Encoder();
        this.decoder = new Decoder();
        for (let item in config) {
            this.encryptedConfig[item] = this.encoder.handle(config[item]);
        }
        this.running = 0;
    }


    // Print config to debug
    printConfig() {
        Logger.success(this.config);
        Logger.success(this.encryptedConfig);
    };


    // Construct XML to be posted
    static constructXml(userName, password, method, data) {
        let xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <CredentialSoapHeader xmlns="http://www.open.com.cn">
`;
        xml += '      <Username>' + userName + '</Username>\n';
        xml += '      <Password>' + password + '</Password>\n';
        xml += `      <ClientCredential>83BCC79913F2331685F4851C4ED2DA72  E37438347941F22F6A873D18CE562AC9</ClientCredential>
    </CredentialSoapHeader>
  </soap:Header>
  <soap:Body>
`;
        xml += '    <' + method + ' xmlns="http://www.open.com.cn">\n';
        for (let name in data) {
            xml += '      <' + name + '>' + data[name] + '</' + name + '>\n';
        }
        xml += '    </' + method + '>\n';
        xml += `  </soap:Body>
</soap:Envelope>
`;
        return xml
    };


    // Check connection with server
    checkConnection() {
        return new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.onload = () => {
                if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
                    resolve(request.status)
                } else {
                    reject(request.status);
                }
            };
            request.open("GET", "http://" + this.config['server'] + "/WebService/ServiceV3.asmx?WSDL");
            request.send();
        });
    };


    // Post data to server
    soapPost(method, body) {
        return new Promise(async (resolve, reject) => {
            try {
                await this.checkConnection();
                let xml_message = Learner.constructXml(this.encryptedConfig.userName, this.encryptedConfig.password, method, body);

                let request = new XMLHttpRequest();
                request.onload = () => {
                    let result = request.responseXML.documentElement.childNodes[0].childNodes[0];
                    let object = {
                        result: {},
                        decryptedResult: {}
                    };
                    for (let i = 0; i < result.childNodes.length; ++i) {
                        object.result[result.childNodes[i].nodeName] = result.childNodes[i].textContent;
                        object.decryptedResult[result.childNodes[i].nodeName] = this.decoder.handle(result.childNodes[i].textContent);
                    }
                    resolve(object);
                };
                request.open("POST", "http://" + this.config.server + "/WebService/ServiceV3.asmx");
                request.setRequestHeader("Content-type", "text/xml; charset=utf-8");
                request.setRequestHeader("SOAPAction", 'http://www.open.com.cn/' + method);
                request.send(xml_message);
            } catch (exception) {
                Logger.error(exception.message)
            }
        });
    };


    async login() {
        try {
            let data = {
                'UserName': this.encryptedConfig.userName,
                'Password': this.encryptedConfig.password,
                'Version': this.encoder.handle('5.0'),
                'LevelID': this.encryptedConfig.level
            };

            let object = await this.soapPost('Login' + this.prefix, data);
            this.config.userId = object.decryptedResult['UserID'];
            this.encryptedConfig.userId = object.result['UserID'];
            this.config.userNumber = object.decryptedResult['UserNumber'];
            this.encryptedConfig.userNumber = object.result['UserNumber'];

            let result = object.decryptedResult['Login' + this.prefix + 'Result'];
            if (result === '1') {
                throw Error('Activation needed for user ' + this.config.userName);
            } else if (result !== '2') {
                throw Error('User ' + this.config.userName + ' failed to log in ' + object.decryptedResult['ReturnMessage'])
            } else {
                Logger.success('User ' + this.config.userName + ' logged in successfully')
            }
            return result;

        } catch (exception) {
            Logger.error(exception.message)
        }
    }


    async getProgress() {
    }


    // The fucking spelling
    async setUnitLearnStatus() {
        try {
            let data = {
                'UserID': this.encryptedConfig.userId,
                'LevelID': this.encryptedConfig.level,
                'UnitID': this.encryptedConfig.unitId,
                'Status': this.encoder.handle('1')
            };

            // ********************* CAUTION *********************
            // DO NOT CORRECT THIS SPELLING ERROR, IT IS A FEATURE
            // ********************* CAUTION *********************
            let object = await this.soapPost('Set' + this.prefix + 'UnitLearnStaus', data);


            let result = object.decryptedResult['Set' + this.prefix + 'UnitLearnStausResult'];
            if (result === '1') {
                Logger.success('Updated unit learning status successfully: unit ' + this.config.unitId);

            } else {
                throw Error('Failed to update unit learning status: unit ' + learn.UnitID)
            }
            return result;

        } catch (exception) {
            Logger.error(exception.message)
        }
    }


    async getServerTime() {
        try {
            let object = await this.soapPost('GetServerTime', {});

            this.config.beginTime = object.result['GetServerTimeResult'];
            this.encryptedConfig.beginTime = this.encoder.handle(object.result['GetServerTimeResult']);

            return object;

        } catch (exception) {
            Logger.error(exception.message)
        }
    }

    async setResponseInformation(score, isCompleted) {
    }

    async setUserActiveInfo(serialNumber, licenseNumber, activationCode) {
        try {
            let data = {
                'UserID': this.encryptedConfig.userId,
                'LevelID': this.encryptedConfig.level,
                'SerialNumber': this.encoder.handle(serialNumber),
                'LicenseNumber': this.encoder.handle(licenseNumber),
                'ActivationCode': this.encoder.handle(activationCode),
                'IsActive': this.encoder.handle('2'),
            };

            return await this.soapPost('Set' + this.prefix + 'UserActiveInfo', data);
        } catch (exception) {
            Logger.error(exception.message)
        }
    }

    async activate(serialNumber, licenseNumber, activationCode) {
        try {
            let object = await this.login();
            let state = object.decryptedResult['Login' + this.prefix + 'Result'];
            if (state === '2') {
                Logger.success('User ' + this.config.userName + ' has been activated');
                return '1';
            } else if (state !== '1') {
                if (object.decryptedResult['ReturnMessage'].indexOf('Activation') === -1) {
                    throw Error('User ' + this.config.userName + ' login failed: ' + object.decryptedResult['ReturnMessage']);
                }
            } else {
                let object = await this.setUserActiveInfo(serialNumber, licenseNumber, activationCode);
                let result = object.decryptedResult['Set' + this.prefix + 'UserActiveInfoResult'];
                if (result === '1') {
                    Logger.success('User ' + this.config.userName + ' has been activated')
                } else {
                    throw Error('Activation of user ' + this.config.userName + ' has failed: ' + object.decryptedResult['ReturnMessage']);
                }
            }
            return state;
        } catch (exception) {
            Logger.error(exception.message)
        }
    }

    async endSection(score) {
        try {
            score = score.toString();
            let object = await this.setResponseInformation(score, '1');
            let result = object.decryptedResult['Set' + this.prefix + 'ResponseInformationResult'];
            if (result === '1') {
                Logger.success('Ended section ' + this.config.sectionId + ' successfully: score ' + score);
                return result;
            } else {
                throw Error('Failed to end section ' + this.config.sectionId);
            }
        } catch (exception) {
            Logger.error(exception.message)
        }
    }

    async startSection() {
        try {
            let object = await this.setResponseInformation('0', '0');
            let result = object.decryptedResult['Set' + this.prefix + 'ResponseInformationResult'];
            if (result === '1') {
                Logger.success('Started section ' + this.config.sectionId + ' successfully');
                return result;
            } else {
                throw Error('Failed to start section ' + this.config.sectionId);

            }
        } catch (exception) {
            Logger.error(exception.message)
        }
    }

    async timer(time) {
        return new Promise(resolve => setTimeout(resolve, time * 1000));
    }

    async startingEndUnit() {
        let result = await this.getProgress();
        if (result === '1') {
            let entry = getEntry(this.config.type, this.config.level, this.config.sectionId);
            if (entry.next.substr(1, 1) !== this.config.unitId) {
                this.setUnitLearnStatus();
            }
            this.config.unitId = entry.next.substr(1, 1);
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
            this.config.sectionId = entry.next;
            this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);
        }
    }

    async learnHandle() {
        await this.getServerTime();
        Logger.success('Learning ' + this.config.type + ': Unit ' + this.config.unitId + ', Section ' + this.config.sectionId);
        let random = Math.random();
        let time = Math.floor(random * (this.config.maxTime - this.config.minTime)) + parseInt(this.config.minTime);
        let s = setInterval(() => {
            console.log(time--);
        }, 1000);
        await this.timer(time);
        clearInterval(s);
        Logger.success('Finished ' + this.config.type + ': Unit ' + this.config.unitId + ', Section ' + this.config.sectionId);

        let entry = getEntry(this.config.type, this.config.level, this.config.sectionId);
        let score = 0;
        if (entry.problem !== 0) {
            minProblen = (this.config.minScore * entry.problem / 100) + 1;
            maxProblem = (this.config.maxScore * entry.problem / 100) + 1;
            if (minProblen > maxProblem)
                minProblen = maxProblem;
            let problem = Math.floor(Math.random() * (maxProblem - minProblen)) + minProblen;
            score = problem * 100.0 / entry.problem;
        }
        await this.endSection(score.toString());

        if (!entry.hasOwnProperty('next')) {
            await this.setUnitLearnStatus();
        }

        if (entry.next.substr(1, 1) !== this.config.unitId) {
            await this.setUnitLearnStatus();
            if (this.config.unitId !== this.config.end)
                this.running = 0;
            this.config.unitId = entry.next.substr(1, 1);
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
        }
        this.config.sectionId = entry.next;
        this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);
        await this.startSection();
    }

    async test() {
        try {
            console.log(getEntry('VLS', '4', '4E54'));
        } catch (exception) {
            console.log(exception.message);
        }

    }
}


class RwtLearner extends Learner {
    constructor(config) {
        super(config);
    }

    async getProgress() {
        try {
            let data = {
                'UserID': this.config.userId,
                'LevelID': this.config.level
            };

            let object = await this.soapPost('Get' + this.prefix + 'Progress', data);
            this.config.unitId = object.result['UnitID'];
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
            this.config.sectionId = object.result['SectionID'];
            this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);

            return object.decryptedResult['Get' + this.prefix + 'ProgressResult']

        } catch (exception) {
            this.config.unitId = '1';
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
            this.config.sectionId = this.config.level + this.config.unitId + '11';
            this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);
            Logger.error(exception.message)
        }
    }

    async setResponseInformation(score, isCompleted) {
        try {
            let data = {
                'UserID': this.encryptedConfig.userId,
                'UserNumber': this.encryptedConfig.userNumber,
                'SectionID': this.encryptedConfig.sectionId,
                'Response': this.encoder.handle(''),
                'Score': this.encoder.handle(score),
                'IsSaveResponse': this.encoder.handle('0'),
                'IsCompleted': this.encoder.handle(isCompleted),
                'BeginTime': this.encryptedConfig.beginTime
            };

            return await this.soapPost('Set' + this.prefix + 'ResponseInformation', data);
        } catch (exception) {
            Logger.error(exception.message)
        }
    }

}

class VlsLearner extends Learner {
    constructor(config) {
        super(config);
    }

    async getProgress() {
        try {
            let data = {
                'UserID': this.config.userId,
                'LevelID': this.config.level
            };

            let object = await this.soapPost('Get' + this.prefix + 'Progress', data);
            this.config.unitId = object.result['UnitID'];
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
            this.config.sectionId = object.result['SectionID'];
            this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);

            return object.decryptedResult['Get' + this.prefix + 'ProgressResult']

        } catch (exception) {
            this.config.unitId = '1';
            this.encryptedConfig.unitId = this.encoder.handle(this.config.unitId);
            this.config.sectionId = this.config.level + this.config.unitId + '21';
            this.encryptedConfig.sectionId = this.encoder.handle(this.config.sectionId);
            Logger.error(exception.message)
        }
    }

    async setResponseInformation(score, isCompleted) {
        try {
            let data = {
                'UserID': this.encryptedConfig.userId,
                'UserNumber': this.encryptedConfig.userNumber,
                'SectionID': this.encryptedConfig.sectionId,
                'SubSectionID': this.encoder.handle('0'),
                'Response': this.encoder.handle(''),
                'Score': this.encoder.handle(score),
                'IsSaveResponse': this.encoder.handle('0'),
                'IsCompleted': this.encoder.handle(isCompleted),
                'BeginTime': this.encryptedConfig.beginTime
            };

            return await this.soapPost('Set' + this.prefix + 'ResponseInformation', data);
        } catch (exception) {
            Logger.error(exception.message)
        }
    }
}


function startLearn() {
    try {
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
            let config = items.config;
            switch (config.type) {
                case 'RWT':
                    learner = new RwtLearner(config);
                    break;
                case 'VLS':
                    learner = new VlsLearner(config);
                    break;
                default:
                    break;
            }
            await learner.login();
            await learner.getProgress();
            await learner.startingEndUnit();

            learner.running = 1;
            while (learner.running) {
                await learner.learnHandle();
            }
        })
    } catch (exception) {
        Logger.error(exception.message)
    }
}

function stopLearn() {
    learner.running = 0;
}

function learnerMessageHandler(message) {
    console.log(message);
    switch (message.action) {
        case 'start':
            startLearn();
            break;
        case 'stop':
            stopLearn();
            break;
        default:
            Logger.error('Unrecognized action');
            break;
    }
}

let learner = null;
let port = chrome.runtime.connect({name: 'learner'});
chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(learnerMessageHandler);
});