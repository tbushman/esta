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
let mockSnapshots = null;
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
  let key, gp, agent, cs = null;
  // eslint-disable-next-line no-undef
  beforeAll(async(done) => {
    nock.enableNetConnect('127.0.0.1');
    await app.listen(8686, () => {
      console.log('connected');
      // agent = request.agent(app);
      // agent.get('/').expect(200, done)
      // console.log(agent)
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
  
  key = 'registration page should contain a csrf token';
  test(key, async() => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'pu.initAdminUser.json'
    );
    nock.enableNetConnect('127.0.0.1');
    let csrf = (!mockSnapshots ? null : mockSnapshots[snapKey]);
    
    if (!recording) {
      expect(csrf).toMatchSnapshot();
      nockDone()

    } else {
      await request(app)
      .get('/register')
      .expect(200)
      .then(async(res)=>{
        const csf = res.header['set-cookie'].filter((item) => {
            console.log(item, /(\_csrf=)/.test(item))
            return /(\_csrf=)/.test(item)
          })[0].split('_csrf=')[1].split(';')[0];
        if (!csf) throw new Error('missing csrf token');
        expect(csf).toMatchSnapshot();
        
        request(app)
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
      
      
      
      
      // let cs = null;
      // let rescookies = null;
      // cs = await agent.get('/register/')
      // .then(async (res) => {
      //   const csf = res.header['set-cookie'].filter((item) => {
      //       console.log(item, /(\_csrf=)/.test(item))
      //       return /(\_csrf=)/.test(item)
      //     })[0].split('_csrf=')[1].split(';')[0];
      //   if (!csf) throw new Error('missing csrf token');
      //   expect(csf).toMatchSnapshot();
      //   agent.attachCookies(res);
      //   cs = csf;
      // });
      nockDone()
      
      
      
      // .expect(async (res) => {
      //   // console.log(res.header)
      //   const csf = res.header['set-cookie'].filter((item) => {
      //       console.log(item, /(\_csrf=)/.test(item))
      //       return /(\_csrf=)/.test(item)
      //     })[0].split('_csrf=')[1].split(';')[0];
      //   if (!csf) throw new Error('missing csrf token');
      //   cs = csf;
      //   rescookies = res
      //   agent.attachCookies(res)
      // })
      // .then(async (res) => {
      //   // console.log(res)
      //   // const cs = await res.header['set-cookie'].filter((item) => {
      //   //     // console.log(item, /(\_csrf=)/.test(item))
      //   //     return /(\_csrf=)/.test(item)
      //   //   })[0].split('_csrf=')[1].split(';')[0];
      //   // console.log(cs)
      //   expect(cs).toMatchSnapshot();
      //   console.log(cookies(res))
      //   console.log(cookies(rescookies))
      //   return agent
      //     .post('/register')
      //     // .set('Set-Cookie', res.header['set-cookie'].join(''))
      //     .send({
      //       _csrf: cs,
      //       givenName: 'Tracey Bushman',
      //       zip: '90210',
      //       username: 'tbushman',
      //       password: 'password',
      //       email: 'tracey.bushman@gmail.com'
      //     })
      //     .expect(302)
      //     .expect('Location', '/sig/admin')
      //     .then((res) => /*console.log(res)*/
      //     {
      //       console.log('k')
      //     })
      //     .catch((err) => console.log(err))
      // })
      //   cs = csf;
      //   rescookies = res;
      //   console.log(csf)
      //   expect(csf).toMatchSnapshot();
      // 
      // })
      
    }
    
  });
  // key = 'should add an admin user';
  // test(key, async() => {
  //   const snapKey = ('API calls '+key+' 1');
  //   const { nockDone } = await nockBack(
  //     'pu.addAdminUser.json'
  //   );
  //   nock.enableNetConnect('127.0.0.1');
  //   if (cs) {
  //     const pu = await agent
  //       .post('/register')
  //       // .set('Set-Cookie', res.header['set-cookie'].join(''))
  //       .send({
  //         _csrf: cs,
  //         givenName: 'Tracey Bushman',
  //         zip: '90210',
  //         username: 'tbushman',
  //         password: 'password',
  //         email: 'tracey.bushman@gmail.com'
  //       })
  //       .expect(302)
  //       .expect('Location', '/sig/admin')
  //       .then((res) => /*console.log(res)*/
  //       {
  //         console.log('k')
  // 
  //       })
  //       .catch((err) => console.log(err))
  //       expect(pu).toMatchSnapshot();
  //   }
  //   nockDone()

  //   const pu = (
  //     !recording ? 
  //     await new Mock(snapKey).dat : 
  //     await agent
  //       .post('/register')
  //       .send({
  //         _csrf: cs,
  //         givenName: 'Tracey Bushman',
  //         zip: '90210',
  //         username: 'tbushman',
  //         password: 'password'
  //       })
  //       .then((data) => data).catch((err) => err)
  //   );
  //   expect(pu).toMatchSnapshot();
  //   nockDone()
  // })

})
  //     // .then((res) => {
  //     // })
  //   if (!mockSnapshotsExist && !csurf) csurf = mockSnapshots[csrfKey];
  // 
  //   console.log(csurf)
  //   const { nockDone } = await nockBack(
  //     'pu.addAdminUser.json'
  //   );
  //   nock.enableNetConnect('127.0.0.1');
  //   const pu = (
  //     !recording ? 
  //     await new Mock(snapKey).dat : 
  //     await agent
  //       .post('/register')
  //       .send({
  //         _csrf: csurf,
  //         givenName: 'Tracey Bushman',
  //         zip: '90210',
  //         username: 'tbushman',
  //         password: 'password'
  //       })
  //       .then((data) => data).catch((err) => err)
  //   );
  //   expect(pu).toMatchSnapshot();
  //   nockDone()
  // })
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
