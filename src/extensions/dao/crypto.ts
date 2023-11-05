import crypto from 'crypto';

const md5 = text => {
return crypto
    .createHash('md5')
    .update(text)
    .digest();
}

export function encrypt(text, secretKey) {
    secretKey = md5(secretKey);
    secretKey = Buffer.concat([secretKey, secretKey.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit

    const cipher = crypto.createCipheriv('des-ede3', secretKey, '');
    const encrypted = cipher.update(text, 'utf8', 'base64');

    return encrypted + cipher.final('base64');
};

export function decrypt(encryptedBase64, secretKey) {
    secretKey = md5(secretKey);
    secretKey = Buffer.concat([secretKey, secretKey.slice(0, 8)]); // properly expand 3DES key from 128 bit to 192 bit
    const decipher = crypto.createDecipheriv('des-ede3', secretKey, '');
    const result = Buffer.concat([decipher.update(encryptedBase64, 'base64'), decipher.final()])
    return result.toString('utf8');
};


