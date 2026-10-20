import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryResourceStatus} from '../web/project-resources.js';
test('library membership uses global identity and official version, ignoring personal edits',()=>{
 const entries=[{resourceId:'a',versionId:2,personalRevision:7}];
 assert.equal(libraryResourceStatus(entries,{resourceId:'a',versionId:2}),'added');
 assert.equal(libraryResourceStatus(entries,{resourceId:'b',versionId:2}),'available');
 assert.equal(libraryResourceStatus(entries,{resourceId:'a',versionId:3}),'update');
 assert.equal(libraryResourceStatus(entries,{resourceId:'a',versionId:1}),'available');
 assert.equal(libraryResourceStatus([],{resourceId:'a',versionId:2}),'available');
 assert.equal(libraryResourceStatus([...entries,{resourceId:'a',versionId:3}],{resourceId:'a',versionId:3}),'added');
});
