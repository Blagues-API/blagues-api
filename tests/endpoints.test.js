require('dotenv').config();

const supertest = require('supertest');

const models = require('../src/models');
const app = require('../src/app');

beforeAll(async () => {
  await models.database.sync();
});

describe('Endpoints tests', () => {
  test('Random joke', async () => {
    expect.assertions(1);

    const randomJoke = {
      id: expect.any(Number),
      type: expect.stringMatching(/global|dev|dark|limit|beauf|blondes/),
      joke: expect.any(String),
      answer: expect.any(String),
    };

    const response = await supertest(app)
      .get('/api/random')
      .set('Authorization', `Bearer ${process.env.token}`);

    expect(response.body).toMatchObject(randomJoke);
  });

  test('Random joke categorized', async () => {
    expect.assertions(1);

    const type = 'dev';

    const response = await supertest(app)
      .get(`/api/type/${type}/random`)
      .set('Authorization', `Bearer ${process.env.token}`);

    return expect(response.body.type).toBe(type);
  });

  test('Random joke with disallowed type', async () => {
    expect.assertions(1);

    const type = 'dark';

    const response = await supertest(app)
      .get(`/api/random?disallow=${type}`)
      .set('Authorization', `Bearer ${process.env.token}`);

    return expect(response.body.type).not.toBe(type);
  });

  test('Get joke by ID', async () => {
    expect.assertions(1);

    const id = 815;

    const response = await supertest(app)
      .get(`/api/id/${id}`)
      .set('Authorization', `Bearer ${process.env.token}`);

    return expect(response.body.id).toBe(id);
  });
});

