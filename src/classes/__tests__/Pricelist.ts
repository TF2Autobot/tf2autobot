import Pricelist from '../Pricelist';
import SchemaManager from 'tf2-schema-2';
import MockedSocket from 'socket.io-mock';

test('Pricelist is created', () => {
    const socket = new MockedSocket();
    const schemaManager = new SchemaManager({});
    const pricelist = new Pricelist(schemaManager.schema, socket);
});
