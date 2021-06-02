require('dotenv').config();

const request = require('supertest');

const models = require('../src/models');
const app = require('../src/app');

beforeAll(async () => {
  await models.database.sync();
});

describe('Authentification tests', () => {

  test('The token should be defined', () => {
    return expect(process.env.token).toBeDefined();
  });

  test('It should require authentification', async () => {
    expect.assertions(1);
    const response = await request(app)
      .get('/api/random');

    return expect(response.statusCode).toBe(401);
  });

  test('It should require Bearer prefix', async () => {
    expect.assertions(1);
    const response = await request(app)
      .get('/api/random')
      .set('Authorization', process.env.token);

    return expect(response.statusCode).toBe(401);
  });

  test('It should be success', async () => {
    expect.assertions(1);
    const response = await request(app)
      .get('/api/random')
      .set('Authorization', `Bearer ${process.env.token}`);

    return expect(response.statusCode).toBe(200);
  });
});
