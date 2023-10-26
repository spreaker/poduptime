import assert from 'node:assert/strict';

export const throwsAsync = async function (promise, error) {
    let f = () => { };
    try {
        await promise;
    } catch (e) {
        f = () => { throw e };
    } finally {
        assert.throws(f, error);
    }
}