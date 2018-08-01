/**
 * Author: Carlos
 * Created At: 2018-05-05 15:35
 * Description: carlos is good
 */

function importTest(name, path) {
    describe(name, () => {
        require(path);
    });
}

describe('init test', function () {
    before(function () {
        console.log('**************************************BEGIN**************************************');
    });
    importTest('loading mq test...', './mq.test.js');
    after(function () {
        console.log('**************************************END**************************************');
    });
});