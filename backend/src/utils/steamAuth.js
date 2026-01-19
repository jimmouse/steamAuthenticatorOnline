const SteamTotp = require('steam-totp');

function generateAuthCode(sharedSecret) {
  try {
    return SteamTotp.generateAuthCode(sharedSecret);
  } catch (error) {
    console.error('Error generating auth code:', error);
    return null;
  }
}

function getTimeRemaining() {
  const time = Math.floor(Date.now() / 1000);
  return 30 - (time % 30);
}

function parseSdaFile(sdaContent, password = null) {
  try {
    let data;
    
    if (typeof sdaContent === 'string') {
      data = JSON.parse(sdaContent);
    } else {
      data = sdaContent;
    }

    if (data.encrypted && password) {
      throw new Error('Encrypted SDA files not yet supported. Please decrypt first.');
    }

    return {
      accountName: data.account_name,
      sharedSecret: data.shared_secret,
      identitySecret: data.identity_secret,
      revocationCode: data.revocation_code,
      uri: data.uri,
      serverTime: data.server_time,
      serialNumber: data.serial_number,
      tokenGid: data.token_gid,
      deviceId: data.device_id,
      secret1: data.secret_1,
      status: data.status,
      fullData: data
    };
  } catch (error) {
    console.error('Error parsing SDA file:', error);
    throw new Error('Invalid SDA file format');
  }
}

module.exports = {
  generateAuthCode,
  getTimeRemaining,
  parseSdaFile
};
