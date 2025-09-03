// onlineUsers.js
const onlineUsers = [];

const addUser = (user, socketId) => {
  const isExist = onlineUsers.findIndex((item) => item.id === user.id);
  if (isExist !== -1) {
    onlineUsers[isExist].socketId = socketId;
    onlineUsers[isExist].roleId = user.roleId;
  } else {
    user.socketId = socketId;
    onlineUsers.push(user);
  }
  return onlineUsers;
};

const removeUser = (socketId) => {
  const index = onlineUsers.findIndex((item) => item.socketId === socketId);
  if (index !== -1) {
    onlineUsers.splice(index, 1);
  }
};

const getOnlineUsers = () => onlineUsers;

module.exports = {
  addUser,
  removeUser,
  getOnlineUsers,
};
