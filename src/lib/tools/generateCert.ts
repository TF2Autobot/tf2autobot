import fs from 'fs';
import forge from 'node-forge';

const DEFAULT_C = 'Australia';
const DEFAULT_ST = 'Victoria';
const DEFAULT_L = 'Melbourne';

const makeNumberPositive = hexString => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    let mostSignificativeHexDigitAsInt = parseInt(hexString[0], 16);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    if (mostSignificativeHexDigitAsInt < 8) return hexString;

    mostSignificativeHexDigitAsInt -= 8;
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    return mostSignificativeHexDigitAsInt.toString() + hexString.substring(1);
};

const randomSerialNumber = () => {
    return makeNumberPositive(forge.util.bytesToHex(forge.random.getBytesSync(20)));
};

// Get the Not Before Date for a Certificate (will be valid from 2 days ago)
const getCertNotBefore = () => {
    const twoDaysAgo = new Date(Date.now() - 60 * 60 * 24 * 2 * 1000);
    const year = twoDaysAgo.getFullYear();
    const month = (twoDaysAgo.getMonth() + 1).toString().padStart(2, '0');
    const day = twoDaysAgo.getDate();
    return new Date(`${year}-${month}-${day} 00:00:00Z`);
};

// Get CA Expiration Date (Valid for 100 Years)
const getCANotAfter = notBefore => {
    const year = notBefore.getFullYear() + 100;
    const month = (notBefore.getMonth() + 1).toString().padStart(2, '0');
    const day = notBefore.getDate();
    return new Date(`${year}-${month}-${day} 23:59:59Z`);
};

/***
 * Generates a new certificate and a private key
 */
export default function CreateRootCA() {
    // Create a new Keypair for the Root CA
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(2048);

    // Define the attributes for the new Root CA
    const attributes = [
        {
            shortName: 'C',
            value: DEFAULT_C
        },
        {
            shortName: 'ST',
            value: DEFAULT_ST
        },
        {
            shortName: 'L',
            value: DEFAULT_L
        },
        {
            shortName: 'CN',
            value: 'My Custom Testing RootCA'
        }
    ];

    const extensions = [
        {
            name: 'basicConstraints',
            cA: true
        },
        {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
        },
        {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
            codeSigning: true,
            emailProtection: true,
            timeStamping: true
        }
    ];

    // Create an empty Certificate
    const cert = forge.pki.createCertificate();

    // Set the Certificate attributes for the new Root CA
    cert.publicKey = publicKey;
    cert.privateKey = privateKey;
    cert.serialNumber = randomSerialNumber();
    cert.validity.notBefore = getCertNotBefore();
    cert.validity.notAfter = getCANotAfter(cert.validity.notBefore);
    cert.setSubject(attributes);
    cert.setIssuer(attributes);
    cert.setExtensions(extensions);

    // Self-sign the Certificate
    cert.sign(privateKey, forge.md.sha512.create());

    // Convert to PEM format
    const pemCert = forge.pki.certificateToPem(cert);
    const pemKey = forge.pki.privateKeyToPem(privateKey);

    // Return the PEM encoded cert and private key
    return { certificate: pemCert, privateKey: pemKey };
}
