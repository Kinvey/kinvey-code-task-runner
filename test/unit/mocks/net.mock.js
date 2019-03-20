function create() {
  const serverMock = {
    listen: (port, cb) => setImmediate(cb)
  };

  return {
    simulateConnection(socketMock) {
      this.onConnection(socketMock);
    },
    createServer(onConnection) {
      this.onConnection = onConnection;
      return serverMock;
    }
  };
}

module.exports = {
  create
};
