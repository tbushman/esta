const expect = require('expect');
const path = require('path');
const nock = require('nock');
const request = require('supertest');
const http = require('http');
const Mock = require('./utils/mock');
const app = require('../app');
const fs = require('fs');
const config = require('../config/index.js');
const pug = require('pug');
const Vue = require('vue');
const { PublisherTest, ContentTest, SignatureTest } = require('../models/index.js');
// const {
//   matcherHint,
//   MatcherHintOptions
// } = require('jest-matcher-utils');
// const domJSON = require('domjson');
const mockSnapshotsExist = fs.existsSync(
  path.join(__dirname, '.', '__snapshots__', 'index.test.js.snap'));
let mockSnapshots;
if (mockSnapshotsExist) {
  mockSnapshots = require(path.join(__dirname, '.', '__snapshots__', 'index.test.js.snap'));
}

const nockBack = nock.back;
nockBack.fixtures = path.join(__dirname, '.', '__nock-fixtures__');

// const { CartTest, UserTest, PublisherTest, OrderTest, ContentTest  } = require('./utils/testmodels');

var recording = config.recordenv;//process.env.RECORD_ENV;
var testing = config.testenv;//process.env.TEST_ENV;
console.log(testing, recording);
if (testing === undefined) {
  testing = false;
  recording = false;
}
nockBack.setMode('record');

describe('API calls', () => {
  let key, gp, agent, csrf;
  // eslint-disable-next-line no-undef
  beforeAll(async(done) => {
    await app.listen(8686, () => {
      console.log('connected');
      agent = request.agent(app)
      done()
    })
  }, 5000);
  beforeEach(async() => {
    nockBack.setMode('record');
    nock.enableNetConnect('127.0.0.1');
  });
  afterEach(async() => {
    // this ensures that consecutive tests don't use the snapshot created
    // by a previous test
    // await ContentTest.deleteMany({}).catch(err => console.log(err));
    nockBack.setMode('wild');
    nock.cleanAll();
  });
  afterAll((done) => {
    console.log('disconnecting');
    app.close(); 
    setImmediate(done);
  });

  // key = 'should get all data';
  // test(key, async() => {
  //   const snapKey = ('API calls '+key+' 1');
  //   let snap = (!mockSnapshotsExist ? null : mockSnapshots[snapKey]
  //   );
  //   const { nockDone } = await nockBack(
  //     'pu.getAll.json'
  //   );
  //   nock.enableNetConnect('127.0.0.1');
  //   const pu = (
  //     !recording ? 
  //     await new Mock(snapKey).dat : 
  //     await agent
  //       .get('/')
  //       .then((data) => data).catch((err) => err)
  //   );
  //   if (!snap) {
  //     console.log('no snp')
  //     expect(pu).toMatchSnapshot();
  //   } else {
  //     console.log(data)
  //     expect(pu).toMatchSnapshot();
  //   }
  //   nockDone();
  //   if (!recording) {
  //     expect(pu).toHaveBeenCalled();
  //   }
  // }, 5000);
  // key = 'should initiate getting csrf';
  // test(key, async() => {
  //   const snapKey = ('API calls '+key+' 1');
  //   const snap = (!mockSnapshotsExist ? null : mockSnapshots[snapKey]);
  //   const register = await agent.get('/register/')
  //   // .header['set-cookie'].filter((item) => {
  //   //   return /(\_csrf=)/.test(item)
  //   // })[0].split('_csrf=')[1].split(';')[0];
  //   const { nockDone } = await nockBack(
  //     'pu.initCsrf.json'
  //   );
  //   nock.enableNetConnect('127.0.0.1');
  //   const csrf = register.header['set-cookie'].filter((item) => {
  //       return /(\_csrf=)/.test(item)
  //     })[0].split('_csrf=')[1].split(';')[0];
  //   expect(csrf).toMatchSnapshot();
  //   nockDone();
  //   console.log(csrf)
  // }, 5000)
  
  key = 'should add an admin user via manual registration';
  test(key, async() => {
    const snapKey = ('API calls '+key+' 1');
    const csrfKey = 'API calls should initiate getting csrf';
    const snap = (!mockSnapshotsExist ? null : mockSnapshots[snapKey]);
    const csurf = (!mockSnapshotsExist ? 
      await agent.get('/register/')
        .then((res) => {
          return res.header['set-cookie'].filter((item) => {
              return /(\_csrf=)/.test(item)
            })[0].split('_csrf=')[1].split(';')[0]
        }) 
        : 
        mockSnapshots[csrfKey]
    );
    console.log(csurf)
    const { nockDone } = await nockBack(
      'pu.addAdminUser.json'
    );
    nock.enableNetConnect('127.0.0.1');
    const pu = (
      !recording ? 
      await new Mock(snapKey).dat : 
      await agent
        .post('/register')
        .send({
          _csrf: csurf,
          givenName: 'Tracey Bushman',
          zip: '90210',
          username: 'tbushman',
          password: 'password'
        })
        .then((data) => data).catch((err) => err)
    );
    expect(pu).toMatchSnapshot();
    nockDone()
  })
  key = 'should add a user via manual registration';
  key = 'should add a user via slack';
  key = 'should add an admin user via slack';
  key = 'as an authenticated admin, add a Geography document';
  key = 'as an authenticated admin, add a Solidarity document';
  key = 'as an authenticated admin, add a EIS document';
  key = 'as an authenticated user, sign a Solidarity document';

});

// describe('MongoDB methods', () => {
//   let key, pu;
//   afterEach(async () => {
//     // await ContentTest.deleteMany({}).catch(err => console.log(err));
//     await nockBack.setMode('wild');
//     await nock.cleanAll();
//   });
// 
//   beforeEach( async() => {
//     // await ContentTest.deleteMany({}).catch(err => console.log(err));
//   });
// 
//   key = 'db should get no data';
//   test(key, async () => {
//     // pu = await new Mock(key).dat;
//     const results = await ContentTest.find({}).then(data => data);
//     await expect(results).toBe([]);
//     await expect(results).toMatchSnapshot();
//   });
// 
//   key = 'db should get no users';
//   test(key, async () => {
//     // pu = await new Mock(key).dat;
//     const results = await PublisherTest.find({}).then(data => data);
//     await expect(results).toBe([]);
//     await expect(results).toMatchSnapshot();
//   });
// 
//   key = 'db should get no signatures';
//   test(key, async () => {
//     // pu = await new Mock(key).dat;
//     const results = await SignatureTest.find({}).then(data => data);
//     await expect(results).toBe([]);
//     await expect(results).toMatchSnapshot();
//   });
// 
// });

// For more information about testing with Jest see:
// https://facebook.github.io/jest/
