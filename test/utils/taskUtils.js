const sampleTask = require('./sampleTask');

function uniqid(prefix) {
  return (prefix || '') + Math.floor(Math.random() * 16000000).toString();
}

function makeCopy(obj) {
  return Object.assign({}, obj);
}

function makeTasks(count) {
  const tasks = [];

  for (let i = 0; i < count; i += 1) {
    const id = uniqid();
    const task = makeCopy(sampleTask);
    task.targetFunction = 'run';
    task.requestId = id;
    task.response = makeCopy(task.response);
    task.response.headers = makeCopy(task.response.headers);
    task.response.headers['x-test-requestid'] = id;
    task.blScript = "function run(req, res, modules) {res.body = {id: '#{id}'}; res.complete(201); return '#{id}';}";
    tasks.push(task);
  }

  return tasks;
}

module.exports = {
  makeTasks
};
