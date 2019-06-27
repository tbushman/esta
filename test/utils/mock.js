const path = require('path');
const fs = require('fs');

const mockSnapshotsExist = fs.existsSync(
  path.join(__dirname, '..', '__snapshots__', 'index.test.js.snap'));
let mockSnapshots;
if (mockSnapshotsExist) {
  mockSnapshots = path.join(__dirname, '..', '__snapshots__', 'index.test.js.snap');
}
class Mock {
  constructor(key) {
    this.dat = jest.fn(() => {
      Promise.resolve(!mockSnapshots ? [] : mockSnapshots[key])
    })
  }
}
module.exports = Mock;
