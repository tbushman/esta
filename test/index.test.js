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
  path.join(__dirname, '.', '__snapshots__', 'index.test.js.mocha-snapshot'));
let mockSnapshots = null;
if (mockSnapshotsExist) {
  mockSnapshots = require(path.join(__dirname, '.', '__snapshots__', 'index.test.js.mocha-snapshot'));
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

function getCsrf(res) {
  const cookie = res.header['set-cookie'];
  // console.log(res.header)
  const csf = cookie.filter((item) => {
      // console.log(item, /(XSRF\-TOKEN=)/i.test(item))
      return /(XSRF\-TOKEN=)/.test(item)
    })[0].split('XSRF-TOKEN=')[1].split(';')[0];
  if (!csf) throw new Error('missing csrf token');
  return csf;
}

describe('API calls', () => {
  let key, agent, csrf = null, header = null, ck = null, user, users = null, doc;
  // eslint-disable-next-line no-undef
  before(async() => {
    nock.enableNetConnect('127.0.0.1');
    await app.listen(config.port, async() => {
      console.log('connected');
      agent = request.agent(app);
      // await ContentTest.deleteMany({}).catch(err => console.log(err));
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
    await nockBack.setMode('wild');
    await nock.cleanAll();
  });
  after(async () => {
    await ContentTest.deleteMany({}).catch(err => console.log(err));
    await PublisherTest.deleteMany({}).catch(err => console.log(err));
  });

  key = 'should get a header';
  it(key, async () => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'app.header.json'
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
  
  key = 'registration page should get and post a well-configured csrf token when creating a user';
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
        const csf = getCsrf(res);
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
        .catch((err) => console.log(err))
      })
      nockDone()
    }
  });
  
  key = 'Should get all users';
  it(key, async () => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'pu.getUser.json'
    );
    nock.enableNetConnect('127.0.0.1');
    users = (!mockSnapshots ? null : mockSnapshots[snapKey]);
    
    if (!recording) {
      expect(users).to.matchSnapshot();
      nockDone()

    } else {
      await agent
      .get('/login')
      .then(async res => {
        const csf = await getCsrf(res);
        await agent
        .post('/login')
        .set('Cookie', cookies(res))
        .send({
          _csrf: csf,
          username: 'tbushman',
          password: 'password'
        })
        .then(async res => {
          await agent
          .post('/api/users')
          .then(async res => {
            // await agent
            // .post(`/pu/getgeo/null/null/${res.body[0].properties.zip}`)
            // cb(null, res.body);
            expect(res.body).to.matchSnapshot();
            users = res.body;
          })
        })
      })
      .catch(err => cb(err))
      nockDone()
    }
  })

  key = 'Should edit a user';
  it(key, async () => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'pu.editUser.json'
    );
    nock.enableNetConnect('127.0.0.1');
  
    if (!recording) {
      user = (!mockSnapshots ? null : mockSnapshots[snapKey]);
      expect(user).to.matchSnapshot();
      nockDone()
  
    } else {
      user = (!users || users.length === 0 ? user : users[0]);
      expect(user).to.not.equal(null);
      await agent
      .get('/sig/editprofile')
      .expect(200)
      .then(async res => {
        await agent
        .post('/api/users')
        .then(async result => {
          const csf = getCsrf(res)
          await agent
          .post('/sig/editprofile')
          .set('Cookie', cookies(res))
          .send({
            _csrf: csf,
            zip: '00000',
            email: 'tbushman@pu.bli.sh'
          })
          .expect(302)
          .then(async res => {
            await agent
            .post('/api/users')
            .then(async res => {
              expect(res.body[0]).to.not.equal(undefined);
              expect(res.body[0].email).to.equal('tbushman@pu.bli.sh')
              expect(res.body).to.matchSnapshot();
            })
          })
          .catch((err) => console.log(err))
        })
        
      })
      nockDone()
    }
  })
  
  key = 'should add a document via congress\.gov';
  it(key, async() => {
    const snapKey = ('API calls '+key+' 1');
    const { nockDone } = await nockBack(
      'content.addDocInSupportOfLegislation.json'
    );
    nock.enableNetConnect(/(api\.govinfo\.gov|127\.0\.0\.1)/);
  // host => host.includes('api.govinfo.gov' || '127.0.0.1')
    if (!recording) {
      doc = (!mockSnapshots ? null : mockSnapshots[snapKey]);
      expect(doc).to.matchSnapshot();
      nockDone()
  
    } else {
      await agent
      .get('/login')
      .then(async res => {
        const csf = await getCsrf(res);
        await agent
        .post('/login')
        .set('Cookie', cookies(res))
        .send({
          _csrf: csf,
          username: 'tbushman',
          password: 'password'
        })
        .then(async res => {
          let start, end;
          await agent
          .post('/api/gpo/'+start+'/'+end)
          .expect(200)
          .then(async res => {
            expect(res.body).to.not.equal(null)
            start = '2020-02-05';
            end = '2020-02-08';
            await agent
            .post('/api/gpo/'+start+'/'+end)
            .expect(200)
            .then(async res => {
              const result = JSON.parse(res.text);
              const gpo = result.packages.filter(item => {
                return item.packageId === 'BILLS-116hres835ih'
              })[0];
              expect(gpo).to.not.equal(undefined);
              const url = `/api/new/Nation/0/0/115/undefined/${encodeURIComponent(gpo.title.replace('.', ''))}/BILLS-116hres835ih`;
              await agent
              .get(url)
              .expect(302)
              .then(async res => {
                await agent
                .post('/api/data')
                .expect(200)
                .then(async res => {
                  expect(res.body).to.matchSnapshot()
                })
                // ContentTest.find({}, {properties: 1}).lean().exec((err, data)=>{
                //   console.log(data)
                //   expect(data).to.not.equal(null)
                //   expect(data).to.matchSnapshot()
                //   doc = data[0]
                // })
              })
              .catch(err => console.log(err))
            })
            // "'/api/new/'+newDoc.placetype+'/'+newDoc.place+'/'+newDoc.tiind+'/'+newDoc.chind+'/'+newDoc.secind+'/'+encodeURIComponent(newDoc.chtitle)+'/'+(!newDoc.xmlid ? undefined : newDoc.xmlid)+''"
          })
        })
      });
      nockDone()
    }
  }).timeout(5000)
  // key = 'should get all documents';
  // it(key, async() => {
  // 
  // })
  // key = 'Should delete a user';
  // it(key, () => {
  //   const snapKey = ('API calls '+key+' 1');
  //   const { nockDone } = await nockBack(
  //     'pu.deleteUser.json'
  //   );
  //   nock.enableNetConnect('127.0.0.1');
  //   csrf = (!mockSnapshots ? null : mockSnapshots[snapKey]);
  // 
  //   if (!recording) {
  //     expect(csrf).to.matchSnapshot();
  //     nockDone()
  // 
  //   } else {
  // 
  //   }
  // })

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


// function cookie (res, name) {
//   return res.headers['set-cookie'].filter(function (cookies) {
//     return cookies.split('=')[0] === name
//   })[0]
// }
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
