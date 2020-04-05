const chai = require('chai');
// const expect = require('expect');
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
const { expect } = chai;
// const {
//   matcherHint,
//   MatcherHintOptions
// } = require('jest-matcher-utils');
// const domJSON = require('domjson');
const mockSnapshotsExist = fs.existsSync(
  path.join(__dirname, '.', '__snapshots__', 'index.test.js.snap'));
let mockSnapshots = null;
if (mockSnapshotsExist) {
  mockSnapshots = require(path.join(__dirname, '.', '__snapshots__', 'index.test.js.snap'));
}

const nockBack = nock.back;
nockBack.fixtures = path.join(__dirname, '.', '__nock-fixtures__');

var recording = config.recordenv;//process.env.RECORD_ENV;
var testing = config.testenv;//process.env.TEST_ENV;
console.log(testing, recording);
if (testing === undefined) {
  testing = false;
  recording = false;
}
nockBack.setMode('record');

describe('API calls', () => {
  let key, agent, csrf = null, header = null;
  // eslint-disable-next-line no-undef
  before(async() => {
    nock.enableNetConnect('127.0.0.1');
    await app.listen(config.port, () => {
      console.log('connected');
      agent = request.agent(app);
      // agent.get('/').expect(200, done)
      // console.log(agent)
    })
  }, 5000);
  beforeEach(async() => {
    await nockBack.setMode('record');
    await nock.enableNetConnect('127.0.0.1');
  });
  afterEach(async() => {
    // this ensures that consecutive tests don't use the snapshot created
    // by a previous test
    // await ContentTest.deleteMany({}).catch(err => console.log(err));
    await nockBack.setMode('wild');
    await nock.cleanAll();
  });
  after((done) => {

  });

  key = 'should get a header';
  it(key, async () => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'editContent.header.json'
    );
    // const { getAuthCode } = authMiddleware;
    nock.enableNetConnect('127.0.0.1');
    header = (!mockSnapshots ? null : mockSnapshots[snapKey]);
  
    if (!recording) {
      expect(header).to.matchSnapshot();
      nockDone()
  
    } else {
      await agent
      .get('/')
      .expect(302)
      .expect('Location', '/home')
      .then((res)=>{
        header = res.header;
        expect(header).to.matchSnapshot();
      })
      nockDone()
    }
  })

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
  
  key = 'registration page should contain a csrf token';
  it(key, async() => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'pu.initAdminUser.json'
    );
    nock.enableNetConnect('127.0.0.1');
    csrf = (!mockSnapshots ? null : mockSnapshots[snapKey]);
    
    if (!recording) {
      expect(csrf).to.matchSnapshot();
      nockDone()

    } else {
      await agent
      .get('/register')
      .expect(200)
      .then(async(res)=>{
        // const csf = res.header['xsrf-token']
        const cookie = res.header['set-cookie'];
        console.log(res.header)
        const csf = cookie.filter((item) => {
            console.log(item, /(XSRF\-TOKEN=)/i.test(item))
            return /(XSRF\-TOKEN=)/.test(item)
          })[0].split('XSRF-TOKEN=')[1].split(';')[0];
        if (!csf) throw new Error('missing csrf token');
        expect(csf).to.matchSnapshot();
        
        await agent
        .post('/register')
        .set('Cookie', cookies(res))
        .send({
          _csrf: csf,
          givenName: 'Tracey Bushman',
          zip: '90210',
          username: 'tbushman',
          password: 'password',
          email: 'tracey.bushman@gmail.com'
        })
        .expect(302)
        .expect('Location', '/sig/admin')
        .then((res) => /*console.log(res)*/
        {
          console.log('k')

        })
        .catch((err) => console.log(err))
      })
      nockDone()
    }
  });
})

  // key = 'should add a user via manual registration';
  // key = 'should add a user via slack';
  // key = 'should add an admin user via slack';
  // key = 'as an authenticated admin, add a Geography document';
  // key = 'as an authenticated admin, add a Solidarity document';
  // key = 'as an authenticated admin, add a EIS document';
  // key = 'as an authenticated user, sign a Solidarity document';

// });

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


function cookie (res, name) {
  return res.headers['set-cookie'].filter(function (cookies) {
    return cookies.split('=')[0] === name
  })[0]
}
function cookies (res) {
  return res.headers['set-cookie'].map(function (cookies) {
    return cookies.split(';')[0]
  }).join(';')
}
// function promisedRegisterRequest() {
//   var authenticatedagent2b = request.agent(app);
//   return new Promise((resolve, reject) => {
//     authenticatedagent2b
//       .post("/register")
//       .send(user)
//       .end(function(error, response) {
//         if (error) reject(error);
//         resolve(authenticatedagent2b);
//       });
//   });
// }
// // Auxiliary function.
// function createLoginAgent(server, loginDetails, done) {
//   agent
//     .post(server)
//     .send(loginDetails)
//     .end(function (error, response) {
//         if (error) {
//             throw error;
//         }
//         // var loginAgent = request.agent();
//         agent.saveCookies(response);
//         done(loginAgent);
//     });
// };
